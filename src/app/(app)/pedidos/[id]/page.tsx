import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { faClipboard, faCreditCard, faFileLines, faHandshake, faNewspaper } from "@fortawesome/free-regular-svg-icons";
import { faBoxesStacked, faLock } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { EstoqueBadge, StatusBadge, VenceEmBadge } from "@/components/ds/badge";
import { DataTable, TBody, TD, TFoot, TH, THead, TR } from "@/components/ds/data-table";
import { KpiCard } from "@/components/ds/kpi-card";
import { RecordChip } from "@/components/ds/record-chip";
import { EmptyState } from "@/components/ds/states";
import { Stepper, type Step } from "@/components/ds/stepper";
import { Icon } from "@/components/icon";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/layout/page";
import { EstoqueDrawersProvider } from "@/features/estoque/components/estoque-drawers";
import { getEstoqueFormOptions } from "@/features/estoque/queries";
import {
  ContratoActions,
  EstruturaPedido,
  PedidoHeaderActions,
  PedidoTabs,
  RegistrarSaidaPedidoButton,
} from "@/features/pedidos/components/pedido-client";
import { getDuplicatasDoPedido } from "@/features/financeiro/queries";
import { listRecibosDoPedido } from "@/features/financeiro/recibos-queries";
import { getPedido, type PedidoDetail } from "@/features/pedidos/queries";
import { diffInDays, todayISO } from "@/lib/dates";
import { documentLabel, formatBRL, formatDate, formatDocument, formatNumber, formatNumero, formatPercent, formatPhone, pluralize } from "@/lib/format";
import { sumMoney } from "@/lib/money";
import { FORMA_PAGAMENTO, PEDIDO_FLUXO, PEDIDO_STATUS, venceEmBreve } from "@/lib/status";
import { formatQuantity, type Unidade } from "@/lib/units";

export async function generateMetadata({ params }: PageProps<"/pedidos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = /^[0-9a-f-]{36}$/i.test(id) ? await getPedido(id) : null;
  return { title: p ? `Pedido ${formatNumero(p.numero)}` : "Pedido" };
}

const FORMA_LABEL: Record<string, string> = {
  boleto: "boleto",
  cartao_credito: "cartão de crédito",
  cartao_debito: "cartão de débito",
  pix: "Pix",
  dinheiro: "dinheiro",
  cheque: "cheque",
};

function stepsFor(p: PedidoDetail): Step[] {
  const reached = new Map<string, Date>();
  for (const h of p.historico) if (h.status !== "cancelado") reached.set(h.status, h.data);
  const currentIdx = PEDIDO_FLUXO.indexOf(p.status === "cancelado" ? lastReached(p) : p.status);
  return PEDIDO_FLUXO.map((s, i) => {
    const at = reached.get(s);
    const state = p.status === "entregue" || i < currentIdx ? "done" : i === currentIdx ? "current" : "future";
    let detail = at ? formatDate(at) : undefined;
    if (state === "current" && at && s !== "aguardando_producao") detail = `Desde ${formatDate(at)}`;
    if (state === "future" && s === "entregue" && p.previsaoEntrega) detail = `Previsto ${formatDate(p.previsaoEntrega)}`;
    return { label: PEDIDO_STATUS[s].label, detail, state };
  });
}

function lastReached(p: PedidoDetail) {
  const flow = p.historico.filter((h) => h.status !== "cancelado").map((h) => h.status);
  return (flow[flow.length - 1] ?? "aguardando_producao") as (typeof PEDIDO_FLUXO)[number];
}

export default async function PedidoPage({ params }: PageProps<"/pedidos/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [p, estoqueOptions, duplicatas, recibos] = await Promise.all([
    getPedido(id),
    getEstoqueFormOptions(),
    getDuplicatasDoPedido(id),
    listRecibosDoPedido(id),
  ]);
  if (!p) notFound();

  const today = todayISO();
  const cancelamento = p.status === "cancelado" ? p.historico.findLast((h) => h.status === "cancelado") : undefined;
  const recebidoPct = p.total > 0 ? p.resumo.recebido / p.total : 0;
  const diasUteisLabel = p.prazoEntregaDias ? `${p.prazoEntregaDias} dias úteis` : null;
  const descontoLabel =
    p.descontoTotal > 0 ? (p.descontoTipo === "percentual" ? `Desconto (${formatNumber(p.descontoValor, 2)}%)` : "Desconto") : "Desconto";
  const chequesTotal = sumMoney(p.cheques.map((c) => c.valor));
  const contasTotal = sumMoney(p.contas.map((c) => c.valor));

  return (
    <EstoqueDrawersProvider options={estoqueOptions}>
      <AppHeader title="Detalhe do pedido" breadcrumb={[{ label: "Pedidos", href: "/pedidos" }, { label: formatNumero(p.numero) }]} />
      <PageBody>
        {/* Cabeçalho (Figma 1:950) */}
        <section className="rounded-card border border-navy-100 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-card bg-navy-900 text-white">
                <Icon icon={faClipboard} size={18} />
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-h2 text-navy-900">Pedido {formatNumero(p.numero)}</h2>
                  <StatusBadge entity="pedido" status={p.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <RecordChip kind="cliente" href={`/orcamentos?cliente=${p.cliente.id}`}>
                    Cliente: {p.cliente.nome}
                  </RecordChip>
                  <RecordChip kind="orcamento" href={`/orcamentos/${p.orcamento.id}`}>
                    Orçamento {formatNumero(p.orcamento.numero)}
                  </RecordChip>
                </div>
                {p.contrato && (
                  <div className="flex flex-wrap gap-2">
                    <RecordChip
                      kind="contrato"
                      dot={p.contrato.status === "assinado" ? "success" : "info"}
                      after={
                        <span className={p.contrato.status === "assinado" ? "text-success-fg" : "text-info-fg"}>
                          {p.contrato.status === "assinado" ? "Assinado" : "Gerado"}
                        </span>
                      }
                    >
                      Contrato {formatNumero(p.contrato.numero)}
                    </RecordChip>
                  </div>
                )}
              </div>
            </div>
            <PedidoHeaderActions pedidoId={p.id} numero={p.numero} status={p.status} />
          </div>
          <dl className="grid grid-cols-2 border-t border-navy-100 lg:grid-cols-5 [&>div+div]:border-l [&>div+div]:border-navy-100">
            <div className="px-5 py-3.5">
              <dt className="text-caption text-navy-400">Data do pedido</dt>
              <dd className="num text-body text-navy-900">{formatDate(p.dataPedido)}</dd>
            </div>
            <div className="px-5 py-3.5">
              <dt className="text-caption text-navy-400">Previsão de entrega</dt>
              <dd className="num text-body text-navy-900">
                {formatDate(p.previsaoEntrega)}
                {diasUteisLabel && <span className="text-caption text-navy-400"> · {diasUteisLabel}</span>}
              </dd>
            </div>
            <div className="px-5 py-3.5">
              <dt className="text-caption text-navy-400">Produção</dt>
              <dd className="num text-body text-navy-900">
                {p.producaoInicio && p.producaoFim ? `${formatDate(p.producaoInicio)} → ${formatDate(p.producaoFim)}` : "Sem data"}
                <Link href={`/execucoes${p.producaoInicio ? `?mes=${p.producaoInicio.slice(0, 7)}` : ""}`} className="block text-caption font-medium text-navy-500 hover:text-navy-900 focus-visible:underline focus-visible:outline-none">
                  Ver na agenda
                </Link>
              </dd>
            </div>
            <div className="min-w-0 px-5 py-3.5">
              <dt className="text-caption text-navy-400">Endereço da obra</dt>
              <dd className="truncate text-body text-navy-900">{p.enderecoObra ?? "—"}</dd>
            </div>
            <div className="px-5 py-3.5">
              <dt className="text-caption text-navy-400">Vendedor</dt>
              <dd className="text-body text-navy-900">{p.vendedor?.name ?? "—"}</dd>
            </div>
          </dl>
        </section>

        {/* Stepper (Figma 1:1028) */}
        <section className="rounded-card border border-navy-100 bg-white px-6 py-5">
          <Stepper
            steps={stepsFor(p)}
            cancelled={
              cancelamento
                ? { detail: `Pedido cancelado em ${formatDate(cancelamento.data)}${cancelamento.motivo ? `: ${cancelamento.motivo}` : ""}` }
                : undefined
            }
          />
        </section>

        {/* KPIs (Figma 1:1071) */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            size="sm"
            label="Valor do pedido"
            value={formatBRL(p.total)}
            context={p.descontoTotal > 0 ? `${descontoLabel.replace("Desconto", "Desconto de").replace("(", "").replace(")", "")} aplicado` : "Sem desconto"}
          />
          <KpiCard size="sm" label="Recebido" value={formatBRL(p.resumo.recebido)} tone="success" progress={recebidoPct} />
          <KpiCard
            size="sm"
            label="A receber"
            value={formatBRL(p.resumo.aReceber)}
            context={
              p.resumo.parcelasEmAberto
                ? `${pluralize(p.resumo.parcelasEmAberto, "parcela", "parcelas")}${p.resumo.formaProximas ? ` em ${FORMA_LABEL[p.resumo.formaProximas]}` : ""} · próxima ${formatDate(p.resumo.proximoVencimento).slice(0, 5)}`
                : "Nenhuma parcela em aberto"
            }
          />
          <KpiCard
            size="sm"
            label="Custo de materiais"
            value={formatBRL(p.resumo.custoMateriais)}
            context={p.total > 0 ? `${formatPercent((p.resumo.custoMateriais / p.total) * 100)} do valor do pedido` : undefined}
          />
        </section>

        {/* Abas (Figma 1:1100) */}
        <PedidoTabs
          tabs={[
            {
              value: "estrutura",
              label: "Estrutura",
              content: (
                <>
                  <p className="flex items-center gap-2 border-b border-navy-100 bg-navy-50/60 px-5 py-3 text-caption text-navy-500">
                    <Icon icon={faLock} size={10} />
                    Estrutura herdada do
                    <Link href={`/orcamentos/${p.orcamento.id}`} className="font-medium text-navy-900 hover:underline">
                      Orçamento {formatNumero(p.orcamento.numero)}
                    </Link>
                    · somente leitura
                  </p>
                  <EstruturaPedido
                    comodos={p.comodos}
                    subtotal={p.subtotal}
                    descontoLabel={descontoLabel}
                    descontoTotal={p.descontoTotal}
                    total={p.total}
                  />
                </>
              ),
            },
            {
              value: "contrato",
              label: "Contrato",
              content: <ContratoTab p={p} />,
            },
            {
              value: "cheques",
              label: "Cheques",
              count: p.cheques.length,
              content: p.cheques.length ? (
                <DataTable className="rounded-none border-0">
                  <THead>
                    <TH>Número</TH>
                    <TH>Emitente</TH>
                    <TH>Banco</TH>
                    <TH>Emissão</TH>
                    <TH>Bom para</TH>
                    <TH>Status</TH>
                    <TH align="right">Valor</TH>
                  </THead>
                  <TBody>
                    {p.cheques.map((c) => (
                      <TR key={c.id}>
                        <TD strong className="num">
                          <Link href={`/financeiro/cheques/${c.id}`} className="hover:underline focus-visible:underline focus-visible:outline-none">
                            {c.numero}
                          </Link>
                        </TD>
                        <TD>{c.emitente}</TD>
                        <TD muted>{c.banco}</TD>
                        <TD className="num">{formatDate(c.dataEmissao)}</TD>
                        <TD className="num">{formatDate(c.bomPara)}</TD>
                        <TD>
                          <StatusBadge entity="cheque" status={c.status} />
                        </TD>
                        <TD align="right" strong>
                          {formatBRL(c.valor)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                  <TFoot>
                    <tr>
                      <td colSpan={6} className="py-2.5 pl-5">
                        Total · {pluralize(p.cheques.length, "cheque", "cheques")}
                      </td>
                      <td className="num py-2.5 pr-5 text-right">{formatBRL(chequesTotal)}</td>
                    </tr>
                  </TFoot>
                </DataTable>
              ) : (
                <EmptyState bordered={false} icon={faCreditCard} title="Nenhum cheque vinculado" description="Cheques recebidos para este pedido aparecem aqui." />
              ),
            },
            {
              value: "duplicatas",
              label: "Duplicatas",
              count: duplicatas.rows.length,
              content: duplicatas.rows.length ? (
                <>
                  <div className="num flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-navy-100 px-5 py-3 text-caption text-navy-500">
                    <span>
                      Pago <strong className="font-medium text-success-fg">{formatBRL(duplicatas.pago)}</strong>
                    </span>
                    <span>
                      Em cheque <strong className="font-medium text-navy-900">{formatBRL(duplicatas.emCheque)}</strong>
                    </span>
                    <span>
                      Em aberto <strong className="font-medium text-navy-900">{formatBRL(duplicatas.emAberto)}</strong>
                    </span>
                  </div>
                  <DataTable className="rounded-none border-0">
                    <THead>
                      <TH>Duplicata</TH>
                      <TH>Nota</TH>
                      <TH>Vencimento</TH>
                      <TH>Status</TH>
                      <TH>Pagamento</TH>
                      <TH align="right">Valor</TH>
                    </THead>
                    <TBody>
                      {duplicatas.rows.map((d) => (
                        <TR key={d.id}>
                          <TD strong className="num">
                            {d.numero}
                          </TD>
                          <TD>
                            <RecordChip kind="nota" href={`/financeiro/notas/${d.notaId}`}>
                              Nota {d.notaNumero}
                            </RecordChip>
                          </TD>
                          <TD className="num">{formatDate(d.vencimento)}</TD>
                          <TD>
                            <StatusBadge entity="duplicata" status={d.displayStatus} />
                          </TD>
                          <TD muted>
                            {d.chequeAtivo ? (
                              <RecordChip kind="cheque" href={`/financeiro/cheques/${d.chequeAtivo.id}`}>
                                Cheque Nº {d.chequeAtivo.numero}
                              </RecordChip>
                            ) : d.forma ? (
                              FORMA_PAGAMENTO[d.forma]
                            ) : (
                              "—"
                            )}
                          </TD>
                          <TD align="right" strong>
                            {formatBRL(d.valor)}
                            {d.valorOriginal != null && <span className="block text-overline font-normal text-navy-400">de {formatBRL(d.valorOriginal)}</span>}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </DataTable>
                </>
              ) : (
                <EmptyState bordered={false} icon={faNewspaper} title="Nenhuma duplicata vinculada" description="Vincule uma nota a este pedido para acompanhar as duplicatas aqui." />
              ),
            },
            {
              value: "recibos",
              label: "Recibos",
              count: recibos.length,
              content: recibos.length ? (
                <DataTable className="rounded-none border-0">
                  <THead>
                    <TH>Número</TH>
                    <TH>Data</TH>
                    <TH>Recebido de</TH>
                    <TH>Referente a</TH>
                    <TH>Forma</TH>
                    <TH>Status</TH>
                    <TH align="right">Valor</TH>
                  </THead>
                  <TBody>
                    {recibos.map((r) => (
                      <TR key={r.id}>
                        <TD strong className="num">
                          <a href={`/financeiro/recibos/${r.id}/pdf`} target="_blank" rel="noreferrer" className="hover:underline focus-visible:underline focus-visible:outline-none">
                            {formatNumero(r.numero)}
                          </a>
                        </TD>
                        <TD className="num">{formatDate(r.data)}</TD>
                        <TD>{r.pagadorNome}</TD>
                        <TD muted>{r.descricao}</TD>
                        <TD muted>{FORMA_PAGAMENTO[r.forma]}</TD>
                        <TD>
                          <StatusBadge entity="recibo" status={r.canceladoEm ? "cancelado" : "emitido"} />
                        </TD>
                        <TD align="right" strong>
                          {formatBRL(r.valor)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </DataTable>
              ) : (
                <EmptyState bordered={false} icon={faFileLines} title="Nenhum recibo vinculado" description="Recibos emitidos para este pedido aparecem aqui." />
              ),
            },
            {
              value: "contas",
              label: "Contas a receber",
              count: p.contas.length,
              content: p.contas.length ? (
                <DataTable className="rounded-none border-0">
                  <THead>
                    <TH>Descrição</TH>
                    <TH>Forma</TH>
                    <TH>Vencimento</TH>
                    <TH>Status</TH>
                    <TH>Pago em</TH>
                    <TH align="right">Valor</TH>
                  </THead>
                  <TBody>
                    {p.contas.map((c) => {
                      const breve = c.displayStatus === "em_aberto" ? venceEmBreve(c.vencimento, today) : null;
                      return (
                        <TR key={c.id}>
                          <TD>{c.descricao}</TD>
                          <TD muted className="capitalize">
                            {FORMA_LABEL[c.formaPagamento]}
                          </TD>
                          <TD className="num">{formatDate(c.vencimento)}</TD>
                          <TD>{breve != null ? <VenceEmBadge dias={breve} /> : <StatusBadge entity="conta" status={c.displayStatus} />}</TD>
                          <TD className="num" muted>
                            {c.pagoEm ? formatDate(c.pagoEm) : "—"}
                          </TD>
                          <TD align="right" strong>
                            {formatBRL(c.valor)}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                  <TFoot>
                    <tr>
                      <td colSpan={5} className="py-2.5 pl-5">
                        Total · {pluralize(p.contas.length, "lançamento", "lançamentos")}
                      </td>
                      <td className="num py-2.5 pr-5 text-right">{formatBRL(contasTotal)}</td>
                    </tr>
                  </TFoot>
                </DataTable>
              ) : (
                <EmptyState bordered={false} icon={faFileLines} title="Nenhuma conta a receber" description="Parcelas lançadas para este pedido aparecem aqui." />
              ),
            },
            {
              value: "materiais",
              label: "Materiais debitados",
              count: p.saidas.length,
              content: (
                <>
                  <div className="flex items-center justify-between gap-3 border-b border-navy-100 px-5 py-3">
                    <p className="num text-caption text-navy-500">
                      Custo total <strong className="font-medium text-navy-900">{formatBRL(p.resumo.custoMateriais)}</strong> · calculado pelo custo médio no momento da saída
                    </p>
                    <RegistrarSaidaPedidoButton pedidoId={p.id} />
                  </div>
                  {p.saidas.length ? (
                    <DataTable className="rounded-none border-0">
                      <THead>
                        <TH>Material</TH>
                        <TH>Data</TH>
                        <TH>Movimento</TH>
                        <TH align="right">Quantidade</TH>
                        <TH align="right">Custo unit.</TH>
                        <TH align="right">Total</TH>
                      </THead>
                      <TBody>
                        {p.saidas.map((s) => (
                          <TR key={s.id}>
                            <TD>
                              <p className="font-medium">{s.material}</p>
                              <p className="num text-overline text-navy-400">{s.codigo}{s.observacao ? ` · ${s.observacao}` : ""}</p>
                            </TD>
                            <TD className="num">{formatDate(s.data)}</TD>
                            <TD>
                              <EstoqueBadge kind="saida" />
                            </TD>
                            <TD align="right">{formatQuantity(s.quantidade, s.unidade as Unidade)}</TD>
                            <TD align="right" muted>
                              {formatBRL(s.custoUnitario)}
                            </TD>
                            <TD align="right" strong>
                              {formatBRL(s.valorTotal)}
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </DataTable>
                  ) : (
                    <EmptyState bordered={false} icon={faBoxesStacked} title="Nenhum material debitado" description="Registre as saídas de estoque usadas na produção deste pedido." />
                  )}
                </>
              ),
            },
          ]}
        />
      </PageBody>
    </EstoqueDrawersProvider>
  );
}

function ContratoTab({ p }: { p: PedidoDetail }) {
  const c = p.contrato;
  if (!c) return <EmptyState bordered={false} icon={faHandshake} title="Contrato não gerado" description="O contrato é gerado na aprovação do orçamento." />;
  const resumo = p.comodos.map((cm) => `${cm.nome}: ${cm.moveis.map((m) => m.nome).join(", ")}`);
  const prazo = p.previsaoEntrega ? diffInDays(p.dataPedido, p.previsaoEntrega) : null;
  return (
    <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-h3 text-navy-900">Contrato {formatNumero(c.numero)}</h3>
            <StatusBadge entity="contrato" status={c.status} />
          </div>
          <ContratoActions contratoId={c.id} assinado={c.status === "assinado"} />
        </div>
        <ol className="flex flex-col gap-3">
          {c.clausulas.map((cl, i) => (
            <li key={cl.titulo} className="rounded-field border border-navy-100 px-4 py-3">
              <p className="text-table font-semibold text-navy-900">
                Cláusula {i + 1}ª · {cl.titulo}
              </p>
              <p className="pt-0.5 text-table text-navy-600">{cl.texto}</p>
            </li>
          ))}
        </ol>
      </div>
      <aside className="flex flex-col gap-4 self-start rounded-card border border-navy-100 bg-navy-50/60 p-4 text-table">
        <div>
          <p className="eyebrow pb-1">Contratante</p>
          <p className="font-medium text-navy-900">{p.cliente.nome}</p>
          {p.cliente.documento && (
            <p className="num text-caption text-navy-500">
              {documentLabel(p.cliente.documento)} {formatDocument(p.cliente.documento)}
            </p>
          )}
          {p.cliente.telefone && <p className="num text-caption text-navy-500">{formatPhone(p.cliente.telefone)}</p>}
          {p.cliente.email && <p className="text-caption text-navy-500">{p.cliente.email}</p>}
        </div>
        <div>
          <p className="eyebrow pb-1">Resumo</p>
          <ul className="flex flex-col gap-0.5 text-caption text-navy-600">
            {resumo.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <dl className="num flex flex-col gap-1.5 border-t border-navy-100 pt-3 text-caption">
          <div className="flex justify-between gap-3">
            <dt className="text-navy-500">Valor total</dt>
            <dd className="font-medium text-navy-900">{formatBRL(p.total)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-navy-500">Pagamento</dt>
            <dd className="text-right text-navy-900">{[p.formaPagamento, p.condicaoDetalhada].filter(Boolean).join(" · ") || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-navy-500">Prazo de entrega</dt>
            <dd className="text-right text-navy-900">
              {p.prazoEntregaDias ? `${p.prazoEntregaDias} dias úteis` : "—"}
              {prazo != null && ` · ${formatDate(p.previsaoEntrega)}`}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-navy-500">Gerado em</dt>
            <dd className="text-navy-900">{formatDate(c.geradoEm)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-navy-500">Assinado em</dt>
            <dd className="text-navy-900">{c.assinadoEm ? formatDate(c.assinadoEm) : "—"}</dd>
          </div>
        </dl>
        <p className="text-overline text-navy-400">PDF e anexo do contrato assinado chegam na próxima fase.</p>
      </aside>
    </div>
  );
}
