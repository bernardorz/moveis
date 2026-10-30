import type { Metadata } from "next";
import { faFileLines } from "@fortawesome/free-regular-svg-icons";
import { StatusBadge } from "@/components/ds/badge";
import { DataTable, EmptyRow, Pagination, TBody, TD, TFoot, TH, THead, TR } from "@/components/ds/data-table";
import { ActiveFilters, ClearFiltersLink, FilterBar, SearchField } from "@/components/ds/filter-bar";
import { RecordChip } from "@/components/ds/record-chip";
import { EmptyState } from "@/components/ds/states";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody, PageTitle } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FinanceiroDrawersProvider } from "@/features/financeiro/components/financeiro-drawers";
import { NovoReciboButton, ReciboRowActions } from "@/features/financeiro/components/recibos-client";
import { getChequeFormOptions } from "@/features/financeiro/queries";
import { getReciboDoLote, listRecibos, RECIBOS_PAGE_SIZE } from "@/features/financeiro/recibos-queries";
import { formatBRL, formatDate, formatNumero, pluralize } from "@/lib/format";
import { FORMA_PAGAMENTO, RECIBO_TIPO, type ReciboTipo } from "@/lib/status";
import { hrefWith, param } from "@/lib/url";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Recibos" };

const PATH = "/financeiro/recibos";
const isoOrUndefined = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const uuidOrUndefined = (v?: string) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);

export default async function RecibosPage({ searchParams }: PageProps<"/financeiro/recibos">) {
  const sp = await searchParams;
  const q = param(sp, "q")?.trim() || undefined;
  const tipoParam = param(sp, "tipo");
  const tipo = tipoParam && tipoParam in RECIBO_TIPO ? (tipoParam as ReciboTipo) : undefined;
  const de = isoOrUndefined(param(sp, "de"));
  const ate = isoOrUndefined(param(sp, "ate"));
  const pedido = uuidOrUndefined(param(sp, "pedido"));
  const lote = uuidOrUndefined(param(sp, "lote"));
  const page = Number(param(sp, "page")) || 1;

  const [{ rows, total, valorTotal }, options, prefill] = await Promise.all([
    listRecibos({ q, tipo, de, ate, pedido, page }),
    getChequeFormOptions(),
    lote ? getReciboDoLote(lote) : null,
  ]);
  const hasFilters = Boolean(q || tipo || de || ate || pedido);
  const pedidoNumero = options.pedidos.find((p) => p.id === pedido)?.numero;

  return (
    <FinanceiroDrawersProvider
      options={options}
      initial={prefill ? { type: "recibo", recibo: { ...prefill, observacoes: null } } : null}
      urlAoFechar={lote ? hrefWith(PATH, sp, { lote: null }) : undefined}
    >
      <AppHeader title="Recibos" breadcrumb={[{ label: "Financeiro", href: "/financeiro" }, { label: "Recibos" }]} />
      <PageBody>
        <PageTitle title="Recibos" description="Recibos de pedidos e de serviços avulsos, como corte e montagem." actions={<NovoReciboButton />} />
        <FilterBar
          active={
            <ActiveFilters
              filters={[
                ...(tipo ? [{ label: `Tipo: ${RECIBO_TIPO[tipo]}`, removeHref: hrefWith(PATH, sp, { tipo: null, page: null }) }] : []),
                ...(q ? [{ label: `Busca: ${q}`, removeHref: hrefWith(PATH, sp, { q: null, page: null }) }] : []),
                ...(de ? [{ label: `Desde ${formatDate(de)}`, removeHref: hrefWith(PATH, sp, { de: null, page: null }) }] : []),
                ...(ate ? [{ label: `Até ${formatDate(ate)}`, removeHref: hrefWith(PATH, sp, { ate: null, page: null }) }] : []),
                ...(pedidoNumero ? [{ label: `Pedido ${formatNumero(pedidoNumero)}`, removeHref: hrefWith(PATH, sp, { pedido: null, page: null }) }] : []),
              ]}
            />
          }
        >
          <form className="contents" action={PATH}>
            <SearchField defaultValue={q} placeholder="Nome ou descrição..." />
            <NativeSelect name="tipo" defaultValue={tipo ?? ""} aria-label="Tipo" containerClassName="w-40">
              <option value="">Tipo: todos</option>
              {(Object.keys(RECIBO_TIPO) as ReciboTipo[]).map((t) => (
                <option key={t} value={t}>
                  {RECIBO_TIPO[t]}
                </option>
              ))}
            </NativeSelect>
            <Input type="date" name="de" defaultValue={de} aria-label="Data a partir de" title="Data a partir de" leading="De" containerClassName="w-48" className="num pl-[38px]" />
            <Input type="date" name="ate" defaultValue={ate} aria-label="Data até" title="Data até" leading="Até" containerClassName="w-48" className="num pl-[42px]" />
            <NativeSelect name="pedido" defaultValue={pedido ?? ""} aria-label="Pedido" containerClassName="w-44">
              <option value="">Pedido: todos</option>
              {options.pedidos.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatNumero(p.numero)} · {p.cliente}
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
            <EmptyState bordered={false} icon={faFileLines} title="Nenhum recibo emitido" description="Emita um recibo de pedido ou de um serviço avulso, como corte de chapa." action={<NovoReciboButton size="compact" />} />
          </div>
        ) : (
          <DataTable
            minWidth={1040}
            footer={<Pagination page={page} pageSize={RECIBOS_PAGE_SIZE} total={total} hrefFor={(p) => hrefWith(PATH, sp, { page: p > 1 ? p : null })} />}
          >
            <THead>
              <TH width={90}>Número</TH>
              <TH width={110}>Data</TH>
              <TH width={100}>Tipo</TH>
              <TH>Recebido de</TH>
              <TH>Referente a</TH>
              <TH width={140}>Vínculo</TH>
              <TH width={110}>Status</TH>
              <TH align="right" width={130}>
                Valor
              </TH>
              <TH width={60}>
                <span className="sr-only">Ações</span>
              </TH>
            </THead>
            <TBody>
              {rows.length === 0 && <EmptyRow columns={9}>Nenhum recibo encontrado com esses filtros.</EmptyRow>}
              {rows.map((r) => {
                const cancelado = Boolean(r.canceladoEm);
                return (
                  <TR key={r.id}>
                    <TD strong className="num">
                      <a href={`${PATH}/${r.id}/pdf`} target="_blank" rel="noreferrer" className="hover:underline focus-visible:underline focus-visible:outline-none">
                        {formatNumero(r.numero)}
                      </a>
                    </TD>
                    <TD className="num" muted>
                      {formatDate(r.data)}
                    </TD>
                    <TD muted>{RECIBO_TIPO[r.tipo]}</TD>
                    <TD>{r.pagadorNome}</TD>
                    <TD muted className="max-w-[280px]">
                      <span className="line-clamp-2">{r.descricao}</span>
                    </TD>
                    <TD>
                      {r.pedidoId && r.pedidoNumero != null ? (
                        <RecordChip kind="pedido" href={`/pedidos/${r.pedidoId}`}>
                          Pedido {formatNumero(r.pedidoNumero)}
                        </RecordChip>
                      ) : (
                        <span className="text-navy-300">Avulso</span>
                      )}
                    </TD>
                    <TD>
                      <StatusBadge entity="recibo" status={cancelado ? "cancelado" : "emitido"} />
                    </TD>
                    <TD align="right" strong>
                      <span className={cn(cancelado && "text-navy-400 line-through")}>{formatBRL(r.valor)}</span>
                      <span className="block text-overline font-normal text-navy-400">{FORMA_PAGAMENTO[r.forma]}</span>
                    </TD>
                    <TD align="right">
                      <ReciboRowActions recibo={r} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
            {rows.length > 0 && (
              <TFoot>
                <tr>
                  <td colSpan={7} className="py-2.5 pl-5 text-table">
                    Total · {pluralize(total, "recibo", "recibos")} · cancelados fora da soma
                  </td>
                  <td className="num px-3 py-2.5 text-right">{formatBRL(valorTotal)}</td>
                  <td />
                </tr>
              </TFoot>
            )}
          </DataTable>
        )}
      </PageBody>
    </FinanceiroDrawersProvider>
  );
}
