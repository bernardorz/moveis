import { onlyDigits } from "./format";

// Máscaras aplicadas durante a digitação.

/** CPF até 11 dígitos; acima disso alterna para CNPJ (00.000.000/0000-00). */
export function maskCpfCnpj(value: string) {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function maskPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskDate(value: string) {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/**
 * Converte texto digitado em pt-BR para número: "6.315,28" → 6315.28.
 * Aceita também ponto como separador decimal quando não há vírgula ("12.5").
 */
export function parseDecimalBR(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(trimmed)
      ? trimmed.replace(/\./g, "")
      : trimmed;
  const n = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Máscara de moeda que preenche da direita para a esquerda: "631528" → "6.315,28". */
export function maskMoney(value: string) {
  const d = onlyDigits(value).replace(/^0+(?=\d)/, "");
  if (!d) return "";
  const cents = Number(d);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
