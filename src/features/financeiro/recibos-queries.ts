import { and, asc, count, desc, eq, gte, ilike, isNull, lte, or, sum } from "drizzle-orm";
import { db } from "@/db";
import { clientes, duplicatas, notas, pagamentos, pedidos, recibos, user } from "@/db/schema";
import { sumMoney } from "@/lib/money";
import type { FormaPagamento, ReciboTipo } from "@/lib/status";

export const RECIBOS_PAGE_SIZE = 15;

export type RecibosFilters = { q?: string; tipo?: ReciboTipo; de?: string; ate?: string; pedido?: string; page?: number };

export async function listRecibos(f: RecibosFilters) {
  const page = Math.max(1, f.page ?? 1);
  const where = and(
    f.q ? or(ilike(recibos.pagadorNome, `%${f.q}%`), ilike(recibos.descricao, `%${f.q}%`)) : undefined,
    f.tipo ? eq(recibos.tipo, f.tipo) : undefined,
    f.de ? gte(recibos.data, f.de) : undefined,
    f.ate ? lte(recibos.data, f.ate) : undefined,
    f.pedido ? eq(recibos.pedidoId, f.pedido) : undefined,
  );
  const [rows, [{ total }], [{ valor }]] = await Promise.all([
    db
      .select({
        id: recibos.id,
        numero: recibos.numero,
        tipo: recibos.tipo,
        data: recibos.data,
        clienteId: recibos.clienteId,
        pagadorNome: recibos.pagadorNome,
        pagadorDocumento: recibos.pagadorDocumento,
        valor: recibos.valor,
        forma: recibos.forma,
        descricao: recibos.descricao,
        pedidoId: recibos.pedidoId,
        pedidoNumero: pedidos.numero,
        observacoes: recibos.observacoes,
        canceladoEm: recibos.canceladoEm,
        canceladoMotivo: recibos.canceladoMotivo,
      })
      .from(recibos)
      .leftJoin(pedidos, eq(recibos.pedidoId, pedidos.id))
      .where(where)
      .orderBy(desc(recibos.numero))
      .limit(RECIBOS_PAGE_SIZE)
      .offset((page - 1) * RECIBOS_PAGE_SIZE),
    db.select({ total: count() }).from(recibos).where(where),
    // Recibo cancelado não entra no total.
    db.select({ valor: sum(recibos.valor) }).from(recibos).where(and(where, isNull(recibos.canceladoEm))),
  ]);
  return { page, total, valorTotal: Number(valor ?? 0), rows };
}

export type ReciboRow = Awaited<ReturnType<typeof listRecibos>>["rows"][number];

export async function getRecibo(id: string) {
  const [row] = await db
    .select({
      id: recibos.id,
      numero: recibos.numero,
      tipo: recibos.tipo,
      data: recibos.data,
      pagadorNome: recibos.pagadorNome,
      pagadorDocumento: recibos.pagadorDocumento,
      valor: recibos.valor,
      forma: recibos.forma,
      descricao: recibos.descricao,
      pedidoNumero: pedidos.numero,
      observacoes: recibos.observacoes,
      canceladoEm: recibos.canceladoEm,
      canceladoMotivo: recibos.canceladoMotivo,
      emitidoPor: user.name,
    })
    .from(recibos)
    .leftJoin(pedidos, eq(recibos.pedidoId, pedidos.id))
    .leftJoin(user, eq(recibos.userId, user.id))
    .where(eq(recibos.id, id));
  return row ?? null;
}

export type ReciboDetail = NonNullable<Awaited<ReturnType<typeof getRecibo>>>;

export async function listRecibosDoPedido(pedidoId: string) {
  return db
    .select({
      id: recibos.id,
      numero: recibos.numero,
      data: recibos.data,
      pagadorNome: recibos.pagadorNome,
      valor: recibos.valor,
      forma: recibos.forma,
      descricao: recibos.descricao,
      canceladoEm: recibos.canceladoEm,
    })
    .from(recibos)
    .where(eq(recibos.pedidoId, pedidoId))
    .orderBy(desc(recibos.numero));
}

/** Dados do atalho "Gerar recibo": parte de um lançamento de pagamento, sem guardar vínculo com ele. */
export async function getReciboDoLote(loteId: string) {
  const rows = await db
    .select({
      valor: pagamentos.valor,
      forma: pagamentos.forma,
      data: pagamentos.data,
      numero: duplicatas.numero,
      notaNumero: notas.numero,
      emitente: notas.emitenteDestinatario,
      clienteId: notas.clienteId,
      cliente: clientes.nome,
      documento: clientes.documento,
      pedidoId: notas.pedidoId,
    })
    .from(pagamentos)
    .innerJoin(duplicatas, eq(pagamentos.duplicataId, duplicatas.id))
    .innerJoin(notas, eq(duplicatas.notaId, notas.id))
    .leftJoin(clientes, eq(notas.clienteId, clientes.id))
    .where(eq(pagamentos.loteId, loteId))
    .orderBy(asc(duplicatas.vencimento), asc(duplicatas.numero));
  const [first] = rows;
  if (!first) return null;
  const numeros = rows.map((r) => r.numero).join(", ");
  return {
    tipo: (first.pedidoId ? "pedido" : "outro") as ReciboTipo,
    data: first.data,
    clienteId: first.clienteId,
    pagadorNome: first.cliente ?? first.emitente,
    pagadorDocumento: first.documento ?? "",
    valor: sumMoney(rows.map((r) => r.valor)),
    forma: first.forma as FormaPagamento,
    descricao: `Pagamento ${rows.length === 1 ? "da duplicata" : "das duplicatas"} ${numeros} da nota ${first.notaNumero}`,
    pedidoId: first.pedidoId,
  };
}

export type ReciboPrefill = NonNullable<Awaited<ReturnType<typeof getReciboDoLote>>>;
