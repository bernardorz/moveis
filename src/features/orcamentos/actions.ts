"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, type Transaction } from "@/db";
import {
  clientes,
  contratos,
  orcamentoComodos,
  orcamentoItens,
  orcamentoMoveis,
  orcamentos,
  pedidoComodos,
  pedidoItens,
  pedidoMoveis,
  pedidoStatusHistorico,
  pedidos,
} from "@/db/schema";
import { CLAUSULAS_PADRAO } from "@/features/contratos/clausulas-padrao";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { addBusinessDays, todayISO } from "@/lib/dates";
import { formatNumero } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { isOrcamentoEditable, orcamentoDisplayStatus } from "@/lib/status";
import { getOrcamento } from "./queries";
import {
  clienteAprovacaoSchema,
  clienteRapidoSchema,
  orcamentoDocSchema,
  type ComodoDoc,
  type OrcamentoDoc,
} from "./schemas";
import { orcamentoTotals } from "./totals";

const revalidate = (id?: string) => {
  revalidatePath("/orcamentos");
  if (id) revalidatePath(`/orcamentos/${id}`);
};

/** Regrava a árvore do orçamento: apaga e reinsere com os mesmos IDs. */
async function writeTree(tx: Transaction, orcamentoId: string, comodos: ComodoDoc[]) {
  await tx.delete(orcamentoComodos).where(eq(orcamentoComodos.orcamentoId, orcamentoId));
  if (!comodos.length) return;
  await tx.insert(orcamentoComodos).values(comodos.map((c, i) => ({ id: c.id, orcamentoId, nome: c.nome, ordem: i })));
  const moveis = comodos.flatMap((c) => c.moveis.map((m, i) => ({ id: m.id, comodoId: c.id, nome: m.nome, ordem: i })));
  if (moveis.length) await tx.insert(orcamentoMoveis).values(moveis);
  const itens = comodos.flatMap((c) =>
    c.moveis.flatMap((m) =>
      m.itens.map((it, i) => ({
        id: it.id,
        movelId: m.id,
        descricao: it.descricao,
        quantidade: it.quantidade,
        largura: it.largura,
        altura: it.altura,
        profundidade: it.profundidade,
        material: it.material || null,
        valorUnitario: it.valorUnitario,
        ordem: i,
      })),
    ),
  );
  if (itens.length) await tx.insert(orcamentoItens).values(itens);
}

function docColumns(doc: OrcamentoDoc) {
  return {
    clienteId: doc.clienteId,
    clienteNomeLivre: doc.clienteId ? null : doc.clienteNomeLivre.trim() || null,
    dataEmissao: doc.dataEmissao,
    validadeDias: doc.validadeDias,
    vendedorId: doc.vendedorId,
    enderecoObra: doc.enderecoObra.trim() || null,
    descontoTipo: doc.descontoTipo,
    descontoValor: doc.descontoValor,
    formaPagamento: doc.formaPagamento.trim() || null,
    condicaoDetalhada: doc.condicaoDetalhada.trim() || null,
    prazoEntregaDias: doc.prazoEntregaDias,
    observacoes: doc.observacoes.trim() || null,
  };
}

export async function createOrcamento() {
  const session = await requireSession();
  const [row] = await db
    .insert(orcamentos)
    .values({
      vendedorId: session.user.id,
      dataEmissao: todayISO(),
      validadeDias: 15,
      prazoEntregaDias: 45,
      formaPagamento: "Entrada + parcelas em cheque",
    })
    .returning({ id: orcamentos.id });
  revalidate();
  redirect(`/orcamentos/${row.id}`);
}

/** Autosave do editor. */
export async function saveOrcamento(id: string, input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  await requireSession();
  const parsed = orcamentoDocSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos no orçamento.", fields: fieldErrors(parsed.error) };

  const current = await db.query.orcamentos.findFirst({ where: eq(orcamentos.id, id) });
  if (!current) return { ok: false, error: "Orçamento não encontrado." };
  if (!isOrcamentoEditable(orcamentoDisplayStatus(current))) {
    return { ok: false, error: "Este orçamento não pode mais ser editado." };
  }

  const doc = parsed.data;
  const savedAt = new Date();
  await db.transaction(async (tx) => {
    await tx.update(orcamentos).set({ ...docColumns(doc), updatedAt: savedAt }).where(eq(orcamentos.id, id));
    await writeTree(tx, id, doc.comodos);
  });
  revalidatePath("/orcamentos");
  return { ok: true, data: { savedAt: savedAt.toISOString() } };
}

export async function createClienteRapido(input: unknown): Promise<ActionResult<{ id: string; nome: string; documento: string | null; telefone: string | null; email: string | null }>> {
  await requireSession();
  const parsed = clienteRapidoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os dados do cliente.", fields: fieldErrors(parsed.error) };
  const c = parsed.data;
  const [row] = await db
    .insert(clientes)
    .values({ nome: c.nome, documento: c.documento || null, telefone: c.telefone || null, email: c.email || null })
    .returning({ id: clientes.id, nome: clientes.nome, documento: clientes.documento, telefone: clientes.telefone, email: clientes.email });
  return { ok: true, data: row, message: "Cliente cadastrado" };
}

type StatusAction = "enviar" | "recusar" | "reabrir" | "renovar";

export async function changeOrcamentoStatus(id: string, action: StatusAction): Promise<ActionResult> {
  await requireSession();
  const o = await db.query.orcamentos.findFirst({ where: eq(orcamentos.id, id) });
  if (!o) return { ok: false, error: "Orçamento não encontrado." };
  const display = orcamentoDisplayStatus(o);
  const now = new Date();

  if (action === "enviar" && display === "rascunho") {
    await db.update(orcamentos).set({ status: "enviado", enviadoEm: now }).where(eq(orcamentos.id, id));
  } else if (action === "recusar" && (display === "rascunho" || display === "enviado" || display === "expirado")) {
    await db.update(orcamentos).set({ status: "recusado", recusadoEm: now }).where(eq(orcamentos.id, id));
  } else if (action === "reabrir" && (display === "recusado" || display === "enviado")) {
    await db.update(orcamentos).set({ status: "rascunho", recusadoEm: null }).where(eq(orcamentos.id, id));
  } else if (action === "renovar" && display === "expirado") {
    await db.update(orcamentos).set({ dataEmissao: todayISO() }).where(eq(orcamentos.id, id));
  } else {
    return { ok: false, error: "Ação não permitida para o status atual." };
  }
  revalidate(id);
  return { ok: true, data: undefined };
}

export async function duplicateOrcamento(id: string): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const source = await getOrcamento(id);
  if (!source) return { ok: false, error: "Orçamento não encontrado." };
  const doc = source.doc;
  // Novos IDs para a cópia.
  const comodos = doc.comodos.map((c) => ({
    ...c,
    id: crypto.randomUUID(),
    moveis: c.moveis.map((m) => ({ ...m, id: crypto.randomUUID(), itens: m.itens.map((i) => ({ ...i, id: crypto.randomUUID() })) })),
  }));
  const newId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(orcamentos)
      .values({ ...docColumns(doc), dataEmissao: todayISO(), vendedorId: doc.vendedorId ?? session.user.id })
      .returning({ id: orcamentos.id });
    await writeTree(tx, row.id, comodos);
    return row.id;
  });
  revalidate();
  return { ok: true, data: { id: newId }, message: `Cópia criada a partir do Orçamento ${formatNumero(source.numero)}` };
}

export async function deleteOrcamento(id: string): Promise<ActionResult> {
  await requireSession();
  const o = await db.query.orcamentos.findFirst({ where: eq(orcamentos.id, id) });
  if (!o) return { ok: false, error: "Orçamento não encontrado." };
  if (o.status === "aprovado") return { ok: false, error: "Orçamentos aprovados não podem ser excluídos." };
  await db.delete(orcamentos).where(eq(orcamentos.id, id));
  revalidate();
  return { ok: true, data: undefined };
}

/**
 * Aprova o orçamento: cria o cliente (se faltar), o pedido com a estrutura
 * copiada e o contrato com as cláusulas padrão, tudo em uma transação.
 */
export async function approveOrcamento(
  id: string,
  clienteInput?: unknown,
): Promise<ActionResult<{ pedidoId: string; pedidoNumero: number; orcamentoNumero: number }>> {
  const session = await requireSession();
  const source = await getOrcamento(id);
  if (!source) return { ok: false, error: "Orçamento não encontrado." };
  if (!isOrcamentoEditable(source.displayStatus)) {
    return { ok: false, error: "Apenas orçamentos em rascunho ou enviados (dentro da validade) podem ser aprovados." };
  }
  const { doc } = source;
  const itens = doc.comodos.flatMap((c) => c.moveis.flatMap((m) => m.itens));
  if (!itens.length) return { ok: false, error: "Adicione ao menos um item antes de aprovar." };
  if (itens.some((i) => !i.descricao.trim())) return { ok: false, error: "Todos os itens precisam de descrição." };

  let clienteData: ReturnType<typeof clienteAprovacaoSchema.parse> | null = null;
  if (!doc.clienteId) {
    const parsed = clienteAprovacaoSchema.safeParse(clienteInput ?? {});
    if (!parsed.success) {
      return { ok: false, error: "Informe os dados do cliente para o contrato.", fields: fieldErrors(parsed.error) };
    }
    clienteData = parsed.data;
  }

  const totals = orcamentoTotals(doc.comodos, { tipo: doc.descontoTipo, valor: doc.descontoValor });
  const dataPedido = todayISO();

  const result = await db.transaction(async (tx) => {
    // Revalida o status dentro da transação para evitar aprovação dupla.
    const [locked] = await tx.select().from(orcamentos).where(eq(orcamentos.id, id)).for("update");
    if (!locked || locked.status === "aprovado" || locked.status === "recusado") return null;

    let clienteId = doc.clienteId;
    if (!clienteId && clienteData) {
      const [c] = await tx
        .insert(clientes)
        .values({
          nome: clienteData.nome,
          documento: clienteData.documento,
          telefone: clienteData.telefone || null,
          email: clienteData.email || null,
        })
        .returning({ id: clientes.id });
      clienteId = c.id;
    }

    await tx
      .update(orcamentos)
      .set({ status: "aprovado", aprovadoEm: new Date(), clienteId, clienteNomeLivre: null })
      .where(eq(orcamentos.id, id));

    const [pedido] = await tx
      .insert(pedidos)
      .values({
        orcamentoId: id,
        clienteId: clienteId!,
        dataPedido,
        prazoEntregaDias: doc.prazoEntregaDias,
        previsaoEntrega: doc.prazoEntregaDias ? addBusinessDays(dataPedido, doc.prazoEntregaDias) : null,
        enderecoObra: doc.enderecoObra || null,
        vendedorId: doc.vendedorId,
        formaPagamento: doc.formaPagamento || null,
        condicaoDetalhada: doc.condicaoDetalhada || null,
        observacoes: doc.observacoes || null,
        subtotal: totals.subtotal,
        descontoTipo: doc.descontoTipo,
        descontoValor: doc.descontoValor,
        descontoTotal: totals.descontoTotal,
        total: totals.total,
      })
      .returning({ id: pedidos.id, numero: pedidos.numero });

    // Cópia da estrutura (novos IDs: o pedido não muda se o orçamento for duplicado).
    for (const [ci, c] of doc.comodos.entries()) {
      const [pc] = await tx.insert(pedidoComodos).values({ pedidoId: pedido.id, nome: c.nome, ordem: ci }).returning({ id: pedidoComodos.id });
      for (const [mi, m] of c.moveis.entries()) {
        const [pm] = await tx.insert(pedidoMoveis).values({ comodoId: pc.id, nome: m.nome, ordem: mi }).returning({ id: pedidoMoveis.id });
        if (m.itens.length) {
          await tx.insert(pedidoItens).values(
            m.itens.map((it, ii) => ({
              movelId: pm.id,
              descricao: it.descricao,
              quantidade: it.quantidade,
              largura: it.largura,
              altura: it.altura,
              profundidade: it.profundidade,
              material: it.material || null,
              valorUnitario: it.valorUnitario,
              ordem: ii,
            })),
          );
        }
      }
    }

    await tx.insert(pedidoStatusHistorico).values({ pedidoId: pedido.id, status: "aguardando_producao", userId: session.user.id });
    await tx.insert(contratos).values({ pedidoId: pedido.id, clausulas: CLAUSULAS_PADRAO });
    return pedido;
  });

  if (!result) return { ok: false, error: "Este orçamento já foi aprovado ou recusado." };
  revalidate(id);
  revalidatePath("/pedidos");
  return { ok: true, data: { pedidoId: result.id, pedidoNumero: result.numero, orcamentoNumero: source.numero } };
}

