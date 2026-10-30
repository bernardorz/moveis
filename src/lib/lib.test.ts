import { describe, expect, it } from "vitest";
import { safeNext } from "./url";
import { addBusinessDays, addDays, parseBRDate, todayISO } from "./dates";
import {
  formatBRL,
  formatDate,
  formatDimensions,
  formatDocument,
  formatNumero,
  formatPhone,
  initials,
} from "./format";
import { maskCpfCnpj, maskDate, maskMoney, maskPhone, parseDecimalBR } from "./masks";
import { discountAmount, lineTotal, sumMoney, weightedAverageCost } from "./money";
import {
  contaDisplayStatus,
  orcamentoDisplayStatus,
  pedidoTransicoesValidas,
  venceEmBreve,
} from "./status";
import { formatQuantity, formatQuantityDelta } from "./units";

describe("money", () => {
  it("soma sem erro de ponto flutuante", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([6200, 1420, 2250])).toBe(9870);
  });

  it("calcula total da linha em centavos", () => {
    expect(lineTotal(4, 562.5)).toBe(2250);
    expect(lineTotal(3, 0.333)).toBe(1);
  });

  it("calcula desconto percentual e em reais, limitado ao subtotal", () => {
    expect(discountAmount(56980, "percentual", 5)).toBe(2849);
    expect(discountAmount(1000, "valor", 120)).toBe(120);
    expect(discountAmount(100, "valor", 500)).toBe(100);
    expect(discountAmount(100, "percentual", 150)).toBe(100);
    expect(discountAmount(100, "percentual", 0)).toBe(0);
  });

  it("calcula custo médio ponderado", () => {
    expect(weightedAverageCost({ saldo: 4, custoMedio: 240, quantidade: 10, custoUnitario: 252 })).toBe(
      248.5714,
    );
    expect(weightedAverageCost({ saldo: 0, custoMedio: 100, quantidade: 5, custoUnitario: 90 })).toBe(90);
    expect(weightedAverageCost({ saldo: 10, custoMedio: 50, quantidade: 0, custoUnitario: 90 })).toBe(50);
  });
});

describe("dates", () => {
  it("soma dias corridos e úteis", () => {
    expect(addDays("2025-05-13", 15)).toBe("2025-05-28");
    // 13/05/2025 é terça; 45 dias úteis depois cai em 15/07/2025.
    expect(addBusinessDays("2025-05-13", 45)).toBe("2025-07-15");
    // sexta + 1 dia útil = segunda
    expect(addBusinessDays("2025-05-16", 1)).toBe("2025-05-19");
  });

  it("valida datas digitadas", () => {
    expect(parseBRDate("20/06/2025")).toBe("2025-06-20");
    expect(parseBRDate("31/02/2025")).toBeNull();
    expect(parseBRDate("2025-06-20")).toBeNull();
  });

  it("retorna hoje no formato ISO", () => {
    expect(todayISO(new Date("2025-05-14T02:00:00Z"))).toBe("2025-05-13");
  });
});

describe("format", () => {
  it("formata moeda com sinal − para negativos", () => {
    expect(formatBRL(6200)).toBe("R$ 6.200,00");
    expect(formatBRL(-2849)).toBe("− R$ 2.849,00");
  });

  it("formata datas, números e documentos", () => {
    expect(formatDate("2025-05-13")).toBe("13/05/2025");
    expect(formatNumero(248)).toBe("#0248");
    expect(formatDocument("12345678909")).toBe("123.456.789-09");
    expect(formatDocument("12345678000190")).toBe("12.345.678/0001-90");
    expect(formatPhone("41998124471")).toBe("(41) 99812-4471");
    expect(initials("Maria Silva")).toBe("MS");
    expect(initials("Ana Beatriz Costa")).toBe("AC");
    expect(formatDimensions(2400, 900, 1100)).toBe("2400 × 900 × 1100");
    expect(formatDimensions(null, null, null)).toBe("—");
  });

  it("formata quantidades por unidade", () => {
    expect(formatQuantity(7.2, "m2")).toBe("7,20");
    expect(formatQuantity(46.5, "metro_linear")).toBe("46,5");
    expect(formatQuantity(840, "metro_linear")).toBe("840");
    expect(formatQuantityDelta(10, "chapa")).toBe("+10 chapas");
    expect(formatQuantityDelta(-1, "chapa")).toBe("−1 chapa");
  });
});

describe("masks", () => {
  it("alterna CPF para CNPJ acima de 11 dígitos", () => {
    expect(maskCpfCnpj("12345678909")).toBe("123.456.789-09");
    expect(maskCpfCnpj("123456789")).toBe("123.456.789");
    expect(maskCpfCnpj("12345678000190")).toBe("12.345.678/0001-90");
  });

  it("aplica máscara de telefone, data e moeda", () => {
    expect(maskPhone("41998124471")).toBe("(41) 99812-4471");
    expect(maskPhone("4133334444")).toBe("(41) 3333-4444");
    expect(maskDate("20062025")).toBe("20/06/2025");
    expect(maskMoney("631528")).toBe("6.315,28");
    expect(maskMoney("0005")).toBe("0,05");
  });

  it("converte decimal pt-BR", () => {
    expect(parseDecimalBR("6.315,28")).toBe(6315.28);
    expect(parseDecimalBR("46,5")).toBe(46.5);
    expect(parseDecimalBR("12.5")).toBe(12.5);
    expect(parseDecimalBR("1.200")).toBe(1200);
    expect(parseDecimalBR("")).toBeNull();
  });
});

describe("status", () => {
  const today = "2025-06-01";

  it("deriva orçamento expirado", () => {
    expect(orcamentoDisplayStatus({ status: "rascunho", dataEmissao: "2025-05-13", validadeDias: 15 }, today)).toBe(
      "expirado",
    );
    expect(orcamentoDisplayStatus({ status: "aprovado", dataEmissao: "2025-05-13", validadeDias: 15 }, today)).toBe(
      "aprovado",
    );
    expect(orcamentoDisplayStatus({ status: "enviado", dataEmissao: "2025-05-20", validadeDias: 15 }, today)).toBe(
      "enviado",
    );
  });

  it("deriva conta vencida e recebida", () => {
    expect(contaDisplayStatus({ status: "em_aberto", vencimento: "2025-05-31", tipo: "pagar" }, today)).toBe("vencido");
    expect(contaDisplayStatus({ status: "em_aberto", vencimento: "2025-06-01", tipo: "pagar" }, today)).toBe(
      "em_aberto",
    );
    expect(contaDisplayStatus({ status: "pago", vencimento: "2025-05-01", tipo: "receber" }, today)).toBe("recebido");
    expect(venceEmBreve("2025-06-04", today)).toBe(3);
    expect(venceEmBreve("2025-06-10", today)).toBeNull();
  });

  it("lista transições válidas do pedido", () => {
    expect(pedidoTransicoesValidas("aguardando_producao")).toEqual([
      "em_producao",
      "pronto",
      "entregue",
      "cancelado",
    ]);
    expect(pedidoTransicoesValidas("em_producao")).toEqual([
      "aguardando_producao",
      "pronto",
      "entregue",
      "cancelado",
    ]);
    expect(pedidoTransicoesValidas("entregue")).toEqual([]);
    expect(pedidoTransicoesValidas("cancelado")).toEqual([]);
  });
});

describe("safeNext", () => {
  it("aceita só caminhos internos", () => {
    expect(safeNext("/financeiro/notas?status=paga")).toBe("/financeiro/notas?status=paga");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext("")).toBe("/");
    expect(safeNext("https://exemplo.com")).toBe("/");
    expect(safeNext("//exemplo.com")).toBe("/");
    expect(safeNext("/\\exemplo.com")).toBe("/");
  });
});
