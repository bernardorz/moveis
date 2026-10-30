import Link from "next/link";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// DS · Barra de filtros (Figma 1:2960): busca, selects de status/período/cliente
// e "Limpar"; filtros ativos aparecem como chips navy removíveis.

export function FilterBar({ children, active, className }: { children: React.ReactNode; active?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-card border border-navy-100 bg-white", className)}>
      <div className="flex flex-wrap items-center gap-2.5 p-4">{children}</div>
      {active}
    </div>
  );
}

export function SearchField({
  name = "q",
  defaultValue,
  placeholder,
  className,
}: {
  name?: string;
  defaultValue?: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <Input
      type="search"
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      aria-label={placeholder}
      leading={<Icon icon={faMagnifyingGlass} size={12} />}
      className="text-table"
      containerClassName={cn("min-w-[200px] max-w-[320px] flex-1", className)}
    />
  );
}

export function ClearFiltersLink({ href, children = "Limpar" }: { href: string; children?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex h-10 items-center rounded-field px-2 text-table font-medium text-navy-500 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}

export type ActiveFilter = { label: string; removeHref: string };

export function ActiveFilters({ filters }: { filters: ActiveFilter[] }) {
  if (!filters.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
      <span className="text-caption text-navy-400">Filtros ativos:</span>
      {filters.map((f) => (
        <span key={f.label} className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 py-0.5 pr-1 pl-2.5 text-caption text-white">
          {f.label}
          <Link
            href={f.removeHref}
            aria-label={`Remover filtro ${f.label}`}
            className="flex size-4 items-center justify-center rounded-full hover:bg-white/15 focus-visible:shadow-[0_0_0_2px_white] focus-visible:outline-none"
          >
            <Icon icon={faXmark} size={9} />
          </Link>
        </span>
      ))}
    </div>
  );
}
