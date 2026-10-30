"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import type { ChequeFormOptions, NotaDetail } from "../queries";
import { ChequeDrawer, type ChequeFormValues } from "./cheque-drawer";
import { NotaDrawer, type NotaFormValues } from "./nota-drawer";
import { PagamentoDrawer } from "./pagamento-drawer";
import { ReciboDrawer, type ReciboFormValues } from "./recibo-drawer";

type DrawerState =
  | { type: "nota"; nota?: NotaFormValues }
  | { type: "cheque"; nota?: NotaDetail; cheque?: ChequeFormValues }
  | { type: "pagamento"; nota: NotaDetail; duplicataId?: string }
  | { type: "recibo"; recibo?: ReciboFormValues }
  | null;

const Ctx = createContext<{ open: (state: NonNullable<DrawerState>) => void } | null>(null);

export function useFinanceiroDrawers() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFinanceiroDrawers fora do FinanceiroDrawersProvider");
  return ctx;
}

/** Drawers do financeiro compartilhados pela tela (cabeçalho e linhas). */
export function FinanceiroDrawersProvider({
  options,
  initial = null,
  urlAoFechar,
  children,
}: {
  options: ChequeFormOptions;
  /** Abre um drawer ao carregar a tela (atalho "Gerar recibo"). */
  initial?: DrawerState;
  /** Limpa da URL o que abriu o drawer, para ele não reabrir ao recarregar. */
  urlAoFechar?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<DrawerState>(initial);
  // Remonta o formulário a cada abertura para começar limpo.
  const [key, setKey] = useState(0);
  const open = (next: NonNullable<DrawerState>) => {
    setKey((k) => k + 1);
    setState(next);
  };
  const close = () => {
    setState(null);
    if (urlAoFechar) router.replace(urlAoFechar, { scroll: false });
  };

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <NotaDrawer key={`n-${key}`} open={state?.type === "nota"} onClose={close} options={options} initial={state?.type === "nota" ? state.nota : undefined} />
      <ChequeDrawer
        key={`c-${key}`}
        open={state?.type === "cheque"}
        onClose={close}
        options={options}
        nota={state?.type === "cheque" ? state.nota : undefined}
        initial={state?.type === "cheque" ? state.cheque : undefined}
      />
      {state?.type === "pagamento" && <PagamentoDrawer key={`p-${key}`} open onClose={close} nota={state.nota} duplicataId={state.duplicataId} />}
      <ReciboDrawer key={`r-${key}`} open={state?.type === "recibo"} onClose={close} options={options} initial={state?.type === "recibo" ? state.recibo : undefined} />
    </Ctx.Provider>
  );
}
