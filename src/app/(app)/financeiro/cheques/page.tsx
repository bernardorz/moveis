import Link from "next/link";
import type { Metadata } from "next";
import { faCreditCard } from "@fortawesome/free-regular-svg-icons";
import { StatusBadge } from "@/components/ds/badge";
import { DataTable, EmptyRow, Pagination, TBody, TD, TFoot, TH, THead, TR } from "@/components/ds/data-table";
import { ActiveFilters, ClearFiltersLink, FilterBar, SearchField } from "@/components/ds/filter-bar";
import { NoLinkChip, RecordChip } from "@/components/ds/record-chip";
import { Segmented } from "@/components/ds/segmented";
import { EmptyState } from "@/components/ds/states";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody, PageTitle } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { NovoChequeButton } from "@/features/financeiro/components/cheque-client";
import { FinanceiroDrawersProvider } from "@/features/financeiro/components/financeiro-drawers";
import { CHEQUES_PAGE_SIZE, getChequeFormOptions, listCheques } from "@/features/financeiro/queries";
import { formatBRL, formatDate, formatNumero, pluralize } from "@/lib/format";
import { CHEQUE_STATUS, CHEQUE_TIPO, type ChequeStatus, type ChequeTipo } from "@/lib/status";
import { hrefWith, param } from "@/lib/url";

export const metadata: Metadata = { title: "Cheques" };

const PATH = "/financeiro/cheques";
const isoOrUndefined = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const uuidOrUndefined = (v?: string) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);

export default async function ChequesPage({ searchParams }: PageProps<"/financeiro/cheques">) {
  const sp = await searchParams;
  const q = param(sp, "q")?.trim() || undefined;
  const tipoParam = param(sp, "tipo");
  const tipo = tipoParam && tipoParam in CHEQUE_TIPO ? (tipoParam as ChequeTipo) : undefined;
  const statusParam = param(sp, "status");
  const status = statusParam && statusParam in CHEQUE_STATUS ? (statusParam as ChequeStatus) : undefined;
  const de = isoOrUndefined(param(sp, "de"));
  const ate = isoOrUndefined(param(sp, "ate"));
  const cliente = uuidOrUndefined(param(sp, "cliente"));
  const pedido = uuidOrUndefined(param(sp, "pedido"));
  const page = Number(param(sp, "page")) || 1;

  const [{ rows, total, valorTotal }, options] = await Promise.all([
    listCheques({ q, tipo, status, de, ate, cliente, pedido, page }),
    getChequeFormOptions(),
  ]);
  const hasFilters = Boolean(q || tipo || status || de || ate || cliente || pedido);
  const clienteNome = options.clientes.find((c) => c.id === cliente)?.nome;
  const pedidoNumero = options.pedidos.find((p) => p.id === pedido)?.numero;

  return (
    <FinanceiroDrawersProvider options={options}>
      <AppHeader title="Cheques" breadcrumb={[{ label: "Financeiro", href: "/financeiro" }, { label: "Cheques" }]} />
      <PageBody>
        <PageTitle title="Cheques" description="Cheques recebidos de clientes e emitidos pela empresa." actions={<NovoChequeButton />} />
        <Segmented
          ariaLabel="Tipo do cheque"
          className="self-start"
          value={tipo ?? "todos"}
          options={[
            { value: "todos", label: "Todos", href: hrefWith(PATH, sp, { tipo: null, page: null }) },
            { value: "recebido", label: "Recebidos", href: hrefWith(PATH, sp, { tipo: "recebido", page: null }) },
            { value: "emitido", label: "Emitidos", href: hrefWith(PATH, sp, { tipo: "emitido", page: null }) },
          ]}
        />
        <FilterBar
          active={
            <ActiveFilters
              filters={[
                ...(status ? [{ label: `Status: ${CHEQUE_STATUS[status].label}`, removeHref: hrefWith(PATH, sp, { status: null, page: null }) }] : []),
                ...(q ? [{ label: `Busca: ${q}`, removeHref: hrefWith(PATH, sp, { q: null, page: null }) }] : []),
                ...(de ? [{ label: `Bom para desde ${formatDate(de)}`, removeHref: hrefWith(PATH, sp, { de: null, page: null }) }] : []),
                ...(ate ? [{ label: `Bom para até ${formatDate(ate)}`, removeHref: hrefWith(PATH, sp, { ate: null, page: null }) }] : []),
                ...(clienteNome ? [{ label: `Cliente: ${clienteNome}`, removeHref: hrefWith(PATH, sp, { cliente: null, page: null }) }] : []),
                ...(pedidoNumero ? [{ label: `Pedido ${formatNumero(pedidoNumero)}`, removeHref: hrefWith(PATH, sp, { pedido: null, page: null }) }] : []),
              ]}
            />
          }
        >
          <form className="contents" action={PATH}>
            {tipo && <input type="hidden" name="tipo" value={tipo} />}
            <SearchField defaultValue={q} placeholder="Número, banco, emitente..." />
            <NativeSelect name="status" defaultValue={status ?? ""} aria-label="Status" containerClassName="w-44">
              <option value="">Status: todos</option>
              {Object.entries(CHEQUE_STATUS).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </NativeSelect>
            <Input type="date" name="de" defaultValue={de} aria-label="Bom para a partir de" title="Bom para a partir de" leading="De" containerClassName="w-48" className="num pl-[38px]" />
            <Input type="date" name="ate" defaultValue={ate} aria-label="Bom para até" title="Bom para até" leading="Até" containerClassName="w-48" className="num pl-[42px]" />
            <NativeSelect name="cliente" defaultValue={cliente ?? ""} aria-label="Cliente" containerClassName="w-48">
              <option value="">Cliente: todos</option>
              {options.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect name="pedido" defaultValue={pedido ?? ""} aria-label="Pedido" containerClassName="w-40">
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
            <EmptyState bordered={false} icon={faCreditCard} title="Nenhum cheque lançado" description="Lance um cheque aqui ou pela nota, escolhendo as duplicatas que ele quita." action={<NovoChequeButton size="compact" />} />
          </div>
        ) : (
          <DataTable
            minWidth={1080}
            footer={<Pagination page={page} pageSize={CHEQUES_PAGE_SIZE} total={total} hrefFor={(p) => hrefWith(PATH, sp, { page: p > 1 ? p : null })} />}
          >
            <THead>
              <TH width={110}>Número</TH>
              <TH width={130}>Banco</TH>
              <TH>Emitente / favorecido</TH>
              <TH width={110}>Emissão</TH>
              <TH width={110}>Bom para</TH>
              <TH width={100}>Duplicatas</TH>
              <TH>Vínculos</TH>
              <TH width={130}>Status</TH>
              <TH align="right" width={130}>
                Valor
              </TH>
            </THead>
            <TBody>
              {rows.length === 0 && <EmptyRow columns={9}>Nenhum cheque encontrado com esses filtros.</EmptyRow>}
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD strong className="num">
                    <Link href={`${PATH}/${c.id}`} className="hover:underline focus-visible:underline focus-visible:outline-none">
                      {c.numero}
                    </Link>
                    <span className="block text-overline font-normal text-navy-400">{CHEQUE_TIPO[c.tipo]}</span>
                  </TD>
                  <TD muted>{c.banco}</TD>
                  <TD>
                    <Link href={`${PATH}/${c.id}`} className="block">
                      {c.emitente}
                    </Link>
                    {c.favorecido && <span className="text-overline text-navy-400">Para {c.favorecido}</span>}
                  </TD>
                  <TD className="num" muted>
                    {formatDate(c.dataEmissao)}
                  </TD>
                  <TD className="num">{formatDate(c.bomPara)}</TD>
                  <TD className="num" muted>
                    {c.duplicatas || "—"}
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {c.pedidoId && c.pedidoNumero != null && (
                        <RecordChip kind="pedido" href={`/pedidos/${c.pedidoId}`}>
                          Pedido {formatNumero(c.pedidoNumero)}
                        </RecordChip>
                      )}
                      {c.clienteId && c.cliente && (
                        <RecordChip kind="cliente" href={`${PATH}?cliente=${c.clienteId}`}>
                          {c.cliente}
                        </RecordChip>
                      )}
                      {!c.pedidoId && !c.clienteId && <NoLinkChip />}
                    </div>
                  </TD>
                  <TD>
                    <StatusBadge entity="cheque" status={c.status} />
                  </TD>
                  <TD align="right" strong>
                    {formatBRL(c.valor)}
                  </TD>
                </TR>
              ))}
            </TBody>
            {rows.length > 0 && (
              <TFoot>
                <tr>
                  <td colSpan={8} className="py-2.5 pl-5 text-table">
                    Total · {pluralize(total, "cheque", "cheques")}
                  </td>
                  <td className="num py-2.5 pr-5 text-right">{formatBRL(valorTotal)}</td>
                </tr>
              </TFoot>
            )}
          </DataTable>
        )}
      </PageBody>
    </FinanceiroDrawersProvider>
  );
}
