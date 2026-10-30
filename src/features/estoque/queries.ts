import { and, asc, count, desc, eq, ilike, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { clientes, fornecedores, materiais, materialAlteracoes, materialCategorias, movimentacoesEstoque, pedidos, user } from "@/db/schema";
import type { Unidade } from "@/lib/units";

export const MATERIAIS_PAGE_SIZE = 12;

export type MateriaisFilters = {
  q?: string;
  categoria?: string;
  unidade?: Unidade;
  abaixo?: boolean;
  sort?: "nome" | "categoria" | "saldo" | "custo";
  dir?: "asc" | "desc";
  page?: number;
};

function whereFor(f: MateriaisFilters, { ignoreCategoria = false } = {}) {
  const conds: (SQL | undefined)[] = [eq(materiais.ativo, true)];
  if (f.q) {
    const like = `%${f.q}%`;
    conds.push(or(ilike(materiais.nome, like), ilike(materiais.codigo, like), ilike(materiais.corAcabamento, like)));
  }
  if (f.categoria && !ignoreCategoria) conds.push(eq(materiais.categoriaId, f.categoria));
  if (f.unidade) conds.push(eq(materiais.unidade, f.unidade));
  if (f.abaixo) conds.push(lt(materiais.saldoAtual, materiais.estoqueMinimo));
  return and(...conds);
}

export async function listMateriais(f: MateriaisFilters) {
  const page = Math.max(1, f.page ?? 1);
  const dir = f.dir === "desc" ? desc : asc;
  const orderBy =
    f.sort === "categoria"
      ? [dir(materialCategorias.ordem), asc(materiais.nome)]
      : f.sort === "saldo"
        ? [dir(materiais.saldoAtual), asc(materiais.nome)]
        : f.sort === "custo"
          ? [dir(materiais.custoMedio), asc(materiais.nome)]
          : f.sort === "nome"
            ? [dir(materiais.nome)]
            : // Padrão: abaixo do mínimo primeiro, depois categoria e nome.
              [
                desc(sql`(${materiais.saldoAtual} < ${materiais.estoqueMinimo})`),
                asc(materialCategorias.ordem),
                asc(materiais.nome),
              ];

  const where = whereFor(f);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: materiais.id,
        codigo: materiais.codigo,
        nome: materiais.nome,
        categoriaId: materiais.categoriaId,
        categoria: materialCategorias.nome,
        unidade: materiais.unidade,
        chapaLargura: materiais.chapaLargura,
        chapaAltura: materiais.chapaAltura,
        chapaEspessura: materiais.chapaEspessura,
        corAcabamento: materiais.corAcabamento,
        complemento: materiais.complemento,
        estoqueMinimo: materiais.estoqueMinimo,
        saldoAtual: materiais.saldoAtual,
        custoMedio: materiais.custoMedio,
      })
      .from(materiais)
      .innerJoin(materialCategorias, eq(materiais.categoriaId, materialCategorias.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(MATERIAIS_PAGE_SIZE)
      .offset((page - 1) * MATERIAIS_PAGE_SIZE),
    db.select({ total: count() }).from(materiais).where(where),
  ]);
  return { rows, total, page };
}

export type MaterialRow = Awaited<ReturnType<typeof listMateriais>>["rows"][number];

/** Contagem por categoria respeitando os demais filtros (chips do topo). */
export async function countByCategoria(f: MateriaisFilters) {
  const [cats, counts] = await Promise.all([
    db.select().from(materialCategorias).orderBy(asc(materialCategorias.ordem)),
    db
      .select({ categoriaId: materiais.categoriaId, total: count() })
      .from(materiais)
      .where(whereFor(f, { ignoreCategoria: true }))
      .groupBy(materiais.categoriaId),
  ]);
  const map = new Map(counts.map((c) => [c.categoriaId, c.total]));
  return {
    categorias: cats.map((c) => ({ ...c, total: map.get(c.id) ?? 0 })),
    total: counts.reduce((acc, c) => acc + c.total, 0),
  };
}

export async function getEstoqueResumo() {
  const [row] = await db
    .select({
      total: count(),
      valor: sql<string>`coalesce(sum(${materiais.saldoAtual} * ${materiais.custoMedio}), 0)`,
    })
    .from(materiais)
    .where(eq(materiais.ativo, true));
  return { total: row.total, valorEstoque: Number(row.valor) };
}

/** Opções dos drawers de material, entrada e saída. */
export async function getEstoqueFormOptions() {
  const [mats, cats, forns, peds, clis] = await Promise.all([
    db
      .select({
        id: materiais.id,
        nome: materiais.nome,
        codigo: materiais.codigo,
        unidade: materiais.unidade,
        saldoAtual: materiais.saldoAtual,
        estoqueMinimo: materiais.estoqueMinimo,
        custoMedio: materiais.custoMedio,
      })
      .from(materiais)
      .where(eq(materiais.ativo, true))
      .orderBy(asc(materiais.nome)),
    db.select().from(materialCategorias).orderBy(asc(materialCategorias.ordem)),
    db.select({ id: fornecedores.id, nome: fornecedores.nome }).from(fornecedores).orderBy(asc(fornecedores.nome)),
    db
      .select({ id: pedidos.id, numero: pedidos.numero, clienteId: pedidos.clienteId, cliente: clientes.nome })
      .from(pedidos)
      .innerJoin(clientes, eq(pedidos.clienteId, clientes.id))
      .where(ne(pedidos.status, "cancelado"))
      .orderBy(desc(pedidos.numero)),
    db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).orderBy(asc(clientes.nome)),
  ]);
  return { materiais: mats, categorias: cats, fornecedores: forns, pedidos: peds, clientes: clis };
}

export type EstoqueFormOptions = Awaited<ReturnType<typeof getEstoqueFormOptions>>;

export async function getMaterialForEdit(id: string) {
  const [row] = await db.select().from(materiais).where(eq(materiais.id, id));
  return row ?? null;
}

export const HISTORICO_PAGE_SIZE = 20;
export type HistoricoFiltro = "entrada" | "saida" | "alteracao";

export type HistoricoEvento = {
  id: string;
  tipo: "entrada" | "saida" | "cadastro" | "edicao";
  /** Quando foi lançado no sistema: é o que ordena a linha do tempo. */
  registradoEm: Date;
  /** Data informada no movimento, que pode ser anterior ao lançamento. */
  data: string | null;
  usuario: string | null;
  quantidade: number | null;
  saldoApos: number | null;
  custoUnitario: number | null;
  valorTotal: number | null;
  fornecedor: string | null;
  numeroNota: string | null;
  observacao: string | null;
  pedidoId: string | null;
  pedidoNumero: number | null;
  cliente: string | null;
  campos: { campo: string; de: string; para: string }[];
};

/** Linha do tempo do item: entradas, saídas, cadastro e edições, do mais recente para o mais antigo. */
export async function getMaterialHistorico(id: string, f: { tipo?: HistoricoFiltro; page?: number }) {
  const [material] = await db
    .select({
      id: materiais.id,
      codigo: materiais.codigo,
      nome: materiais.nome,
      categoriaId: materiais.categoriaId,
      categoria: materialCategorias.nome,
      unidade: materiais.unidade,
      chapaLargura: materiais.chapaLargura,
      chapaAltura: materiais.chapaAltura,
      chapaEspessura: materiais.chapaEspessura,
      corAcabamento: materiais.corAcabamento,
      complemento: materiais.complemento,
      estoqueMinimo: materiais.estoqueMinimo,
      saldoAtual: materiais.saldoAtual,
      custoMedio: materiais.custoMedio,
    })
    .from(materiais)
    .innerJoin(materialCategorias, eq(materiais.categoriaId, materialCategorias.id))
    .where(eq(materiais.id, id));
  if (!material) return null;

  const page = Math.max(1, f.page ?? 1);
  // Cada fonte traz o suficiente para preencher a página depois de misturadas.
  const limite = page * HISTORICO_PAGE_SIZE;
  const querMovimentos = f.tipo !== "alteracao";
  const querAlteracoes = !f.tipo || f.tipo === "alteracao";
  const condMov = and(eq(movimentacoesEstoque.materialId, id), f.tipo === "entrada" || f.tipo === "saida" ? eq(movimentacoesEstoque.tipo, f.tipo) : undefined);

  const [movimentos, alteracoes, [{ totalMov }], [{ totalAlt }]] = await Promise.all([
    querMovimentos
      ? db
          .select({
            id: movimentacoesEstoque.id,
            tipo: movimentacoesEstoque.tipo,
            createdAt: movimentacoesEstoque.createdAt,
            data: movimentacoesEstoque.data,
            quantidade: movimentacoesEstoque.quantidade,
            saldoApos: movimentacoesEstoque.saldoApos,
            custoUnitario: movimentacoesEstoque.custoUnitario,
            valorTotal: movimentacoesEstoque.valorTotal,
            numeroNota: movimentacoesEstoque.numeroNota,
            observacao: movimentacoesEstoque.observacao,
            pedidoId: movimentacoesEstoque.pedidoId,
            pedidoNumero: pedidos.numero,
            cliente: clientes.nome,
            fornecedor: fornecedores.nome,
            usuario: user.name,
          })
          .from(movimentacoesEstoque)
          .leftJoin(pedidos, eq(movimentacoesEstoque.pedidoId, pedidos.id))
          .leftJoin(clientes, eq(movimentacoesEstoque.clienteId, clientes.id))
          .leftJoin(fornecedores, eq(movimentacoesEstoque.fornecedorId, fornecedores.id))
          .leftJoin(user, eq(movimentacoesEstoque.userId, user.id))
          .where(condMov)
          .orderBy(desc(movimentacoesEstoque.createdAt))
          .limit(limite)
      : [],
    querAlteracoes
      ? db
          .select({
            id: materialAlteracoes.id,
            tipo: materialAlteracoes.tipo,
            createdAt: materialAlteracoes.createdAt,
            campos: materialAlteracoes.campos,
            usuario: user.name,
          })
          .from(materialAlteracoes)
          .leftJoin(user, eq(materialAlteracoes.userId, user.id))
          .where(eq(materialAlteracoes.materialId, id))
          .orderBy(desc(materialAlteracoes.createdAt))
          .limit(limite)
      : [],
    querMovimentos ? db.select({ totalMov: count() }).from(movimentacoesEstoque).where(condMov) : [{ totalMov: 0 }],
    querAlteracoes ? db.select({ totalAlt: count() }).from(materialAlteracoes).where(eq(materialAlteracoes.materialId, id)) : [{ totalAlt: 0 }],
  ]);

  const eventos: HistoricoEvento[] = [
    ...movimentos.map(({ createdAt, ...m }) => ({ ...m, registradoEm: createdAt, campos: [] })),
    ...alteracoes.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      registradoEm: a.createdAt,
      data: null,
      usuario: a.usuario,
      quantidade: null,
      saldoApos: null,
      custoUnitario: null,
      valorTotal: null,
      fornecedor: null,
      numeroNota: null,
      observacao: null,
      pedidoId: null,
      pedidoNumero: null,
      cliente: null,
      campos: a.campos,
    })),
  ].sort((a, b) => b.registradoEm.getTime() - a.registradoEm.getTime());

  return {
    material,
    page,
    total: totalMov + totalAlt,
    eventos: eventos.slice((page - 1) * HISTORICO_PAGE_SIZE, page * HISTORICO_PAGE_SIZE),
  };
}

export type MaterialHistorico = NonNullable<Awaited<ReturnType<typeof getMaterialHistorico>>>;
