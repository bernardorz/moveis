import { formatNumber } from "./format";

export type Unidade = "m2" | "chapa" | "unidade" | "metro_linear" | "caixa";

export const UNIDADES: Record<Unidade, { label: string; plural: string; decimals: number }> = {
  m2: { label: "m²", plural: "m²", decimals: 2 },
  chapa: { label: "chapa", plural: "chapas", decimals: 0 },
  unidade: { label: "unidade", plural: "unidades", decimals: 0 },
  metro_linear: { label: "metro linear", plural: "metros lineares", decimals: 1 },
  caixa: { label: "caixa", plural: "caixas", decimals: 0 },
};

export const UNIDADE_OPTIONS = (Object.keys(UNIDADES) as Unidade[]).map((value) => ({
  value,
  label: UNIDADES[value].label,
}));

/** Saldo exibido conforme a unidade: m² sempre com 2 casas ("7,20"). */
export function formatQuantity(value: number, unidade: Unidade) {
  const { decimals } = UNIDADES[unidade];
  if (unidade === "m2") {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return formatNumber(value, Math.max(decimals, 3));
}

/** "+10 chapas", "−4 chapas". */
export function formatQuantityDelta(value: number, unidade: Unidade) {
  const { label, plural } = UNIDADES[unidade];
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${formatNumber(abs)} ${abs === 1 ? label : plural}`;
}
