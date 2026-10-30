import { addDays, diffInDays, todayISO } from "./dates";

// Mapa entidade → status → rótulo e tom semântico do DS. Todo status é exibido
// com ponto + texto (nunca só cor).

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "muted";

type StatusMeta = { label: string; tone: Tone };

export const ORCAMENTO_STATUS = {
  rascunho: { label: "Rascunho", tone: "neutral" },
  enviado: { label: "Enviado", tone: "info" },
  aprovado: { label: "Aprovado", tone: "success" },
  recusado: { label: "Recusado", tone: "danger" },
  expirado: { label: "Expirado", tone: "muted" },
} as const satisfies Record<string, StatusMeta>;

export const PEDIDO_STATUS = {
  aguardando_producao: { label: "Aguardando produção", tone: "warning" },
  em_producao: { label: "Em produção", tone: "warning" },
  pronto: { label: "Pronto", tone: "info" },
  entregue: { label: "Entregue/Instalado", tone: "success" },
  cancelado: { label: "Cancelado", tone: "neutral" },
} as const satisfies Record<string, StatusMeta>;

export const CONTRATO_STATUS = {
  gerado: { label: "Gerado", tone: "info" },
  assinado: { label: "Assinado", tone: "success" },
} as const satisfies Record<string, StatusMeta>;

export const DUPLICATA_STATUS = {
  em_aberto: { label: "Em aberto", tone: "warning" },
  em_cheque: { label: "Em cheque", tone: "info" },
  paga: { label: "Paga", tone: "success" },
} as const satisfies Record<string, StatusMeta>;

export const NOTA_STATUS = {
  em_aberto: { label: "Em aberto", tone: "warning" },
  parcial: { label: "Parcialmente paga", tone: "info" },
  paga: { label: "Paga", tone: "success" },
} as const satisfies Record<string, StatusMeta>;

export const CHEQUE_STATUS = {
  em_carteira: { label: "Em carteira", tone: "warning" },
  emitido: { label: "Emitido", tone: "warning" },
  depositado: { label: "Depositado", tone: "info" },
  compensado: { label: "Compensado", tone: "success" },
  devolvido: { label: "Devolvido", tone: "danger" },
  repassado: { label: "Repassado", tone: "neutral" },
} as const satisfies Record<string, StatusMeta>;

export const CHEQUE_TIPO = {
  recebido: "Recebido",
  emitido: "Emitido",
} as const;

export const RECIBO_STATUS = {
  emitido: { label: "Emitido", tone: "success" },
  cancelado: { label: "Cancelado", tone: "muted" },
} as const satisfies Record<string, StatusMeta>;

export const RECIBO_TIPO = {
  pedido: "Pedido",
  corte: "Corte",
  montagem: "Montagem",
  outro: "Outro",
} as const;

export const FORMA_PAGAMENTO = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  cheque: "Cheque",
  boleto: "Boleto",
} as const;

/** Formas do "Registrar pagamento" da nota: cheque tem fluxo próprio. */
export const FORMAS_DUPLICATA = ["pix", "dinheiro", "cartao_credito", "cartao_debito"] as const;

export const CONTA_STATUS = {
  em_aberto: { label: "Em aberto", tone: "warning" },
  pago: { label: "Pago", tone: "success" },
  recebido: { label: "Recebido", tone: "success" },
  vencido: { label: "Vencido", tone: "danger" },
} as const satisfies Record<string, StatusMeta>;

export type OrcamentoStatus = keyof typeof ORCAMENTO_STATUS;
export type OrcamentoStoredStatus = Exclude<OrcamentoStatus, "expirado">;
export type PedidoStatus = keyof typeof PEDIDO_STATUS;
export type ContratoStatus = keyof typeof CONTRATO_STATUS;
export type DuplicataDisplayStatus = keyof typeof DUPLICATA_STATUS;
export type NotaStatus = keyof typeof NOTA_STATUS;
export type ChequeStatus = keyof typeof CHEQUE_STATUS;
export type ChequeTipo = keyof typeof CHEQUE_TIPO;
export type ReciboTipo = keyof typeof RECIBO_TIPO;
export type FormaPagamento = keyof typeof FORMA_PAGAMENTO;
export type ContaDisplayStatus = keyof typeof CONTA_STATUS;

export function orcamentoValidoAte(dataEmissao: string, validadeDias: number) {
  return addDays(dataEmissao, validadeDias);
}

/** Rascunho/enviado com validade vencida é exibido como "Expirado". */
export function orcamentoDisplayStatus(
  o: { status: OrcamentoStoredStatus; dataEmissao: string; validadeDias: number },
  today = todayISO(),
): OrcamentoStatus {
  if ((o.status === "rascunho" || o.status === "enviado") && orcamentoValidoAte(o.dataEmissao, o.validadeDias) < today) {
    return "expirado";
  }
  return o.status;
}

export function isOrcamentoEditable(status: OrcamentoStatus) {
  return status === "rascunho" || status === "enviado";
}

/** Em aberto com vencimento passado é "Vencido". Pago vira "Recebido" nas contas a receber. */
export function contaDisplayStatus(
  c: { status: "em_aberto" | "pago"; vencimento: string; tipo: "pagar" | "receber" },
  today = todayISO(),
): ContaDisplayStatus {
  if (c.status === "pago") return c.tipo === "receber" ? "recebido" : "pago";
  return c.vencimento < today ? "vencido" : "em_aberto";
}

/** Dias até o vencimento quando está próximo (0–3 dias); senão null. */
export function venceEmBreve(vencimento: string, today = todayISO(), janela = 3) {
  const dias = diffInDays(today, vencimento);
  return dias >= 0 && dias <= janela ? dias : null;
}

export const PEDIDO_FLUXO: PedidoStatus[] = [
  "aguardando_producao",
  "em_producao",
  "pronto",
  "entregue",
];

/** Avança para qualquer etapa seguinte, volta uma etapa, ou cancela (se não finalizado). */
export function pedidoTransicoesValidas(atual: PedidoStatus): PedidoStatus[] {
  if (atual === "cancelado" || atual === "entregue") return [];
  const idx = PEDIDO_FLUXO.indexOf(atual);
  const anterior = idx > 0 ? [PEDIDO_FLUXO[idx - 1]] : [];
  return [...anterior, ...PEDIDO_FLUXO.slice(idx + 1), "cancelado"];
}

export function canTransitionPedido(from: PedidoStatus, to: PedidoStatus) {
  return pedidoTransicoesValidas(from).includes(to);
}

const CHEQUE_TRANSICOES: Record<ChequeTipo, Partial<Record<ChequeStatus, ChequeStatus[]>>> = {
  recebido: {
    em_carteira: ["depositado", "compensado", "repassado", "devolvido"],
    depositado: ["compensado", "devolvido"],
    compensado: ["devolvido"],
    repassado: ["devolvido"],
    devolvido: ["em_carteira"],
  },
  emitido: {
    emitido: ["compensado", "devolvido"],
    compensado: ["devolvido"],
    devolvido: ["emitido"],
  },
};

export function chequeTransicoesValidas(tipo: ChequeTipo, atual: ChequeStatus): ChequeStatus[] {
  return CHEQUE_TRANSICOES[tipo][atual] ?? [];
}

export function canTransitionCheque(tipo: ChequeTipo, from: ChequeStatus, to: ChequeStatus) {
  return chequeTransicoesValidas(tipo, from).includes(to);
}

export const chequeStatusInicial = (tipo: ChequeTipo): ChequeStatus => (tipo === "emitido" ? "emitido" : "em_carteira");

/** Compensado ou repassado: dá baixa nas duplicatas vinculadas. */
export const isChequeLiquidado = (status: ChequeStatus) => status === "compensado" || status === "repassado";

/** Devolvido deixa de valer: as duplicatas ficam livres para outro cheque. */
export const isChequeAtivo = (status: ChequeStatus) => status !== "devolvido";

/** Ainda não saiu da mão da empresa: pode ser excluído e ter duplicatas trocadas. */
export const isChequeEditavel = (status: ChequeStatus) => status === "em_carteira" || status === "emitido";
