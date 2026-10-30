import { discountAmount, lineTotal, sumMoney, type DescontoTipo } from "@/lib/money";

// Funções puras de totais da árvore Cômodo → Móvel → Item. Usadas no editor
// (cliente), na aprovação (servidor) e no detalhe do pedido.

export type TreeItem = { quantidade: number; valorUnitario: number };
export type TreeMovel = { itens: TreeItem[] };
export type TreeComodo = { moveis: TreeMovel[] };

export const itemTotal = (item: TreeItem) => lineTotal(item.quantidade, item.valorUnitario);

export const movelSubtotal = (movel: TreeMovel) => sumMoney(movel.itens.map(itemTotal));

export const comodoSubtotal = (comodo: TreeComodo) => sumMoney(comodo.moveis.map(movelSubtotal));

export function comodoCounts(comodo: TreeComodo) {
  return {
    moveis: comodo.moveis.length,
    itens: comodo.moveis.reduce((acc, m) => acc + m.itens.length, 0),
  };
}

export function orcamentoTotals(
  comodos: TreeComodo[],
  desconto: { tipo: DescontoTipo; valor: number },
) {
  const subtotal = sumMoney(comodos.map(comodoSubtotal));
  const descontoTotal = discountAmount(subtotal, desconto.tipo, desconto.valor);
  return {
    subtotal,
    descontoTotal,
    total: sumMoney([subtotal, -descontoTotal]),
  };
}
