import { pgEnum } from "drizzle-orm/pg-core";

/** "Expirado" é derivado (validade vencida), ver lib/status. */
export const orcamentoStatus = pgEnum("orcamento_status", [
  "rascunho",
  "enviado",
  "aprovado",
  "recusado",
]);

export const descontoTipo = pgEnum("desconto_tipo", ["percentual", "valor"]);

export const pedidoStatus = pgEnum("pedido_status", [
  "aguardando_producao",
  "em_producao",
  "pronto",
  "entregue",
  "cancelado",
]);

export const contratoStatus = pgEnum("contrato_status", ["gerado", "assinado"]);

export const duplicataStatus = pgEnum("duplicata_status", ["em_aberto", "paga"]);

/** Recebido: de clientes. Emitido: pela própria DH, para pagar uma nota. */
export const chequeTipo = pgEnum("cheque_tipo", ["recebido", "emitido"]);

export const chequeStatus = pgEnum("cheque_status", [
  "em_carteira",
  "depositado",
  "compensado",
  "devolvido",
  "repassado",
  "emitido",
]);

export const contaTipo = pgEnum("conta_tipo", ["pagar", "receber"]);

/** "Vencido" é derivado (em aberto com vencimento passado), ver lib/status. */
export const contaStatus = pgEnum("conta_status", ["em_aberto", "pago"]);

export const formaPagamento = pgEnum("forma_pagamento", [
  "boleto",
  "cartao_credito",
  "pix",
  "dinheiro",
  "cheque",
  "cartao_debito",
]);

export const unidadeMedida = pgEnum("unidade_medida", [
  "m2",
  "chapa",
  "unidade",
  "metro_linear",
  "caixa",
]);

export const movimentacaoTipo = pgEnum("movimentacao_tipo", ["entrada", "saida"]);

export const materialAlteracaoTipo = pgEnum("material_alteracao_tipo", ["cadastro", "edicao"]);

export const reciboTipo = pgEnum("recibo_tipo", ["pedido", "corte", "montagem", "outro"]);
