import type { NextRequest } from "next/server";
import { renderOrcamentoPdf } from "@/features/orcamentos/pdf";
import { getOrcamento } from "@/features/orcamentos/queries";
import { requireSession } from "@/lib/session";

// Abre no visualizador do navegador (inline). Sem cache: o PDF reflete sempre o último salvamento.
export async function GET(_request: NextRequest, ctx: RouteContext<"/orcamentos/[id]/pdf">) {
  await requireSession();
  const { id } = await ctx.params;
  const orcamento = /^[0-9a-f-]{36}$/i.test(id) ? await getOrcamento(id) : null;
  if (!orcamento) return new Response("Orçamento não encontrado", { status: 404 });

  const pdf = await renderOrcamentoPdf(orcamento);
  const filename = `orcamento-${String(orcamento.numero).padStart(4, "0")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
