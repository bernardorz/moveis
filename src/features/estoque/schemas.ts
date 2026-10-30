import { z } from "zod";

const unidade = z.enum(["m2", "chapa", "unidade", "metro_linear", "caixa"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");
const optionalId = z.uuid().nullable().optional();

export const materialSchema = z.object({
  id: z.uuid().optional(),
  nome: z.string().trim().min(2, "Informe o nome do material."),
  categoriaId: z.uuid("Selecione a categoria."),
  unidade,
  chapaLargura: z.number().int().positive().nullable().optional(),
  chapaAltura: z.number().int().positive().nullable().optional(),
  chapaEspessura: z.number().int().positive().nullable().optional(),
  corAcabamento: z.string().trim().max(120).nullable().optional(),
  complemento: z.string().trim().max(120).nullable().optional(),
  estoqueMinimo: z.number({ error: "Informe o estoque mínimo." }).min(0, "Não pode ser negativo."),
});
export type MaterialInput = z.infer<typeof materialSchema>;

export const entradaSchema = z.object({
  materialId: z.uuid("Selecione o material."),
  data: isoDate,
  quantidade: z.number({ error: "Informe a quantidade." }).positive("A quantidade deve ser maior que zero."),
  valorUnitario: z.number({ error: "Informe o valor unitário." }).min(0, "Valor inválido."),
  fornecedorId: optionalId,
  numeroNota: z.string().trim().max(40).nullable().optional(),
  observacao: z.string().trim().max(500).nullable().optional(),
});
export type EntradaInput = z.infer<typeof entradaSchema>;

export const saidaSchema = z.object({
  materialId: z.uuid("Selecione o material."),
  data: isoDate,
  quantidade: z.number({ error: "Informe a quantidade." }).positive("A quantidade deve ser maior que zero."),
  pedidoId: optionalId,
  clienteId: optionalId,
  observacao: z.string().trim().max(500).nullable().optional(),
});
export type SaidaInput = z.infer<typeof saidaSchema>;

export const fornecedorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do fornecedor."),
  documento: z.string().trim().nullable().optional(),
});
