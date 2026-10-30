"use client";

import Image from "next/image";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import {
  faChevronDown,
  faChevronRight,
  faDownLeftAndUpRightToCenter,
  faGripVertical,
  faPlus,
  faUpRightAndDownLeftFromCenter,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { DimensionsInput, DecimalInput, MoneyInput } from "@/components/ds/inputs";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBRL, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ComodoDoc, ItemDoc, MovelDoc } from "../schemas";
import { comodoCounts, comodoSubtotal, itemTotal, movelSubtotal } from "../totals";
import { DragHandle, SortableItem, SortableList } from "./sortable";
import { cloneComodo, cloneItem, cloneMovel, insertAfter, newComodo, newItem, newMovel, updateIn } from "./tree";

// DS · Linhas da árvore do orçamento (Figma 1:3369 / 1:366): três níveis com
// recuo e peso visual decrescentes; subtotal sempre no cabeçalho do grupo.

const ITEM_GRID = "grid grid-cols-[32px_minmax(200px,1fr)_56px_176px_192px_124px_112px_64px] items-center gap-x-1";

/**
 * Ícone de duplicar exportado do Figma. É o "copy" de uma versão anterior do
 * Font Awesome 6 (caixa 512×512), sem equivalente exato no pacote atual.
 */
export function DuplicarIcon({ size }: { size: 11 | 12 | 14 }) {
  return <Image src={`/icons/duplicar-${size}.svg`} width={size} height={size} alt="" unoptimized className="shrink-0" />;
}

function IconAction({
  label,
  icon,
  iconNode,
  onClick,
  size = 12,
}: {
  label: string;
  icon?: IconDefinition;
  iconNode?: React.ReactNode;
  onClick: () => void;
  size?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="flex size-7 items-center justify-center rounded-field-sm text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none"
        >
          {iconNode ?? (icon && <Icon icon={icon} size={size} />)}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Toggle({ open, onClick, label, size }: { open: boolean; onClick: () => void; label: string; size: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={label}
      className="flex size-7 shrink-0 items-center justify-center rounded-field-sm text-navy-500 hover:bg-navy-100 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none"
    >
      <Icon icon={open ? faChevronDown : faChevronRight} size={size} />
    </button>
  );
}

/** Nome editável no próprio cabeçalho, sem borda até receber foco. */
function InlineName({
  value,
  onChange,
  placeholder,
  readOnly,
  className,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  readOnly?: boolean;
  className?: string;
  label: string;
}) {
  return (
    <input
      aria-label={label}
      value={value}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      size={Math.max(value.length || placeholder.length, 6)}
      className={cn(
        "min-w-0 rounded-field-sm border border-transparent bg-transparent px-1.5 py-0.5 font-semibold text-navy-900 outline-none placeholder:font-normal placeholder:text-navy-400 hover:border-navy-200 focus:border-navy-900 focus:bg-white focus:shadow-field-focus read-only:hover:border-transparent",
        className,
      )}
    />
  );
}

export function Estrutura({
  comodos,
  onChange,
  readOnly,
  collapsed,
  onCollapsedChange,
  materiais,
}: {
  comodos: ComodoDoc[];
  onChange: (comodos: ComodoDoc[]) => void;
  readOnly: boolean;
  collapsed: Set<string>;
  onCollapsedChange: (next: Set<string>) => void;
  materiais: string[];
}) {
  const toggle = (id: string) => {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onCollapsedChange(next);
  };
  const expandAll = () => onCollapsedChange(new Set());
  const collapseAll = () => onCollapsedChange(new Set(comodos.flatMap((c) => [c.id, ...c.moveis.map((m) => m.id)])));

  const addComodo = () => {
    const c = newComodo();
    onChange([...comodos, c]);
  };

  return (
    <section className="rounded-card border border-navy-100 bg-white">
      <datalist id="materiais-sugestoes">
        {materiais.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 pt-4 pb-[13px]">
        <div>
          <h3 className="text-h3 text-navy-900">Estrutura do orçamento</h3>
          <p className="flex items-center gap-1 text-caption text-navy-400">
            Cômodos <Icon icon={faArrowRight} size={9} /> Móveis <Icon icon={faArrowRight} size={9} /> Itens
            {!readOnly && (
              <>
                {" · arraste "}
                <Icon icon={faGripVertical} size={10} />
                {" para reordenar"}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="compact" onClick={expandAll} className="gap-1.5 px-3">
            <Icon icon={faUpRightAndDownLeftFromCenter} size={11} />
            Expandir tudo
          </Button>
          <Button variant="ghost" size="compact" onClick={collapseAll} className="gap-1.5 px-3">
            <Icon icon={faDownLeftAndUpRightToCenter} size={11} />
            Recolher tudo
          </Button>
          {!readOnly && (
            <Button size="compact" onClick={addComodo} className="gap-1.5 px-3.5">
              <Icon icon={faPlus} size={11} />
              Adicionar cômodo
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {comodos.length === 0 && (
          <p className="rounded-card border border-dashed border-navy-200 px-4 py-8 text-center text-table text-navy-400">
            Nenhum cômodo ainda. {readOnly ? "" : "Adicione o primeiro para montar o orçamento."}
          </p>
        )}
        <SortableList items={comodos} onReorder={onChange} disabled={readOnly}>
          {comodos.map((comodo) => (
            <SortableItem key={comodo.id} id={comodo.id} disabled={readOnly}>
              <ComodoBlock
                comodo={comodo}
                readOnly={readOnly}
                open={!collapsed.has(comodo.id)}
                collapsed={collapsed}
                onToggle={toggle}
                onChange={(next) => onChange(updateIn(comodos, comodo.id, () => next))}
                onDuplicate={() => onChange(insertAfter(comodos, comodo.id, cloneComodo(comodo)))}
                onRemove={() => onChange(comodos.filter((c) => c.id !== comodo.id))}
              />
            </SortableItem>
          ))}
        </SortableList>
        {!readOnly && (
          <button
            type="button"
            onClick={addComodo}
            className="flex h-12 items-center justify-center gap-2 rounded-card border border-dashed border-navy-200 text-body font-medium text-navy-500 transition-colors hover:border-navy-300 hover:bg-navy-50 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none"
          >
            <Icon icon={faPlus} size={11} />
            Adicionar cômodo
          </button>
        )}
      </div>
    </section>
  );
}

function ComodoBlock({
  comodo,
  readOnly,
  open,
  collapsed,
  onToggle,
  onChange,
  onDuplicate,
  onRemove,
}: {
  comodo: ComodoDoc;
  readOnly: boolean;
  open: boolean;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onChange: (c: ComodoDoc) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const counts = comodoCounts(comodo);
  const setMoveis = (moveis: MovelDoc[]) => onChange({ ...comodo, moveis });

  return (
    <div className="overflow-hidden rounded-card border border-navy-200 bg-white">
      <div className="flex h-12 items-center gap-2 border-l-4 border-navy-900 bg-navy-50 pr-3 pl-2">
        <DragHandle label={`Reordenar cômodo ${comodo.nome}`} />
        <Toggle open={open} onClick={() => onToggle(comodo.id)} label={open ? "Recolher cômodo" : "Expandir cômodo"} size={11} />
        <span className="rounded-[4px] border border-navy-200 bg-white px-[7px] py-[3px] text-micro font-semibold tracking-[0.5px] text-navy-500 uppercase">
          Cômodo
        </span>
        <InlineName
          label="Nome do cômodo"
          value={comodo.nome}
          onChange={(nome) => onChange({ ...comodo, nome })}
          placeholder="Nome do cômodo"
          readOnly={readOnly}
          className="text-h3"
        />
        <span className="num truncate text-caption text-navy-400">
          {pluralize(counts.moveis, "móvel", "móveis")} · {pluralize(counts.itens, "item", "itens")}
        </span>
        <span className="ml-auto text-caption text-navy-500">Subtotal</span>
        <span className="num pr-2 text-h3 text-navy-900">{formatBRL(comodoSubtotal(comodo))}</span>
        {!readOnly && (
          <>
            <IconAction label="Duplicar cômodo" iconNode={<DuplicarIcon size={12} />} onClick={onDuplicate} />
            <IconAction label="Excluir cômodo" icon={faTrashCan} onClick={onRemove} />
          </>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-2.5 bg-white py-3 pr-3 pl-6">
          <SortableList items={comodo.moveis} onReorder={setMoveis} disabled={readOnly}>
            {comodo.moveis.map((movel) => (
              <SortableItem key={movel.id} id={movel.id} disabled={readOnly}>
                <MovelBlock
                  movel={movel}
                  readOnly={readOnly}
                  open={!collapsed.has(movel.id)}
                  onToggle={() => onToggle(movel.id)}
                  onChange={(next) => setMoveis(updateIn(comodo.moveis, movel.id, () => next))}
                  onDuplicate={() => setMoveis(insertAfter(comodo.moveis, movel.id, cloneMovel(movel)))}
                  onRemove={() => setMoveis(comodo.moveis.filter((m) => m.id !== movel.id))}
                />
              </SortableItem>
            ))}
          </SortableList>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setMoveis([...comodo.moveis, newMovel()])}
              className="flex h-10 items-center justify-center gap-2 rounded-field border border-dashed border-navy-200 text-table font-medium text-navy-500 transition-colors hover:border-navy-300 hover:bg-navy-50 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none"
            >
              <Icon icon={faPlus} size={10} />
              Adicionar móvel{comodo.nome ? ` em ${comodo.nome}` : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MovelBlock({
  movel,
  readOnly,
  open,
  onToggle,
  onChange,
  onDuplicate,
  onRemove,
}: {
  movel: MovelDoc;
  readOnly: boolean;
  open: boolean;
  onToggle: () => void;
  onChange: (m: MovelDoc) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const setItens = (itens: ItemDoc[]) => onChange({ ...movel, itens });

  return (
    <div className="rounded-field border border-navy-100 bg-white">
      <div className={cn("flex h-[45px] items-center gap-2 pr-3 pl-2", open && "border-b border-navy-100")}>
        <DragHandle label={`Reordenar móvel ${movel.nome}`} />
        <Toggle open={open} onClick={onToggle} label={open ? "Recolher móvel" : "Expandir móvel"} size={10} />
        <span className="text-micro font-semibold tracking-[0.5px] text-navy-400 uppercase">Móvel</span>
        <InlineName
          label="Nome do móvel"
          value={movel.nome}
          onChange={(nome) => onChange({ ...movel, nome })}
          placeholder="Nome do móvel"
          readOnly={readOnly}
          className="text-body"
        />
        <span className="num truncate text-caption text-navy-400">
          {pluralize(movel.itens.length, "item", "itens")}
          {!open && " · recolhido"}
        </span>
        <span className="ml-auto text-caption text-navy-400">Subtotal</span>
        <span className="num pr-2 text-body font-semibold text-navy-900">{formatBRL(movelSubtotal(movel))}</span>
        {!readOnly && (
          <>
            <IconAction label="Duplicar móvel" iconNode={<DuplicarIcon size={12} />} onClick={onDuplicate} />
            <IconAction label="Excluir móvel" icon={faTrashCan} onClick={onRemove} />
          </>
        )}
      </div>

      {open && (
        <div className="overflow-x-auto">
          <div className="min-w-[960px]">
            <div className={cn(ITEM_GRID, "px-0 py-2 text-overline font-semibold tracking-[0.275px] text-navy-400 uppercase")}>
              <span />
              <span className="px-1">Descrição</span>
              <span className="px-1 text-right">Qtd</span>
              <span className="px-1 text-center">L × A × P (mm)</span>
              <span className="px-1">Material / acabamento</span>
              <span className="px-1 text-right">Valor unit.</span>
              <span className="px-3 text-right">Total</span>
              <span />
            </div>
            <SortableList items={movel.itens} onReorder={setItens} disabled={readOnly}>
              {movel.itens.map((item) => (
                <SortableItem key={item.id} id={item.id} disabled={readOnly}>
                  <ItemRow
                    item={item}
                    readOnly={readOnly}
                    onChange={(next) => setItens(updateIn(movel.itens, item.id, () => next))}
                    onDuplicate={() => setItens(insertAfter(movel.itens, item.id, cloneItem(item)))}
                    onRemove={() => setItens(movel.itens.filter((i) => i.id !== item.id))}
                  />
                </SortableItem>
              ))}
            </SortableList>
            {movel.itens.length === 0 && <p className="px-8 py-3 text-caption text-navy-400">Nenhum item neste móvel.</p>}
          </div>
          {!readOnly && (
            <div className="border-t border-navy-50 px-3 pt-[9px] pb-2">
              <button
                type="button"
                onClick={() => setItens([...movel.itens, newItem()])}
                className="flex items-center gap-2 rounded-[4px] px-1.5 py-1 text-table font-medium text-navy-600 hover:bg-navy-50 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none"
              >
                <Icon icon={faPlus} size={10} />
                Adicionar item
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item,
  readOnly,
  onChange,
  onDuplicate,
  onRemove,
}: {
  item: ItemDoc;
  readOnly: boolean;
  onChange: (i: ItemDoc) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const set = <K extends keyof ItemDoc>(k: K, v: ItemDoc[K]) => onChange({ ...item, [k]: v });
  const label = item.descricao || "item";
  return (
    <div className={cn(ITEM_GRID, "py-1.5")}>
      <span className="flex justify-center">
        <DragHandle label={`Reordenar ${label}`} size={11} />
      </span>
      <Input
        inputSize="sm"
        aria-label="Descrição"
        value={item.descricao}
        onChange={(e) => set("descricao", e.target.value)}
        placeholder="Descrição do item"
        disabled={readOnly}
      />
      <DecimalInput
        inputSize="sm"
        aria-label={`Quantidade de ${label}`}
        value={item.quantidade}
        onValueChange={(v) => set("quantidade", v ?? 0)}
        disabled={readOnly}
        className="px-2"
      />
      <DimensionsInput
        size="sm"
        disabled={readOnly}
        ariaLabelPrefix={`${label}: `}
        value={{ largura: item.largura, altura: item.altura, profundidade: item.profundidade }}
        onValueChange={(d) => onChange({ ...item, ...d })}
      />
      <Input
        inputSize="sm"
        aria-label={`Material de ${label}`}
        list="materiais-sugestoes"
        value={item.material}
        onChange={(e) => set("material", e.target.value)}
        placeholder="Material"
        disabled={readOnly}
      />
      <MoneyInput
        inputSize="sm"
        aria-label={`Valor unitário de ${label}`}
        value={item.valorUnitario}
        onValueChange={(v) => set("valorUnitario", v ?? 0)}
        disabled={readOnly}
        className="pl-8"
      />
      <span className="num px-3 text-right text-table font-medium text-navy-900">{formatBRL(itemTotal(item))}</span>
      <span className="flex justify-end gap-0.5 pr-2">
        {!readOnly && (
          <>
            <IconAction label="Duplicar item" iconNode={<DuplicarIcon size={11} />} onClick={onDuplicate} />
            <IconAction label="Remover item" icon={faXmark} onClick={onRemove} />
          </>
        )}
      </span>
    </div>
  );
}
