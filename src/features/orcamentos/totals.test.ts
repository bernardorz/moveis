import { describe, expect, it } from "vitest";
import { comodoCounts, comodoSubtotal, movelSubtotal, orcamentoTotals } from "./totals";

const ilha = {
  itens: [
    { quantidade: 1, valorUnitario: 6200 },
    { quantidade: 1, valorUnitario: 1420 },
    { quantidade: 4, valorUnitario: 562.5 },
  ],
};
const superiores = { itens: [{ quantidade: 1, valorUnitario: 8420 }] };
const inferiores = { itens: [{ quantidade: 1, valorUnitario: 10350 }] };
const cozinha = { moveis: [ilha, superiores, inferiores] };

describe("totais do orçamento", () => {
  it("soma subtotais por móvel e cômodo", () => {
    expect(movelSubtotal(ilha)).toBe(9870);
    expect(comodoSubtotal(cozinha)).toBe(28640);
    expect(comodoCounts(cozinha)).toEqual({ moveis: 3, itens: 5 });
  });

  it("aplica desconto no total geral", () => {
    const comodos = [cozinha, { moveis: [{ itens: [{ quantidade: 1, valorUnitario: 21380 }] }] }, {
      moveis: [{ itens: [{ quantidade: 1, valorUnitario: 6960 }] }],
    }];
    expect(orcamentoTotals(comodos, { tipo: "percentual", valor: 5 })).toEqual({
      subtotal: 56980,
      descontoTotal: 2849,
      total: 54131,
    });
    expect(orcamentoTotals(comodos, { tipo: "valor", valor: 980 })).toEqual({
      subtotal: 56980,
      descontoTotal: 980,
      total: 56000,
    });
  });

  it("lida com orçamento vazio", () => {
    expect(orcamentoTotals([], { tipo: "percentual", valor: 10 })).toEqual({
      subtotal: 0,
      descontoTotal: 0,
      total: 0,
    });
  });
});
