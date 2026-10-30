"use server";

import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cheques, clientes, materiais, notas, orcamentos, recibos } from "@/db/schema";
import { formatNumero, onlyDigits } from "@/lib/format";
import { requireSession } from "@/lib/session";

export type SearchResult = {
  group: "Orçamentos" | "Pedidos" | "Clientes" | "Materiais" | "Notas" | "Cheques" | "Recibos";
  label: string;
  detail?: string;
  href: string;
};

/** Busca global (Ctrl K) por número, nome, documento ou código. */
export async function globalSearch(term: string): Promise<SearchResult[]> {
  await requireSession();
  const q = term.trim();
  if (q.length < 2) return [];

  const like = `%${q}%`;
  const digits = onlyDigits(q);
  const numero = digits ? Number(digits) : null;

  const [orcs, peds, clis, mats, nts, chqs, recs] = await Promise.all([
    db.query.orcamentos.findMany({
      where: (o, { or: _or, eq }) =>
        numero
          ? _or(eq(o.numero, numero), ilike(o.clienteNomeLivre, like))
          : ilike(o.clienteNomeLivre, like),
      with: { cliente: { columns: { nome: true } } },
      orderBy: desc(orcamentos.numero),
      limit: 5,
    }),
    numero
      ? db.query.pedidos.findMany({
          where: (p, { eq }) => eq(p.numero, numero),
          with: { cliente: { columns: { nome: true } } },
          limit: 5,
        })
      : Promise.resolve([]),
    db
      .select({ id: clientes.id, nome: clientes.nome, documento: clientes.documento })
      .from(clientes)
      .where(
        or(
          ilike(clientes.nome, like),
          ilike(clientes.email, like),
          digits.length >= 3 ? ilike(clientes.documento, `%${digits}%`) : undefined,
          digits.length >= 3 ? ilike(clientes.telefone, `%${digits}%`) : undefined,
        ),
      )
      .orderBy(clientes.nome)
      .limit(5),
    db
      .select({ id: materiais.id, nome: materiais.nome, codigo: materiais.codigo })
      .from(materiais)
      .where(or(ilike(materiais.nome, like), ilike(materiais.codigo, like)))
      .orderBy(sql`${materiais.nome}`)
      .limit(5),
    db
      .select({ id: notas.id, numero: notas.numero, emitente: notas.emitenteDestinatario })
      .from(notas)
      .where(or(ilike(notas.numero, like), ilike(notas.emitenteDestinatario, like)))
      .orderBy(desc(notas.dataEmissao))
      .limit(5),
    db
      .select({ id: cheques.id, numero: cheques.numero, emitente: cheques.emitente, banco: cheques.banco })
      .from(cheques)
      .where(or(ilike(cheques.numero, like), ilike(cheques.emitente, like), ilike(cheques.favorecido, like)))
      .orderBy(desc(cheques.bomPara))
      .limit(5),
    db
      .select({ id: recibos.id, numero: recibos.numero, pagador: recibos.pagadorNome })
      .from(recibos)
      .where(or(ilike(recibos.pagadorNome, like), ilike(recibos.descricao, like), numero ? eq(recibos.numero, numero) : undefined))
      .orderBy(desc(recibos.numero))
      .limit(5),
  ]);

  // Orçamentos de clientes cujo nome casa com a busca.
  const orcsPorCliente =
    clis.length > 0
      ? await db.query.orcamentos.findMany({
          where: (o, { inArray }) => inArray(o.clienteId, clis.map((c) => c.id)),
          with: { cliente: { columns: { nome: true } } },
          orderBy: desc(orcamentos.numero),
          limit: 5,
        })
      : [];
  const orcMap = new Map([...orcs, ...orcsPorCliente].map((o) => [o.id, o]));

  return [
    ...[...orcMap.values()].slice(0, 5).map<SearchResult>((o) => ({
      group: "Orçamentos",
      label: `Orçamento ${formatNumero(o.numero)}`,
      detail: o.cliente?.nome ?? o.clienteNomeLivre ?? "Sem cliente",
      href: `/orcamentos/${o.id}`,
    })),
    ...peds.map<SearchResult>((p) => ({
      group: "Pedidos",
      label: `Pedido ${formatNumero(p.numero)}`,
      detail: p.cliente.nome,
      href: `/pedidos/${p.id}`,
    })),
    ...clis.map<SearchResult>((c) => ({
      group: "Clientes",
      label: c.nome,
      detail: c.documento ?? undefined,
      href: `/orcamentos?cliente=${c.id}`,
    })),
    ...mats.map<SearchResult>((m) => ({
      group: "Materiais",
      label: m.nome,
      detail: m.codigo,
      href: `/estoque/materiais?q=${encodeURIComponent(m.codigo)}`,
    })),
    ...nts.map<SearchResult>((n) => ({
      group: "Notas",
      label: `Nota ${n.numero}`,
      detail: n.emitente,
      href: `/financeiro/notas/${n.id}`,
    })),
    ...chqs.map<SearchResult>((c) => ({
      group: "Cheques",
      label: `Cheque Nº ${c.numero}`,
      detail: `${c.emitente} · ${c.banco}`,
      href: `/financeiro/cheques/${c.id}`,
    })),
    ...recs.map<SearchResult>((r) => ({
      group: "Recibos",
      label: `Recibo ${formatNumero(r.numero)}`,
      detail: r.pagador,
      href: `/financeiro/recibos?q=${encodeURIComponent(r.pagador)}`,
    })),
  ];
}
