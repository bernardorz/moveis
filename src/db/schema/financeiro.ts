import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { id, money, timestamps } from "./_helpers";
import { user } from "./auth";
import { clientes, fornecedores } from "./cadastros";
import {
  chequeStatus,
  chequeTipo,
  contaStatus,
  contaTipo,
  duplicataStatus,
  formaPagamento,
  reciboTipo,
} from "./enums";
import { pedidos } from "./pedidos";

/** Nota física (sem emissão fiscal). */
export const notas = pgTable(
  "notas",
  {
    id: id(),
    numero: text().notNull(),
    emitenteDestinatario: text().notNull(),
    dataEmissao: date({ mode: "string" }).notNull(),
    valorTotal: money().notNull(),
    observacoes: text(),
    /** Vínculos opcionais: nota de fornecedor fica sem eles. */
    clienteId: uuid().references(() => clientes.id, { onDelete: "set null" }),
    pedidoId: uuid().references(() => pedidos.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index().on(t.numero), index().on(t.clienteId), index().on(t.pedidoId)],
);

export const duplicatas = pgTable(
  "duplicatas",
  {
    id: id(),
    notaId: uuid()
      .notNull()
      .references(() => notas.id, { onDelete: "cascade" }),
    numero: text().notNull(),
    vencimento: date({ mode: "string" }).notNull(),
    valor: money().notNull(),
    status: duplicataStatus().notNull().default("em_aberto"),
    pagaEm: date({ mode: "string" }),
    /** Valor antes de um pagamento parcial; `valor` passa a ser o que foi pago. */
    valorOriginal: money(),
    /** Duplicata que gerou este saldo em um pagamento parcial. */
    origemId: uuid().references((): AnyPgColumn => duplicatas.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index().on(t.notaId), index().on(t.status), uniqueIndex().on(t.notaId, t.numero)],
);

export const cheques = pgTable(
  "cheques",
  {
    id: id(),
    tipo: chequeTipo().notNull().default("recebido"),
    numero: text().notNull(),
    banco: text().notNull(),
    emitente: text().notNull(),
    /** Quem recebe o cheque emitido, ou para quem o recebido foi repassado. */
    favorecido: text(),
    valor: money().notNull(),
    dataEmissao: date({ mode: "string" }).notNull(),
    bomPara: date({ mode: "string" }).notNull(),
    status: chequeStatus().notNull().default("em_carteira"),
    clienteId: uuid().references(() => clientes.id, { onDelete: "set null" }),
    pedidoId: uuid().references(() => pedidos.id, { onDelete: "set null" }),
    observacoes: text(),
    statusAlteradoEm: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex().on(t.tipo, t.banco, t.numero, t.emitente),
    index().on(t.status),
    index().on(t.bomPara),
    index().on(t.clienteId),
    index().on(t.pedidoId),
  ],
);

/** Um cheque pode quitar várias duplicatas, inclusive de notas diferentes. */
export const chequeDuplicatas = pgTable(
  "cheque_duplicatas",
  {
    chequeId: uuid()
      .notNull()
      .references(() => cheques.id, { onDelete: "cascade" }),
    duplicataId: uuid()
      .notNull()
      .references(() => duplicatas.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.chequeId, t.duplicataId] })],
);

/** Pagamento de duplicata fora de cheque. Uma linha por duplicata; `loteId` agrupa o mesmo lançamento. */
export const pagamentos = pgTable(
  "pagamentos",
  {
    id: id(),
    duplicataId: uuid()
      .notNull()
      .references(() => duplicatas.id, { onDelete: "cascade" }),
    loteId: uuid().notNull(),
    forma: formaPagamento().notNull(),
    valor: money().notNull(),
    data: date({ mode: "string" }).notNull(),
    observacao: text(),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.duplicataId), index().on(t.loteId)],
);

export const reciboNumeroSeq = pgSequence("recibo_numero_seq", { startWith: 1 });

/** Só documento: emitir ou cancelar não altera duplicatas, contas nem pedido. */
export const recibos = pgTable(
  "recibos",
  {
    id: id(),
    numero: integer()
      .notNull()
      .unique()
      .default(sql`nextval('recibo_numero_seq')`),
    tipo: reciboTipo().notNull(),
    data: date({ mode: "string" }).notNull(),
    clienteId: uuid().references(() => clientes.id, { onDelete: "set null" }),
    /** Copiados no recibo: quem traz uma chapa para cortar pode não ter cadastro. */
    pagadorNome: text().notNull(),
    pagadorDocumento: text(),
    valor: money().notNull(),
    forma: formaPagamento().notNull(),
    descricao: text().notNull(),
    pedidoId: uuid().references(() => pedidos.id, { onDelete: "set null" }),
    observacoes: text(),
    canceladoEm: timestamp({ withTimezone: true }),
    canceladoMotivo: text(),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index().on(t.data), index().on(t.pedidoId), index().on(t.clienteId)],
);

/** Contas a pagar e a receber (lançamentos manuais). */
export const contas = pgTable(
  "contas",
  {
    id: id(),
    tipo: contaTipo().notNull(),
    descricao: text().notNull(),
    valor: money().notNull(),
    vencimento: date({ mode: "string" }).notNull(),
    formaPagamento: formaPagamento().notNull(),
    categoria: text(),
    parcelaNumero: integer(),
    parcelaTotal: integer(),
    grupoParcelamentoId: uuid(),
    status: contaStatus().notNull().default("em_aberto"),
    pagoEm: date({ mode: "string" }),
    valorPago: money(),
    clienteId: uuid().references(() => clientes.id, { onDelete: "set null" }),
    pedidoId: uuid().references(() => pedidos.id, { onDelete: "set null" }),
    fornecedorId: uuid().references(() => fornecedores.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index().on(t.tipo, t.status),
    index().on(t.vencimento),
    index().on(t.pedidoId),
    index().on(t.clienteId),
  ],
);
