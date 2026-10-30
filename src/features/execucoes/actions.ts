"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pedidos } from "@/db/schema";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { requireSession } from "@/lib/session";
import { agendaSchema } from "./schemas";

/** Datas da produção e previsão de entrega. Nenhuma outra data muda junto. */
export async function salvarAgenda(id: string, input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = agendaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise as datas.", fields: fieldErrors(parsed.error) };

  const [atual] = await db.select({ status: pedidos.status }).from(pedidos).where(eq(pedidos.id, id));
  if (!atual) return { ok: false, error: "Pedido não encontrado." };
  if (atual.status === "cancelado") return { ok: false, error: "Este pedido foi cancelado." };

  await db.update(pedidos).set(parsed.data).where(eq(pedidos.id, id));
  revalidatePath("/execucoes");
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  return { ok: true, data: undefined };
}
