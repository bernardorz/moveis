"use client";

import Link from "next/link";
import { createContext, useContext, useState, useTransition } from "react";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ds/badge";
import { DateInput } from "@/components/ds/inputs";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet";
import { changePedidoStatus } from "@/features/pedidos/actions";
import { formatNumero } from "@/lib/format";
import { PEDIDO_STATUS, pedidoTransicoesValidas, type PedidoStatus } from "@/lib/status";
import { salvarAgenda } from "../actions";
import type { PedidoNaAgenda } from "../queries";

const Ctx = createContext<{ abrir: (pedido: PedidoNaAgenda) => void } | null>(null);

export function useAgendaDrawer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAgendaDrawer fora do AgendaProvider");
  return ctx;
}

/** Drawer do pedido compartilhado pelo calendário e pelas listas. */
export function AgendaProvider({ children }: { children: React.ReactNode }) {
  const [pedido, setPedido] = useState<PedidoNaAgenda | null>(null);
  return (
    <Ctx.Provider value={{ abrir: setPedido }}>
      {children}
      {pedido && <AgendaDrawer key={pedido.id} pedido={pedido} onClose={() => setPedido(null)} />}
    </Ctx.Provider>
  );
}

const PROXIMO_PASSO: Partial<Record<PedidoStatus, { para: PedidoStatus; label: string }>> = {
  aguardando_producao: { para: "em_producao", label: "Iniciar produção" },
  em_producao: { para: "pronto", label: "Marcar como pronto" },
  pronto: { para: "entregue", label: "Marcar como entregue" },
};

function useMudarStatus(pedido: Pick<PedidoNaAgenda, "id" | "numero">, depois?: () => void) {
  const [pending, startTransition] = useTransition();
  const mudar = (para: PedidoStatus) =>
    startTransition(async () => {
      const r = await changePedidoStatus(pedido.id, { to: para });
      if (!r.ok) return void toast.error("Não foi possível alterar o status", { description: r.error });
      toast.success(`Pedido ${formatNumero(pedido.numero)}: ${PEDIDO_STATUS[para].label}`, { description: "Status atualizado" });
      depois?.();
    });
  return { mudar, pending };
}

export function AbrirPedidoAgenda({
  pedido,
  className,
  style,
  children,
  ariaLabel,
  title,
}: {
  pedido: PedidoNaAgenda;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  ariaLabel?: string;
  title?: string;
}) {
  const { abrir } = useAgendaDrawer();
  return (
    <button type="button" onClick={() => abrir(pedido)} className={className} style={style} aria-label={ariaLabel} title={title}>
      {children}
    </button>
  );
}

export function LinhaAcoes({ pedido }: { pedido: PedidoNaAgenda }) {
  const { abrir } = useAgendaDrawer();
  const { mudar, pending } = useMudarStatus(pedido);
  const passo = PROXIMO_PASSO[pedido.status];
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" size="compact" onClick={() => abrir(pedido)}>
        {pedido.producaoInicio ? "Datas" : "Agendar"}
      </Button>
      {passo && (
        <Button size="compact" loading={pending} onClick={() => mudar(passo.para)}>
          {passo.label}
        </Button>
      )}
    </div>
  );
}

function AgendaDrawer({ pedido, onClose }: { pedido: PedidoNaAgenda; onClose: () => void }) {
  const [inicio, setInicio] = useState(pedido.producaoInicio);
  const [fim, setFim] = useState(pedido.producaoFim);
  const [entrega, setEntrega] = useState(pedido.previsaoEntrega);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const { mudar, pending: mudando } = useMudarStatus(pedido, onClose);

  // Cancelar pede motivo: continua na tela do pedido.
  const transicoes = pedidoTransicoesValidas(pedido.status).filter((s) => s !== "cancelado");
  const passaEntrega = Boolean(fim && entrega && fim > entrega);
  const mudarData = (setter: (v: string | null) => void, valor: string | null) => {
    setter(valor);
    setErrors({});
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarAgenda(pedido.id, { producaoInicio: inicio, producaoFim: fim, previsaoEntrega: entrega });
      if (!r.ok) {
        setErrors(r.fields ?? {});
        if (!r.fields) toast.error("Não foi possível salvar", { description: r.error });
        return;
      }
      toast.success("Agenda atualizada", { description: `Pedido ${formatNumero(pedido.numero)}` });
      onClose();
    });
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader title={`Pedido ${formatNumero(pedido.numero)}`} description={pedido.cliente} />
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetBody>
            <div className="flex flex-col gap-2 rounded-card border border-navy-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-table font-medium text-navy-900">Status</p>
                <StatusBadge entity="pedido" status={pedido.status} />
              </div>
              {transicoes.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {transicoes.map((s) => (
                    <Button key={s} type="button" variant="secondary" size="compact" disabled={mudando} onClick={() => mudar(s)}>
                      {PEDIDO_STATUS[s].label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Início da produção" htmlFor="a-inicio" error={errors.producaoInicio}>
                <DateInput id="a-inicio" value={inicio} onValueChange={(v) => mudarData(setInicio, v)} aria-invalid={!!errors.producaoInicio || undefined} />
              </Field>
              <Field label="Fim da produção" htmlFor="a-fim" error={errors.producaoFim}>
                <DateInput id="a-fim" value={fim} onValueChange={(v) => mudarData(setFim, v)} aria-invalid={!!errors.producaoFim || undefined} />
              </Field>
            </div>
            <Field label="Previsão de entrega" htmlFor="a-entrega" error={errors.previsaoEntrega}>
              <DateInput id="a-entrega" value={entrega} onValueChange={(v) => mudarData(setEntrega, v)} />
            </Field>
            {passaEntrega && (
              <p className="flex items-center gap-2 rounded-field bg-warning-bg px-3 py-2 text-caption text-warning-fg">
                <Icon icon={faTriangleExclamation} size={12} />
                A produção termina depois da previsão de entrega.
              </p>
            )}
            <Link href={`/pedidos/${pedido.id}`} className="self-start text-table font-medium text-navy-900 underline underline-offset-2 focus-visible:shadow-focus focus-visible:outline-none">
              Abrir pedido
            </Link>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" size="compact" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="compact" loading={pending}>
              Salvar datas
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
