import Link from "next/link";
import { faDownload, faGripLines, faBars, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { Metadata } from "next";
import { EstoqueBadge } from "@/components/ds/badge";
import {
  DataTable,
  EmptyRow,
  Pagination,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ds/data-table";
import { Segmented } from "@/components/ds/segmented";
import { Icon } from "@/components/icon";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody, PageTitle } from "@/components/layout/page";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getEstoqueAlertas } from "@/features/estoque/alertas";
import { EstoqueDrawersProvider } from "@/features/estoque/components/estoque-drawers";
import {
  MateriaisFilters,
  MateriaisHeaderActions,
  MaterialRowActions,
} from "@/features/estoque/components/materiais-client";
import {
  countByCategoria,
  getEstoqueFormOptions,
  getEstoqueResumo,
  listMateriais,
  MATERIAIS_PAGE_SIZE,
  type MateriaisFilters as Filters,
} from "@/features/estoque/queries";
import { formatBRL, formatDimensions, formatNumber } from "@/lib/format";
import { formatQuantity, UNIDADES, type Unidade } from "@/lib/units";
import { hrefWith, param, sortHref, type SearchParams } from "@/lib/url";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Materiais" };

const PATH = "/estoque/materiais";

function parseFilters(sp: SearchParams): Filters {
  const unidade = param(sp, "unidade");
  const sort = param(sp, "sort");
  return {
    q: param(sp, "q")?.trim() || undefined,
    categoria: param(sp, "categoria") || undefined,
    unidade: unidade && unidade in UNIDADES ? (unidade as Unidade) : undefined,
    abaixo: param(sp, "abaixo") === "1",
    sort: sort === "nome" || sort === "categoria" || sort === "saldo" || sort === "custo" ? sort : undefined,
    dir: param(sp, "dir") === "desc" ? "desc" : "asc",
    page: Number(param(sp, "page")) || 1,
  };
}

export default async function MateriaisPage({ searchParams }: PageProps<"/estoque/materiais">) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const density = param(sp, "densidade") === "compacto" ? "compact" : "comfortable";

  const [{ rows, total, page }, cats, resumo, alertas, options] = await Promise.all([
    listMateriais(filters),
    countByCategoria(filters),
    getEstoqueResumo(),
    getEstoqueAlertas(),
    getEstoqueFormOptions(),
  ]);

  const sortProps = (column: NonNullable<Filters["sort"]>) => ({
    active: filters.sort === column,
    direction: filters.dir,
    href: sortHref(PATH, sp, column),
  });

  const exportHref = hrefWith("/api/estoque/materiais/export", sp, { page: null, densidade: null });

  return (
    <EstoqueDrawersProvider options={options}>
      <AppHeader title="Materiais" breadcrumb={[{ label: "Estoque", href: PATH }, { label: "Materiais" }]} />
      <PageBody>
        <PageTitle
          title="Materiais"
          description={
            <>
              {formatNumber(resumo.total)} {resumo.total === 1 ? "material cadastrado" : "materiais cadastrados"} · valor em estoque{" "}
              <span className="num font-medium text-navy-900">{formatBRL(resumo.valorEstoque)}</span>
            </>
          }
          actions={<MateriaisHeaderActions />}
        />

        {alertas.length > 0 && (
          <section className="flex items-center gap-3 rounded-card border border-danger-soft bg-danger-bg px-[21px] py-[15px]" aria-live="polite">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-field border border-danger-soft bg-white text-danger">
              <Icon icon={faTriangleExclamation} size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-table font-semibold text-danger-strong">
                {alertas.length === 1
                  ? "1 material está abaixo do estoque mínimo"
                  : `${alertas.length} materiais estão abaixo do estoque mínimo`}
              </p>
              <p className="truncate text-caption text-danger-fg/90">
                {alertas
                  .slice(0, 3)
                  .map((a) => a.nome)
                  .join(", ")}
                {alertas.length > 3 && ` e mais ${alertas.length - 3}.`}
              </p>
            </div>
            <Link
              href={filters.abaixo ? hrefWith(PATH, sp, { abaixo: null, page: null }) : hrefWith(PATH, sp, { abaixo: "1", page: null })}
              className="flex h-9 shrink-0 items-center rounded-field border border-danger-soft bg-white px-[15px] text-table font-medium text-danger-fg hover:bg-danger-bg focus-visible:shadow-focus focus-visible:outline-none"
            >
              {filters.abaixo ? "Mostrar todos" : "Mostrar apenas estes"}
            </Link>
          </section>
        )}

        <section className="overflow-hidden rounded-card border border-navy-100 bg-white">
          {/* Chips de categoria (Figma 1:1430) */}
          <div className="flex flex-wrap gap-2 px-5 pt-4">
            <CategoryChip href={hrefWith(PATH, sp, { categoria: null, page: null })} active={!filters.categoria} label="Todos" count={cats.total} />
            {cats.categorias.map((c) => (
              <CategoryChip
                key={c.id}
                href={hrefWith(PATH, sp, { categoria: c.id, page: null })}
                active={filters.categoria === c.id}
                label={c.nome}
                count={c.total}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 border-b border-navy-100 px-5 pt-4 pb-4">
            <MateriaisFilters categorias={cats.categorias} abaixoCount={alertas.length} />
            <div className="flex items-center gap-3">
              <Segmented
                ariaLabel="Densidade da tabela"
                size="sm"
                value={density}
                options={[
                  {
                    value: "comfortable",
                    label: (
                      <>
                        <Icon icon={faBars} size={11} /> Confortável
                      </>
                    ),
                    href: hrefWith(PATH, sp, { densidade: null }),
                  },
                  {
                    value: "compact",
                    label: (
                      <>
                        <Icon icon={faGripLines} size={11} /> Compacto
                      </>
                    ),
                    href: hrefWith(PATH, sp, { densidade: "compacto" }),
                  },
                ]}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={exportHref}
                    aria-label="Exportar CSV"
                    className="flex size-10 items-center justify-center rounded-field border border-navy-200 bg-white text-navy-700 hover:bg-navy-50 focus-visible:shadow-focus focus-visible:outline-none"
                  >
                    <Icon icon={faDownload} size={13} />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Exportar CSV</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <DataTable
            density={density}
            className="rounded-none border-0"
            minWidth={980}
            footer={
              <Pagination
                page={page}
                pageSize={MATERIAIS_PAGE_SIZE}
                total={total}
                hrefFor={(p) => hrefWith(PATH, sp, { page: p > 1 ? p : null })}
                aside={
                  <span className="rounded-field border border-navy-200 bg-navy-50 px-3 py-1.5 text-caption text-navy-500">
                    {MATERIAIS_PAGE_SIZE} por página
                  </span>
                }
              />
            }
          >
            <THead>
              <TH sort={sortProps("nome")} width="30%">Material</TH>
              <TH sort={sortProps("categoria")}>Categoria</TH>
              <TH>Unidade</TH>
              <TH>Cor / acabamento</TH>
              <TH align="right" sort={sortProps("saldo")}>
                Saldo atual
              </TH>
              <TH align="right">Estoque mín.</TH>
              <TH align="right" sort={sortProps("custo")}>
                Custo médio
              </TH>
              <TH width={60}>
                <span className="sr-only">Ações</span>
              </TH>
            </THead>
            <TBody>
              {rows.length === 0 && (
                <EmptyRow columns={8}>
                  {filters.q || filters.categoria || filters.unidade || filters.abaixo
                    ? "Nenhum material encontrado com esses filtros."
                    : "Nenhum material cadastrado ainda. Use “Novo material” para começar."}
                </EmptyRow>
              )}
              {rows.map((m) => {
                const abaixo = m.saldoAtual < m.estoqueMinimo;
                const unidade = m.unidade as Unidade;
                const medida = m.chapaLargura ? formatDimensions(m.chapaLargura, m.chapaAltura, m.chapaEspessura) + " mm" : null;
                return (
                  <TR key={m.id} className={cn(abaixo && "[&>td:first-child]:shadow-[inset_3px_0_0_var(--color-danger)]")}>
                    <TD>
                      <Link href={`${PATH}/${m.id}`} className="block font-medium text-navy-900 hover:underline focus-visible:underline focus-visible:outline-none">
                        {m.nome}
                      </Link>
                      <p className="num text-overline text-navy-400 group-data-[density=compact]/table:hidden">
                        {[m.codigo, medida, m.complemento].filter(Boolean).join(" · ")}
                      </p>
                    </TD>
                    <TD>{m.categoria}</TD>
                    <TD muted>{UNIDADES[unidade].label}</TD>
                    <TD>{m.corAcabamento ?? "—"}</TD>
                    <TD align="right">
                      <span className="inline-flex items-center gap-2">
                        {abaixo && <EstoqueBadge kind="abaixo" />}
                        <span className={cn("font-semibold", abaixo ? "text-danger-fg" : "text-navy-900")}>
                          {formatQuantity(m.saldoAtual, unidade)}
                        </span>
                      </span>
                    </TD>
                    <TD align="right" className="text-navy-500">
                      {formatNumber(m.estoqueMinimo)}
                    </TD>
                    <TD align="right">{formatBRL(m.custoMedio)}</TD>
                    <TD align="right">
                      <MaterialRowActions material={m} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </DataTable>
        </section>
      </PageBody>
    </EstoqueDrawersProvider>
  );
}

function CategoryChip({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-8 items-center gap-1 rounded-full border px-[13px] text-table font-medium transition-colors focus-visible:shadow-focus focus-visible:outline-none",
        active ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 bg-white text-navy-600 hover:bg-navy-50",
      )}
    >
      {label}
      <span className="num text-overline opacity-70">{count}</span>
    </Link>
  );
}
