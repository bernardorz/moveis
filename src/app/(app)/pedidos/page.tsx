import Link from "next/link";
import type { Metadata } from "next";
import { faClipboard } from "@fortawesome/free-regular-svg-icons";
import { StatusBadge } from "@/components/ds/badge";
import { DataTable, Pagination, TBody, TD, TH, THead, TR } from "@/components/ds/data-table";
import { ActiveFilters, ClearFiltersLink, FilterBar, SearchField } from "@/components/ds/filter-bar";
import { RecordChip } from "@/components/ds/record-chip";
import { EmptyState } from "@/components/ds/states";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody, PageTitle } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { listPedidos, PEDIDOS_PAGE_SIZE } from "@/features/pedidos/queries";
import { formatBRL, formatDate, formatNumero, formatPercent } from "@/lib/format";
import { PEDIDO_STATUS, type PedidoStatus } from "@/lib/status";
import { hrefWith, param } from "@/lib/url";

export const metadata: Metadata = { title: "Pedidos" };

const PATH = "/pedidos";

export default async function PedidosPage({ searchParams }: PageProps<"/pedidos">) {
  const sp = await searchParams;
  const q = param(sp, "q")?.trim() || undefined;
  const statusParam = param(sp, "status");
  const status = statusParam && statusParam in PEDIDO_STATUS ? (statusParam as PedidoStatus) : undefined;
  const page = Number(param(sp, "page")) || 1;
  const { rows, total } = await listPedidos({ q, status, page });
  const hasFilters = Boolean(q || status);

  return (
    <>
      <AppHeader title="Pedidos" />
      <PageBody>
        <PageTitle title="Pedidos" description="Todo pedido nasce de um orçamento aprovado." />
        <FilterBar
          active={
            <ActiveFilters
              filters={[
                ...(status ? [{ label: `Status: ${PEDIDO_STATUS[status].label}`, removeHref: hrefWith(PATH, sp, { status: null, page: null }) }] : []),
                ...(q ? [{ label: `Busca: ${q}`, removeHref: hrefWith(PATH, sp, { q: null, page: null }) }] : []),
              ]}
            />
          }
        >
          <form className="contents" action={PATH}>
            <SearchField defaultValue={q} placeholder="Buscar número ou cliente..." />
            <NativeSelect name="status" defaultValue={status ?? ""} aria-label="Status" containerClassName="w-52">
              <option value="">Status: todos</option>
              {Object.entries(PEDIDO_STATUS).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </NativeSelect>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            {hasFilters && <ClearFiltersLink href={PATH} />}
          </form>
        </FilterBar>

        {rows.length === 0 && !hasFilters ? (
          <div className="rounded-section border border-navy-100 bg-white p-8">
            <EmptyState
              bordered={false}
              icon={faClipboard}
              title="Nenhum pedido ainda"
              description="Aprove um orçamento para gerar o primeiro pedido."
              action={
                <Button asChild size="compact">
                  <Link href="/orcamentos">Ver orçamentos</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <DataTable footer={<Pagination page={page} pageSize={PEDIDOS_PAGE_SIZE} total={total} hrefFor={(p) => hrefWith(PATH, sp, { page: p > 1 ? p : null })} />}>
            <THead>
              <TH width={100}>Número</TH>
              <TH>Cliente</TH>
              <TH width={120}>Data</TH>
              <TH width={130}>Previsão</TH>
              <TH width={190}>Status</TH>
              <TH width={160}>Orçamento</TH>
              <TH align="right" width={110}>
                Recebido
              </TH>
              <TH align="right" width={150}>
                Total
              </TH>
            </THead>
            <TBody>
              {rows.length === 0 && (
                <tr className="bg-white!">
                  <td colSpan={8} className="px-5 py-10 text-center text-table text-navy-400">
                    Nenhum pedido encontrado com esses filtros.
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <TR key={p.id}>
                  <TD strong className="num">
                    <Link href={`/pedidos/${p.id}`} className="hover:underline focus-visible:underline focus-visible:outline-none">
                      {formatNumero(p.numero)}
                    </Link>
                  </TD>
                  <TD>
                    <Link href={`/pedidos/${p.id}`} className="block">
                      {p.cliente}
                    </Link>
                    {p.vendedor && <span className="text-overline text-navy-400">{p.vendedor}</span>}
                  </TD>
                  <TD className="num">{formatDate(p.dataPedido)}</TD>
                  <TD className="num" muted>
                    {formatDate(p.previsaoEntrega)}
                  </TD>
                  <TD>
                    <StatusBadge entity="pedido" status={p.status} />
                  </TD>
                  <TD>
                    <RecordChip kind="orcamento" href={`/orcamentos/${p.orcamentoId}`}>
                      Orçamento {formatNumero(p.orcamentoNumero)}
                    </RecordChip>
                  </TD>
                  <TD align="right" muted>
                    {p.total > 0 ? formatPercent((p.recebido / p.total) * 100, 0) : "—"}
                  </TD>
                  <TD align="right" strong>
                    {formatBRL(p.total)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </DataTable>
        )}
      </PageBody>
    </>
  );
}
