import Link from "next/link";
import {
  faArrowDownShortWide,
  faArrowUpWideShort,
  faChevronLeft,
  faChevronRight,
  faSort,
} from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// DS · Tabela de dados (Figma 1:3039): cabeçalho navy, zebra suave, hover,
// ordenação, ações por linha, linha de totais e modo compacto (44 / 32 px).

export type Density = "comfortable" | "compact";

export function DataTable({
  density = "comfortable",
  className,
  minWidth = 760,
  children,
  footer,
}: {
  density?: Density;
  className?: string;
  minWidth?: number;
  children: React.ReactNode;
  /** Rodapé fora da <table> (paginação). */
  footer?: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-card border border-navy-100 bg-white", className)}>
      <div className="overflow-x-auto">
        <table data-density={density} className="group/table w-full border-collapse text-table" style={{ minWidth }}>
          {children}
        </table>
      </div>
      {footer}
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-navy-900 text-left text-caption font-semibold text-white">
      <tr>{children}</tr>
    </thead>
  );
}

type Align = "left" | "right" | "center";
const alignClass = (align?: Align) => (align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left");

export function TH({
  children,
  align,
  className,
  sort,
  width,
}: {
  children?: React.ReactNode;
  align?: Align;
  className?: string;
  width?: number | string;
  /** Ordenação por link: estado atual e href para alternar. */
  sort?: { active: boolean; direction?: "asc" | "desc"; href: string };
}) {
  return (
    <th
      scope="col"
      style={{ width }}
      aria-sort={sort?.active ? (sort.direction === "desc" ? "descending" : "ascending") : undefined}
      className={cn("px-3 py-2.5 font-semibold whitespace-nowrap first:pl-5 last:pr-5", alignClass(align), className)}
    >
      {sort ? (
        <Link
          href={sort.href}
          scroll={false}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm hover:text-navy-200 focus-visible:underline focus-visible:outline-none",
            align === "right" && "justify-end",
          )}
        >
          {children}
          {sort.active ? (
            <Icon icon={sort.direction === "desc" ? faArrowUpWideShort : faArrowDownShortWide} size={10} />
          ) : (
            <Icon icon={faSort} size={9} className="opacity-50" />
          )}
        </Link>
      ) : (
        children
      )}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="[&>tr:nth-child(even)]:bg-navy-50/40 [&>tr+tr]:border-t [&>tr+tr]:border-navy-100">{children}</tbody>;
}

export function TR({ children, className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr className={cn("transition-colors hover:bg-navy-50!", className)} {...props}>
      {children}
    </tr>
  );
}

export function TD({
  children,
  align,
  className,
  colSpan,
  muted,
  strong,
}: {
  children?: React.ReactNode;
  align?: Align;
  className?: string;
  colSpan?: number;
  /** Texto secundário (navy-600). */
  muted?: boolean;
  /** Números e identificadores em medium. */
  strong?: boolean;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-3 py-3 align-middle text-navy-900 first:pl-5 last:pr-5 group-data-[density=compact]/table:py-1.5",
        alignClass(align),
        align === "right" && "num",
        muted && "text-navy-600",
        strong && "font-medium",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function TFoot({ children }: { children: React.ReactNode }) {
  return <tfoot className="border-t border-navy-200 bg-navy-50 font-semibold text-navy-900">{children}</tfoot>;
}

/** Linha de carregamento (skeleton) no fim da tabela. */
export function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr className="h-11 bg-white!">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-3 first:pl-5 last:pr-5">
          <Skeleton className={cn("h-3", i === 0 ? "w-14" : i % 3 === 0 ? "h-5 w-24 rounded-full" : "w-20")} />
        </td>
      ))}
    </tr>
  );
}

export function EmptyRow({ columns, children }: { columns: number; children: React.ReactNode }) {
  return (
    <tr className="bg-white!">
      <td colSpan={columns} className="px-5 py-10 text-center text-table text-navy-400">
        {children}
      </td>
    </tr>
  );
}

/** Paginação com links: "Mostrando 1–12 de 148" + páginas. */
export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
  aside,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
  aside?: React.ReactNode;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const windowPages = pageWindow(page, pages);
  const btn =
    "flex size-8 items-center justify-center rounded-field-sm text-table transition-colors focus-visible:shadow-focus focus-visible:outline-none";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 px-5 pt-[13px] pb-3">
      <div className="flex items-center gap-3">
        <span className="num text-table text-navy-500">
          Mostrando {from}–{to} de {total}
        </span>
        {aside}
      </div>
      {pages > 1 && (
        <nav aria-label="Paginação" className="flex items-center gap-1">
          <PageLink disabled={page <= 1} href={hrefFor(page - 1)} className={btn} label="Página anterior">
            <Icon icon={faChevronLeft} size={10} />
          </PageLink>
          {windowPages.map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className={cn(btn, "text-navy-400")}>
                …
              </span>
            ) : (
              <Link
                key={p}
                href={hrefFor(p)}
                scroll={false}
                aria-current={p === page ? "page" : undefined}
                className={cn(btn, "num", p === page ? "bg-navy-900 font-medium text-white" : "text-navy-900 hover:bg-navy-50")}
              >
                {p}
              </Link>
            ),
          )}
          <PageLink disabled={page >= pages} href={hrefFor(page + 1)} className={btn} label="Próxima página">
            <Icon icon={faChevronRight} size={10} />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  disabled,
  href,
  className,
  label,
  children,
}: {
  disabled: boolean;
  href: string;
  className: string;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled)
    return (
      <span aria-disabled className={cn(className, "text-navy-300")} aria-label={label}>
        {children}
      </span>
    );
  return (
    <Link href={href} scroll={false} aria-label={label} className={cn(className, "text-navy-900 hover:bg-navy-50")}>
      {children}
    </Link>
  );
}

function pageWindow(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}
