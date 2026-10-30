"use client";

import { useState } from "react";
import { faCalendar } from "@fortawesome/free-regular-svg-icons";
import { ptBR } from "date-fns/locale";
import { Icon } from "@/components/icon";
import { Calendar } from "@/components/ui/calendar";
import { Input, type InputProps } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseBRDate, parseISODate, toISODate } from "@/lib/dates";
import { discountAmount, type DescontoTipo } from "@/lib/money";
import { formatBRL, formatDate, formatDecimal, formatNumber } from "@/lib/format";
import { maskDate, maskMoney, parseDecimalBR } from "@/lib/masks";
import { cn } from "@/lib/utils";

// Campos com máscara brasileira (DS · Campos). Todos são controlados por um
// valor numérico/ISO e mostram o texto formatado.

type BaseProps = Omit<InputProps, "value" | "onChange" | "defaultValue" | "type">;

/**
 * Texto exibido no campo, sincronizado com o valor externo: quando o valor
 * muda por fora (ex.: recálculo), o texto é reformatado durante o render.
 */
function useSyncedText<T>(value: T, format: (v: T) => string, parse: (text: string) => T) {
  const [text, setText] = useState(() => format(value));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (parse(text) !== value) setText(format(value));
  }
  return [text, setText] as const;
}

/** Moeda: "R$" à esquerda, alinhado à direita, digitação da direita para a esquerda. */
export function MoneyInput({
  value,
  onValueChange,
  currencyPrefix = true,
  ...props
}: BaseProps & { value: number | null; onValueChange: (value: number | null) => void; currencyPrefix?: boolean }) {
  const [text, setText] = useSyncedText(value, (v) => (v == null ? "" : formatDecimal(v)), parseDecimalBR);

  return (
    <Input
      inputMode="numeric"
      align="right"
      leading={currencyPrefix ? "R$" : undefined}
      className={currencyPrefix ? "pl-[41px]" : undefined}
      value={text}
      onChange={(e) => {
        const masked = maskMoney(e.target.value);
        setText(masked);
        onValueChange(masked ? parseDecimalBR(masked) : null);
      }}
      {...props}
    />
  );
}

/** Número decimal livre (quantidades: 46,5 · 7,20). */
export function DecimalInput({
  value,
  onValueChange,
  maxFractionDigits = 3,
  ...props
}: BaseProps & { value: number | null; onValueChange: (value: number | null) => void; maxFractionDigits?: number }) {
  const [text, setText] = useSyncedText(
    value,
    (v) => (v == null ? "" : formatNumber(v, maxFractionDigits).replace(/\./g, "")),
    parseDecimalBR,
  );

  return (
    <Input
      inputMode="decimal"
      align="right"
      value={text}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d,]/g, "").replace(/(,.*?),/g, "$1");
        setText(raw);
        onValueChange(raw ? parseDecimalBR(raw) : null);
      }}
      {...props}
    />
  );
}

/** Data DD/MM/AAAA com calendário. Valor em ISO (YYYY-MM-DD). */
export function DateInput({
  value,
  onValueChange,
  id,
  disabled,
  ...props
}: BaseProps & { value: string | null; onValueChange: (iso: string | null) => void }) {
  const [text, setText] = useSyncedText(value, (v) => (v ? formatDate(v) : ""), (t) => parseBRDate(t) ?? null);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        value={text}
        disabled={disabled}
        className="num"
        onChange={(e) => {
          const masked = maskDate(e.target.value);
          setText(masked);
          if (masked.length === 10) onValueChange(parseBRDate(masked));
          else if (!masked) onValueChange(null);
        }}
        onBlur={() => {
          if (text && !parseBRDate(text)) setText(value ? formatDate(value) : "");
        }}
        trailing={
          <PopoverTrigger
            disabled={disabled}
            aria-label="Abrir calendário"
            className="-mr-1 flex size-7 items-center justify-center rounded-field-sm text-navy-400 hover:bg-navy-50 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none"
          >
            <Icon icon={faCalendar} size={14} />
          </PopoverTrigger>
        }
        {...props}
      />
      <PopoverContent align="end" className="w-auto p-1">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={value ? parseISODate(value) : undefined}
          defaultMonth={value ? parseISODate(value) : undefined}
          timeZone="UTC"
          onSelect={(date) => {
            if (!date) return;
            onValueChange(toISODate(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** L × A × P (mm) em um único campo com três entradas. */
export function DimensionsInput({
  value,
  onValueChange,
  size = "md",
  showCaptions = false,
  disabled,
  className,
  ariaLabelPrefix = "",
}: {
  value: { largura: number | null; altura: number | null; profundidade: number | null };
  onValueChange: (value: { largura: number | null; altura: number | null; profundidade: number | null }) => void;
  size?: "sm" | "md";
  showCaptions?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabelPrefix?: string;
}) {
  const keys = ["largura", "altura", "profundidade"] as const;
  const labels = { largura: "Largura", altura: "Altura", profundidade: "Profund." };
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        className={cn(
          "flex items-center rounded-field border border-navy-200 bg-white px-[5px] transition-[border-color,box-shadow] focus-within:border-navy-900 focus-within:shadow-field-focus",
          size === "md" ? "h-[42px]" : "h-8 rounded-field-sm px-1",
          disabled && "bg-navy-50",
        )}
      >
        {keys.map((k, i) => (
          <span key={k} className="flex min-w-0 flex-1 items-center">
            {i > 0 && <span className="px-0.5 text-overline text-navy-300">×</span>}
            <input
              inputMode="numeric"
              disabled={disabled}
              aria-label={`${ariaLabelPrefix}${labels[k]} (mm)`}
              value={value[k] ?? ""}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 5);
                onValueChange({ ...value, [k]: digits ? Number(digits) : null });
              }}
              className={cn(
                "num w-full min-w-0 bg-transparent text-center text-navy-900 outline-none disabled:text-navy-500",
                size === "md" ? "text-body" : "text-table",
              )}
            />
          </span>
        ))}
      </div>
      {showCaptions && (
        <div className="flex text-micro text-navy-400">
          {keys.map((k) => (
            <span key={k} className="flex-1 text-center">
              {labels[k]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Desconto com alternância % / R$ e a linha de resultado. */
export function DiscountInput({
  tipo,
  valor,
  subtotal,
  onChange,
  disabled,
  id,
}: {
  tipo: DescontoTipo;
  valor: number;
  subtotal: number;
  onChange: (next: { tipo: DescontoTipo; valor: number }) => void;
  disabled?: boolean;
  id?: string;
}) {
  const amount = discountAmount(subtotal, tipo, valor);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <div className="flex h-10 shrink-0 items-center rounded-field border border-navy-200 p-[3px]" role="radiogroup" aria-label="Tipo de desconto">
          {(["percentual", "valor"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              disabled={disabled}
              onClick={() => onChange({ tipo: t, valor })}
              className={cn(
                "flex h-full items-center rounded-field-sm px-3 text-caption font-semibold transition-colors focus-visible:shadow-focus focus-visible:outline-none",
                tipo === t ? "bg-navy-900 text-white" : "text-navy-500 hover:text-navy-900",
              )}
            >
              {t === "percentual" ? "%" : "R$"}
            </button>
          ))}
        </div>
        <MoneyInput
          id={id}
          currencyPrefix={false}
          disabled={disabled}
          value={valor}
          onValueChange={(v) => onChange({ tipo, valor: v ?? 0 })}
          containerClassName="flex-1"
        />
      </div>
      <p className="num text-overline text-navy-400">
        = {amount > 0 ? formatBRL(-amount) : formatBRL(0)} sobre {formatBRL(subtotal)}
      </p>
    </div>
  );
}
