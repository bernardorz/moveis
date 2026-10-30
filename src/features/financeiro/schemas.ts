import { z } from "zod";
import { sumMoney, toCents } from "@/lib/money";
import { FORMAS_DUPLICATA } from "@/lib/status";

const isoDate = z.string({ error: "Informe a data." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");
const optionalId = z.uuid().nullable().optional();
const money = z.number({ error: "Informe o valor." }).positive("O valor deve ser maior que zero.");

export const duplicataFormSchema = z.object({
  id: z.uuid().optional(),
  numero: z.string().trim().min(1, "Informe o número."),
  vencimento: isoDate,
  valor: money,
});

export const notaSchema = z
  .object({
    id: z.uuid().optional(),
    numero: z.string().trim().min(1, "Informe o número da nota."),
    emitenteDestinatario: z.string().trim().min(2, "Informe o emitente ou destinatário."),
    dataEmissao: isoDate,
    valorTotal: money,
    observacoes: z.string().trim().max(1000).nullable().optional(),
    clienteId: optionalId,
    pedidoId: optionalId,
    duplicatas: z.array(duplicataFormSchema).min(1, "Adicione ao menos uma duplicata."),
  })
  .superRefine((nota, ctx) => {
    const soma = sumMoney(nota.duplicatas.map((d) => d.valor));
    if (toCents(soma) !== toCents(nota.valorTotal)) {
      ctx.addIssue({ code: "custom", path: ["duplicatas"], message: "A soma das duplicatas precisa ser igual ao valor total da nota." });
    }
    const vistos = new Set<string>();
    nota.duplicatas.forEach((d, i) => {
      if (vistos.has(d.numero)) ctx.addIssue({ code: "custom", path: ["duplicatas", i, "numero"], message: "Número repetido." });
      vistos.add(d.numero);
    });
  });
export type NotaInput = z.infer<typeof notaSchema>;

export const chequeSchema = z
  .object({
    id: z.uuid().optional(),
    /** Lançado pela nota: exige ao menos uma duplicata dela. */
    notaId: z.uuid().optional(),
    tipo: z.enum(["recebido", "emitido"]),
    numero: z.string().trim().min(1, "Informe o número do cheque."),
    banco: z.string().trim().min(1, "Informe o banco."),
    emitente: z.string().trim().min(2, "Informe o emitente."),
    favorecido: z.string().trim().max(200).nullable().optional(),
    valor: money,
    dataEmissao: isoDate,
    bomPara: isoDate,
    clienteId: optionalId,
    pedidoId: optionalId,
    observacoes: z.string().trim().max(1000).nullable().optional(),
    duplicataIds: z.array(z.uuid()),
  })
  .superRefine((cheque, ctx) => {
    if (cheque.bomPara < cheque.dataEmissao) {
      ctx.addIssue({ code: "custom", path: ["bomPara"], message: "Não pode ser antes da emissão." });
    }
  });
export type ChequeInput = z.infer<typeof chequeSchema>;

export const chequeStatusSchema = z.object({
  status: z.enum(["em_carteira", "emitido", "depositado", "compensado", "devolvido", "repassado"]),
  /** Data da baixa nas duplicatas, quando compensado ou repassado. */
  data: isoDate.optional(),
  favorecido: z.string().trim().max(200).nullable().optional(),
});

export const pagamentoSchema = z.object({
  notaId: z.uuid(),
  duplicataIds: z.array(z.uuid()).min(1, "Ligue ao menos uma duplicata."),
  forma: z.enum(FORMAS_DUPLICATA, { error: "Selecione a forma de pagamento." }),
  data: isoDate,
  valor: money,
  observacao: z.string().trim().max(500).nullable().optional(),
  /** Duplicata de saldo, obrigatória quando o valor não cobre tudo. */
  saldoNumero: z.string().trim().nullable().optional(),
  saldoVencimento: isoDate.nullable().optional(),
});

export const reciboSchema = z
  .object({
    id: z.uuid().optional(),
    tipo: z.enum(["pedido", "corte", "montagem", "outro"]),
    data: isoDate,
    clienteId: optionalId,
    pagadorNome: z.string().trim().min(2, "Informe quem pagou."),
    pagadorDocumento: z.string().trim().max(20).nullable().optional(),
    valor: money,
    forma: z.enum(["pix", "dinheiro", "cartao_credito", "cartao_debito", "cheque", "boleto"], { error: "Selecione a forma de pagamento." }),
    descricao: z.string().trim().min(3, "Informe a que se refere o recibo.").max(1000),
    pedidoId: optionalId,
    observacoes: z.string().trim().max(1000).nullable().optional(),
  })
  // `when`: valida junto com os outros campos, para o usuário ver todos os erros de uma vez.
  .refine((r) => r.tipo !== "pedido" || !!r.pedidoId, { path: ["pedidoId"], message: "Selecione o pedido.", when: () => true });

export const reciboCancelSchema = z.object({ motivo: z.string().trim().min(3, "Informe o motivo do cancelamento.").max(500) });
