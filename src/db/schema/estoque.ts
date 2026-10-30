import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { id, money, quantity, timestamps, unitCost } from "./_helpers";
import { user } from "./auth";
import { clientes, fornecedores } from "./cadastros";
import { materialAlteracaoTipo, movimentacaoTipo, unidadeMedida } from "./enums";
import { pedidos } from "./pedidos";

export const materialCategorias = pgTable("material_categorias", {
  id: id(),
  nome: text().notNull().unique(),
  /** Prefixo do código gerado para os materiais (ex.: CH → CH-0012). */
  prefixo: text().notNull().unique(),
  ordem: integer().notNull().default(0),
});

export const materiais = pgTable(
  "materiais",
  {
    id: id(),
    codigo: text().notNull().unique(),
    nome: text().notNull(),
    categoriaId: uuid()
      .notNull()
      .references(() => materialCategorias.id, { onDelete: "restrict" }),
    unidade: unidadeMedida().notNull(),
    /** Medida da chapa em mm, quando aplicável. */
    chapaLargura: integer(),
    chapaAltura: integer(),
    chapaEspessura: integer(),
    corAcabamento: text(),
    /** Informação complementar exibida sob o nome (ex.: "cx. 500 un"). */
    complemento: text(),
    estoqueMinimo: quantity().notNull().default(0),
    saldoAtual: quantity().notNull().default(0),
    custoMedio: unitCost().notNull().default(0),
    ativo: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [index().on(t.categoriaId), index().on(t.nome)],
);

export const movimentacoesEstoque = pgTable(
  "movimentacoes_estoque",
  {
    id: id(),
    materialId: uuid()
      .notNull()
      .references(() => materiais.id, { onDelete: "restrict" }),
    tipo: movimentacaoTipo().notNull(),
    data: date({ mode: "string" }).notNull(),
    quantidade: quantity().notNull(),
    /** Entrada: valor pago por unidade. Saída: custo médio no momento do débito. */
    custoUnitario: unitCost().notNull(),
    valorTotal: money().notNull(),
    saldoApos: quantity().notNull(),
    custoMedioApos: unitCost().notNull(),
    fornecedorId: uuid().references(() => fornecedores.id, { onDelete: "set null" }),
    numeroNota: text(),
    observacao: text(),
    pedidoId: uuid().references(() => pedidos.id, { onDelete: "set null" }),
    clienteId: uuid().references(() => clientes.id, { onDelete: "set null" }),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.materialId, t.data),
    index().on(t.pedidoId),
    index().on(t.clienteId),
  ],
);

export type MaterialCampoAlterado = { campo: string; de: string; para: string };

/** Cadastro e edições do material. Entradas e saídas ficam em movimentacoes_estoque. */
export const materialAlteracoes = pgTable(
  "material_alteracoes",
  {
    id: id(),
    materialId: uuid()
      .notNull()
      .references(() => materiais.id, { onDelete: "cascade" }),
    tipo: materialAlteracaoTipo().notNull(),
    campos: jsonb().$type<MaterialCampoAlterado[]>().notNull().default([]),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.materialId, t.createdAt)],
);
