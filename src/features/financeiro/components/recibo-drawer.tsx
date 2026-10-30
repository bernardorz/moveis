"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Combobox } from "@/components/ds/combobox";
import { DateInput, MoneyInput } from "@/components/ds/inputs";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/dates";
import { formatDocument, formatNumero } from "@/lib/format";
import { maskCpfCnpj } from "@/lib/masks";
import { FORMA_PAGAMENTO, RECIBO_TIPO, type FormaPagamento, type ReciboTipo } from "@/lib/status";
import type { ChequeFormOptions } from "../queries";
import { saveRecibo } from "../recibos-actions";

export type ReciboFormValues = {
  id?: string;
  numero?: number;
  tipo: ReciboTipo;
  data: string;
  clienteId: string | null;
  pagadorNome: string;
  pagadorDocumento: string | null;
  valor: number | null;
  forma: FormaPagamento | "";
  descricao: string;
  pedidoId: string | null;
  observacoes: string | null;
};

const PLACEHOLDER: Record<ReciboTipo, string> = {
  pedido: "Ex.: Entrada do pedido",
  corte: "Ex.: Corte de 2 chapas de MDF 18 mm",
  montagem: "Ex.: Montagem de guarda-roupa",
  outro: "Descreva o que foi pago",
};

export function ReciboDrawer({
  open,
  onClose,
  options,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  options: ChequeFormOptions;
  initial?: ReciboFormValues;
}) {
  const [tipo, setTipo] = useState<ReciboTipo>(initial?.tipo ?? "corte");
  const [data, setData] = useState<string | null>(initial?.data ?? todayISO());
  const [clienteId, setClienteId] = useState<string | null>(initial?.clienteId ?? null);
  const [pagadorNome, setPagadorNome] = useState(initial?.pagadorNome ?? "");
  const [pagadorDocumento, setPagadorDocumento] = useState(initial?.pagadorDocumento ? formatDocument(initial.pagadorDocumento) : "");
  const [valor, setValor] = useState<number | null>(initial?.valor ?? null);
  const [forma, setForma] = useState<string>(initial?.forma ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [pedidoId, setPedidoId] = useState<string | null>(initial?.pedidoId ?? null);
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function escolherCliente(id: string | null) {
    setClienteId(id);
    const cliente = options.clientes.find((c) => c.id === id);
    if (!cliente) return;
    setPagadorNome(cliente.nome);
    setPagadorDocumento(formatDocument(cliente.documento));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveRecibo({
        id: initial?.id,
        tipo,
        data,
        clienteId,
        pagadorNome,
        pagadorDocumento,
        valor,
        forma: forma || undefined,
        descricao,
        pedidoId,
        observacoes,
      });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error("Não foi possível salvar o recibo", { description: result.error });
        return;
      }
      const numero = formatNumero(result.data.numero);
      const href = `/financeiro/recibos/${result.data.id}/pdf`;
      toast.info(initial?.id ? `Recibo ${numero} salvo` : `Recibo ${numero} emitido`, {
        action: { label: "Ver PDF", onClick: () => window.open(href, "_blank") },
      });
      onClose();
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="max-w-[520px]">
        <SheetHeader
          title={initial?.id ? `Editar recibo ${formatNumero(initial.numero!)}` : "Novo recibo"}
          description="Só gera o documento: não dá baixa em duplicatas nem em contas."
        />
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetBody>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Tipo" htmlFor="r-tipo" required>
                <NativeSelect id="r-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as ReciboTipo)} className="text-body">
                  {(Object.keys(RECIBO_TIPO) as ReciboTipo[]).map((t) => (
                    <option key={t} value={t}>
                      {RECIBO_TIPO[t]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Data" htmlFor="r-data" required error={errors.data}>
                <DateInput id="r-data" value={data} onValueChange={setData} aria-invalid={!!errors.data || undefined} />
              </Field>
            </div>
            <Field label="Pedido" htmlFor="r-pedido" required={tipo === "pedido"} optional={tipo !== "pedido"} error={errors.pedidoId}>
              <Combobox
                id="r-pedido"
                options={options.pedidos.map((p) => ({ value: p.id, label: `Pedido ${formatNumero(p.numero)}`, detail: p.cliente }))}
                value={pedidoId}
                invalid={!!errors.pedidoId}
                onValueChange={(v) => {
                  setPedidoId(v);
                  const p = options.pedidos.find((x) => x.id === v);
                  if (p) {
                    setTipo("pedido");
                    escolherCliente(p.clienteId);
                  }
                }}
                placeholder="Vincular a um pedido"
                searchPlaceholder="Número ou cliente"
              />
            </Field>
            <Field label="Cliente cadastrado" htmlFor="r-cliente" optional>
              <Combobox
                id="r-cliente"
                options={options.clientes.map((c) => ({ value: c.id, label: c.nome, detail: formatDocument(c.documento) || undefined }))}
                value={clienteId}
                onValueChange={escolherCliente}
                placeholder="Buscar cliente"
              />
            </Field>
            <div className="grid grid-cols-[1fr_170px] gap-3.5">
              <Field label="Recebido de" htmlFor="r-nome" required error={errors.pagadorNome}>
                <Input id="r-nome" value={pagadorNome} onChange={(e) => setPagadorNome(e.target.value)} aria-invalid={!!errors.pagadorNome || undefined} />
              </Field>
              <Field label="CPF/CNPJ" htmlFor="r-doc" optional>
                <Input id="r-doc" className="num" value={pagadorDocumento} onChange={(e) => setPagadorDocumento(maskCpfCnpj(e.target.value))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Valor" htmlFor="r-valor" required error={errors.valor}>
                <MoneyInput id="r-valor" value={valor} onValueChange={setValor} aria-invalid={!!errors.valor || undefined} />
              </Field>
              <Field label="Forma de pagamento" htmlFor="r-forma" required error={errors.forma}>
                <NativeSelect id="r-forma" value={forma} onChange={(e) => setForma(e.target.value)} aria-invalid={!!errors.forma || undefined} className="text-body">
                  <option value="">Selecione</option>
                  {(Object.keys(FORMA_PAGAMENTO) as FormaPagamento[]).map((f) => (
                    <option key={f} value={f}>
                      {FORMA_PAGAMENTO[f]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Referente a" htmlFor="r-desc" required error={errors.descricao}>
              <Textarea id="r-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder={PLACEHOLDER[tipo]} aria-invalid={!!errors.descricao || undefined} />
            </Field>
            <Field label="Observações" htmlFor="r-obs" optional>
              <Textarea id="r-obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" size="compact" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="compact" loading={pending}>
              {initial?.id ? "Salvar" : "Emitir recibo"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
