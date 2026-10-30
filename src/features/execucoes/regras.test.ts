import { describe, expect, it } from "vitest";
import { avisosPedido, barrasDaSemana, estaAtrasado, mesValido, nomeDoMes, semanasDoMes, somarMeses } from "./regras";

const HOJE = "2026-10-30";
const pedido = (over: Partial<Parameters<typeof avisosPedido>[0]>) => ({
  status: "aguardando_producao" as const,
  producaoInicio: "2026-11-02",
  producaoFim: "2026-11-10",
  previsaoEntrega: "2026-11-20",
  ...over,
});

describe("avisos", () => {
  it("não avisa quando está tudo no prazo", () => {
    expect(avisosPedido(pedido({}), HOJE)).toEqual([]);
  });

  it("início atrasado só enquanto não começou", () => {
    expect(avisosPedido(pedido({ producaoInicio: "2026-10-29" }), HOJE)).toEqual(["inicio_atrasado"]);
    expect(avisosPedido(pedido({ status: "em_producao", producaoInicio: "2026-10-29" }), HOJE)).toEqual([]);
  });

  it("produção atrasada e entrega atrasada", () => {
    const p = pedido({ status: "em_producao", producaoInicio: "2026-10-01", producaoFim: "2026-10-29", previsaoEntrega: "2026-10-29" });
    expect(avisosPedido(p, HOJE)).toEqual(["producao_atrasada", "entrega_atrasada"]);
  });

  it("hoje ainda não é atraso", () => {
    expect(avisosPedido(pedido({ producaoInicio: HOJE, producaoFim: HOJE, previsaoEntrega: HOJE }), HOJE)).toEqual([]);
  });

  it("avisa quando a produção termina depois da entrega", () => {
    const avisos = avisosPedido(pedido({ producaoFim: "2026-11-25" }), HOJE);
    expect(avisos).toEqual(["passa_entrega"]);
    expect(estaAtrasado(avisos)).toBe(false);
  });

  it("sem data só para quem ainda vai produzir", () => {
    expect(avisosPedido(pedido({ producaoInicio: null, producaoFim: null }), HOJE)).toEqual(["sem_data"]);
    expect(avisosPedido(pedido({ status: "pronto", producaoInicio: null, producaoFim: null }), HOJE)).toEqual([]);
  });

  it("pronto só avisa da entrega; entregue e cancelado não avisam", () => {
    const atrasado = { producaoInicio: "2026-10-01", producaoFim: "2026-10-05", previsaoEntrega: "2026-10-10" };
    expect(avisosPedido(pedido({ status: "pronto", ...atrasado }), HOJE)).toEqual(["entrega_atrasada"]);
    expect(avisosPedido(pedido({ status: "entregue", ...atrasado }), HOJE)).toEqual([]);
    expect(avisosPedido(pedido({ status: "cancelado", ...atrasado }), HOJE)).toEqual([]);
  });
});

describe("meses", () => {
  it("navega virando o ano", () => {
    expect(somarMeses("2026-12", 1)).toBe("2027-01");
    expect(somarMeses("2027-01", -1)).toBe("2026-12");
  });

  it("valida o parâmetro da URL", () => {
    expect(mesValido("2026-11")).toBe("2026-11");
    expect(mesValido("2026-13")).toBeUndefined();
    expect(mesValido("abc")).toBeUndefined();
    expect(mesValido(undefined)).toBeUndefined();
  });

  it("nomeia o mês", () => {
    expect(nomeDoMes("2026-11")).toBe("novembro de 2026");
  });
});

describe("semanas do mês", () => {
  it("vai de segunda a domingo e cobre o mês", () => {
    const semanas = semanasDoMes("2026-11"); // 1º de novembro de 2026 é domingo
    expect(semanas[0][0]).toBe("2026-10-26");
    expect(semanas[0][6]).toBe("2026-11-01");
    expect(semanas.at(-1)![6]).toBe("2026-12-06");
    expect(semanas.every((s) => s.length === 7)).toBe(true);
  });

  it("não cria semana sobrando quando o mês começa na segunda", () => {
    const semanas = semanasDoMes("2026-06"); // 1º de junho de 2026 é segunda
    expect(semanas[0][0]).toBe("2026-06-01");
    expect(semanas).toHaveLength(5);
  });

  it("atravessa a virada do ano", () => {
    const semanas = semanasDoMes("2026-12");
    expect(semanas.at(-1)![6]).toBe("2027-01-03");
  });
});

describe("barras do calendário", () => {
  const semana = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"];

  it("posiciona dentro da semana", () => {
    expect(barrasDaSemana(semana, [{ id: "a", inicio: "2026-11-03", fim: "2026-11-05" }])).toEqual({
      linhas: 1,
      barras: [{ id: "a", coluna: 1, dias: 3, linha: 0, continuaAntes: false, continuaDepois: false }],
    });
  });

  it("corta o que atravessa a semana", () => {
    const { barras } = barrasDaSemana(semana, [{ id: "a", inicio: "2026-10-20", fim: "2026-11-20" }]);
    expect(barras[0]).toEqual({ id: "a", coluna: 0, dias: 7, linha: 0, continuaAntes: true, continuaDepois: true });
  });

  it("ignora o que está fora da semana", () => {
    expect(barrasDaSemana(semana, [{ id: "a", inicio: "2026-11-09", fim: "2026-11-10" }]).barras).toEqual([]);
  });

  it("sobrepostos ficam em linhas diferentes", () => {
    const { barras, linhas } = barrasDaSemana(semana, [
      { id: "a", inicio: "2026-11-02", fim: "2026-11-04" },
      { id: "b", inicio: "2026-11-03", fim: "2026-11-06" },
    ]);
    expect(linhas).toBe(2);
    expect(barras.map((b) => b.linha)).toEqual([0, 1]);
  });

  it("reaproveita a linha quando não há sobreposição", () => {
    const { barras, linhas } = barrasDaSemana(semana, [
      { id: "a", inicio: "2026-11-02", fim: "2026-11-03" },
      { id: "b", inicio: "2026-11-04", fim: "2026-11-05" },
      { id: "c", inicio: "2026-11-03", fim: "2026-11-04" },
    ]);
    expect(linhas).toBe(2);
    expect(barras.find((b) => b.id === "b")!.linha).toBe(0);
    expect(barras.find((b) => b.id === "c")!.linha).toBe(1);
  });

  it("maior prioridade fica no topo, mesmo começando depois", () => {
    const { barras, linhas } = barrasDaSemana(semana, [
      { id: "pronto", inicio: "2026-11-02", fim: "2026-11-08", prioridade: 2 },
      { id: "producao", inicio: "2026-11-04", fim: "2026-11-05", prioridade: 0 },
    ]);
    expect(linhas).toBe(2);
    expect(barras.find((b) => b.id === "producao")!.linha).toBe(0);
    expect(barras.find((b) => b.id === "pronto")!.linha).toBe(1);
  });

  it("menor prioridade aproveita o espaço livre antes de uma barra prioritária", () => {
    const { barras, linhas } = barrasDaSemana(semana, [
      { id: "producao", inicio: "2026-11-05", fim: "2026-11-06", prioridade: 0 },
      { id: "pronto", inicio: "2026-11-02", fim: "2026-11-03", prioridade: 2 },
      { id: "entregue", inicio: "2026-11-03", fim: "2026-11-05", prioridade: 2 },
    ]);
    expect(linhas).toBe(2);
    expect(barras.find((b) => b.id === "pronto")!.linha).toBe(0);
    expect(barras.find((b) => b.id === "entregue")!.linha).toBe(1);
  });

  it("evento de um dia só", () => {
    const { barras } = barrasDaSemana(semana, [{ id: "a", inicio: "2026-11-08", fim: "2026-11-08" }]);
    expect(barras[0]).toMatchObject({ coluna: 6, dias: 1 });
  });
});
