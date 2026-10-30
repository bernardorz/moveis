import type { NextRequest } from "next/server";
import { renderReciboPdf } from "@/features/financeiro/recibo-pdf";
import { getRecibo } from "@/features/financeiro/recibos-queries";
import { requireSession } from "@/lib/session";

export async function GET(_request: NextRequest, ctx: RouteContext<"/financeiro/recibos/[id]/pdf">) {
  await requireSession();
  const { id } = await ctx.params;
  const recibo = /^[0-9a-f-]{36}$/i.test(id) ? await getRecibo(id) : null;
  if (!recibo) return new Response("Recibo não encontrado", { status: 404 });

  const pdf = await renderReciboPdf(recibo);
  const filename = `recibo-${String(recibo.numero).padStart(4, "0")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
