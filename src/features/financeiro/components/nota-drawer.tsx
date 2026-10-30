"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { Combobox } from "@/components/ds/combobox";
import { DateInput, DecimalInput, MoneyInput } from "@/components/ds/inputs";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/dates";
import { formatBRL, formatNumero } from "@/lib/format";
import { sumMoney, toCents } from "@/lib/money";
import { saveNota } from "../actions";
import type { ChequeFormOptions } from "../queries";
import { parcelarNota } from "../regras";

export type NotaFormValues = {
  id: string;
  numero: string;
  emitenteDestinatario: string;
  dataEmissao: string;
  valorTotal: number;
  observacoes: string;
  clienteId: string | null;
  pedidoId: string | null;
  duplicatas: {
    id: string;
    numero: string;
    vencimento: string;
    valor: number;
    /** Paga ou em cheque: não pode ser alterada. */
    congelada: boolean;
    /** Tem cheque no histórico: não pode ser removida. */
    temVinculo: boolean;
    /** Saldo de um pagamento parcial: número e vencimento podem mudar, o valor não. */
    saldo: boolean;
  }[];
};

type Linha = {
  key: string;
  id?: string;
  numero: string;
  vencimento: string | null;
  valor: number | null;
  congelada?: boolean;
  temVinculo?: boolean;
  saldo?: boolean;
};

export function NotaDrawer({
  open,
  onClose,
  options,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  options: ChequeFormOptions;
  initial?: NotaFormValues;
}) {
  const router = useRouter();
  const [numero, setNumero] = useState(initial?.numero ?? "");
  const [emitente, setEmitente] = useState(initial?.emitenteDestinatario ?? "");
  const [dataEmissao, setDataEmissao] = useState<string | null>(initial?.dataEmissao ?? todayISO());
  const [valorTotal, setValorTotal] = useState<number | null>(initial?.valorTotal ?? null);
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [clienteId, setClienteId] = useState<string | null>(initial?.clienteId ?? null);
  const [pedidoId, setPedidoId] = useState<string | null>(initial?.pedidoId ?? null);
  const [linhas, setLinhas] = useState<Linha[]>(() => initial?.duplicatas.map((d) => ({ ...d, key: d.id })) ?? []);
  const [parcelas, setParcelas] = useState<number | null>(null);
  const [primeiro, setPrimeiro] = useState<string | null>(null);
  const [intervalo, setIntervalo] = useState<number | null>(30);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  // Parcelar recria as linhas, então só vale enquanto nenhuma tem pagamento ou cheque.
  const podeParcelar = !linhas.some((l) => l.congelada || l.temVinculo || l.saldo);
  const soma = sumMoney(linhas.map((l) => l.valor ?? 0));
  const diferenca = (toCents(valorTotal ?? 0) - toCents(soma)) / 100;

  function gerar() {
    const faltando: Record<string, string> = {};
    if (!valorTotal) faltando.valorTotal = "Informe o valor total.";
    if (!parcelas || parcelas < 1) faltando.parcelas = "Informe a quantidade.";
    if (!primeiro) faltando.primeiro = "Informe a data.";
    if (Object.keys(faltando).length) return setErrors(faltando);
    setErrors({});
    setLinhas(
      parcelarNota({ valorTotal: valorTotal!, parcelas: parcelas!, primeiroVencimento: primeiro!, intervaloDias: intervalo ?? 30 }).map((p) => ({
        ...p,
        key: crypto.randomUUID(),
      })),
    );
  }

  const updateLinha = (key: string, patch: Partial<Linha>) => setLinhas((rows) => rows.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveNota({
        id: initial?.id,
        numero,
        emitenteDestinatario: emitente,
        dataEmissao,
        valorTotal,
        observacoes,
        clienteId,
        pedidoId,
        duplicatas: linhas.map(({ id, numero: n, vencimento, valor }) => ({ id, numero: n, vencimento, valor })),
      });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error("Não foi possível salvar a nota", { description: result.error });
        return;
      }
      toast.success(result.message ?? "Nota salva", { description: `Nota ${numero}` });
      onClose();
      if (!initial) router.push(`/financeiro/notas/${result.data.id}`);
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="max-w-[600px]">
        <SheetHeader title={initial ? `Editar nota ${initial.numero}` : "Nova nota"} description="Nota física e suas duplicatas." />
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetBody>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Número da nota" htmlFor="n-numero" required error={errors.numero}>
                <Input id="n-numero" value={numero} onChange={(e) => setNumero(e.target.value)} aria-invalid={!!errors.numero || undefined} placeholder="Ex.: 58.214" />
              </Field>
              <Field label="Data de emissão" htmlFor="n-emissao" required error={errors.dataEmissao}>
                <DateInput id="n-emissao" value={dataEmissao} onValueChange={setDataEmissao} aria-invalid={!!errors.dataEmissao || undefined} />
              </Field>
            </div>
            <Field label="Emitente / destinatário" htmlFor="n-emitente" required error={errors.emitenteDestinatario}>
              <Input id="n-emitente" value={emitente} onChange={(e) => setEmitente(e.target.value)} aria-invalid={!!errors.emitenteDestinatario || undefined} />
            </Field>
            <Field label="Valor total" htmlFor="n-valor" required error={errors.valorTotal}>
              <MoneyInput id="n-valor" value={valorTotal} onValueChange={setValorTotal} aria-invalid={!!errors.valorTotal || undefined} />
            </Field>

            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Cliente" htmlFor="n-cliente" optional>
                <Combobox
                  id="n-cliente"
                  options={options.clientes.map((c) => ({ value: c.id, label: c.nome }))}
                  value={clienteId}
                  onValueChange={setClienteId}
                  placeholder="Vincular a um cliente"
                />
              </Field>
              <Field label="Pedido" htmlFor="n-pedido" optional>
                <Combobox
                  id="n-pedido"
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
            </div>

            {podeParcelar && (
              <fieldset className="flex flex-col gap-3 rounded-card border border-navy-100 bg-navy-50 p-4">
                <legend className="sr-only">Gerar duplicatas</legend>
                <p className="text-table font-medium text-navy-900">Gerar duplicatas</p>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Quantidade" htmlFor="n-parcelas" error={errors.parcelas}>
                    <DecimalInput id="n-parcelas" align="left" maxFractionDigits={0} value={parcelas} onValueChange={(v) => setParcelas(v == null ? null : Math.min(120, Math.round(v)))} />
                  </Field>
                  <Field label="1º vencimento" htmlFor="n-primeiro" error={errors.primeiro}>
                    <DateInput id="n-primeiro" value={primeiro} onValueChange={setPrimeiro} />
                  </Field>
                  <Field label="Intervalo" htmlFor="n-intervalo">
                    <DecimalInput id="n-intervalo" align="left" maxFractionDigits={0} value={intervalo} onValueChange={(v) => setIntervalo(v == null ? null : Math.round(v))} addon="dias" />
                  </Field>
                </div>
                <Button type="button" variant="secondary" size="compact" className="self-start" onClick={gerar}>
                  {linhas.length ? "Gerar de novo" : "Gerar duplicatas"}
                </Button>
              </fieldset>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-table font-medium text-navy-900">Duplicatas</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="compact"
                  onClick={() => setLinhas((rows) => [...rows, { key: crypto.randomUUID(), numero: "", vencimento: null, valor: null }])}
                >
                  <Icon icon={faPlus} size={10} />
                  Adicionar
                </Button>
              </div>
              {linhas.length === 0 && (
                <p className="rounded-field border border-dashed border-navy-200 px-3 py-4 text-center text-caption text-navy-400">
                  Gere as duplicatas acima ou adicione uma a uma.
                </p>
              )}
              {linhas.map((l, i) => (
                <div key={l.key} className="grid grid-cols-[88px_1fr_1fr_32px] items-start gap-2">
                  <Input
                    aria-label={`Número da duplicata ${i + 1}`}
                    value={l.numero}
                    disabled={l.congelada}
                    aria-invalid={!!errors[`duplicatas.${i}.numero`] || undefined}
                    onChange={(e) => updateLinha(l.key, { numero: e.target.value })}
                    className="num"
                  />
                  <DateInput
                    aria-label={`Vencimento da duplicata ${i + 1}`}
                    value={l.vencimento}
                    disabled={l.congelada}
                    aria-invalid={!!errors[`duplicatas.${i}.vencimento`] || undefined}
                    onValueChange={(v) => updateLinha(l.key, { vencimento: v })}
                  />
                  <MoneyInput
                    aria-label={`Valor da duplicata ${i + 1}`}
                    value={l.valor}
                    disabled={l.congelada || l.saldo}
                    aria-invalid={!!errors[`duplicatas.${i}.valor`] || undefined}
                    onValueChange={(v) => updateLinha(l.key, { valor: v })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 self-center"
                    aria-label={`Remover duplicata ${i + 1}`}
                    disabled={l.congelada || l.temVinculo || l.saldo}
                    onClick={() => setLinhas((rows) => rows.filter((x) => x.key !== l.key))}
                  >
                    <Icon icon={faTrashCan} size={12} />
                  </Button>
                </div>
              ))}
              {linhas.length > 0 && (
                <p className="num flex items-center justify-between rounded-field bg-navy-50 px-3 py-2 text-caption">
                  <span className="text-navy-500">
                    Soma <strong className="font-medium text-navy-900">{formatBRL(soma)}</strong>
                  </span>
                  {diferenca === 0 ? (
                    <span className="font-medium text-success-fg">Confere com o valor da nota</span>
                  ) : diferenca > 0 ? (
                    <span className="font-medium text-danger-fg">Faltam {formatBRL(diferenca)}</span>
                  ) : (
                    <span className="font-medium text-danger-fg">Passou {formatBRL(-diferenca)}</span>
                  )}
                </p>
              )}
              {errors.duplicatas && <p role="alert" className="text-overline text-danger">{errors.duplicatas}</p>}
            </div>

            <Field label="Observações" htmlFor="n-obs" optional>
              <Textarea id="n-obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" size="compact" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="compact" loading={pending}>
              {initial ? "Salvar" : "Cadastrar nota"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
