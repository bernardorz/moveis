import Link from "next/link";
import type { Metadata } from "next";
import { faNewspaper } from "@fortawesome/free-regular-svg-icons";
import { StatusBadge } from "@/components/ds/badge";
import { DataTable, EmptyRow, Pagination, TBody, TD, TH, THead, TR } from "@/components/ds/data-table";
import { ActiveFilters, ClearFiltersLink, FilterBar, SearchField } from "@/components/ds/filter-bar";
import { NoLinkChip, RecordChip } from "@/components/ds/record-chip";
import { EmptyState } from "@/components/ds/states";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody, PageTitle } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FinanceiroDrawersProvider } from "@/features/financeiro/components/financeiro-drawers";
import { NovaNotaButton } from "@/features/financeiro/components/nota-client";
import { getChequeFormOptions, listNotas, NOTAS_PAGE_SIZE } from "@/features/financeiro/queries";
import { formatBRL, formatDate, formatNumero } from "@/lib/format";
import { NOTA_STATUS, type NotaStatus } from "@/lib/status";
import { hrefWith, param } from "@/lib/url";

export const metadata: Metadata = { title: "Notas e duplicatas" };

const PATH = "/financeiro/notas";
const isoOrUndefined = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export default async function NotasPage({ searchParams }: PageProps<"/financeiro/notas">) {
  const sp = await searchParams;
  const q = param(sp, "q")?.trim() || undefined;
  const statusParam = param(sp, "status");
  const status = statusParam && statusParam in NOTA_STATUS ? (statusParam as NotaStatus) : undefined;
  const de = isoOrUndefined(param(sp, "de"));
  const ate = isoOrUndefined(param(sp, "ate"));
  const page = Number(param(sp, "page")) || 1;
  const [{ rows, total }, options] = await Promise.all([listNotas({ q, status, de, ate, page }), getChequeFormOptions()]);
  const hasFilters = Boolean(q || status || de || ate);

  return (
    <FinanceiroDrawersProvider options={options}>
      <AppHeader title="Notas e duplicatas" breadcrumb={[{ label: "Financeiro", href: "/financeiro" }, { label: "Notas e duplicatas" }]} />
      <PageBody>
        <PageTitle title="Notas e duplicatas" description="Cadastre as notas e lance cheques para as duplicatas de cada uma." actions={<NovaNotaButton />} />
        <FilterBar
          active={
            <ActiveFilters
              filters={[
                ...(status ? [{ label: `Status: ${NOTA_STATUS[status].label}`, removeHref: hrefWith(PATH, sp, { status: null, page: null }) }] : []),
                ...(q ? [{ label: `Busca: ${q}`, removeHref: hrefWith(PATH, sp, { q: null, page: null }) }] : []),
                ...(de ? [{ label: `Emissão desde ${formatDate(de)}`, removeHref: hrefWith(PATH, sp, { de: null, page: null }) }] : []),
                ...(ate ? [{ label: `Emissão até ${formatDate(ate)}`, removeHref: hrefWith(PATH, sp, { ate: null, page: null }) }] : []),
              ]}
            />
          }
        >
          <form className="contents" action={PATH}>
            <SearchField defaultValue={q} placeholder="Buscar número ou emitente..." />
            <NativeSelect name="status" defaultValue={status ?? ""} aria-label="Status" containerClassName="w-52">
              <option value="">Status: todos</option>
              {Object.entries(NOTA_STATUS).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </NativeSelect>
            <Input type="date" name="de" defaultValue={de} aria-label="Emissão a partir de" title="Emissão a partir de" leading="De" containerClassName="w-48" className="num pl-[38px]" />
            <Input type="date" name="ate" defaultValue={ate} aria-label="Emissão até" title="Emissão até" leading="Até" containerClassName="w-48" className="num pl-[42px]" />
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            {hasFilters && <ClearFiltersLink href={PATH} />}
          </form>
        </FilterBar>

        {rows.length === 0 && !hasFilters ? (
          <div className="rounded-section border border-navy-100 bg-white p-8">
            <EmptyState bordered={false} icon={faNewspaper} title="Nenhuma nota cadastrada" description="Cadastre a primeira nota com suas duplicatas." action={<NovaNotaButton size="compact" />} />
          </div>
        ) : (
          <DataTable
            minWidth={1000}
            footer={<Pagination page={page} pageSize={NOTAS_PAGE_SIZE} total={total} hrefFor={(p) => hrefWith(PATH, sp, { page: p > 1 ? p : null })} />}
          >
            <THead>
              <TH width={130}>Nota</TH>
              <TH>Emitente / destinatário</TH>
              <TH width={120}>Emissão</TH>
              <TH width={150}>Duplicatas</TH>
              <TH>Vínculos</TH>
              <TH width={190}>Status</TH>
              <TH align="right" width={150}>
                Valor total
              </TH>
            </THead>
            <TBody>
              {rows.length === 0 && <EmptyRow columns={7}>Nenhuma nota encontrada com esses filtros.</EmptyRow>}
              {rows.map((n) => (
                <TR key={n.id}>
                  <TD strong className="num">
                    <Link href={`${PATH}/${n.id}`} className="hover:underline focus-visible:underline focus-visible:outline-none">
                      {n.numero}
                    </Link>
                  </TD>
                  <TD>
                    <Link href={`${PATH}/${n.id}`} className="block">
                      {n.emitenteDestinatario}
                    </Link>
                  </TD>
                  <TD className="num" muted>
                    {formatDate(n.dataEmissao)}
                  </TD>
                  <TD className="num">
                    {n.pagas} de {n.total} pagas
                    {n.emCheque > 0 && <span className="block text-overline text-navy-400">{n.emCheque} em cheque</span>}
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {n.pedidoId && n.pedidoNumero != null && (
                        <RecordChip kind="pedido" href={`/pedidos/${n.pedidoId}`}>
                          Pedido {formatNumero(n.pedidoNumero)}
                        </RecordChip>
                      )}
                      {n.cliente && <RecordChip kind="cliente">{n.cliente}</RecordChip>}
                      {!n.pedidoId && !n.cliente && <NoLinkChip />}
                    </div>
                  </TD>
                  <TD>
                    <StatusBadge entity="nota" status={n.status} />
                  </TD>
                  <TD align="right" strong>
                    {formatBRL(n.valorTotal)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </DataTable>
        )}
      </PageBody>
    </FinanceiroDrawersProvider>
  );
}
