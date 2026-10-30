import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { faBoxesStacked, faPenToSquare, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Badge, DeltaText, EstoqueBadge } from "@/components/ds/badge";
import { DataTable, EmptyRow, Pagination, TBody, TD, TH, THead, TR } from "@/components/ds/data-table";
import { KpiCard } from "@/components/ds/kpi-card";
import { RecordChip } from "@/components/ds/record-chip";
import { Segmented } from "@/components/ds/segmented";
import { Icon } from "@/components/icon";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/layout/page";
import { EstoqueDrawersProvider } from "@/features/estoque/components/estoque-drawers";
import { MaterialHistoricoActions } from "@/features/estoque/components/materiais-client";
import { getEstoqueFormOptions, getMaterialHistorico, HISTORICO_PAGE_SIZE, type HistoricoEvento, type HistoricoFiltro } from "@/features/estoque/queries";
import { formatBRL, formatDate, formatDimensions, formatNumero, formatTime } from "@/lib/format";
import { formatQuantity, formatQuantityDelta, UNIDADES, type Unidade } from "@/lib/units";
import { hrefWith, param } from "@/lib/url";

const FILTROS: HistoricoFiltro[] = ["entrada", "saida", "alteracao"];

export async function generateMetadata({ params }: PageProps<"/estoque/materiais/[id]">): Promise<Metadata> {
  const { id } = await params;
  const h = /^[0-9a-f-]{36}$/i.test(id) ? await getMaterialHistorico(id, {}) : null;
  return { title: h ? `Histórico · ${h.material.nome}` : "Histórico do material" };
}

function Detalhes({ evento }: { evento: HistoricoEvento }) {
  if (evento.tipo === "cadastro") return <span className="text-navy-500">Material cadastrado</span>;
  if (evento.tipo === "edicao") {
    return (
      <ul className="flex flex-col gap-0.5">
        {evento.campos.map((c) => (
          <li key={c.campo} className="text-caption text-navy-600">
            <span className="font-medium text-navy-900">{c.campo}:</span> {c.de || "—"} → {c.para || "—"}
          </li>
        ))}
      </ul>
    );
  }
  const textos = [evento.fornecedor, evento.numeroNota && `NF ${evento.numeroNota}`, evento.cliente, evento.observacao].filter(Boolean);
  return (
    <div className="flex flex-col gap-1">
      {evento.pedidoId && evento.pedidoNumero != null && (
        <RecordChip kind="pedido" href={`/pedidos/${evento.pedidoId}`} className="self-start">
          Pedido {formatNumero(evento.pedidoNumero)}
        </RecordChip>
      )}
      {textos.length > 0 && <span className="text-caption text-navy-600">{textos.join(" · ")}</span>}
      {!evento.pedidoId && textos.length === 0 && <span className="text-navy-300">—</span>}
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: HistoricoEvento["tipo"] }) {
  if (tipo === "entrada" || tipo === "saida") return <EstoqueBadge kind={tipo} />;
  return <Badge tone="neutral" icon={tipo === "cadastro" ? faPlus : faPenToSquare}>{tipo === "cadastro" ? "Cadastro" : "Edição"}</Badge>;
}

export default async function MaterialHistoricoPage({ params, searchParams }: PageProps<"/estoque/materiais/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sp = await searchParams;
  const tipoParam = param(sp, "tipo") as HistoricoFiltro | undefined;
  const tipo = tipoParam && FILTROS.includes(tipoParam) ? tipoParam : undefined;
  const page = Number(param(sp, "page")) || 1;
  const PATH = `/estoque/materiais/${id}`;

  const [historico, options] = await Promise.all([getMaterialHistorico(id, { tipo, page }), getEstoqueFormOptions()]);
  if (!historico) notFound();
  const { material, eventos, total } = historico;
  const unidade = material.unidade as Unidade;
  const abaixo = material.saldoAtual < material.estoqueMinimo;
  const medida = material.chapaLargura ? `${formatDimensions(material.chapaLargura, material.chapaAltura, material.chapaEspessura)} mm` : null;

  return (
    <EstoqueDrawersProvider options={options}>
      <AppHeader
        title="Histórico do material"
        breadcrumb={[
          { label: "Estoque", href: "/estoque/materiais" },
          { label: "Materiais", href: "/estoque/materiais" },
          { label: material.codigo },
        ]}
      />
      <PageBody>
        <section className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-navy-100 bg-white p-5">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-card bg-navy-900 text-white">
              <Icon icon={faBoxesStacked} size={18} />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-h2 text-navy-900">{material.nome}</h2>
                {abaixo && <EstoqueBadge kind="abaixo" />}
              </div>
              <p className="num text-table text-navy-500">
                {[material.codigo, material.categoria, UNIDADES[unidade].label, medida, material.corAcabamento, material.complemento].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <MaterialHistoricoActions material={material} />
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard size="sm" tone={abaixo ? "alert" : "default"} label="Saldo atual" value={formatQuantity(material.saldoAtual, unidade)} context={UNIDADES[unidade].plural} />
          <KpiCard size="sm" label="Estoque mínimo" value={formatQuantity(material.estoqueMinimo, unidade)} context={UNIDADES[unidade].plural} />
          <KpiCard size="sm" label="Custo médio" value={formatBRL(material.custoMedio)} context={`Em estoque: ${formatBRL(material.saldoAtual * material.custoMedio)}`} />
        </div>

        <section className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-h3 text-navy-900">Histórico</h3>
            <Segmented
              ariaLabel="Filtrar histórico"
              size="sm"
              value={tipo ?? "todos"}
              options={[
                { value: "todos", label: "Tudo", href: hrefWith(PATH, sp, { tipo: null, page: null }) },
                { value: "entrada", label: "Entradas", href: hrefWith(PATH, sp, { tipo: "entrada", page: null }) },
                { value: "saida", label: "Saídas", href: hrefWith(PATH, sp, { tipo: "saida", page: null }) },
                { value: "alteracao", label: "Alterações", href: hrefWith(PATH, sp, { tipo: "alteracao", page: null }) },
              ]}
            />
          </div>
          <DataTable
            minWidth={1000}
            footer={<Pagination page={historico.page} pageSize={HISTORICO_PAGE_SIZE} total={total} hrefFor={(p) => hrefWith(PATH, sp, { page: p > 1 ? p : null })} />}
          >
            <THead>
              <TH width={200}>Data</TH>
              <TH width={110}>Tipo</TH>
              <TH width={130}>Quantidade</TH>
              <TH width={110} align="right">
                Saldo após
              </TH>
              <TH width={140} align="right">
                Custo
              </TH>
              <TH width={150}>Quem</TH>
              <TH>Detalhes</TH>
            </THead>
            <TBody>
              {eventos.length === 0 && <EmptyRow columns={7}>Nenhum registro {tipo ? "desse tipo" : "para este material"}.</EmptyRow>}
              {eventos.map((e) => (
                <TR key={e.id}>
                  <TD className="num">
                    {e.data ? formatDate(e.data) : formatDate(e.registradoEm)}
                    <span className="block text-overline text-navy-400">
                      Lançado em {formatDate(e.registradoEm)} às {formatTime(e.registradoEm)}
                    </span>
                  </TD>
                  <TD>
                    <TipoBadge tipo={e.tipo} />
                  </TD>
                  <TD>
                    {e.quantidade != null ? (
                      <DeltaText value={e.tipo === "entrada" ? 1 : -1}>{formatQuantityDelta(e.tipo === "entrada" ? e.quantidade : -e.quantidade, unidade)}</DeltaText>
                    ) : (
                      <span className="text-navy-300">—</span>
                    )}
                  </TD>
                  <TD align="right">{e.saldoApos != null ? formatQuantity(e.saldoApos, unidade) : <span className="text-navy-300">—</span>}</TD>
                  <TD align="right">
                    {e.custoUnitario != null ? (
                      <>
                        {formatBRL(e.valorTotal)}
                        <span className="block text-overline text-navy-400">{formatBRL(e.custoUnitario)} / un.</span>
                      </>
                    ) : (
                      <span className="text-navy-300">—</span>
                    )}
                  </TD>
                  <TD strong>{e.usuario ?? <span className="font-normal text-navy-300">—</span>}</TD>
                  <TD>
                    <Detalhes evento={e} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </DataTable>
          <Link href="/estoque/materiais" className="self-start text-caption font-medium text-navy-500 hover:text-navy-900 focus-visible:underline focus-visible:outline-none">
            Voltar para materiais
          </Link>
        </section>
      </PageBody>
    </EstoqueDrawersProvider>
  );
}
