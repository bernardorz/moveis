import { relations } from "drizzle-orm";
import { account, session, user } from "./auth";
import { clientes, fornecedores } from "./cadastros";
import { materiais, materialAlteracoes, materialCategorias, movimentacoesEstoque } from "./estoque";
import { chequeDuplicatas, cheques, contas, duplicatas, notas, pagamentos, recibos } from "./financeiro";
import {
  orcamentoComodos,
  orcamentoItens,
  orcamentoMoveis,
  orcamentos,
} from "./orcamentos";
import {
  contratos,
  pedidoComodos,
  pedidoItens,
  pedidoMoveis,
  pedidoStatusHistorico,
  pedidos,
} from "./pedidos";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const clientesRelations = relations(clientes, ({ many }) => ({
  orcamentos: many(orcamentos),
  pedidos: many(pedidos),
  cheques: many(cheques),
  contas: many(contas),
  movimentacoes: many(movimentacoesEstoque),
  alteracoes: many(materialAlteracoes),
}));

export const fornecedoresRelations = relations(fornecedores, ({ many }) => ({
  contas: many(contas),
  movimentacoes: many(movimentacoesEstoque),
}));

export const orcamentosRelations = relations(orcamentos, ({ one, many }) => ({
  cliente: one(clientes, { fields: [orcamentos.clienteId], references: [clientes.id] }),
  vendedor: one(user, { fields: [orcamentos.vendedorId], references: [user.id] }),
  comodos: many(orcamentoComodos),
  pedido: one(pedidos),
}));

export const orcamentoComodosRelations = relations(orcamentoComodos, ({ one, many }) => ({
  orcamento: one(orcamentos, {
    fields: [orcamentoComodos.orcamentoId],
    references: [orcamentos.id],
  }),
  moveis: many(orcamentoMoveis),
}));

export const orcamentoMoveisRelations = relations(orcamentoMoveis, ({ one, many }) => ({
  comodo: one(orcamentoComodos, {
    fields: [orcamentoMoveis.comodoId],
    references: [orcamentoComodos.id],
  }),
  itens: many(orcamentoItens),
}));

export const orcamentoItensRelations = relations(orcamentoItens, ({ one }) => ({
  movel: one(orcamentoMoveis, {
    fields: [orcamentoItens.movelId],
    references: [orcamentoMoveis.id],
  }),
}));

export const pedidosRelations = relations(pedidos, ({ one, many }) => ({
  orcamento: one(orcamentos, { fields: [pedidos.orcamentoId], references: [orcamentos.id] }),
  cliente: one(clientes, { fields: [pedidos.clienteId], references: [clientes.id] }),
  vendedor: one(user, { fields: [pedidos.vendedorId], references: [user.id] }),
  comodos: many(pedidoComodos),
  historico: many(pedidoStatusHistorico),
  contrato: one(contratos),
  cheques: many(cheques),
  contas: many(contas),
  movimentacoes: many(movimentacoesEstoque),
}));

export const pedidoStatusHistoricoRelations = relations(pedidoStatusHistorico, ({ one }) => ({
  pedido: one(pedidos, {
    fields: [pedidoStatusHistorico.pedidoId],
    references: [pedidos.id],
  }),
}));

export const pedidoComodosRelations = relations(pedidoComodos, ({ one, many }) => ({
  pedido: one(pedidos, { fields: [pedidoComodos.pedidoId], references: [pedidos.id] }),
  moveis: many(pedidoMoveis),
}));

export const pedidoMoveisRelations = relations(pedidoMoveis, ({ one, many }) => ({
  comodo: one(pedidoComodos, {
    fields: [pedidoMoveis.comodoId],
    references: [pedidoComodos.id],
  }),
  itens: many(pedidoItens),
}));

export const pedidoItensRelations = relations(pedidoItens, ({ one }) => ({
  movel: one(pedidoMoveis, { fields: [pedidoItens.movelId], references: [pedidoMoveis.id] }),
}));

export const contratosRelations = relations(contratos, ({ one }) => ({
  pedido: one(pedidos, { fields: [contratos.pedidoId], references: [pedidos.id] }),
}));

export const notasRelations = relations(notas, ({ one, many }) => ({
  cliente: one(clientes, { fields: [notas.clienteId], references: [clientes.id] }),
  pedido: one(pedidos, { fields: [notas.pedidoId], references: [pedidos.id] }),
  duplicatas: many(duplicatas),
}));

export const pagamentosRelations = relations(pagamentos, ({ one }) => ({
  duplicata: one(duplicatas, { fields: [pagamentos.duplicataId], references: [duplicatas.id] }),
  user: one(user, { fields: [pagamentos.userId], references: [user.id] }),
}));

export const recibosRelations = relations(recibos, ({ one }) => ({
  cliente: one(clientes, { fields: [recibos.clienteId], references: [clientes.id] }),
  pedido: one(pedidos, { fields: [recibos.pedidoId], references: [pedidos.id] }),
  user: one(user, { fields: [recibos.userId], references: [user.id] }),
}));

export const duplicatasRelations = relations(duplicatas, ({ one, many }) => ({
  nota: one(notas, { fields: [duplicatas.notaId], references: [notas.id] }),
  cheques: many(chequeDuplicatas),
  pagamentos: many(pagamentos),
}));

export const chequesRelations = relations(cheques, ({ one, many }) => ({
  cliente: one(clientes, { fields: [cheques.clienteId], references: [clientes.id] }),
  pedido: one(pedidos, { fields: [cheques.pedidoId], references: [pedidos.id] }),
  duplicatas: many(chequeDuplicatas),
}));

export const chequeDuplicatasRelations = relations(chequeDuplicatas, ({ one }) => ({
  cheque: one(cheques, { fields: [chequeDuplicatas.chequeId], references: [cheques.id] }),
  duplicata: one(duplicatas, {
    fields: [chequeDuplicatas.duplicataId],
    references: [duplicatas.id],
  }),
}));

export const contasRelations = relations(contas, ({ one }) => ({
  cliente: one(clientes, { fields: [contas.clienteId], references: [clientes.id] }),
  pedido: one(pedidos, { fields: [contas.pedidoId], references: [pedidos.id] }),
  fornecedor: one(fornecedores, {
    fields: [contas.fornecedorId],
    references: [fornecedores.id],
  }),
}));

export const materialCategoriasRelations = relations(materialCategorias, ({ many }) => ({
  materiais: many(materiais),
}));

export const materialAlteracoesRelations = relations(materialAlteracoes, ({ one }) => ({
  material: one(materiais, { fields: [materialAlteracoes.materialId], references: [materiais.id] }),
  user: one(user, { fields: [materialAlteracoes.userId], references: [user.id] }),
}));

export const materiaisRelations = relations(materiais, ({ one, many }) => ({
  categoria: one(materialCategorias, {
    fields: [materiais.categoriaId],
    references: [materialCategorias.id],
  }),
  movimentacoes: many(movimentacoesEstoque),
}));

export const movimentacoesEstoqueRelations = relations(movimentacoesEstoque, ({ one }) => ({
  material: one(materiais, {
    fields: [movimentacoesEstoque.materialId],
    references: [materiais.id],
  }),
  fornecedor: one(fornecedores, {
    fields: [movimentacoesEstoque.fornecedorId],
    references: [fornecedores.id],
  }),
  pedido: one(pedidos, {
    fields: [movimentacoesEstoque.pedidoId],
    references: [pedidos.id],
  }),
  cliente: one(clientes, {
    fields: [movimentacoesEstoque.clienteId],
    references: [clientes.id],
  }),
  user: one(user, { fields: [movimentacoesEstoque.userId], references: [user.id] }),
}));
