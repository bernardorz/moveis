import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/layout/page";
import { OrcamentoEditor } from "@/features/orcamentos/components/orcamento-editor";
import { getOrcamento, getOrcamentoFormOptions } from "@/features/orcamentos/queries";
import { formatNumero } from "@/lib/format";
import { isOrcamentoEditable } from "@/lib/status";

export async function generateMetadata({ params }: PageProps<"/orcamentos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const o = await getOrcamento(id).catch(() => null);
  return { title: o ? `Orçamento ${formatNumero(o.numero)}` : "Orçamento" };
}

export default async function OrcamentoPage({ params }: PageProps<"/orcamentos/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [orcamento, options] = await Promise.all([getOrcamento(id), getOrcamentoFormOptions()]);
  if (!orcamento) notFound();

  return (
    <>
      <AppHeader
        title={isOrcamentoEditable(orcamento.displayStatus) ? "Editar orçamento" : "Orçamento"}
        breadcrumb={[{ label: "Orçamentos", href: "/orcamentos" }, { label: formatNumero(orcamento.numero) }]}
      />
      <PageBody>
        <OrcamentoEditor key={orcamento.id + orcamento.status + orcamento.displayStatus} orcamento={orcamento} options={options} />
      </PageBody>
    </>
  );
}
