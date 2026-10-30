import { z } from "zod";

// Documento editado no cliente e salvo pelo autosave. IDs são UUIDs gerados
// no navegador, o que torna o salvamento idempotente.

const dim = z.number().int().min(0).max(99999).nullable();

export const itemDocSchema = z.object({
  id: z.uuid(),
  descricao: z.string().max(300),
  quantidade: z.number().min(0).max(1_000_000),
  largura: dim,
  altura: dim,
  profundidade: dim,
  material: z.string().max(200),
  valorUnitario: z.number().min(0).max(100_000_000),
});

export const movelDocSchema = z.object({
  id: z.uuid(),
  nome: z.string().max(200),
  itens: z.array(itemDocSchema),
});

export const comodoDocSchema = z.object({
  id: z.uuid(),
  nome: z.string().max(200),
  moveis: z.array(movelDocSchema),
});

export const orcamentoDocSchema = z.object({
  clienteId: z.uuid().nullable(),
  clienteNomeLivre: z.string().max(200),
  dataEmissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validadeDias: z.number().int().min(1).max(365),
  vendedorId: z.string().nullable(),
  enderecoObra: z.string().max(300),
  descontoTipo: z.enum(["percentual", "valor"]),
  descontoValor: z.number().min(0),
  formaPagamento: z.string().max(120),
  condicaoDetalhada: z.string().max(300),
  prazoEntregaDias: z.number().int().min(0).max(999).nullable(),
  observacoes: z.string().max(4000),
  comodos: z.array(comodoDocSchema).max(100),
});

export type ItemDoc = z.infer<typeof itemDocSchema>;
export type MovelDoc = z.infer<typeof movelDocSchema>;
export type ComodoDoc = z.infer<typeof comodoDocSchema>;
export type OrcamentoDoc = z.infer<typeof orcamentoDocSchema>;

export const clienteRapidoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente."),
  documento: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || v.length === 11 || v.length === 14, "CPF deve ter 11 dígitos e CNPJ 14.")
    .optional(),
  telefone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || v.length >= 10, "Telefone incompleto.")
    .optional(),
  email: z.union([z.literal(""), z.email("E-mail inválido.")]).optional(),
});

/** Na aprovação sem cliente, o contrato exige nome e CPF/CNPJ. */
export const clienteAprovacaoSchema = clienteRapidoSchema.extend({
  documento: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11 || v.length === 14, "Informe CPF (11 dígitos) ou CNPJ (14 dígitos)."),
});

export const FORMAS_PAGAMENTO = [
  "À vista (Pix)",
  "Entrada + parcelas em cheque",
  "Entrada + parcelas no boleto",
  "Cartão de crédito parcelado",
  "Dinheiro",
  "A combinar",
];
