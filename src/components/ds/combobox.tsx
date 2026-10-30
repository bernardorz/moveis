"use client";

import { useMemo, useState } from "react";
import { faChevronDown, faMagnifyingGlass, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Command } from "cmdk";
import { Icon } from "@/components/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// DS · Select pesquisável (Figma 1:2639): clientes, pedidos e materiais.
// Destaca o trecho buscado e pode ter o rodapé "+ Cadastrar novo".

export type ComboOption = { value: string; label: string; detail?: string; keywords?: string };

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = normalize(text).indexOf(normalize(query));
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Selecione",
  searchPlaceholder = "Buscar...",
  emptyText = "Nada encontrado.",
  onCreate,
  createLabel = "Cadastrar novo",
  id,
  disabled,
  className,
  invalid,
}: {
  options: ComboOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Mostra o rodapé "+ Cadastrar novo" e recebe o texto buscado. */
  onCreate?: (query: string) => void;
  createLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options.slice(0, 50);
    return options
      .filter((o) => normalize(`${o.label} ${o.detail ?? ""} ${o.keywords ?? ""}`).includes(q))
      .slice(0, 50);
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-2 rounded-field border border-navy-200 bg-white px-[13px] text-left text-table transition-[border-color,box-shadow] outline-none focus-visible:border-navy-900 focus-visible:shadow-field-focus disabled:cursor-not-allowed disabled:bg-navy-50 aria-expanded:border-navy-900 aria-expanded:shadow-field-focus aria-invalid:border-danger-border",
          className,
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", selected ? "text-navy-900" : "text-navy-400")}>
          {selected ? selected.label : placeholder}
        </span>
        {selected?.detail && <span className="num shrink-0 text-caption text-navy-400">{selected.detail}</span>}
        <Icon icon={faChevronDown} size={9} className="shrink-0 text-navy-400" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 overflow-hidden p-0">
        <Command shouldFilter={false} loop>
          <div className="flex items-center gap-2 border-b border-navy-100 px-3">
            <Icon icon={faMagnifyingGlass} size={12} className="text-navy-400" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder}
              className="h-10 flex-1 bg-transparent text-table text-navy-900 outline-none placeholder:text-navy-400"
            />
          </div>
          <Command.List className="max-h-64 overflow-y-auto py-1">
            <Command.Empty className="px-3 py-4 text-center text-table text-navy-400">{emptyText}</Command.Empty>
            {filtered.map((o) => (
              <Command.Item
                key={o.value}
                value={o.value}
                onSelect={() => {
                  onValueChange(o.value);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-table text-navy-900 data-[selected=true]:bg-navy-50 aria-selected:bg-navy-50"
              >
                <span className="truncate">
                  <Highlight text={o.label} query={query.trim()} />
                </span>
                {o.detail && <span className="num shrink-0 text-caption text-navy-400">{o.detail}</span>}
              </Command.Item>
            ))}
          </Command.List>
          {onCreate && (
            <button
              type="button"
              onClick={() => {
                onCreate(query.trim());
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center gap-2 border-t border-navy-100 px-3 py-2.5 text-table font-medium text-navy-900 hover:bg-navy-50 focus-visible:bg-navy-50 focus-visible:outline-none"
            >
              <Icon icon={faPlus} size={10} />
              {createLabel}
            </button>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
