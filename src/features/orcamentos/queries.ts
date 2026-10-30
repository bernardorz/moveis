import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { clientes, materiais, orcamentoComodos, orcamentoItens, orcamentoMoveis, orcamentos, pedidos, user } from "@/db/schema";
import { todayISO } from "@/lib/dates";
import { discountAmount } from "@/lib/money";
import { orcamentoDisplayStatus, type OrcamentoStatus } from "@/lib/status";
import type { OrcamentoDoc } from "./schemas";

export async function getOrcamento(id: string) {
  const row = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, id),
    with: {
      cliente: true,
      vendedor: { columns: { name: true } },
      pedido: { columns: { id: true, numero: true } },
      comodos: {
        orderBy: asc(orcamentoComodos.ordem),
        with: {
          moveis: {
            orderBy: asc(orcamentoMoveis.ordem),
            with: { itens: { orderBy: asc(orcamentoItens.ordem) } },
          },
        },
      },
    },
  });
  if (!row) return null;

  const doc: OrcamentoDoc = {
    clienteId: row.clienteId,
    clienteNomeLivre: row.clienteNomeLivre ?? "",
    dataEmissao: row.dataEmissao,
    validadeDias: row.validadeDias,
    vendedorId: row.vendedorId,
    enderecoObra: row.enderecoObra ?? "",
    descontoTipo: row.descontoTipo,
    descontoValor: row.descontoValor,
    formaPagamento: row.formaPagamento ?? "",
    condicaoDetalhada: row.condicaoDetalhada ?? "",
    prazoEntregaDias: row.prazoEntregaDias,
    observacoes: row.observacoes ?? "",
    comodos: row.comodos.map((c) => ({
      id: c.id,
      nome: c.nome,
      moveis: c.moveis.map((m) => ({
        id: m.id,
        nome: m.nome,
        itens: m.itens.map((i) => ({
          id: i.id,
          descricao: i.descricao,
          quantidade: i.quantidade,
          largura: i.largura,
          altura: i.altura,
          profundidade: i.profundidade,
          material: i.material ?? "",
          valorUnitario: i.valorUnitario,
        })),
      })),
    })),
  };

  return {
    id: row.id,
    numero: row.numero,
    status: row.status,
    displayStatus: orcamentoDisplayStatus(row),
    cliente: row.cliente,
    vendedorNome: row.vendedor?.name ?? null,
    pedido: row.pedido,
    updatedAt: row.updatedAt,
    doc,
  };
}

export type OrcamentoDetail = NonNullable<Awaited<ReturnType<typeof getOrcamento>>>;

export async function getOrcamentoFormOptions() {
  const [vendedores, clientesRows, materiaisRows] = await Promise.all([
    db.select({ id: user.id, nome: user.name }).from(user).orderBy(asc(user.name)),
    db
      .select({ id: clientes.id, nome: clientes.nome, documento: clientes.documento, telefone: clientes.telefone, email: clientes.email })
      .from(clientes)
      .orderBy(asc(clientes.nome)),
    db.select({ nome: materiais.nome }).from(materiais).where(eq(materiais.ativo, true)).orderBy(asc(materiais.nome)),
  ]);
  return { vendedores, clientes: clientesRows, materiais: materiaisRows.map((m) => m.nome) };
}

export type OrcamentoFormOptions = Awaited<ReturnType<typeof getOrcamentoFormOptions>>;

export const ORCAMENTOS_PAGE_SIZE = 15;

export type OrcamentosFilters = { q?: string; status?: OrcamentoStatus; cliente?: string; page?: number };

export async function listOrcamentos(f: OrcamentosFilters) {
  const page = Math.max(1, f.page ?? 1);
  const today = todayISO();
  const conds: (SQL | undefined)[] = [];
  if (f.q) {
    const digits = f.q.replace(/\D/g, "");
    conds.push(
      or(
        ilike(clientes.nome, `%${f.q}%`),
        ilike(orcamentos.clienteNomeLivre, `%${f.q}%`),
        digits ? eq(orcamentos.numero, Number(digits)) : undefined,
      ),
    );
  }
  if (f.cliente) conds.push(eq(orcamentos.clienteId, f.cliente));
  const expired = sql`(${orcamentos.status} in ('rascunho','enviado') and (${orcamentos.dataEmissao} + ${orcamentos.validadeDias}) < ${today}::date)`;
  if (f.status === "expirado") conds.push(expired);
  else if (f.status === "rascunho" || f.status === "enviado") conds.push(and(eq(orcamentos.status, f.status), sql`not ${expired}`));
  else if (f.status) conds.push(eq(orcamentos.status, f.status));
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: orcamentos.id,
        numero: orcamentos.numero,
        status: orcamentos.status,
        dataEmissao: orcamentos.dataEmissao,
        validadeDias: orcamentos.validadeDias,
        descontoTipo: orcamentos.descontoTipo,
        descontoValor: orcamentos.descontoValor,
        clienteNome: clientes.nome,
        clienteNomeLivre: orcamentos.clienteNomeLivre,
        vendedor: user.name,
        pedidoId: pedidos.id,
        pedidoNumero: pedidos.numero,
      })
      .from(orcamentos)
      .leftJoin(clientes, eq(orcamentos.clienteId, clientes.id))
      .leftJoin(user, eq(orcamentos.vendedorId, user.id))
      .leftJoin(pedidos, eq(pedidos.orcamentoId, orcamentos.id))
      .where(where)
      .orderBy(desc(orcamentos.numero))
      .limit(ORCAMENTOS_PAGE_SIZE)
      .offset((page - 1) * ORCAMENTOS_PAGE_SIZE),
    db
      .select({ total: count() })
      .from(orcamentos)
      .leftJoin(clientes, eq(orcamentos.clienteId, clientes.id))
      .where(where),
  ]);

  const subtotals = rows.length
    ? await db
        .select({
          orcamentoId: orcamentoComodos.orcamentoId,
          subtotal: sql<string>`coalesce(sum(round(${orcamentoItens.quantidade} * ${orcamentoItens.valorUnitario}, 2)), 0)`,
        })
        .from(orcamentoComodos)
        .innerJoin(orcamentoMoveis, eq(orcamentoMoveis.comodoId, orcamentoComodos.id))
        .innerJoin(orcamentoItens, eq(orcamentoItens.movelId, orcamentoMoveis.id))
        .where(inArray(orcamentoComodos.orcamentoId, rows.map((r) => r.id)))
        .groupBy(orcamentoComodos.orcamentoId)
    : [];
  const subMap = new Map(subtotals.map((s) => [s.orcamentoId, Number(s.subtotal)]));

  return {
    page,
    total,
    rows: rows.map((r) => {
      const subtotal = subMap.get(r.id) ?? 0;
      return {
        ...r,
        displayStatus: orcamentoDisplayStatus(r, today),
        total: subtotal - discountAmount(subtotal, r.descontoTipo, r.descontoValor),
      };
    }),
  };
}
