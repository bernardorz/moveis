import { describe, expect, it } from "vitest";
import { valorPorExtenso } from "./extenso";

describe("valor por extenso", () => {
  it.each([
    [0, "zero real"],
    [0.01, "um centavo"],
    [0.5, "cinquenta centavos"],
    [1, "um real"],
    [2, "dois reais"],
    [1.01, "um real e um centavo"],
    [16, "dezesseis reais"],
    [21, "vinte e um reais"],
    [100, "cem reais"],
    [101, "cento e um reais"],
    [200, "duzentos reais"],
    [999.99, "novecentos e noventa e nove reais e noventa e nove centavos"],
    [1000, "mil reais"],
    [1001, "mil e um reais"],
    [1100, "mil e cem reais"],
    [1200, "mil e duzentos reais"],
    [1234.56, "mil duzentos e trinta e quatro reais e cinquenta e seis centavos"],
    [2000, "dois mil reais"],
    [21500, "vinte e um mil e quinhentos reais"],
    [100000, "cem mil reais"],
    [1000000, "um milhão de reais"],
    [2000000, "dois milhões de reais"],
    [1000001, "um milhão e um reais"],
    [2500000, "dois milhões e quinhentos mil reais"],
  ])("%s", (valor, texto) => {
    expect(valorPorExtenso(valor)).toBe(texto);
  });
});
