"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { faFilePdf, faHandshake } from "@fortawesome/free-regular-svg-icons";
import { faArrowsRotate, faChevronDown, faChevronRight, faEllipsis, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ds/confirm-dialog";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEstoqueDrawers } from "@/features/estoque/components/estoque-drawers";
import { formatBRL, formatDimensions, formatNumber, formatNumero, pluralize } from "@/lib/format";
import { PEDIDO_STATUS, pedidoTransicoesValidas, type PedidoStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { changePedidoStatus, marcarContratoAssinado } from "../actions";
import { comodoSubtotal, itemTotal, movelSubtotal } from "@/features/orcamentos/totals";

export function PedidoHeaderActions({ pedidoId, numero, status }: { pedidoId: string; numero: number; status: PedidoStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string>();
  const transicoes = pedidoTransicoesValidas(status);

  function change(to: PedidoStatus, motivoText?: string) {
    startTransition(async () => {
      const r = await changePedidoStatus(pedidoId, { to, motivo: motivoText });
      if (!r.ok) {
        setError(r.fields?.motivo);
        if (!r.fields) toast.error("Não foi possível alterar o status", { description: r.error });
        return;
      }
      setCancelOpen(false);
      toast.success(`Pedido ${formatNumero(numero)}: ${PEDIDO_STATUS[to].label}`, { description: "Status atualizado" });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Mais ações">
            <Icon icon={faEllipsis} size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => router.push(`/estoque/materiais`)}>
            <Icon icon={faArrowUp} size={12} /> Ir para o estoque
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Icon icon={faFilePdf} size={12} /> Gerar PDF do contrato (em breve)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="rounded-field focus-visible:shadow-focus focus-visible:outline-none">
            <Button variant="secondary" disabled className="pointer-events-none">
              <Icon icon={faFilePdf} size={14} />
              Exportar
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Em breve: exportação em PDF</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={!transicoes.length} loading={pending}>
            {!pending && <Icon icon={faArrowsRotate} size={12} />}
            Alterar status
            <Icon icon={faChevronDown} size={10} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="eyebrow px-2.5 py-1.5">Mover para</DropdownMenuLabel>
          {transicoes
            .filter((t) => t !== "cancelado")
            .map((t) => (
              <DropdownMenuItem key={t} onSelect={() => change(t)}>
                {PEDIDO_STATUS[t].label}
              </DropdownMenuItem>
            ))}
          {transicoes.includes("cancelado") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setCancelOpen(true)}>
                Cancelar pedido
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        destructive
        title={`Cancelar pedido ${formatNumero(numero)}?`}
        description="O stepper fica cinza e exibe a data e o motivo do cancelamento. Contas e cheques vinculados não são alterados."
        confirmLabel="Cancelar pedido"
        cancelLabel="Voltar"
        pending={pending}
        onConfirm={() => change("cancelado", motivo)}
      >
        <Field label="Motivo" htmlFor="cancel-motivo" required error={error} className="pt-3">
          <Textarea id="cancel-motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-invalid={!!error || undefined} />
        </Field>
      </ConfirmDialog>
    </div>
  );
}

export function PedidoTabs({
  tabs,
}: {
  tabs: { value: string; label: string; count?: number; content: React.ReactNode }[];
}) {
  return (
    <Tabs defaultValue={tabs[0].value} className="overflow-hidden rounded-card border border-navy-100 bg-white">
      <TabsList className="gap-7 px-5">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} count={t.count}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value}>
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

type Comodo = {
  id: string;
  nome: string;
  moveis: {
    id: string;
    nome: string;
    itens: {
      id: string;
      descricao: string;
      quantidade: number;
      largura: number | null;
      altura: number | null;
      profundidade: number | null;
      material: string | null;
      valorUnitario: number;
    }[];
  }[];
};

/** Estrutura somente leitura agrupada (Figma 1:1119). */
export function EstruturaPedido({
  comodos,
  subtotal,
  descontoLabel,
  descontoTotal,
  total,
}: {
  comodos: Comodo[];
  subtotal: number;
  descontoLabel: string;
  descontoTotal: number;
  total: number;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const s = new Set<string>();
    comodos.forEach((c, ci) => {
      if (ci > 0) s.add(c.id);
      c.moveis.forEach((m, mi) => {
        if (mi > 1) s.add(m.id);
      });
    });
    return s;
  });
  const toggle = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const cell = "px-3 py-2.5 first:pl-5 last:pr-5";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-table">
        <thead className="bg-navy-900 text-caption font-semibold text-white">
          <tr>
            <th className={cn(cell, "text-left")}>Descrição</th>
            <th className={cn(cell, "w-16 text-center")}>Qtd</th>
            <th className={cn(cell, "w-44 text-center")}>L × A × P (mm)</th>
            <th className={cn(cell, "w-52 text-left")}>Material / acabamento</th>
            <th className={cn(cell, "w-32 text-right")}>Valor unit.</th>
            <th className={cn(cell, "w-36 text-right")}>Total</th>
          </tr>
        </thead>
        <tbody>
          {comodos.map((c) => {
            const openC = !collapsed.has(c.id);
            return (
              <FragmentRows key={c.id}>
                <tr className="border-t border-navy-100 bg-navy-50/60">
                  <td colSpan={5} className="py-2.5 pr-3 pl-5">
                    <button type="button" onClick={() => toggle(c.id)} aria-expanded={openC} className="flex items-center gap-2 text-left focus-visible:underline focus-visible:outline-none">
                      <Icon icon={openC ? faChevronDown : faChevronRight} size={10} className="text-navy-500" />
                      <span className="text-body font-semibold text-navy-900">{c.nome || "Cômodo sem nome"}</span>
                      <span className="text-caption text-navy-400">
                        · {openC ? pluralize(c.moveis.length, "móvel", "móveis") : c.moveis.map((m) => m.nome).join(", ")}
                      </span>
                    </button>
                  </td>
                  <td className="num py-2.5 pr-5 text-right text-body font-semibold text-navy-900">{formatBRL(comodoSubtotal(c))}</td>
                </tr>
                {openC &&
                  c.moveis.map((m) => {
                    const openM = !collapsed.has(m.id);
                    return (
                      <FragmentRows key={m.id}>
                        <tr className="border-t border-navy-100">
                          <td colSpan={5} className="py-2.5 pr-3 pl-10">
                            <button type="button" onClick={() => toggle(m.id)} aria-expanded={openM} className="flex items-center gap-2 text-left focus-visible:underline focus-visible:outline-none">
                              <Icon icon={openM ? faChevronDown : faChevronRight} size={9} className="text-navy-400" />
                              <span className="font-semibold text-navy-900">{m.nome || "Móvel sem nome"}</span>
                              {!openM && <span className="text-caption text-navy-400">· {pluralize(m.itens.length, "item", "itens")}</span>}
                            </button>
                          </td>
                          <td className="num py-2.5 pr-5 text-right font-semibold text-navy-900">{formatBRL(movelSubtotal(m))}</td>
                        </tr>
                        {openM &&
                          m.itens.map((i) => (
                            <tr key={i.id} className="border-t border-navy-100 hover:bg-navy-50/50">
                              <td className="py-2.5 pr-3 pl-[60px] text-navy-900">{i.descricao}</td>
                              <td className="num px-3 py-2.5 text-center">{formatNumber(i.quantidade)}</td>
                              <td className="num px-3 py-2.5 text-center text-navy-500">{formatDimensions(i.largura, i.altura, i.profundidade)}</td>
                              <td className="px-3 py-2.5 text-navy-900">{i.material || "—"}</td>
                              <td className="num px-3 py-2.5 text-right">{formatBRL(i.valorUnitario)}</td>
                              <td className="num py-2.5 pr-5 pl-3 text-right">{formatBRL(itemTotal(i))}</td>
                            </tr>
                          ))}
                      </FragmentRows>
                    );
                  })}
              </FragmentRows>
            );
          })}
        </tbody>
        <tfoot className="num border-t border-navy-100">
          <tr>
            <td colSpan={5} className="pt-4 pr-3 text-right text-table text-navy-500">
              Subtotal
            </td>
            <td className="pt-4 pr-5 text-right text-navy-900">{formatBRL(subtotal)}</td>
          </tr>
          <tr>
            <td colSpan={5} className="py-1 pr-3 text-right text-table text-navy-500">
              {descontoLabel}
            </td>
            <td className={cn("py-1 pr-5 text-right", descontoTotal > 0 ? "text-danger-fg" : "text-navy-900")}>
              {descontoTotal > 0 ? `- ${formatBRL(descontoTotal)}` : formatBRL(0)}
            </td>
          </tr>
          <tr>
            <td colSpan={5} className="pt-2 pr-3 pb-4 text-right font-semibold text-navy-900">
              Total do pedido
            </td>
            <td className="pt-2 pr-5 pb-4 text-right text-[16px] leading-6 font-semibold text-navy-900">{formatBRL(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function FragmentRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function ContratoActions({ contratoId, assinado }: { contratoId: string; assinado: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={assinado ? "secondary" : "primary"}
      size="compact"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await marcarContratoAssinado(contratoId, !assinado);
          if (!r.ok) return void toast.error("Não foi possível atualizar", { description: r.error });
          toast.success(assinado ? "Contrato voltou para gerado" : "Contrato assinado", { description: "Status do contrato atualizado" });
          router.refresh();
        })
      }
    >
      {!pending && <Icon icon={faHandshake} size={12} />}
      {assinado ? "Desfazer assinatura" : "Marcar como assinado"}
    </Button>
  );
}

export function RegistrarSaidaPedidoButton({ pedidoId }: { pedidoId: string }) {
  const { open } = useEstoqueDrawers();
  return (
    <Button variant="secondary" size="compact" onClick={() => open({ type: "saida", pedidoId })}>
      <Icon icon={faArrowUp} size={11} className="text-danger" />
      Registrar saída
    </Button>
  );
}
