"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { contratos, pedidoStatusHistorico, pedidos } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { requireSession } from "@/lib/session";
import { canTransitionPedido, PEDIDO_STATUS } from "@/lib/status";

const statusSchema = z.object({
  to: z.enum(["aguardando_producao", "em_producao", "pronto", "entregue", "cancelado"]),
  motivo: z.string().trim().max(500).optional(),
});

export async function changePedidoStatus(id: string, input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Status inválido." };
  const { to, motivo } = parsed.data;
  if (to === "cancelado" && !motivo) {
    return { ok: false, error: "Informe o motivo do cancelamento.", fields: { motivo: "Informe o motivo do cancelamento." } };
  }

  const result = await db.transaction(async (tx) => {
    const [p] = await tx.select().from(pedidos).where(eq(pedidos.id, id)).for("update");
    if (!p) return "Pedido não encontrado.";
    if (!canTransitionPedido(p.status, to)) {
      return `Não é possível passar de “${PEDIDO_STATUS[p.status].label}” para “${PEDIDO_STATUS[to].label}”.`;
    }
    await tx.update(pedidos).set({ status: to }).where(eq(pedidos.id, id));
    await tx.insert(pedidoStatusHistorico).values({
      pedidoId: id,
      status: to,
      motivo: to === "cancelado" ? motivo : null,
      userId: session.user.id,
    });
    return null;
  });
  if (result) return { ok: false, error: result };

  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/pedidos");
  revalidatePath("/execucoes");
  return { ok: true, data: undefined, message: PEDIDO_STATUS[to].label };
}

export async function marcarContratoAssinado(contratoId: string, assinado: boolean): Promise<ActionResult> {
  await requireSession();
  const [row] = await db
    .update(contratos)
    .set({ status: assinado ? "assinado" : "gerado", assinadoEm: assinado ? new Date() : null })
    .where(eq(contratos.id, contratoId))
    .returning({ pedidoId: contratos.pedidoId });
  if (!row) return { ok: false, error: "Contrato não encontrado." };
  revalidatePath(`/pedidos/${row.pedidoId}`);
  return { ok: true, data: undefined };
}
