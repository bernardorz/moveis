"use client";

import { createContext, useContext, useState } from "react";
import type { EstoqueFormOptions } from "../queries";
import { EntradaDrawer } from "./entrada-drawer";
import { MaterialDrawer, type MaterialFormValues } from "./material-drawer";
import { SaidaDrawer } from "./saida-drawer";

type DrawerState =
  | { type: "material"; material?: MaterialFormValues }
  | { type: "entrada"; materialId?: string }
  | { type: "saida"; materialId?: string; pedidoId?: string }
  | null;

const Ctx = createContext<{ open: (state: NonNullable<DrawerState>) => void } | null>(null);

export function useEstoqueDrawers() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEstoqueDrawers fora do EstoqueDrawersProvider");
  return ctx;
}

/** Drawers de material, entrada e saída compartilhados pela tela (cabeçalho e linhas). */
export function EstoqueDrawersProvider({
  options,
  children,
}: {
  options: EstoqueFormOptions;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<DrawerState>(null);
  // Remonta o formulário a cada abertura para começar limpo.
  const [key, setKey] = useState(0);
  const open = (next: NonNullable<DrawerState>) => {
    setKey((k) => k + 1);
    setState(next);
  };
  const close = () => setState(null);

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <MaterialDrawer
        key={`m-${key}`}
        open={state?.type === "material"}
        onClose={close}
        categorias={options.categorias}
        initial={state?.type === "material" ? state.material : undefined}
      />
      <EntradaDrawer
        key={`e-${key}`}
        open={state?.type === "entrada"}
        onClose={close}
        options={options}
        materialId={state?.type === "entrada" ? state.materialId : undefined}
      />
      <SaidaDrawer
        key={`s-${key}`}
        open={state?.type === "saida"}
        onClose={close}
        options={options}
        materialId={state?.type === "saida" ? state.materialId : undefined}
        pedidoId={state?.type === "saida" ? state.pedidoId : undefined}
      />
    </Ctx.Provider>
  );
}
