import { and, asc, eq, lt } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { materiais } from "@/db/schema";

/** Materiais ativos com saldo abaixo do estoque mínimo (sidebar, sino e banner). */
export const getEstoqueAlertas = cache(async () =>
  db
    .select({
      id: materiais.id,
      nome: materiais.nome,
      codigo: materiais.codigo,
      saldoAtual: materiais.saldoAtual,
      estoqueMinimo: materiais.estoqueMinimo,
      unidade: materiais.unidade,
    })
    .from(materiais)
    .where(and(eq(materiais.ativo, true), lt(materiais.saldoAtual, materiais.estoqueMinimo)))
    .orderBy(asc(materiais.nome)),
);
