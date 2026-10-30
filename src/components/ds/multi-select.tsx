"use client";

import { useMemo, useState } from "react";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { Checkbox } from "@/components/ui/checkbox";
import { formatBRL } from "@/lib/format";
import { sumMoney } from "@/lib/money";

// DS · Multisseleção (Figma 1:2639): vincular duplicatas a um cheque.
// Chips navy removíveis + busca + lista agrupada por nota + total selecionado.

export type MultiOption = { value: string; group: string; label: string; detail?: string; amount?: number };

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Buscar...",
  chipLabel,
}: {
  options: MultiOption[];
  value: string[];
  onValueChange: (v: string[]) => void;
  placeholder?: string;
  chipLabel?: (o: MultiOption) => string;
}) {
  const [query, setQuery] = useState("");
  const selected = options.filter((o) => value.includes(o.value));
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = options.filter((o) => !q || `${o.group} ${o.label}`.toLowerCase().includes(q));
    const map = new Map<string, MultiOption[]>();
    for (const o of filtered) map.set(o.group, [...(map.get(o.group) ?? []), o]);
    return [...map.entries()];
  }, [options, query]);
  const toggle = (v: string) => onValueChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-field border border-navy-200 bg-white px-2 py-1.5 focus-within:border-navy-900 focus-within:shadow-field-focus">
        {selected.map((o) => (
          <span key={o.value} className="inline-flex items-center gap-1.5 rounded-[4px] bg-navy-900 py-0.5 pr-1 pl-2 text-caption text-white">
            {chipLabel ? chipLabel(o) : o.label}
            <button type="button" onClick={() => toggle(o.value)} aria-label={`Remover ${o.label}`} className="flex size-4 items-center justify-center rounded-[3px] hover:bg-white/15">
              <Icon icon={faXmark} size={9} />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="min-w-24 flex-1 bg-transparent px-1 text-table text-navy-900 outline-none placeholder:text-navy-400"
        />
      </div>
      <div className="overflow-hidden rounded-field border border-navy-200 bg-white">
        {groups.map(([group, items]) => (
          <div key={group}>
            <p className="eyebrow px-3 pt-2.5 pb-1 text-[10px]">{group}</p>
            {items.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-table text-navy-900 hover:bg-navy-50 has-[[data-state=checked]]:bg-navy-50">
                <Checkbox checked={value.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
                <span className="num flex-1">
                  {o.label}
                  {o.detail && <span className="text-navy-500"> · {o.detail}</span>}
                </span>
                {o.amount != null && <span className="num text-navy-500">{formatBRL(o.amount)}</span>}
              </label>
            ))}
          </div>
        ))}
        <div className="num flex items-center justify-between border-t border-navy-100 bg-navy-50 px-3 py-2 text-caption">
          <span className="text-navy-500">
            {selected.length} {selected.length === 1 ? "selecionada" : "selecionadas"}
          </span>
          <span className="font-semibold text-navy-900">{formatBRL(sumMoney(selected.map((o) => o.amount ?? 0)))}</span>
        </div>
      </div>
    </div>
  );
}
