import { describe, expect, it } from "vitest";
import { diffMaterial } from "./historico";

const base = {
  nome: "MDF Branco",
  categoria: "Chapas",
  unidade: "chapa" as const,
  chapaLargura: 2750,
  chapaAltura: 1840,
  chapaEspessura: 18,
  corAcabamento: "Branco",
  complemento: null,
  estoqueMinimo: 5,
};

describe("diffMaterial", () => {
  it("não registra nada quando nada mudou", () => {
    expect(diffMaterial(base, { ...base })).toEqual([]);
  });

  it("trata vazio e nulo como iguais", () => {
    expect(diffMaterial(base, { ...base, complemento: "" })).toEqual([]);
  });

  it("descreve o valor anterior e o novo", () => {
    expect(diffMaterial(base, { ...base, estoqueMinimo: 8, nome: "MDF Branco TX" })).toEqual([
      { campo: "Nome", de: "MDF Branco", para: "MDF Branco TX" },
      { campo: "Estoque mínimo", de: "5", para: "8" },
    ]);
  });

  it("junta as três medidas em um campo", () => {
    expect(diffMaterial(base, { ...base, chapaEspessura: 15 })).toEqual([
      { campo: "Medida da chapa", de: "2750 × 1840 × 18 mm", para: "2750 × 1840 × 15 mm" },
    ]);
  });
});
