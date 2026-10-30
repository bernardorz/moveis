import { numeric, timestamp, uuid } from "drizzle-orm/pg-core";

export const id = () => uuid().primaryKey().defaultRandom();

/** Valores monetários: numeric(14,2), lidos como number e arredondados em lib/money. */
export const money = () => numeric({ precision: 14, scale: 2, mode: "number" });

/** Quantidades de estoque e de itens (aceita 46,5 m, 7,20 m² etc.). */
export const quantity = () => numeric({ precision: 12, scale: 3, mode: "number" });

/** Custo unitário com mais casas para o custo médio ponderado. */
export const unitCost = () => numeric({ precision: 14, scale: 4, mode: "number" });

export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
