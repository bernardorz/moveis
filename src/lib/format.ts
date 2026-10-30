import { parseISODate } from "./dates";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const decimal2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "R$ 6.200,00". Negativos usam o sinal "−" (DS: negativos com − e vermelho). */
export function formatBRL(value: number | null | undefined) {
  const v = value ?? 0;
  const formatted = currency.format(Math.abs(v)).replace(/ /g, " ");
  return v < 0 ? `− ${formatted}` : formatted;
}

/** "6.200,00" (sem símbolo), para campos com prefixo R$. */
export function formatDecimal(value: number | null | undefined) {
  return decimal2.format(value ?? 0);
}

export function formatNumber(value: number | null | undefined, maxFractionDigits = 3) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: maxFractionDigits }).format(
    value ?? 0,
  );
}

export function formatPercent(value: number, fractionDigits = 1) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: fractionDigits }).format(value)}%`;
}

/** "YYYY-MM-DD" → "13/05/2025". */
export function formatDate(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  const date = typeof iso === "string" ? parseISODate(iso) : iso;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: typeof iso === "string" ? "UTC" : "America/Sao_Paulo",
  }).format(date);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

/** Número sequencial com 4 dígitos: 248 → "#0248". */
export function formatNumero(numero: number) {
  return `#${String(numero).padStart(4, "0")}`;
}

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** CPF (11 dígitos) ou CNPJ (14 dígitos). Outros tamanhos voltam como vieram. */
export function formatDocument(value: string | null | undefined) {
  if (!value) return "";
  const d = onlyDigits(value);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value;
}

export function documentLabel(value: string | null | undefined) {
  if (!value) return "";
  return onlyDigits(value).length > 11 ? "CNPJ" : "CPF";
}

export function formatPhone(value: string | null | undefined) {
  if (!value) return "";
  const d = onlyDigits(value);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return value;
}

export function initials(name: string | null | undefined) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function pluralize(count: number, singular: string, plural: string) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

/** "2400 × 900 × 1100" (mm). Ignora dimensões ausentes. */
export function formatDimensions(l?: number | null, a?: number | null, p?: number | null) {
  const parts = [l, a, p].filter((v): v is number => v != null && v > 0);
  return parts.length ? parts.map((v) => formatNumber(v, 0).replace(/\./g, "")).join(" × ") : "—";
}
