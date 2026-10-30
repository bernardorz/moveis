import { index, pgTable, text } from "drizzle-orm/pg-core";
import { id, timestamps } from "./_helpers";

/** Só o nome é obrigatório. */
export const clientes = pgTable(
  "clientes",
  {
    id: id(),
    nome: text().notNull(),
    documento: text(),
    telefone: text(),
    email: text(),
    ...timestamps,
  },
  (t) => [index().on(t.nome), index().on(t.documento)],
);

export const fornecedores = pgTable(
  "fornecedores",
  {
    id: id(),
    nome: text().notNull(),
    documento: text(),
    telefone: text(),
    email: text(),
    ...timestamps,
  },
  (t) => [index().on(t.nome)],
);
