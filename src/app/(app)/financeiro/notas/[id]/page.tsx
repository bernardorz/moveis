import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { faCreditCard, faNewspaper } from "@fortawesome/free-regular-svg-icons";
import { StatusBadge } from "@/components/ds/badge";
import { DataTable, TBody, TD, TFoot, TH, THead, TR } from "@/components/ds/data-table";
import { KpiCard } from "@/components/ds/kpi-card";
import { RecordChip } from "@/components/ds/record-chip";
import { EmptyState } from "@/components/ds/states";
import { Icon } from "@/components/icon";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/layout/page";
import { FinanceiroDrawersProvider } from "@/features/financeiro/components/financeiro-drawers";
import { DuplicataRowActions, EditarVinculosAction, NotaHeaderActions } from "@/features/financeiro/components/nota-client";
import { getChequeFormOptions, getNota } from "@/features/financeiro/queries";
import { todayISO } from "@/lib/dates";
import { formatBRL, formatDate, formatNumero, pluralize } from "@/lib/format";
import { CHEQUE_TIPO, FORMA_PAGAMENTO } from "@/lib/status";
import { cn } from "@/lib/utils";

const CHEQUES = "/financeiro/cheques";

export async function generateMetadata({ params }: PageProps<"/financeiro/notas/[id]">): Promise<Metadata> {
  const { id } = await params;
  const n = /^[0-9a-f-]{36}$/i.test(id) ? await getNota(id) : null;
  return { title: n ? `Nota ${n.numero}` : "Nota" };
}

export default async function NotaPage({ params }: PageProps<"/financeiro/notas/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [nota, options] = await Promise.all([getNota(id), getChequeFormOptions()]);
  if (!nota) notFound();

  const today = todayISO();
  const { resumo } = nota;

  return (
    <FinanceiroDrawersProvider options={options}>
      <AppHeader
        title="Detalhe da nota"
        breadcrumb={[
          { label: "Financeiro", href: "/financeiro" },
          { label: "Notas e duplicatas", href: "/financeiro/notas" },
          { label: nota.numero },
        ]}
      />
      <PageBody>
        <section className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-navy-100 bg-white p-5">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-card bg-navy-900 text-white">
              <Icon icon={faNewspaper} size={18} />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-h2 text-navy-900">Nota {nota.numero}</h2>
                <StatusBadge entity="nota" status={resumo.status} />
              </div>
              <p className="num text-table text-navy-500">
                {nota.emitenteDestinatario} · Emitida em {formatDate(nota.dataEmissao)}
              </p>
              {(nota.cliente || nota.pedido) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {nota.pedido && (
                    <RecordChip kind="pedido" href={`/pedidos/${nota.pedido.id}`}>
                      Pedido {formatNumero(nota.pedido.numero)}
                    </RecordChip>
                  )}
                  {nota.cliente && <RecordChip kind="cliente">Cliente: {nota.cliente.nome}</RecordChip>}
                </div>
              )}
              {nota.observacoes && <p className="text-caption text-navy-500">{nota.observacoes}</p>}
            </div>
          </div>
          <NotaHeaderActions nota={nota} />
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard size="sm" label="Valor total" value={formatBRL(nota.valorTotal)} context={pluralize(nota.duplicatas.length, "duplicata", "duplicatas")} />
          <KpiCard
            size="sm"
            tone="success"
            label="Pago"
            value={formatBRL(resumo.pago.valor)}
            progress={nota.valorTotal > 0 ? resumo.pago.valor / nota.valorTotal : 0}
            context={pluralize(resumo.pago.quantidade, "duplicata", "duplicatas")}
          />
          <KpiCard size="sm" label="Em cheque" value={formatBRL(resumo.emCheque.valor)} context={`${pluralize(resumo.emCheque.quantidade, "duplicata", "duplicatas")} · aguardando compensação`} />
          <KpiCard size="sm" label="Em aberto" value={formatBRL(resumo.emAberto.valor)} context={pluralize(resumo.emAberto.quantidade, "duplicata", "duplicatas")} />
        </div>

        <section className="flex flex-col gap-2.5">
          <h3 className="text-h3 text-navy-900">Duplicatas</h3>
          <DataTable minWidth={720}>
            <THead>
              <TH width={110}>Duplicata</TH>
              <TH width={130}>Vencimento</TH>
              <TH width={150}>Status</TH>
              <TH>Pagamento</TH>
              <TH align="right" width={150}>
                Valor
              </TH>
              <TH width={60}>
                <span className="sr-only">Ações</span>
              </TH>
            </THead>
            <TBody>
              {nota.duplicatas.map((d) => {
                const vencida = d.displayStatus === "em_aberto" && d.vencimento < today;
                return (
                  <TR key={d.id}>
                    <TD strong className="num">
                      {d.numero}
                      {d.origemNumero && <span className="block text-overline font-normal text-navy-400">Saldo de {d.origemNumero}</span>}
                    </TD>
                    <TD className={cn("num", vencida && "font-medium text-danger-fg")}>{formatDate(d.vencimento)}</TD>
                    <TD>
                      <StatusBadge entity="duplicata" status={d.displayStatus} />
                      {d.displayStatus === "paga" && d.pagaEm && <span className="num block pt-0.5 text-overline text-navy-400">em {formatDate(d.pagaEm)}</span>}
                    </TD>
                    <TD>
                      {d.chequeAtivo ? (
                        <RecordChip kind="cheque" href={`${CHEQUES}/${d.chequeAtivo.id}`}>
                          Cheque Nº {d.chequeAtivo.numero}
                        </RecordChip>
                      ) : d.pagamento ? (
                        <span>{FORMA_PAGAMENTO[d.pagamento.forma]}</span>
                      ) : (
                        <span className="text-navy-300">—</span>
                      )}
                    </TD>
                    <TD align="right" strong>
                      {formatBRL(d.valor)}
                      {d.valorOriginal != null && <span className="block text-overline font-normal text-navy-400">de {formatBRL(d.valorOriginal)}</span>}
                    </TD>
                    <TD align="right">
                      <DuplicataRowActions nota={nota} duplicata={d} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
            <TFoot>
              <tr>
                <td colSpan={4} className="py-2.5 pl-5 text-table">
                  Total
                </td>
                <td className="num px-3 py-2.5 text-right">{formatBRL(nota.valorTotal)}</td>
                <td />
              </tr>
            </TFoot>
          </DataTable>
        </section>

        <section className="flex flex-col gap-2.5">
          <h3 className="text-h3 text-navy-900">Cheques desta nota</h3>
          {nota.cheques.length === 0 ? (
            <div className="rounded-card border border-navy-100 bg-white">
              <EmptyState bordered={false} icon={faCreditCard} title="Nenhum cheque lançado" description="Só é preciso se a nota for paga em cheque. Use “Lançar cheque” para escolher as duplicatas que ele quita." />
            </div>
          ) : (
            <DataTable minWidth={860}>
              <THead>
                <TH width={120}>Número</TH>
                <TH width={100}>Tipo</TH>
                <TH>Banco</TH>
                <TH width={120}>Bom para</TH>
                <TH width={150}>Status</TH>
                <TH align="right" width={170}>
                  Quita nesta nota
                </TH>
                <TH align="right" width={140}>
                  Valor do cheque
                </TH>
                <TH width={60}>
                  <span className="sr-only">Ações</span>
                </TH>
              </THead>
              <TBody>
                {nota.cheques.map((c) => (
                  <TR key={c.id}>
                    <TD strong className="num">
                      <Link href={`${CHEQUES}/${c.id}`} className="hover:underline focus-visible:underline focus-visible:outline-none">
                        {c.numero}
                      </Link>
                    </TD>
                    <TD muted>{CHEQUE_TIPO[c.tipo]}</TD>
                    <TD>{c.banco}</TD>
                    <TD className="num">{formatDate(c.bomPara)}</TD>
                    <TD>
                      <StatusBadge entity="cheque" status={c.status} />
                    </TD>
                    <TD align="right">
                      {formatBRL(c.somaNaNota)}
                      <span className="block text-overline text-navy-400">{pluralize(c.duplicataIds.length, "duplicata", "duplicatas")}</span>
                    </TD>
                    <TD align="right" strong>
                      {formatBRL(c.valor)}
                    </TD>
                    <TD align="right">
                      <EditarVinculosAction nota={nota} cheque={c} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </DataTable>
          )}
        </section>
      </PageBody>
    </FinanceiroDrawersProvider>
  );
}
