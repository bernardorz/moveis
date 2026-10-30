"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { recibos } from "@/db/schema";
import { fieldErrors, type ActionResult } from "@/lib/action-result";
import { onlyDigits } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { reciboCancelSchema, reciboSchema } from "./schemas";

function revalidateRecibos() {
  revalidatePath("/financeiro/recibos");
  revalidatePath("/pedidos", "layout");
}

export async function saveRecibo(input: unknown): Promise<ActionResult<{ id: string; numero: number }>> {
  const session = await requireSession();
  const parsed = reciboSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fields: fieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  const values = {
    ...data,
    clienteId: data.clienteId ?? null,
    pedidoId: data.pedidoId ?? null,
    pagadorDocumento: data.pagadorDocumento ? onlyDigits(data.pagadorDocumento) || null : null,
    observacoes: data.observacoes || null,
  };

  if (id) {
    const [salvo] = await db
      .update(recibos)
      .set(values)
      .where(and(eq(recibos.id, id), isNull(recibos.canceladoEm)))
      .returning({ id: recibos.id, numero: recibos.numero });
    if (!salvo) return { ok: false, error: "Este recibo não existe mais ou foi cancelado." };
    revalidateRecibos();
    return { ok: true, data: salvo };
  }
  const [criado] = await db.insert(recibos).values({ ...values, userId: session.user.id }).returning({ id: recibos.id, numero: recibos.numero });
  revalidateRecibos();
  return { ok: true, data: criado };
}

/** Recibo emitido não é excluído: o número fica registrado e o PDF sai com a marca de cancelado. */
export async function cancelarRecibo(id: string, input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = reciboCancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Informe o motivo.", fields: fieldErrors(parsed.error) };
  const [cancelado] = await db
    .update(recibos)
    .set({ canceladoEm: new Date(), canceladoMotivo: parsed.data.motivo })
    .where(and(eq(recibos.id, id), isNull(recibos.canceladoEm)))
    .returning({ id: recibos.id });
  if (!cancelado) return { ok: false, error: "Este recibo não existe mais ou já foi cancelado." };
  revalidateRecibos();
  return { ok: true, data: undefined };
}
