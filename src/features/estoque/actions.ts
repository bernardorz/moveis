"use server";

import { desc, eq, inArray, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { fornecedores, materiais, materialAlteracoes, materialCategorias, movimentacoesEstoque } from "@/db/schema";
import { lineTotal, round3, weightedAverageCost } from "@/lib/money";
import { requireSession } from "@/lib/session";
import { formatQuantity, formatQuantityDelta, type Unidade } from "@/lib/units";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { diffMaterial } from "./historico";
import { entradaSchema, fornecedorSchema, materialSchema, saidaSchema } from "./schemas";

function revalidateEstoque() {
  revalidatePath("/estoque", "layout");
  revalidatePath("/pedidos", "layout");
}

export async function saveMaterial(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = materialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fields: fieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  const values = {
    ...data,
    chapaLargura: data.chapaLargura ?? null,
    chapaAltura: data.chapaAltura ?? null,
    chapaEspessura: data.chapaEspessura ?? null,
    corAcabamento: data.corAcabamento || null,
    complemento: data.complemento || null,
  };

  if (id) {
    const encontrado = await db.transaction(async (tx) => {
      const [atual] = await tx.select().from(materiais).where(eq(materiais.id, id)).for("update");
      if (!atual) return false;
      const categorias = await tx
        .select({ id: materialCategorias.id, nome: materialCategorias.nome })
        .from(materialCategorias)
        .where(inArray(materialCategorias.id, [atual.categoriaId, values.categoriaId]));
      const nomeCategoria = (categoriaId: string) => categorias.find((c) => c.id === categoriaId)?.nome ?? "";
      const campos = diffMaterial(
        { ...atual, unidade: atual.unidade, categoria: nomeCategoria(atual.categoriaId) },
        { ...values, categoria: nomeCategoria(values.categoriaId) },
      );
      await tx.update(materiais).set(values).where(eq(materiais.id, id));
      if (campos.length) await tx.insert(materialAlteracoes).values({ materialId: id, tipo: "edicao", campos, userId: session.user.id });
      return true;
    });
    if (!encontrado) return { ok: false, error: "Material não encontrado." };
    revalidateEstoque();
    return { ok: true, data: { id }, message: "Material atualizado" };
  }

  const created = await db.transaction(async (tx) => {
    const [cat] = await tx.select().from(materialCategorias).where(eq(materialCategorias.id, data.categoriaId));
    if (!cat) throw new Error("Categoria inválida");
    // Código sequencial por prefixo da categoria: CH-0001, CH-0002...
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`material-codigo-${cat.prefixo}`}))`);
    const [last] = await tx
      .select({ codigo: materiais.codigo })
      .from(materiais)
      .where(like(materiais.codigo, `${cat.prefixo}-%`))
      .orderBy(desc(materiais.codigo))
      .limit(1);
    const next = (last ? Number(last.codigo.split("-")[1]) : 0) + 1;
    const codigo = `${cat.prefixo}-${String(next).padStart(4, "0")}`;
    const [row] = await tx.insert(materiais).values({ ...values, codigo }).returning({ id: materiais.id });
    await tx.insert(materialAlteracoes).values({ materialId: row.id, tipo: "cadastro", userId: session.user.id });
    return row;
  });
  revalidateEstoque();
  return { ok: true, data: created, message: "Material cadastrado" };
}

export async function registrarEntrada(input: unknown): Promise<ActionResult<{ saldo: number }>> {
  const session = await requireSession();
  const parsed = entradaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fields: fieldErrors(parsed.error) };
  const e = parsed.data;

  const result = await db.transaction(async (tx) => {
    const [m] = await tx.select().from(materiais).where(eq(materiais.id, e.materialId)).for("update");
    if (!m) return null;
    const quantidade = round3(e.quantidade);
    const saldoApos = round3(m.saldoAtual + quantidade);
    const custoMedioApos = weightedAverageCost({
      saldo: m.saldoAtual,
      custoMedio: m.custoMedio,
      quantidade,
      custoUnitario: e.valorUnitario,
    });
    await tx.update(materiais).set({ saldoAtual: saldoApos, custoMedio: custoMedioApos }).where(eq(materiais.id, m.id));
    await tx.insert(movimentacoesEstoque).values({
      materialId: m.id,
      tipo: "entrada",
      data: e.data,
      quantidade,
      custoUnitario: e.valorUnitario,
      valorTotal: lineTotal(quantidade, e.valorUnitario),
      saldoApos,
      custoMedioApos,
      fornecedorId: e.fornecedorId ?? null,
      numeroNota: e.numeroNota || null,
      observacao: e.observacao || null,
      userId: session.user.id,
    });
    return { m, quantidade, saldoApos };
  });
  if (!result) return { ok: false, error: "Material não encontrado." };

  revalidateEstoque();
  const { m, quantidade, saldoApos } = result;
  const nota = e.numeroNota ? ` · NF ${e.numeroNota}` : "";
  return {
    ok: true,
    data: { saldo: saldoApos },
    message: `${m.nome} · ${formatQuantityDelta(quantidade, m.unidade as Unidade)}${nota}`,
  };
}

export async function registrarSaida(input: unknown): Promise<ActionResult<{ saldo: number }>> {
  const session = await requireSession();
  const parsed = saidaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fields: fieldErrors(parsed.error) };
  const s = parsed.data;

  const result = await db.transaction(async (tx) => {
    const [m] = await tx.select().from(materiais).where(eq(materiais.id, s.materialId)).for("update");
    if (!m) return { ok: false as const, error: "Material não encontrado." };
    const quantidade = round3(s.quantidade);
    if (quantidade > m.saldoAtual) {
      const error = `Saldo insuficiente: há ${formatQuantity(m.saldoAtual, m.unidade as Unidade)} em estoque.`;
      return { ok: false as const, error, fields: { quantidade: error } };
    }
    const saldoApos = round3(m.saldoAtual - quantidade);
    await tx.update(materiais).set({ saldoAtual: saldoApos }).where(eq(materiais.id, m.id));
    await tx.insert(movimentacoesEstoque).values({
      materialId: m.id,
      tipo: "saida",
      data: s.data,
      quantidade,
      custoUnitario: m.custoMedio,
      valorTotal: lineTotal(quantidade, m.custoMedio),
      saldoApos,
      custoMedioApos: m.custoMedio,
      pedidoId: s.pedidoId ?? null,
      clienteId: s.clienteId ?? null,
      observacao: s.observacao || null,
      userId: session.user.id,
    });
    return { ok: true as const, m, quantidade, saldoApos };
  });
  if (!result.ok) return result;

  revalidateEstoque();
  const { m, quantidade, saldoApos } = result;
  const unidade = m.unidade as Unidade;
  return {
    ok: true,
    data: { saldo: saldoApos },
    message: `${m.nome} · ${formatQuantityDelta(-quantidade, unidade)}`,
    warning:
      saldoApos < m.estoqueMinimo
        ? `${m.nome}: saldo após saída ${formatQuantity(saldoApos, unidade)} / mín. ${formatQuantity(m.estoqueMinimo, unidade)}`
        : undefined,
  };
}

export async function createFornecedor(input: unknown): Promise<ActionResult<{ id: string; nome: string }>> {
  await requireSession();
  const parsed = fornecedorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const [row] = await db
    .insert(fornecedores)
    .values({ nome: parsed.data.nome, documento: parsed.data.documento || null })
    .returning({ id: fornecedores.id, nome: fornecedores.nome });
  revalidatePath("/estoque", "layout");
  return { ok: true, data: row, message: "Fornecedor cadastrado" };
}
