import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { faCreditCard, faNewspaper } from "@fortawesome/free-regular-svg-icons";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { ConciliacaoBadge, StatusBadge } from "@/components/ds/badge";
import { DataTable, TBody, TD, TH, THead, TR } from "@/components/ds/data-table";
import { RecordChip } from "@/components/ds/record-chip";
import { EmptyState } from "@/components/ds/states";
import { Icon } from "@/components/icon";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/layout/page";
import { ChequeHeaderActions } from "@/features/financeiro/components/cheque-client";
import { FinanceiroDrawersProvider } from "@/features/financeiro/components/financeiro-drawers";
import { getCheque, getChequeFormOptions } from "@/features/financeiro/queries";
import { formatBRL, formatDate, formatNumero } from "@/lib/format";
import { sumMoney } from "@/lib/money";
import { CHEQUE_TIPO } from "@/lib/status";

const NOTAS = "/financeiro/notas";

export async function generateMetadata({ params }: PageProps<"/financeiro/cheques/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = /^[0-9a-f-]{36}$/i.test(id) ? await getCheque(id) : null;
  return { title: c ? `Cheque Nº ${c.numero}` : "Cheque" };
}

export default async function ChequePage({ params }: PageProps<"/financeiro/cheques/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [cheque, options] = await Promise.all([getCheque(id), getChequeFormOptions()]);
  if (!cheque) notFound();

  const dados: [string, React.ReactNode][] = [
    ["Tipo", CHEQUE_TIPO[cheque.tipo]],
    ["Banco", cheque.banco],
    ["Emitente", cheque.emitente],
    [cheque.status === "repassado" ? "Repassado a" : "Favorecido", cheque.favorecido ?? "—"],
    ["Emissão", formatDate(cheque.dataEmissao)],
    ["Bom para", formatDate(cheque.bomPara)],
  ];

  return (
    <FinanceiroDrawersProvider options={options}>
      <AppHeader
        title="Detalhe do cheque"
        breadcrumb={[
          { label: "Financeiro", href: "/financeiro" },
          { label: "Cheques", href: "/financeiro/cheques" },
          { label: `Nº ${cheque.numero}` },
        ]}
      />
      <PageBody>
        <section className="rounded-card border border-navy-100 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-card bg-navy-900 text-white">
                <Icon icon={faCreditCard} size={18} />
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-h2 text-navy-900">Cheque Nº {cheque.numero}</h2>
                  <StatusBadge entity="cheque" status={cheque.status} />
                  <span className="num text-h3 text-navy-900">{formatBRL(cheque.valor)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cheque.grupos.map((g) => (
                    <RecordChip key={g.nota.id} kind="nota" href={`${NOTAS}/${g.nota.id}`}>
                      Nota {g.nota.numero}
                    </RecordChip>
                  ))}
                  {cheque.cliente && (
                    <RecordChip kind="cliente" href={`/financeiro/cheques?cliente=${cheque.cliente.id}`}>
                      Cliente: {cheque.cliente.nome}
                    </RecordChip>
                  )}
                  {cheque.pedido && (
                    <RecordChip kind="pedido" href={`/pedidos/${cheque.pedido.id}`}>
                      Pedido {formatNumero(cheque.pedido.numero)}
                    </RecordChip>
                  )}
                </div>
              </div>
            </div>
            <ChequeHeaderActions cheque={cheque} />
          </div>
          <dl className="grid grid-cols-2 border-t border-navy-100 md:grid-cols-3 xl:grid-cols-6">
            {dados.map(([label, value]) => (
              <div key={label} className="px-5 py-3.5">
                <dt className="text-caption text-navy-400">{label}</dt>
                <dd className="num text-body text-navy-900">{value}</dd>
              </div>
            ))}
          </dl>
          {cheque.observacoes && <p className="border-t border-navy-100 px-5 py-3.5 text-table text-navy-600">{cheque.observacoes}</p>}
        </section>

        {cheque.status === "devolvido" && cheque.duplicataIds.length > 0 && (
          <p className="flex items-center gap-2 rounded-field border border-danger-soft bg-danger-bg px-4 py-2.5 text-table text-danger-fg">
            <Icon icon={faCircleExclamation} size={12} />
            Cheque devolvido: as duplicatas abaixo ficam só como histórico e estão livres para outro cheque.
          </p>
        )}

        <section className="flex flex-col gap-2.5">
          <h3 className="text-h3 text-navy-900">Duplicatas vinculadas</h3>
          {cheque.grupos.length === 0 ? (
            <div className="rounded-card border border-navy-100 bg-white">
              <EmptyState bordered={false} icon={faNewspaper} title="Nenhuma duplicata vinculada" description="Edite o cheque para vincular duplicatas, ou lance o cheque pela nota." />
            </div>
          ) : (
            cheque.grupos.map((g) => (
              <div key={g.nota.id} className="flex flex-col gap-1.5">
                <p className="flex flex-wrap items-center justify-between gap-2 text-table text-navy-600">
                  <Link href={`${NOTAS}/${g.nota.id}`} className="font-medium text-navy-900 hover:underline focus-visible:underline focus-visible:outline-none">
                    Nota {g.nota.numero} · {g.nota.emitenteDestinatario}
                  </Link>
                  <span className="num">{formatBRL(sumMoney(g.duplicatas.map((d) => d.valor)))}</span>
                </p>
                <DataTable minWidth={560}>
                  <THead>
                    <TH width={130}>Duplicata</TH>
                    <TH width={160}>Vencimento</TH>
                    <TH>Status</TH>
                    <TH align="right" width={150}>
                      Valor
                    </TH>
                  </THead>
                  <TBody>
                    {g.duplicatas.map((d) => (
                      <TR key={d.id}>
                        <TD strong className="num">
                          {d.numero}
                        </TD>
                        <TD className="num">{formatDate(d.vencimento)}</TD>
                        <TD>
                          <StatusBadge entity="duplicata" status={d.displayStatus} />
                        </TD>
                        <TD align="right" strong>
                          {formatBRL(d.valor)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </DataTable>
              </div>
            ))
          )}
        </section>

        <section className="num flex flex-wrap items-center justify-end gap-x-8 gap-y-2 rounded-card border border-navy-100 bg-white px-5 py-3.5 text-table">
          <span className="text-navy-500">
            Soma das duplicatas <strong className="pl-1 font-semibold text-navy-900">{formatBRL(cheque.somaDuplicatas)}</strong>
          </span>
          <span className="text-navy-500">
            Valor do cheque <strong className="pl-1 font-semibold text-navy-900">{formatBRL(cheque.valor)}</strong>
          </span>
          <span className="flex items-center gap-2 text-navy-500">
            Diferença
            <ConciliacaoBadge diferenca={cheque.diferenca}>
              {cheque.diferenca > 0 ? `Sobra ${formatBRL(cheque.diferenca)}` : `Falta ${formatBRL(-cheque.diferenca)}`}
            </ConciliacaoBadge>
          </span>
        </section>
      </PageBody>
    </FinanceiroDrawersProvider>
  );
}
