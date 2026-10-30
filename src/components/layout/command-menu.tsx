"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Command } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Icon } from "@/components/icon";
import { globalSearch, type SearchResult } from "@/features/search/actions";

// Busca global da topbar (Ctrl K / ⌘K).
export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const handle = setTimeout(() => {
      startTransition(async () => setResults(await globalSearch(query)));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const visible = query.trim().length < 2 ? [] : results;
  const groups = ["Orçamentos", "Pedidos", "Clientes", "Materiais", "Notas", "Cheques", "Recibos"] as const;

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-80 items-center gap-2 rounded-field border border-navy-100 bg-navy-50 pr-2 pl-3 text-left text-table text-navy-400 transition-colors hover:border-navy-200 focus-visible:shadow-focus focus-visible:outline-none"
      >
        <Icon icon={faMagnifyingGlass} size={12} />
        <span className="flex-1 truncate">Buscar clientes, pedidos, cheques...</span>
        <kbd className="rounded-[4px] border border-navy-200 bg-white px-[7px] py-[3px] font-mono text-micro leading-[14px] text-navy-400">
          Ctrl K
        </kbd>
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy-950/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed top-[14vh] left-1/2 z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-section border border-navy-100 bg-white shadow-modal data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <DialogPrimitive.Title className="sr-only">Busca global</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Busque orçamentos, pedidos, clientes e materiais
            </DialogPrimitive.Description>
            <Command shouldFilter={false} loop>
              <div className="flex items-center gap-3 border-b border-navy-100 px-4">
                <Icon icon={faMagnifyingGlass} size={13} className="text-navy-400" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Número, nome, CPF/CNPJ ou código do material"
                  className="h-12 flex-1 bg-transparent text-body text-navy-900 outline-none placeholder:text-navy-400"
                />
                {pending && <span className="text-caption text-navy-400">Buscando…</span>}
              </div>
              <Command.List className="max-h-[360px] overflow-y-auto p-2">
                {query.trim().length < 2 ? (
                  <p className="px-3 py-6 text-center text-table text-navy-400">Digite ao menos 2 caracteres.</p>
                ) : (
                  !pending && (
                    <Command.Empty className="px-3 py-6 text-center text-table text-navy-400">
                      Nada encontrado para “{query}”.
                    </Command.Empty>
                  )
                )}
                {groups.map((group) => {
                  const items = visible.filter((r) => r.group === group);
                  if (!items.length) return null;
                  return (
                    <Command.Group
                      key={group}
                      heading={group}
                      className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1"
                    >
                      {items.map((r) => (
                        <Command.Item
                          key={r.href + r.label}
                          value={r.href + r.label}
                          onSelect={() => go(r.href)}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-field px-3 py-2 text-table text-navy-900 data-[selected=true]:bg-navy-50"
                        >
                          <span className="truncate font-medium">{r.label}</span>
                          {r.detail && <span className="num truncate text-caption text-navy-400">{r.detail}</span>}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </Command.List>
            </Command>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
