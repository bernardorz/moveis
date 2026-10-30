import { describe, expect, it } from "vitest";
import { renderOrcamentoPdf, type OrcamentoPdfData } from "./pdf";

const item = (n: number) => ({
  id: `i${n}`,
  descricao: `Item ${n}`,
  quantidade: 2,
  largura: 1200,
  altura: 600,
  profundidade: null,
  material: "MDF Branco",
  valorUnitario: 100.5,
});

const orcamento = (itens: number): OrcamentoPdfData => ({
  numero: 248,
  cliente: null,
  vendedorNome: "Ricardo Dias",
  doc: {
    clienteId: null,
    clienteNomeLivre: "João",
    dataEmissao: "2026-10-30",
    validadeDias: 15,
    vendedorId: null,
    enderecoObra: "",
    descontoTipo: "percentual",
    descontoValor: 5,
    formaPagamento: "Pix",
    condicaoDetalhada: "",
    prazoEntregaDias: 45,
    observacoes: "Inclui instalação.",
    comodos: [{ id: "c1", nome: "Cozinha", moveis: [{ id: "m1", nome: "Ilha", itens: Array.from({ length: itens }, (_, n) => item(n)) }] }],
  },
});

const pageCount = (pdf: Buffer) => pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length ?? 0;

describe("PDF do orçamento", () => {
  it("gera um PDF de uma página para um orçamento curto", async () => {
    const pdf = await renderOrcamentoPdf(orcamento(3));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pageCount(pdf)).toBe(1);
  });

  it("quebra um orçamento longo em várias páginas", async () => {
    expect(pageCount(await renderOrcamentoPdf(orcamento(120)))).toBeGreaterThan(1);
  });
});
