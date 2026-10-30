import Link from "next/link";
import type { Metadata } from "next";
import { faFileLines } from "@fortawesome/free-regular-svg-icons";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { StatusBadge } from "@/components/ds/badge";
import { DataTable, Pagination, TBody, TD, TH, THead, TR } from "@/components/ds/data-table";
import { ActiveFilters, ClearFiltersLink, FilterBar, SearchField } from "@/components/ds/filter-bar";
import { NoLinkChip, RecordChip } from "@/components/ds/record-chip";
import { EmptyState } from "@/components/ds/states";
import { Icon } from "@/components/icon";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody, PageTitle } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { db } from "@/db";
import { createOrcamento } from "@/features/orcamentos/actions";
import { listOrcamentos, ORCAMENTOS_PAGE_SIZE } from "@/features/orcamentos/queries";
import { addDays } from "@/lib/dates";
import { formatBRL, formatDate, formatNumero } from "@/lib/format";
import { ORCAMENTO_STATUS, type OrcamentoStatus } from "@/lib/status";
import { hrefWith, param } from "@/lib/url";

export const metadata: Metadata = { title: "Orçamentos" };

const PATH = "/orcamentos";

function NewButton() {
  return (
    <form action={createOrcamento}>
      <Button type="submit">
        <Icon icon={faPlus} size={12} />
        Novo orçamento
      </Button>
    </form>
  );
}

export default async function OrcamentosPage({ searchParams }: PageProps<"/orcamentos">) {
  const sp = await searchParams;
  const q = param(sp, "q")?.trim() || undefined;
  const statusParam = param(sp, "status");
  const status = statusParam && statusParam in ORCAMENTO_STATUS ? (statusParam as OrcamentoStatus) : undefined;
  const cliente = param(sp, "cliente") || undefined;
  const page = Number(param(sp, "page")) || 1;

  const [{ rows, total }, clienteRow] = await Promise.all([
    listOrcamentos({ q, status, cliente, page }),
    cliente ? db.query.clientes.findFirst({ where: (c, { eq }) => eq(c.id, cliente), columns: { nome: true } }) : null,
  ]);
  const hasFilters = Boolean(q || status || cliente);

  return (
    <>
      <AppHeader title="Orçamentos" />
      <PageBody>
        <PageTitle title="Orçamentos" description="Rascunhos, enviados e aprovados. Aprovar um orçamento gera o pedido e o contrato." actions={<NewButton />} />

        <FilterBar
          active={
            <ActiveFilters
              filters={[
                ...(status ? [{ label: `Status: ${ORCAMENTO_STATUS[status].label}`, removeHref: hrefWith(PATH, sp, { status: null, page: null }) }] : []),
                ...(cliente ? [{ label: `Cliente: ${clienteRow?.nome ?? "—"}`, removeHref: hrefWith(PATH, sp, { cliente: null, page: null }) }] : []),
                ...(q ? [{ label: `Busca: ${q}`, removeHref: hrefWith(PATH, sp, { q: null, page: null }) }] : []),
              ]}
            />
          }
        >
          <form className="contents" action={PATH}>
            {cliente && <input type="hidden" name="cliente" value={cliente} />}
            <SearchField defaultValue={q} placeholder="Buscar número ou cliente..." />
            <NativeSelect name="status" defaultValue={status ?? ""} aria-label="Status" containerClassName="w-44">
              <option value="">Status: todos</option>
              {Object.entries(ORCAMENTO_STATUS).map(([value, meta]) => (
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
              icon={faFileLines}
              title="Nenhum orçamento ainda"
              description="Crie o primeiro orçamento para começar."
              action={<NewButton />}
            />
          </div>
        ) : (
          <DataTable
            footer={<Pagination page={page} pageSize={ORCAMENTOS_PAGE_SIZE} total={total} hrefFor={(p) => hrefWith(PATH, sp, { page: p > 1 ? p : null })} />}
          >
            <THead>
              <TH width={110}>Número</TH>
              <TH>Cliente</TH>
              <TH width={120}>Emissão</TH>
              <TH width={120}>Válido até</TH>
              <TH width={150}>Status</TH>
              <TH width={160}>Vínculo</TH>
              <TH align="right" width={150}>
                Total
              </TH>
            </THead>
            <TBody>
              {rows.length === 0 && (
                <tr className="bg-white!">
                  <td colSpan={7} className="px-5 py-10 text-center text-table text-navy-400">
                    Nenhum orçamento encontrado com esses filtros.
                  </td>
                </tr>
              )}
              {rows.map((o) => (
                <TR key={o.id} className="cursor-pointer">
                  <TD strong className="num">
                    <Link href={`/orcamentos/${o.id}`} className="hover:underline focus-visible:underline focus-visible:outline-none">
                      {formatNumero(o.numero)}
                    </Link>
                  </TD>
                  <TD>
                    <Link href={`/orcamentos/${o.id}`} className="block">
                      {o.clienteNome ?? (o.clienteNomeLivre ? <span>{o.clienteNomeLivre} <span className="text-caption text-navy-400">· sem cadastro</span></span> : <span className="text-navy-400">Sem cliente</span>)}
                    </Link>
                    {o.vendedor && <span className="text-overline text-navy-400">{o.vendedor}</span>}
                  </TD>
                  <TD className="num">{formatDate(o.dataEmissao)}</TD>
                  <TD className="num" muted>
                    {formatDate(addDays(o.dataEmissao, o.validadeDias))}
                  </TD>
                  <TD>
                    <StatusBadge entity="orcamento" status={o.displayStatus} />
                  </TD>
                  <TD>
                    {o.pedidoId ? (
                      <RecordChip kind="pedido" href={`/pedidos/${o.pedidoId}`}>
                        Pedido {formatNumero(o.pedidoNumero!)}
                      </RecordChip>
                    ) : (
                      <NoLinkChip />
                    )}
                  </TD>
                  <TD align="right" strong>
                    {formatBRL(o.total)}
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
