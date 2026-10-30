import { and, asc, count, desc, eq, gte, ilike, inArray, lte, ne, notExists, or, sql, sum, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { chequeDuplicatas, cheques, clientes, duplicatas, notas, pedidos } from "@/db/schema";
import { sumMoney } from "@/lib/money";
import { isChequeAtivo, type ChequeStatus, type ChequeTipo, type NotaStatus } from "@/lib/status";
import { diferencaCheque, duplicataDisplayStatus, notaResumo, notaStatus } from "./regras";

export const NOTAS_PAGE_SIZE = 15;
export const CHEQUES_PAGE_SIZE = 15;

/** Duplicata em aberto com cheque ativo vinculado: é o "Em cheque" em SQL. */
const temChequeAtivo = sql`exists (
  select 1 from ${chequeDuplicatas}
  inner join ${cheques} on ${cheques.id} = ${chequeDuplicatas.chequeId}
  where ${chequeDuplicatas.duplicataId} = ${duplicatas.id} and ${cheques.status} <> 'devolvido'
)`;

export type NotasFilters = { q?: string; status?: NotaStatus; de?: string; ate?: string; page?: number };

export async function listNotas(f: NotasFilters) {
  const page = Math.max(1, f.page ?? 1);
  const agg = db
    .select({
      notaId: duplicatas.notaId,
      // Apelidos próprios: a consulta também junta pedidos, que tem uma coluna "total".
      total: count().as("dup_total"),
      pagas: sql<number>`count(*) filter (where ${duplicatas.status} = 'paga')`.mapWith(Number).as("dup_pagas"),
      emCheque: sql<number>`count(*) filter (where ${duplicatas.status} <> 'paga' and ${temChequeAtivo})`.mapWith(Number).as("dup_em_cheque"),
    })
    .from(duplicatas)
    .groupBy(duplicatas.notaId)
    .as("agg");

  const pagas = sql`coalesce(${agg.pagas}, 0)`;
  const emCheque = sql`coalesce(${agg.emCheque}, 0)`;
  const total = sql`coalesce(${agg.total}, 0)`;
  const statusCond: Record<NotaStatus, SQL> = {
    em_aberto: sql`${pagas} = 0 and ${emCheque} = 0`,
    paga: sql`${total} > 0 and ${pagas} = ${total}`,
    parcial: sql`(${pagas} > 0 or ${emCheque} > 0) and ${pagas} < ${total}`,
  };

  const where = and(
    f.q ? or(ilike(notas.numero, `%${f.q}%`), ilike(notas.emitenteDestinatario, `%${f.q}%`)) : undefined,
    f.status ? statusCond[f.status] : undefined,
    f.de ? gte(notas.dataEmissao, f.de) : undefined,
    f.ate ? lte(notas.dataEmissao, f.ate) : undefined,
  );

  const [rows, [{ total: totalRows }]] = await Promise.all([
    db
      .select({
        id: notas.id,
        numero: notas.numero,
        emitenteDestinatario: notas.emitenteDestinatario,
        dataEmissao: notas.dataEmissao,
        valorTotal: notas.valorTotal,
        clienteId: notas.clienteId,
        cliente: clientes.nome,
        pedidoId: notas.pedidoId,
        pedidoNumero: pedidos.numero,
        total: agg.total,
        pagas: agg.pagas,
        emCheque: agg.emCheque,
      })
      .from(notas)
      .leftJoin(agg, eq(agg.notaId, notas.id))
      .leftJoin(clientes, eq(notas.clienteId, clientes.id))
      .leftJoin(pedidos, eq(notas.pedidoId, pedidos.id))
      .where(where)
      .orderBy(desc(notas.dataEmissao), desc(notas.createdAt))
      .limit(NOTAS_PAGE_SIZE)
      .offset((page - 1) * NOTAS_PAGE_SIZE),
    db.select({ total: count() }).from(notas).leftJoin(agg, eq(agg.notaId, notas.id)).where(where),
  ]);

  return {
    page,
    total: totalRows,
    rows: rows.map((r) => {
      const counts = { total: Number(r.total ?? 0), pagas: Number(r.pagas ?? 0), emCheque: Number(r.emCheque ?? 0) };
      return { ...r, ...counts, status: notaStatus(counts) };
    }),
  };
}

export async function getNota(id: string) {
  const row = await db.query.notas.findFirst({
    where: eq(notas.id, id),
    with: {
      cliente: { columns: { id: true, nome: true } },
      pedido: { columns: { id: true, numero: true } },
      duplicatas: {
        orderBy: [asc(duplicatas.vencimento), asc(duplicatas.numero)],
        with: {
          pagamentos: { columns: { forma: true, loteId: true } },
          cheques: {
            with: {
              cheque: { with: { duplicatas: { with: { duplicata: { columns: { id: true, valor: true, notaId: true } } } } } },
            },
          },
        },
      },
    },
  });
  if (!row) return null;

  const numeros = new Map(row.duplicatas.map((d) => [d.id, d.numero]));
  const dups = row.duplicatas.map(({ cheques: links, pagamentos: pags, ...d }) => {
    const statuses = links.map((l) => l.cheque.status);
    return {
      ...d,
      pagamento: pags[0] ?? null,
      origemNumero: d.origemId ? (numeros.get(d.origemId) ?? null) : null,
      displayStatus: duplicataDisplayStatus(d, statuses),
      /** Cheque que vale hoje; os devolvidos ficam só no histórico. */
      chequeAtivo: links.find((l) => isChequeAtivo(l.cheque.status))?.cheque ?? null,
      temVinculo: links.length > 0,
    };
  });

  // Cheques da nota, com o quanto cada um cobre dela.
  const chequesMap = new Map<string, (typeof row.duplicatas)[number]["cheques"][number]["cheque"]>();
  for (const d of row.duplicatas) for (const { cheque } of d.cheques) chequesMap.set(cheque.id, cheque);

  return {
    id: row.id,
    numero: row.numero,
    emitenteDestinatario: row.emitenteDestinatario,
    dataEmissao: row.dataEmissao,
    valorTotal: row.valorTotal,
    observacoes: row.observacoes,
    cliente: row.cliente,
    pedido: row.pedido,
    duplicatas: dups,
    resumo: notaResumo(dups),
    cheques: [...chequesMap.values()]
      .map(({ duplicatas: links, ...c }) => {
        const nestaNota = links.filter((l) => l.duplicata.notaId === row.id).map((l) => l.duplicata);
        return {
          ...c,
          duplicataIds: nestaNota.map((d) => d.id),
          somaNaNota: sumMoney(nestaNota.map((d) => d.valor)),
          /** O cheque pode cobrir outras notas; editar pela nota não pode perder esses vínculos. */
          outrasDuplicatas: links.filter((l) => l.duplicata.notaId !== row.id).map((l) => l.duplicata),
        };
      })
      .sort((a, b) => a.bomPara.localeCompare(b.bomPara)),
  };
}

export type NotaDetail = NonNullable<Awaited<ReturnType<typeof getNota>>>;
export type DuplicataView = NotaDetail["duplicatas"][number];

export type ChequesFilters = {
  q?: string;
  tipo?: ChequeTipo;
  status?: ChequeStatus;
  de?: string;
  ate?: string;
  cliente?: string;
  pedido?: string;
  page?: number;
};

export async function listCheques(f: ChequesFilters) {
  const page = Math.max(1, f.page ?? 1);
  const where = and(
    f.q
      ? or(
          ilike(cheques.numero, `%${f.q}%`),
          ilike(cheques.banco, `%${f.q}%`),
          ilike(cheques.emitente, `%${f.q}%`),
          ilike(cheques.favorecido, `%${f.q}%`),
        )
      : undefined,
    f.tipo ? eq(cheques.tipo, f.tipo) : undefined,
    f.status ? eq(cheques.status, f.status) : undefined,
    f.de ? gte(cheques.bomPara, f.de) : undefined,
    f.ate ? lte(cheques.bomPara, f.ate) : undefined,
    f.cliente ? eq(cheques.clienteId, f.cliente) : undefined,
    f.pedido ? eq(cheques.pedidoId, f.pedido) : undefined,
  );
  const links = db
    .select({ chequeId: chequeDuplicatas.chequeId, quantidade: count().as("quantidade") })
    .from(chequeDuplicatas)
    .groupBy(chequeDuplicatas.chequeId)
    .as("links");

  const [rows, [totais]] = await Promise.all([
    db
      .select({
        id: cheques.id,
        tipo: cheques.tipo,
        numero: cheques.numero,
        banco: cheques.banco,
        emitente: cheques.emitente,
        favorecido: cheques.favorecido,
        valor: cheques.valor,
        dataEmissao: cheques.dataEmissao,
        bomPara: cheques.bomPara,
        status: cheques.status,
        clienteId: cheques.clienteId,
        cliente: clientes.nome,
        pedidoId: cheques.pedidoId,
        pedidoNumero: pedidos.numero,
        duplicatas: links.quantidade,
      })
      .from(cheques)
      .leftJoin(clientes, eq(cheques.clienteId, clientes.id))
      .leftJoin(pedidos, eq(cheques.pedidoId, pedidos.id))
      .leftJoin(links, eq(links.chequeId, cheques.id))
      .where(where)
      .orderBy(asc(cheques.bomPara), asc(cheques.numero))
      .limit(CHEQUES_PAGE_SIZE)
      .offset((page - 1) * CHEQUES_PAGE_SIZE),
    db.select({ total: count(), valor: sum(cheques.valor) }).from(cheques).where(where),
  ]);

  return {
    page,
    total: totais.total,
    valorTotal: Number(totais.valor ?? 0),
    rows: rows.map((r) => ({ ...r, duplicatas: Number(r.duplicatas ?? 0) })),
  };
}

export async function getCheque(id: string) {
  const row = await db.query.cheques.findFirst({
    where: eq(cheques.id, id),
    with: {
      cliente: { columns: { id: true, nome: true } },
      pedido: { columns: { id: true, numero: true } },
      duplicatas: {
        with: {
          duplicata: {
            with: {
              nota: { columns: { id: true, numero: true, emitenteDestinatario: true } },
              cheques: { with: { cheque: { columns: { status: true } } } },
            },
          },
        },
      },
    },
  });
  if (!row) return null;

  const { duplicatas: links, cliente, pedido, ...cheque } = row;
  const dups = links
    .map(({ duplicata: { cheques: outros, ...d } }) => ({
      ...d,
      displayStatus: duplicataDisplayStatus(d, outros.map((o) => o.cheque.status)),
    }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.numero.localeCompare(b.numero));

  const grupos = new Map<string, { nota: (typeof dups)[number]["nota"]; duplicatas: typeof dups }>();
  for (const d of dups) {
    const grupo = grupos.get(d.notaId) ?? { nota: d.nota, duplicatas: [] };
    grupo.duplicatas.push(d);
    grupos.set(d.notaId, grupo);
  }
  const soma = sumMoney(dups.map((d) => d.valor));

  return {
    ...cheque,
    cliente,
    pedido,
    duplicataIds: dups.map((d) => d.id),
    grupos: [...grupos.values()],
    somaDuplicatas: soma,
    diferenca: diferencaCheque(cheque.valor, soma),
  };
}

export type ChequeDetail = NonNullable<Awaited<ReturnType<typeof getCheque>>>;

/** Clientes, pedidos e duplicatas livres para os formulários de cheque. */
export async function getChequeFormOptions() {
  const [clis, peds, livres] = await Promise.all([
    db.select({ id: clientes.id, nome: clientes.nome, documento: clientes.documento }).from(clientes).orderBy(asc(clientes.nome)),
    db
      .select({ id: pedidos.id, numero: pedidos.numero, clienteId: pedidos.clienteId, cliente: clientes.nome })
      .from(pedidos)
      .innerJoin(clientes, eq(pedidos.clienteId, clientes.id))
      .where(ne(pedidos.status, "cancelado"))
      .orderBy(desc(pedidos.numero)),
    db
      .select({
        id: duplicatas.id,
        numero: duplicatas.numero,
        vencimento: duplicatas.vencimento,
        valor: duplicatas.valor,
        notaNumero: notas.numero,
        emitenteDestinatario: notas.emitenteDestinatario,
      })
      .from(duplicatas)
      .innerJoin(notas, eq(duplicatas.notaId, notas.id))
      .where(
        and(
          eq(duplicatas.status, "em_aberto"),
          notExists(
            db
              .select({ id: chequeDuplicatas.chequeId })
              .from(chequeDuplicatas)
              .innerJoin(cheques, eq(cheques.id, chequeDuplicatas.chequeId))
              .where(and(eq(chequeDuplicatas.duplicataId, duplicatas.id), ne(cheques.status, "devolvido"))),
          ),
        ),
      )
      .orderBy(asc(notas.numero), asc(duplicatas.vencimento), asc(duplicatas.numero)),
  ]);
  return { clientes: clis, pedidos: peds, duplicatasLivres: livres };
}

export type ChequeFormOptions = Awaited<ReturnType<typeof getChequeFormOptions>>;

/** Duplicatas das notas ligadas a um pedido, para a aba do pedido. */
export async function getDuplicatasDoPedido(pedidoId: string) {
  const notasDoPedido = await db.select({ id: notas.id, numero: notas.numero }).from(notas).where(eq(notas.pedidoId, pedidoId));
  if (notasDoPedido.length === 0) return { rows: [], pago: 0, emCheque: 0, emAberto: 0 };

  const dups = await db.query.duplicatas.findMany({
    where: inArray(duplicatas.notaId, notasDoPedido.map((n) => n.id)),
    orderBy: [asc(duplicatas.vencimento), asc(duplicatas.numero)],
    with: {
      pagamentos: { columns: { forma: true } },
      cheques: { with: { cheque: { columns: { id: true, numero: true, status: true } } } },
    },
  });
  const numeroNota = new Map(notasDoPedido.map((n) => [n.id, n.numero]));
  const rows = dups.map(({ cheques: links, pagamentos: pags, ...d }) => ({
    ...d,
    notaNumero: numeroNota.get(d.notaId) ?? "",
    forma: pags[0]?.forma ?? null,
    chequeAtivo: links.find((l) => isChequeAtivo(l.cheque.status))?.cheque ?? null,
    displayStatus: duplicataDisplayStatus(d, links.map((l) => l.cheque.status)),
  }));
  const resumo = notaResumo(rows);
  return { rows, pago: resumo.pago.valor, emCheque: resumo.emCheque.valor, emAberto: resumo.emAberto.valor };
}
