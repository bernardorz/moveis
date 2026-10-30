"use client";

import { useState, useTransition } from "react";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { Combobox } from "@/components/ds/combobox";
import { DateInput, DecimalInput } from "@/components/ds/inputs";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/dates";
import { formatBRL, formatNumero } from "@/lib/format";
import { lineTotal } from "@/lib/money";
import { formatQuantity, UNIDADES, type Unidade } from "@/lib/units";
import { registrarSaida } from "../actions";
import type { EstoqueFormOptions } from "../queries";

export function SaidaDrawer({
  open,
  onClose,
  options,
  materialId: initialMaterialId,
  pedidoId: initialPedidoId,
}: {
  open: boolean;
  onClose: () => void;
  options: EstoqueFormOptions;
  materialId?: string;
  pedidoId?: string;
}) {
  const [materialId, setMaterialId] = useState<string | null>(initialMaterialId ?? null);
  const [data, setData] = useState<string | null>(todayISO());
  const [quantidade, setQuantidade] = useState<number | null>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(initialPedidoId ?? null);
  const initialCliente = options.pedidos.find((p) => p.id === initialPedidoId)?.clienteId ?? null;
  const [clienteId, setClienteId] = useState<string | null>(initialCliente);
  const [observacao, setObservacao] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const material = options.materiais.find((m) => m.id === materialId);
  const unidade = material?.unidade as Unidade | undefined;
  const saldoApos = material && quantidade ? material.saldoAtual - quantidade : null;
  const insuficiente = saldoApos != null && saldoApos < 0;
  const abaixo = material && saldoApos != null && !insuficiente && saldoApos < material.estoqueMinimo;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await registrarSaida({ materialId, data, quantidade, pedidoId, clienteId, observacao });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error("Não foi possível registrar", { description: result.error });
        return;
      }
      toast.success("Saída registrada", { description: result.message });
      if (result.warning) toast.warning("Saldo ficou abaixo do mínimo", { description: result.warning });
      onClose();
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader title="Registrar saída" description="Débito de material para produção." />
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetBody>
            <Field label="Material" htmlFor="s-material" required error={errors.materialId}>
              <Combobox
                id="s-material"
                options={options.materiais.map((m) => ({
                  value: m.id,
                  label: m.nome,
                  detail: `${m.codigo} · saldo ${formatQuantity(m.saldoAtual, m.unidade as Unidade)}`,
                }))}
                value={materialId}
                onValueChange={setMaterialId}
                placeholder="Selecione o material"
                searchPlaceholder="Nome ou código"
                invalid={!!errors.materialId}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Data" htmlFor="s-data" required error={errors.data}>
                <DateInput id="s-data" value={data} onValueChange={setData} />
              </Field>
              <Field
                label="Quantidade"
                htmlFor="s-qtd"
                required
                error={errors.quantidade ?? (insuficiente ? `Saldo disponível: ${formatQuantity(material!.saldoAtual, unidade!)}` : undefined)}
              >
                <DecimalInput
                  id="s-qtd"
                  value={quantidade}
                  onValueChange={setQuantidade}
                  addon={unidade ? UNIDADES[unidade].plural : undefined}
                  aria-invalid={!!errors.quantidade || insuficiente || undefined}
                />
              </Field>
            </div>
            <Field label="Pedido" htmlFor="s-pedido" optional>
              <Combobox
                id="s-pedido"
                options={options.pedidos.map((p) => ({ value: p.id, label: `Pedido ${formatNumero(p.numero)}`, detail: p.cliente }))}
                value={pedidoId}
                onValueChange={(v) => {
                  setPedidoId(v);
                  const p = options.pedidos.find((x) => x.id === v);
                  if (p) setClienteId(p.clienteId);
                }}
                placeholder="Vincular a um pedido"
                searchPlaceholder="Número ou cliente"
              />
            </Field>
            <Field label="Cliente" htmlFor="s-cliente" optional>
              <Combobox
                id="s-cliente"
                options={options.clientes.map((c) => ({ value: c.id, label: c.nome }))}
                value={clienteId}
                onValueChange={setClienteId}
                placeholder="Vincular a um cliente"
              />
            </Field>
            <Field label="Observação" htmlFor="s-obs" optional>
              <Textarea id="s-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} placeholder="Ex.: Produção · Cozinha" />
            </Field>

            {material && unidade && quantidade && !insuficiente ? (
              <div className="num rounded-card border border-navy-100 bg-navy-50 px-4 py-3 text-caption text-navy-600">
                <p>
                  Saldo: <strong className="font-medium text-navy-900">{formatQuantity(material.saldoAtual, unidade)}</strong>
                  {" → "}
                  <strong className={abaixo ? "font-medium text-danger-fg" : "font-medium text-navy-900"}>
                    {formatQuantity(saldoApos!, unidade)}
                  </strong>{" "}
                  {UNIDADES[unidade].plural}
                </p>
                <p>
                  Custo debitado: <strong className="font-medium text-navy-900">{formatBRL(lineTotal(quantidade, material.custoMedio))}</strong> (custo médio{" "}
                  {formatBRL(material.custoMedio)})
                </p>
              </div>
            ) : null}
            {abaixo && (
              <p className="flex items-center gap-2 rounded-field border border-[#fde68a] bg-warning-bg px-3 py-2 text-caption text-[#92400e]">
                <Icon icon={faTriangleExclamation} size={12} className="text-warning" />
                O saldo ficará abaixo do mínimo ({formatQuantity(material!.estoqueMinimo, unidade!)}).
              </p>
            )}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" size="compact" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="compact" loading={pending} disabled={insuficiente}>
              Registrar saída
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
