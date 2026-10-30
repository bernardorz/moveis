import type { ComodoDoc, ItemDoc, MovelDoc } from "../schemas";

// Fábricas e operações imutáveis da árvore Cômodo → Móvel → Item.

export const newItem = (): ItemDoc => ({
  id: crypto.randomUUID(),
  descricao: "",
  quantidade: 1,
  largura: null,
  altura: null,
  profundidade: null,
  material: "",
  valorUnitario: 0,
});

export const newMovel = (nome = ""): MovelDoc => ({ id: crypto.randomUUID(), nome, itens: [newItem()] });

export const newComodo = (nome = ""): ComodoDoc => ({ id: crypto.randomUUID(), nome, moveis: [newMovel()] });

export const cloneItem = (i: ItemDoc): ItemDoc => ({ ...i, id: crypto.randomUUID() });
export const cloneMovel = (m: MovelDoc): MovelDoc => ({
  ...m,
  id: crypto.randomUUID(),
  nome: m.nome ? `${m.nome} (cópia)` : "",
  itens: m.itens.map(cloneItem),
});
export const cloneComodo = (c: ComodoDoc): ComodoDoc => ({
  ...c,
  id: crypto.randomUUID(),
  nome: c.nome ? `${c.nome} (cópia)` : "",
  moveis: c.moveis.map((m) => ({ ...cloneMovel(m), nome: m.nome })),
});

/** Insere `item` logo depois do elemento `afterId`. */
export function insertAfter<T extends { id: string }>(list: T[], afterId: string, item: T) {
  const idx = list.findIndex((x) => x.id === afterId);
  return idx < 0 ? [...list, item] : [...list.slice(0, idx + 1), item, ...list.slice(idx + 1)];
}

export function updateIn<T extends { id: string }>(list: T[], id: string, fn: (item: T) => T) {
  return list.map((x) => (x.id === id ? fn(x) : x));
}
