import { describe, expect, it } from "vitest";
import { sumMoney } from "@/lib/money";
import { canTransitionCheque, chequeTransicoesValidas, isChequeLiquidado } from "@/lib/status";
import { diferencaCheque, distribuirPagamento, duplicataDisplayStatus, notaResumo, notaStatus, parcelarNota, proximoNumeroSaldo } from "./regras";

describe("status da duplicata", () => {
  it("fica em cheque enquanto houver cheque ativo", () => {
    expect(duplicataDisplayStatus({ status: "em_aberto" }, [])).toBe("em_aberto");
    expect(duplicataDisplayStatus({ status: "em_aberto" }, ["emitido"])).toBe("em_cheque");
    expect(duplicataDisplayStatus({ status: "em_aberto" }, ["devolvido"])).toBe("em_aberto");
    expect(duplicataDisplayStatus({ status: "em_aberto" }, ["devolvido", "em_carteira"])).toBe("em_cheque");
  });

  it("paga prevalece sobre o cheque", () => {
    expect(duplicataDisplayStatus({ status: "paga" }, ["compensado"])).toBe("paga");
    expect(duplicataDisplayStatus({ status: "paga" }, [])).toBe("paga");
  });
});

describe("status da nota", () => {
  it("segue as duplicatas", () => {
    expect(notaStatus({ total: 10, pagas: 0, emCheque: 0 })).toBe("em_aberto");
    expect(notaStatus({ total: 10, pagas: 0, emCheque: 5 })).toBe("parcial");
    expect(notaStatus({ total: 10, pagas: 5, emCheque: 0 })).toBe("parcial");
    expect(notaStatus({ total: 10, pagas: 0, emCheque: 10 })).toBe("parcial");
    expect(notaStatus({ total: 10, pagas: 10, emCheque: 0 })).toBe("paga");
    expect(notaStatus({ total: 0, pagas: 0, emCheque: 0 })).toBe("em_aberto");
  });

  it("separa pago, em cheque e em aberto", () => {
    const resumo = notaResumo([
      { valor: 100.1, displayStatus: "paga" },
      { valor: 100.2, displayStatus: "em_cheque" },
      { valor: 100.2, displayStatus: "em_cheque" },
      { valor: 50, displayStatus: "em_aberto" },
    ]);
    expect(resumo.status).toBe("parcial");
    expect(resumo.pago).toEqual({ valor: 100.1, quantidade: 1 });
    expect(resumo.emCheque).toEqual({ valor: 200.4, quantidade: 2 });
    expect(resumo.emAberto).toEqual({ valor: 50, quantidade: 1 });
  });
});

describe("parcelamento da nota", () => {
  it("numera, espaça os vencimentos e fecha o valor nos centavos", () => {
    const parcelas = parcelarNota({ valorTotal: 1000, parcelas: 3, primeiroVencimento: "2026-01-10", intervaloDias: 30 });
    expect(parcelas.map((p) => p.numero)).toEqual(["1/3", "2/3", "3/3"]);
    expect(parcelas.map((p) => p.vencimento)).toEqual(["2026-01-10", "2026-02-09", "2026-03-11"]);
    expect(parcelas.map((p) => p.valor)).toEqual([333.33, 333.33, 333.34]);
    expect(sumMoney(parcelas.map((p) => p.valor))).toBe(1000);
  });

  it("não perde centavos em 10 parcelas", () => {
    const parcelas = parcelarNota({ valorTotal: 12345.67, parcelas: 10, primeiroVencimento: "2026-01-01", intervaloDias: 30 });
    expect(sumMoney(parcelas.map((p) => p.valor))).toBe(12345.67);
  });
});

describe("transições do cheque", () => {
  it("só o recebido pode ser repassado ou depositado", () => {
    expect(canTransitionCheque("recebido", "em_carteira", "repassado")).toBe(true);
    expect(canTransitionCheque("recebido", "em_carteira", "depositado")).toBe(true);
    expect(chequeTransicoesValidas("emitido", "emitido")).toEqual(["compensado", "devolvido"]);
  });

  it("devolvido volta ao status inicial do tipo", () => {
    expect(chequeTransicoesValidas("recebido", "devolvido")).toEqual(["em_carteira"]);
    expect(chequeTransicoesValidas("emitido", "devolvido")).toEqual(["emitido"]);
  });

  it("liquidado só pode ser devolvido", () => {
    expect(chequeTransicoesValidas("recebido", "compensado")).toEqual(["devolvido"]);
    expect(chequeTransicoesValidas("recebido", "repassado")).toEqual(["devolvido"]);
    expect(canTransitionCheque("recebido", "compensado", "repassado")).toBe(false);
    expect(isChequeLiquidado("repassado")).toBe(true);
    expect(isChequeLiquidado("depositado")).toBe(false);
  });
});

describe("conciliação", () => {
  it("indica sobra e falta", () => {
    expect(diferencaCheque(1000, 1000)).toBe(0);
    expect(diferencaCheque(1000.1, 1000)).toBe(0.1);
    expect(diferencaCheque(900, 1000)).toBe(-100);
  });
});

describe("pagamento de duplicatas", () => {
  const dup = (numero: string, vencimento: string, valor: number) => ({ id: numero, numero, vencimento, valor });

  it("gera saldo no exemplo de R$ 200 em uma duplicata de R$ 300", () => {
    const r = distribuirPagamento([dup("3/3", "2026-12-01", 300)], 200);
    expect(r).toEqual({ ok: true, quitadas: [], parcial: { id: "3/3", numero: "3/3", pago: 200, saldo: 100, valorOriginal: 300 } });
  });

  it("preserva a soma das duplicatas", () => {
    const r = distribuirPagamento([dup("1/1", "2026-12-01", 100.1)], 33.33);
    if (!r.ok || !r.parcial) throw new Error("esperava parcial");
    expect(sumMoney([r.parcial.pago, r.parcial.saldo])).toBe(100.1);
  });

  it("quita inteiras quando o valor é a soma", () => {
    const r = distribuirPagamento([dup("2/2", "2026-12-02", 50), dup("1/2", "2026-12-01", 50)], 100);
    expect(r).toEqual({ ok: true, quitadas: [{ id: "1/2", valor: 50 }, { id: "2/2", valor: 50 }], parcial: null });
  });

  it("deixa parcial só a de vencimento mais tardio", () => {
    const r = distribuirPagamento([dup("2/2", "2026-12-02", 100), dup("1/2", "2026-12-01", 100)], 150);
    expect(r).toEqual({ ok: true, quitadas: [{ id: "1/2", valor: 100 }], parcial: { id: "2/2", numero: "2/2", pago: 50, saldo: 50, valorOriginal: 100 } });
  });

  it("bloqueia valor acima da soma, zerado ou que não alcança a última", () => {
    const dois = [dup("1/2", "2026-12-01", 100), dup("2/2", "2026-12-02", 100)];
    expect(distribuirPagamento(dois, 200.01).ok).toBe(false);
    expect(distribuirPagamento(dois, 0).ok).toBe(false);
    expect(distribuirPagamento(dois, 100).ok).toBe(false);
    expect(distribuirPagamento([], 10).ok).toBe(false);
  });

  it("numera o saldo sem repetir", () => {
    expect(proximoNumeroSaldo("3/3", ["1/3", "2/3", "3/3"])).toBe("3/3-A");
    expect(proximoNumeroSaldo("3/3-A", ["3/3", "3/3-A"])).toBe("3/3-B");
    expect(proximoNumeroSaldo("3/3", ["3/3", "3/3-A", "3/3-B"])).toBe("3/3-C");
  });
});
