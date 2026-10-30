"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, ne, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { chequeDuplicatas, cheques, duplicatas, notas, pagamentos } from "@/db/schema";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { formatBRL, formatNumber, pluralize } from "@/lib/format";
import { requireSession } from "@/lib/session";
import {
  CHEQUE_STATUS,
  canTransitionCheque,
  chequeStatusInicial,
  isChequeEditavel,
  isChequeLiquidado,
} from "@/lib/status";
import { distribuirPagamento } from "./regras";
import { chequeSchema, chequeStatusSchema, notaSchema, pagamentoSchema } from "./schemas";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Erro de regra de negócio: desfaz a transação e vira mensagem para o usuário. */
class RegraError extends Error {
  constructor(
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

function falha(error: unknown): { ok: false; error: string; fields?: Record<string, string> } {
  if (error instanceof RegraError) return { ok: false, error: error.message, fields: error.fields };
  throw error;
}

function revalidateFinanceiro() {
  revalidatePath("/financeiro", "layout");
  revalidatePath("/pedidos", "layout");
}

const nomeDuplicata = (d: { numero: string; notaNumero: string }) => `${d.numero} da nota ${d.notaNumero}`;

/**
 * Trava as duplicatas e confirma que estão livres: em aberto e sem outro cheque
 * ativo. A trava impede dois cheques de pegarem a mesma duplicata ao mesmo tempo.
 */
async function travarDuplicatasLivres(tx: Tx, ids: string[], chequeId?: string) {
  if (ids.length === 0) return [];
  const rows = await tx
    .select({ id: duplicatas.id, numero: duplicatas.numero, status: duplicatas.status, valor: duplicatas.valor, vencimento: duplicatas.vencimento, notaId: duplicatas.notaId, notaNumero: notas.numero })
    .from(duplicatas)
    .innerJoin(notas, eq(duplicatas.notaId, notas.id))
    .where(inArray(duplicatas.id, ids))
    .orderBy(duplicatas.id)
    .for("update", { of: duplicatas });
  if (rows.length !== new Set(ids).size) throw new RegraError("Uma das duplicatas não existe mais. Recarregue a página.");

  const pagas = rows.filter((d) => d.status === "paga");
  if (pagas.length) throw new RegraError(`Já ${pagas.length === 1 ? "está paga" : "estão pagas"}: ${pagas.map(nomeDuplicata).join(", ")}.`);

  const ocupadas = await tx
    .select({ duplicataId: chequeDuplicatas.duplicataId, numero: cheques.numero })
    .from(chequeDuplicatas)
    .innerJoin(cheques, eq(cheques.id, chequeDuplicatas.chequeId))
    .where(
      and(
        inArray(chequeDuplicatas.duplicataId, ids),
        ne(cheques.status, "devolvido"),
        chequeId ? ne(cheques.id, chequeId) : undefined,
      ),
    );
  if (ocupadas.length) {
    const nomes = ocupadas.map((o) => `${nomeDuplicata(rows.find((d) => d.id === o.duplicataId)!)} (cheque Nº ${o.numero})`);
    throw new RegraError(`Já ${ocupadas.length === 1 ? "está em outro cheque" : "estão em outros cheques"}: ${nomes.join(", ")}.`);
  }
  return rows;
}

export async function saveNota(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = notaSchema.safeParse(input);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return { ok: false, error: fields.duplicatas ?? "Revise os campos destacados.", fields };
  }
  const { id, duplicatas: linhas, ...data } = parsed.data;
  const values = { ...data, observacoes: data.observacoes || null, clienteId: data.clienteId ?? null, pedidoId: data.pedidoId ?? null };

  try {
    const notaId = await db.transaction(async (tx) => {
      if (!id) {
        const [nota] = await tx.insert(notas).values(values).returning({ id: notas.id });
        await tx.insert(duplicatas).values(linhas.map(({ numero, vencimento, valor }) => ({ notaId: nota.id, numero, vencimento, valor })));
        return nota.id;
      }

      const [nota] = await tx.select({ id: notas.id }).from(notas).where(eq(notas.id, id)).for("update");
      if (!nota) throw new RegraError("Nota não encontrada.");
      const atuais = await tx.query.duplicatas.findMany({
        where: eq(duplicatas.notaId, id),
        with: { cheques: { with: { cheque: { columns: { status: true } } } } },
      });

      const idsAtuais = new Set(atuais.map((d) => d.id));
      if (linhas.some((l) => l.id && !idsAtuais.has(l.id))) throw new RegraError("Uma das duplicatas não existe mais. Recarregue a página.");

      // Duplicata paga ou em cheque fica congelada; removida, levaria junto o histórico do cheque.
      for (const atual of atuais) {
        const linha = linhas.find((l) => l.id === atual.id);
        const ativa = atual.cheques.some((c) => c.cheque.status !== "devolvido");
        const congelada = atual.status === "paga" || ativa;
        if (!linha && (congelada || atual.cheques.length > 0)) {
          throw new RegraError(`A duplicata ${atual.numero} tem pagamento ou cheque vinculado e não pode ser removida.`);
        }
        // O saldo de um parcial completa o valor da duplicata de origem: o reabrir depende dele.
        if (atual.origemId && (!linha || linha.valor !== atual.valor)) {
          throw new RegraError(`A duplicata ${atual.numero} é saldo de um pagamento parcial: o valor não pode mudar. Reabra o pagamento para refazer.`);
        }
        if (linha && congelada && (linha.numero !== atual.numero || linha.vencimento !== atual.vencimento || linha.valor !== atual.valor)) {
          throw new RegraError(`A duplicata ${atual.numero} está paga ou em cheque e não pode ser alterada.`);
        }
      }

      await tx.update(notas).set(values).where(eq(notas.id, id));
      const mantidas = linhas.flatMap((l) => (l.id ? [l.id] : []));
      await tx.delete(duplicatas).where(and(eq(duplicatas.notaId, id), mantidas.length ? notInArray(duplicatas.id, mantidas) : undefined));
      // Em duas etapas: o índice único de número não pode colidir ao trocar números entre linhas.
      for (const l of linhas) {
        if (l.id) await tx.update(duplicatas).set({ numero: `tmp-${l.id}` }).where(eq(duplicatas.id, l.id));
      }
      for (const l of linhas) {
        if (l.id) {
          await tx.update(duplicatas).set({ numero: l.numero, vencimento: l.vencimento, valor: l.valor }).where(and(eq(duplicatas.id, l.id), eq(duplicatas.notaId, id)));
        } else {
          await tx.insert(duplicatas).values({ notaId: id, numero: l.numero, vencimento: l.vencimento, valor: l.valor });
        }
      }
      return id;
    });
    revalidateFinanceiro();
    return { ok: true, data: { id: notaId }, message: id ? "Nota atualizada" : "Nota cadastrada" };
  } catch (error) {
    return falha(error);
  }
}

export async function deleteNota(id: string): Promise<ActionResult> {
  await requireSession();
  try {
    await db.transaction(async (tx) => {
      const [nota] = await tx.select({ id: notas.id }).from(notas).where(eq(notas.id, id)).for("update");
      if (!nota) throw new RegraError("Nota não encontrada.");
      const vinculos = await tx
        .select({ id: chequeDuplicatas.chequeId })
        .from(chequeDuplicatas)
        .innerJoin(duplicatas, eq(duplicatas.id, chequeDuplicatas.duplicataId))
        .where(eq(duplicatas.notaId, id))
        .limit(1);
      if (vinculos.length) throw new RegraError("Esta nota tem cheques vinculados, mesmo que devolvidos, e não pode ser excluída.");
      await tx.delete(notas).where(eq(notas.id, id));
    });
    revalidateFinanceiro();
    return { ok: true, data: undefined };
  } catch (error) {
    return falha(error);
  }
}

/**
 * Pagamento por fora de cheque. Cobre as duplicatas ligadas em ordem de vencimento;
 * se o valor não cobrir a última, ela fica paga com o recebido e o resto vira nova duplicata.
 */
export async function registrarPagamento(input: unknown): Promise<ActionResult<{ loteId: string }>> {
  const session = await requireSession();
  const parsed = pagamentoSchema.safeParse(input);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return { ok: false, error: fields.duplicataIds ?? "Revise os campos destacados.", fields };
  }
  const { notaId, duplicataIds, forma, data, valor, observacao, saldoNumero, saldoVencimento } = parsed.data;

  try {
    const { loteId, message } = await db.transaction(async (tx) => {
      const rows = await travarDuplicatasLivres(tx, duplicataIds);
      if (rows.some((d) => d.notaId !== notaId)) throw new RegraError("As duplicatas precisam ser desta nota.");

      const distribuicao = distribuirPagamento(rows, valor);
      if (!distribuicao.ok) throw new RegraError(distribuicao.error, { valor: distribuicao.error });
      const { quitadas, parcial } = distribuicao;

      const loteId = randomUUID();
      const registro = { loteId, forma, data, observacao: observacao || null, userId: session.user.id };
      if (quitadas.length) {
        await tx.update(duplicatas).set({ status: "paga", pagaEm: data }).where(inArray(duplicatas.id, quitadas.map((q) => q.id)));
        await tx.insert(pagamentos).values(quitadas.map((q) => ({ ...registro, duplicataId: q.id, valor: q.valor })));
      }

      if (!parcial) return { loteId, message: `${pluralize(quitadas.length, "duplicata quitada", "duplicatas quitadas")}` };

      const faltando: Record<string, string> = {};
      if (!saldoNumero) faltando.saldoNumero = "Informe o número.";
      if (!saldoVencimento) faltando.saldoVencimento = "Informe o vencimento.";
      if (Object.keys(faltando).length) throw new RegraError("Informe os dados da duplicata de saldo.", faltando);

      const [repetida] = await tx
        .select({ id: duplicatas.id })
        .from(duplicatas)
        .where(and(eq(duplicatas.notaId, notaId), eq(duplicatas.numero, saldoNumero!)));
      if (repetida) throw new RegraError("Já existe uma duplicata com esse número nesta nota.", { saldoNumero: "Número já usado nesta nota." });

      await tx
        .update(duplicatas)
        .set({ status: "paga", pagaEm: data, valor: parcial.pago, valorOriginal: parcial.valorOriginal })
        .where(eq(duplicatas.id, parcial.id));
      await tx.insert(pagamentos).values({ ...registro, duplicataId: parcial.id, valor: parcial.pago });
      await tx.insert(duplicatas).values({ notaId, numero: saldoNumero!, vencimento: saldoVencimento!, valor: parcial.saldo, origemId: parcial.id });
      return { loteId, message: `Nova duplicata ${saldoNumero} de ${formatBRL(parcial.saldo)} em aberto` };
    });
    revalidateFinanceiro();
    return { ok: true, data: { loteId }, message };
  } catch (error) {
    return falha(error);
  }
}

/**
 * Desfaz o pagamento manual. Em um parcial, devolve o valor original e apaga o saldo,
 * que precisa estar intacto. A baixa feita por cheque só volta devolvendo o cheque.
 */
export async function reabrirDuplicata(id: string): Promise<ActionResult> {
  await requireSession();
  try {
    await db.transaction(async (tx) => {
      const [dup] = await tx.select().from(duplicatas).where(eq(duplicatas.id, id)).for("update");
      if (!dup) throw new RegraError("Duplicata não encontrada.");
      if (dup.status !== "paga") throw new RegraError("Esta duplicata não está paga.");
      const [ativo] = await tx
        .select({ numero: cheques.numero })
        .from(chequeDuplicatas)
        .innerJoin(cheques, eq(cheques.id, chequeDuplicatas.chequeId))
        .where(and(eq(chequeDuplicatas.duplicataId, id), ne(cheques.status, "devolvido")));
      if (ativo) throw new RegraError(`Foi paga pelo cheque Nº ${ativo.numero}. Para reabrir, marque o cheque como devolvido.`);

      const [saldo] = await tx.select().from(duplicatas).where(eq(duplicatas.origemId, id)).for("update");
      if (saldo) {
        const [vinculo] = await tx.select({ id: chequeDuplicatas.chequeId }).from(chequeDuplicatas).where(eq(chequeDuplicatas.duplicataId, saldo.id)).limit(1);
        if (saldo.status === "paga" || vinculo) {
          throw new RegraError(`O saldo ${saldo.numero} já tem pagamento ou cheque. Desfaça isso antes de reabrir esta duplicata.`);
        }
        await tx.delete(duplicatas).where(eq(duplicatas.id, saldo.id));
      }
      await tx.delete(pagamentos).where(eq(pagamentos.duplicataId, id));
      await tx
        .update(duplicatas)
        .set({ status: "em_aberto", pagaEm: null, valor: dup.valorOriginal ?? dup.valor, valorOriginal: null })
        .where(eq(duplicatas.id, id));
    });
    revalidateFinanceiro();
    return { ok: true, data: undefined, message: "Duplicata reaberta" };
  } catch (error) {
    return falha(error);
  }
}

export async function saveCheque(input: unknown): Promise<ActionResult<{ id: string; numero: string }>> {
  await requireSession();
  const parsed = chequeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fields: fieldErrors(parsed.error) };
  const { id, notaId, duplicataIds, ...data } = parsed.data;
  const values = {
    ...data,
    favorecido: data.favorecido || null,
    clienteId: data.clienteId ?? null,
    pedidoId: data.pedidoId ?? null,
    observacoes: data.observacoes || null,
  };

  try {
    const chequeId = await db.transaction(async (tx) => {
      const [atual] = id ? await tx.select().from(cheques).where(eq(cheques.id, id)).for("update") : [];
      if (id && !atual) throw new RegraError("Cheque não encontrado.");
      const editavel = !atual || isChequeEditavel(atual.status);
      if (atual && !editavel && values.tipo !== atual.tipo) throw new RegraError("O tipo só pode mudar enquanto o cheque não foi movimentado.");

      const repetido = await tx
        .select({ id: cheques.id })
        .from(cheques)
        .where(
          and(
            eq(cheques.tipo, values.tipo),
            eq(cheques.banco, values.banco),
            eq(cheques.numero, values.numero),
            eq(cheques.emitente, values.emitente),
            id ? ne(cheques.id, id) : undefined,
          ),
        );
      if (repetido.length) {
        throw new RegraError("Já existe um cheque com esse número.", { numero: "Já existe um cheque com este número, banco e emitente." });
      }

      // Cheque já movimentado mantém os vínculos que tinha.
      if (editavel) {
        const rows = await travarDuplicatasLivres(tx, duplicataIds, id);
        if (!id && notaId && !rows.some((d) => d.notaId === notaId)) {
          throw new RegraError("Ligue ao menos uma duplicata desta nota.", { duplicataIds: "Ligue ao menos uma duplicata desta nota." });
        }
      }

      const status = atual ? (editavel ? chequeStatusInicial(values.tipo) : atual.status) : chequeStatusInicial(values.tipo);
      const [salvo] = id
        ? await tx.update(cheques).set({ ...values, status }).where(eq(cheques.id, id)).returning({ id: cheques.id })
        : await tx.insert(cheques).values({ ...values, status }).returning({ id: cheques.id });

      if (editavel) {
        await tx.delete(chequeDuplicatas).where(eq(chequeDuplicatas.chequeId, salvo.id));
        if (duplicataIds.length) {
          await tx.insert(chequeDuplicatas).values(duplicataIds.map((duplicataId) => ({ chequeId: salvo.id, duplicataId })));
        }
      }
      return salvo.id;
    });
    revalidateFinanceiro();
    return {
      ok: true,
      data: { id: chequeId, numero: values.numero },
      message: duplicataIds.length ? pluralize(duplicataIds.length, "duplicata vinculada", "duplicatas vinculadas") : undefined,
    };
  } catch (error) {
    return falha(error);
  }
}

export async function changeChequeStatus(id: string, input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = chequeStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Status inválido." };
  const { status, data, favorecido } = parsed.data;
  if (isChequeLiquidado(status) && !data) return { ok: false, error: "Informe a data da baixa.", fields: { data: "Informe a data." } };

  try {
    const baixadas = await db.transaction(async (tx) => {
      const [cheque] = await tx.select().from(cheques).where(eq(cheques.id, id)).for("update");
      if (!cheque) throw new RegraError("Cheque não encontrado.");
      if (!canTransitionCheque(cheque.tipo, cheque.status, status)) {
        throw new RegraError(`Um cheque ${CHEQUE_STATUS[cheque.status].label.toLowerCase()} não pode virar ${CHEQUE_STATUS[status].label.toLowerCase()}.`);
      }

      const links = await tx.select({ id: chequeDuplicatas.duplicataId }).from(chequeDuplicatas).where(eq(chequeDuplicatas.chequeId, id));
      const ids = links.map((l) => l.id);

      // Reapresentar: enquanto devolvido, as duplicatas podem ter sido pagas ou ir para outro cheque.
      if (cheque.status === "devolvido") await travarDuplicatasLivres(tx, ids, id);

      if (ids.length && isChequeLiquidado(status)) {
        await tx.update(duplicatas).set({ status: "paga", pagaEm: data }).where(inArray(duplicatas.id, ids));
      }
      if (ids.length && isChequeLiquidado(cheque.status) && status === "devolvido") {
        await tx.update(duplicatas).set({ status: "em_aberto", pagaEm: null }).where(inArray(duplicatas.id, ids));
      }

      await tx
        .update(cheques)
        .set({ status, statusAlteradoEm: new Date(), favorecido: status === "repassado" ? favorecido || cheque.favorecido : cheque.favorecido })
        .where(eq(cheques.id, id));
      return ids.length;
    });
    revalidateFinanceiro();
    const message = isChequeLiquidado(status) && baixadas
      ? `${formatNumber(baixadas)} ${baixadas === 1 ? "duplicata baixada" : "duplicatas baixadas"}`
      : status === "devolvido" && baixadas
        ? `${formatNumber(baixadas)} ${baixadas === 1 ? "duplicata voltou" : "duplicatas voltaram"} para em aberto`
        : undefined;
    return { ok: true, data: undefined, message };
  } catch (error) {
    return falha(error);
  }
}

export async function deleteCheque(id: string): Promise<ActionResult> {
  await requireSession();
  try {
    await db.transaction(async (tx) => {
      const [cheque] = await tx.select({ status: cheques.status }).from(cheques).where(eq(cheques.id, id)).for("update");
      if (!cheque) throw new RegraError("Cheque não encontrado.");
      if (!isChequeEditavel(cheque.status)) throw new RegraError("Só é possível excluir cheques em carteira ou emitidos. Use o status para registrar o que aconteceu.");
      await tx.delete(cheques).where(eq(cheques.id, id));
    });
    revalidateFinanceiro();
    return { ok: true, data: undefined };
  } catch (error) {
    return falha(error);
  }
}
