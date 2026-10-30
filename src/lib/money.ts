// Aritmética monetária: os valores trafegam como number (reais), mas toda
// soma/multiplicação é feita em centavos inteiros para não acumular erro.

export const toCents = (value: number) => Math.round((value + Number.EPSILON) * 100);
export const fromCents = (cents: number) => cents / 100;

export const round2 = (value: number) => fromCents(toCents(value));
export const round3 = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;
export const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10000) / 10000;

export function sumMoney(values: number[]) {
  return fromCents(values.reduce((acc, v) => acc + toCents(v), 0));
}

/** Total de uma linha: quantidade × valor unitário, arredondado em centavos. */
export function lineTotal(quantidade: number, valorUnitario: number) {
  return round2(quantidade * valorUnitario);
}

export type DescontoTipo = "percentual" | "valor";

/** Desconto efetivo em R$, limitado ao subtotal. */
export function discountAmount(subtotal: number, tipo: DescontoTipo, valor: number) {
  if (!valor || valor <= 0 || subtotal <= 0) return 0;
  const raw = tipo === "percentual" ? (subtotal * Math.min(valor, 100)) / 100 : valor;
  return round2(Math.min(raw, subtotal));
}

/**
 * Custo médio ponderado após uma entrada:
 * (saldo × custo médio + quantidade × custo unitário) / (saldo + quantidade).
 * Saldo negativo ou zero não pondera: assume o custo da entrada.
 */
export function weightedAverageCost(params: {
  saldo: number;
  custoMedio: number;
  quantidade: number;
  custoUnitario: number;
}) {
  const { saldo, custoMedio, quantidade, custoUnitario } = params;
  if (quantidade <= 0) return round4(custoMedio);
  if (saldo <= 0) return round4(custoUnitario);
  return round4((saldo * custoMedio + quantidade * custoUnitario) / (saldo + quantidade));
}
