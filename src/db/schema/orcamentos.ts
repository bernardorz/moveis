import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { id, money, quantity, timestamps } from "./_helpers";
import { user } from "./auth";
import { clientes } from "./cadastros";
import { descontoTipo, orcamentoStatus } from "./enums";

export const orcamentoNumeroSeq = pgSequence("orcamento_numero_seq", { startWith: 1 });

export const orcamentos = pgTable(
  "orcamentos",
  {
    id: id(),
    numero: integer()
      .notNull()
      .unique()
      .default(sql`nextval('orcamento_numero_seq')`),
    status: orcamentoStatus().notNull().default("rascunho"),
    clienteId: uuid().references(() => clientes.id, { onDelete: "set null" }),
    /** Usado quando o orçamento não tem cliente cadastrado. */
    clienteNomeLivre: text(),
    dataEmissao: date({ mode: "string" }).notNull().defaultNow(),
    validadeDias: integer().notNull().default(15),
    vendedorId: text().references(() => user.id, { onDelete: "set null" }),
    enderecoObra: text(),
    descontoTipo: descontoTipo().notNull().default("percentual"),
    descontoValor: money().notNull().default(0),
    formaPagamento: text(),
    condicaoDetalhada: text(),
    prazoEntregaDias: integer(),
    observacoes: text(),
    enviadoEm: timestamp({ withTimezone: true }),
    aprovadoEm: timestamp({ withTimezone: true }),
    recusadoEm: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.status), index().on(t.clienteId)],
);

/** Colunas comuns de item, compartilhadas pelo orçamento e pelo pedido. */
export const itemColumns = () => ({
  id: id(),
  descricao: text().notNull().default(""),
  quantidade: quantity().notNull().default(1),
  largura: integer(),
  altura: integer(),
  profundidade: integer(),
  material: text(),
  valorUnitario: money().notNull().default(0),
  ordem: integer().notNull().default(0),
});

export const orcamentoComodos = pgTable(
  "orcamento_comodos",
  {
    id: id(),
    orcamentoId: uuid()
      .notNull()
      .references(() => orcamentos.id, { onDelete: "cascade" }),
    nome: text().notNull().default(""),
    ordem: integer().notNull().default(0),
  },
  (t) => [index().on(t.orcamentoId)],
);

export const orcamentoMoveis = pgTable(
  "orcamento_moveis",
  {
    id: id(),
    comodoId: uuid()
      .notNull()
      .references(() => orcamentoComodos.id, { onDelete: "cascade" }),
    nome: text().notNull().default(""),
    ordem: integer().notNull().default(0),
  },
  (t) => [index().on(t.comodoId)],
);

export const orcamentoItens = pgTable(
  "orcamento_itens",
  {
    ...itemColumns(),
    movelId: uuid()
      .notNull()
      .references(() => orcamentoMoveis.id, { onDelete: "cascade" }),
  },
  (t) => [index().on(t.movelId)],
);
