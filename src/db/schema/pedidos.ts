import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { id, money, timestamps } from "./_helpers";
import { user } from "./auth";
import { clientes } from "./cadastros";
import { contratoStatus, descontoTipo, pedidoStatus } from "./enums";
import { itemColumns, orcamentos } from "./orcamentos";

export const pedidoNumeroSeq = pgSequence("pedido_numero_seq", { startWith: 1 });

export const pedidos = pgTable(
  "pedidos",
  {
    id: id(),
    numero: integer()
      .notNull()
      .unique()
      .default(sql`nextval('pedido_numero_seq')`),
    orcamentoId: uuid()
      .notNull()
      .unique()
      .references(() => orcamentos.id, { onDelete: "restrict" }),
    clienteId: uuid()
      .notNull()
      .references(() => clientes.id, { onDelete: "restrict" }),
    status: pedidoStatus().notNull().default("aguardando_producao"),
    dataPedido: date({ mode: "string" }).notNull().defaultNow(),
    prazoEntregaDias: integer(),
    previsaoEntrega: date({ mode: "string" }),
    /** Período planejado na agenda de execuções; início e fim são informados juntos. */
    producaoInicio: date({ mode: "string" }),
    producaoFim: date({ mode: "string" }),
    enderecoObra: text(),
    vendedorId: text().references(() => user.id, { onDelete: "set null" }),
    formaPagamento: text(),
    condicaoDetalhada: text(),
    observacoes: text(),
    subtotal: money().notNull().default(0),
    descontoTipo: descontoTipo().notNull().default("percentual"),
    descontoValor: money().notNull().default(0),
    /** Desconto efetivo em R$. */
    descontoTotal: money().notNull().default(0),
    total: money().notNull().default(0),
    ...timestamps,
  },
  (t) => [index().on(t.status), index().on(t.clienteId), index().on(t.producaoInicio)],
);

export const pedidoStatusHistorico = pgTable(
  "pedido_status_historico",
  {
    id: id(),
    pedidoId: uuid()
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    status: pedidoStatus().notNull(),
    data: timestamp({ withTimezone: true }).notNull().defaultNow(),
    motivo: text(),
    userId: text().references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [index().on(t.pedidoId)],
);

/** Estrutura copiada do orçamento no momento da aprovação. */
export const pedidoComodos = pgTable(
  "pedido_comodos",
  {
    id: id(),
    pedidoId: uuid()
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    nome: text().notNull().default(""),
    ordem: integer().notNull().default(0),
  },
  (t) => [index().on(t.pedidoId)],
);

export const pedidoMoveis = pgTable(
  "pedido_moveis",
  {
    id: id(),
    comodoId: uuid()
      .notNull()
      .references(() => pedidoComodos.id, { onDelete: "cascade" }),
    nome: text().notNull().default(""),
    ordem: integer().notNull().default(0),
  },
  (t) => [index().on(t.comodoId)],
);

export const pedidoItens = pgTable(
  "pedido_itens",
  {
    ...itemColumns(),
    movelId: uuid()
      .notNull()
      .references(() => pedidoMoveis.id, { onDelete: "cascade" }),
  },
  (t) => [index().on(t.movelId)],
);

export const contratoNumeroSeq = pgSequence("contrato_numero_seq", { startWith: 1 });

export type ContratoClausula = { titulo: string; texto: string };

/** 1 pedido = 1 contrato. */
export const contratos = pgTable("contratos", {
  id: id(),
  numero: integer()
    .notNull()
    .unique()
    .default(sql`nextval('contrato_numero_seq')`),
  pedidoId: uuid()
    .notNull()
    .unique()
    .references(() => pedidos.id, { onDelete: "cascade" }),
  status: contratoStatus().notNull().default("gerado"),
  clausulas: jsonb().$type<ContratoClausula[]>().notNull().default([]),
  geradoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  assinadoEm: timestamp({ withTimezone: true }),
  arquivoAssinadoPath: text(),
  arquivoAssinadoNome: text(),
  arquivoAssinadoTamanho: integer(),
  ...timestamps,
});
