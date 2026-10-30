"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { faArrowDown, faArrowUp, faClockRotateLeft, faPenToSquare, faPlus } from "@fortawesome/free-solid-svg-icons";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { RowActions } from "@/components/ds/row-actions";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { UNIDADE_OPTIONS } from "@/lib/units";
import type { MaterialHistorico, MaterialRow } from "../queries";
import { useEstoqueDrawers } from "./estoque-drawers";
import type { MaterialFormValues } from "./material-drawer";

function paraFormulario(m: MaterialRow | MaterialHistorico["material"]): MaterialFormValues {
  return {
    id: m.id,
    codigo: m.codigo,
    nome: m.nome,
    categoriaId: m.categoriaId,
    unidade: m.unidade,
    chapaLargura: m.chapaLargura,
    chapaAltura: m.chapaAltura,
    chapaEspessura: m.chapaEspessura,
    corAcabamento: m.corAcabamento ?? "",
    complemento: m.complemento ?? "",
    estoqueMinimo: m.estoqueMinimo,
  };
}

export function MaterialHistoricoActions({ material }: { material: MaterialHistorico["material"] }) {
  const { open } = useEstoqueDrawers();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" onClick={() => open({ type: "material", material: paraFormulario(material) })}>
        <Icon icon={faPenToSquare} size={12} />
        Editar
      </Button>
      <Button variant="secondary" onClick={() => open({ type: "saida", materialId: material.id })}>
        <Icon icon={faArrowUp} size={12} className="text-danger" />
        Registrar saída
      </Button>
      <Button onClick={() => open({ type: "entrada", materialId: material.id })}>
        <Icon icon={faArrowDown} size={12} />
        Registrar entrada
      </Button>
    </div>
  );
}

export function MateriaisHeaderActions() {
  const { open } = useEstoqueDrawers();
  return (
    <>
      <Button variant="secondary" onClick={() => open({ type: "entrada" })}>
        <Icon icon={faArrowDown} size={12} className="text-success" />
        Registrar entrada
      </Button>
      <Button variant="secondary" onClick={() => open({ type: "saida" })}>
        <Icon icon={faArrowUp} size={12} className="text-danger" />
        Registrar saída
      </Button>
      <Button onClick={() => open({ type: "material" })}>
        <Icon icon={faPlus} size={12} />
        Novo material
      </Button>
    </>
  );
}

export function MaterialRowActions({ material }: { material: MaterialRow }) {
  const { open } = useEstoqueDrawers();
  return (
    <RowActions label={`Ações de ${material.nome}`}>
      <DropdownMenuItem asChild>
        <Link href={`/estoque/materiais/${material.id}`}>
          <Icon icon={faClockRotateLeft} size={12} />
          Ver histórico
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => open({ type: "material", material: paraFormulario(material) })}>
        <Icon icon={faPenToSquare} size={12} />
        Editar
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => open({ type: "entrada", materialId: material.id })}>
        <Icon icon={faArrowDown} size={12} />
        Registrar entrada
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => open({ type: "saida", materialId: material.id })}>
        <Icon icon={faArrowUp} size={12} />
        Registrar saída
      </DropdownMenuItem>
    </RowActions>
  );
}

/** Filtros da listagem: atualizam a URL (busca com debounce). */
export function MateriaisFilters({
  categorias,
  abaixoCount,
}: {
  categorias: { id: string; nome: string }[];
  abaixoCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const first = useRef(true);

  function update(updates: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => update({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = ["q", "categoria", "unidade", "abaixo"].some((k) => sp.get(k));
  const abaixo = sp.get("abaixo") === "1";

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nome, código ou cor"
        aria-label="Buscar materiais"
        leading={<Icon icon={faMagnifyingGlass} size={12} />}
        className="text-table"
        containerClassName="w-[260px]"
      />
      <NativeSelect
        aria-label="Categoria"
        value={sp.get("categoria") ?? ""}
        onChange={(e) => update({ categoria: e.target.value || null })}
        containerClassName="w-44"
      >
        <option value="">Categoria: todas</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Unidade"
        value={sp.get("unidade") ?? ""}
        onChange={(e) => update({ unidade: e.target.value || null })}
        containerClassName="w-[165px]"
      >
        <option value="">Unidade: todas</option>
        {UNIDADE_OPTIONS.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </NativeSelect>
      <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-field border border-navy-200 bg-white px-[13px] text-table text-navy-900 hover:bg-navy-50">
        <Checkbox checked={abaixo} onCheckedChange={(v) => update({ abaixo: v === true ? "1" : null })} />
        Abaixo do mínimo
        <span className="num rounded-full bg-danger-bg px-1.5 text-overline font-medium text-danger-fg shadow-[0_0_0_1px_rgb(220_38_38/0.2)]">
          {abaixoCount}
        </span>
      </label>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.replace(pathname, { scroll: false });
          }}
          className="flex h-10 items-center rounded-field px-2 text-table font-medium text-navy-500 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
