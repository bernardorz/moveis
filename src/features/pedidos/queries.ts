import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  cheques,
  clientes,
  contas,
  materiais,
  movimentacoesEstoque,
  orcamentos,
  pedidoComodos,
  pedidoItens,
  pedidoMoveis,
  pedidoStatusHistorico,
  pedidos,
  user,
} from "@/db/schema";
import { todayISO } from "@/lib/dates";
import { sumMoney } from "@/lib/money";
import { contaDisplayStatus, type PedidoStatus } from "@/lib/status";

export async function getPedido(id: string) {
  const row = await db.query.pedidos.findFirst({
    where: eq(pedidos.id, id),
    with: {
      cliente: true,
      orcamento: { columns: { id: true, numero: true } },
      vendedor: { columns: { name: true } },
      contrato: true,
      historico: { orderBy: asc(pedidoStatusHistorico.data) },
      comodos: {
        orderBy: asc(pedidoComodos.ordem),
        with: {
          moveis: {
            orderBy: asc(pedidoMoveis.ordem),
            with: { itens: { orderBy: asc(pedidoItens.ordem) } },
          },
        },
      },
    },
  });
  if (!row) return null;

  const [chequesRows, contasRows, saidas] = await Promise.all([
    db.select().from(cheques).where(eq(cheques.pedidoId, id)).orderBy(asc(cheques.bomPara)),
    db
      .select()
      .from(contas)
      .where(and(eq(contas.pedidoId, id), eq(contas.tipo, "receber")))
      .orderBy(asc(contas.vencimento), asc(contas.parcelaNumero)),
    db
      .select({
        id: movimentacoesEstoque.id,
        data: movimentacoesEstoque.data,
        quantidade: movimentacoesEstoque.quantidade,
        custoUnitario: movimentacoesEstoque.custoUnitario,
        valorTotal: movimentacoesEstoque.valorTotal,
        observacao: movimentacoesEstoque.observacao,
        materialId: materiais.id,
        material: materiais.nome,
        codigo: materiais.codigo,
        unidade: materiais.unidade,
      })
      .from(movimentacoesEstoque)
      .innerJoin(materiais, eq(movimentacoesEstoque.materialId, materiais.id))
      .where(and(eq(movimentacoesEstoque.pedidoId, id), eq(movimentacoesEstoque.tipo, "saida")))
      .orderBy(desc(movimentacoesEstoque.data), asc(materiais.nome)),
  ]);

  const today = todayISO();
  const contasView = contasRows.map((c) => ({ ...c, displayStatus: contaDisplayStatus(c, today) }));
  // Recebido = contas a receber pagas. Cheque não tem vínculo com conta: compensá-lo não baixa a parcela.
  const recebido = sumMoney(contasView.filter((c) => c.status === "pago").map((c) => c.valorPago ?? c.valor));
  const aReceberContas = contasView.filter((c) => c.status === "em_aberto");
  const custoMateriais = sumMoney(saidas.map((s) => s.valorTotal));

  return {
    ...row,
    cheques: chequesRows,
    contas: contasView,
    saidas,
    resumo: {
      recebido,
      aReceber: sumMoney(aReceberContas.map((c) => c.valor)),
      parcelasEmAberto: aReceberContas.length,
      proximoVencimento: aReceberContas[0]?.vencimento ?? null,
      formaProximas: aReceberContas[0]?.formaPagamento ?? null,
      custoMateriais,
    },
  };
}

export type PedidoDetail = NonNullable<Awaited<ReturnType<typeof getPedido>>>;

export const PEDIDOS_PAGE_SIZE = 15;

export async function listPedidos(f: { q?: string; status?: PedidoStatus; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const conds: (SQL | undefined)[] = [];
  if (f.q) {
    const digits = f.q.replace(/\D/g, "");
    conds.push(or(ilike(clientes.nome, `%${f.q}%`), digits ? eq(pedidos.numero, Number(digits)) : undefined));
  }
  if (f.status) conds.push(eq(pedidos.status, f.status));
  const where = and(...conds);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: pedidos.id,
        numero: pedidos.numero,
        status: pedidos.status,
        dataPedido: pedidos.dataPedido,
        previsaoEntrega: pedidos.previsaoEntrega,
        total: pedidos.total,
        cliente: clientes.nome,
        orcamentoId: orcamentos.id,
        orcamentoNumero: orcamentos.numero,
        vendedor: user.name,
        recebido: sql<string>`coalesce((select sum(coalesce(${contas.valorPago}, ${contas.valor})) from ${contas} where ${contas.pedidoId} = ${pedidos.id} and ${contas.tipo} = 'receber' and ${contas.status} = 'pago'), 0)`,
      })
      .from(pedidos)
      .innerJoin(clientes, eq(pedidos.clienteId, clientes.id))
      .innerJoin(orcamentos, eq(pedidos.orcamentoId, orcamentos.id))
      .leftJoin(user, eq(pedidos.vendedorId, user.id))
      .where(where)
      .orderBy(desc(pedidos.numero))
      .limit(PEDIDOS_PAGE_SIZE)
      .offset((page - 1) * PEDIDOS_PAGE_SIZE),
    db.select({ total: count() }).from(pedidos).innerJoin(clientes, eq(pedidos.clienteId, clientes.id)).where(where),
  ]);
  return { page, total, rows: rows.map((r) => ({ ...r, recebido: Number(r.recebido) })) };
}
