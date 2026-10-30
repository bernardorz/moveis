"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConciliacaoBadge } from "@/components/ds/badge";
import { Combobox } from "@/components/ds/combobox";
import { DateInput, MoneyInput } from "@/components/ds/inputs";
import { MultiSelect } from "@/components/ds/multi-select";
import { Segmented } from "@/components/ds/segmented";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/dates";
import { EMPRESA } from "@/lib/empresa";
import { formatBRL, formatDate, formatNumero } from "@/lib/format";
import { sumMoney } from "@/lib/money";
import { CHEQUE_TIPO, isChequeEditavel, type ChequeStatus, type ChequeTipo } from "@/lib/status";
import { saveCheque } from "../actions";
import type { ChequeFormOptions, NotaDetail } from "../queries";
import { diferencaCheque } from "../regras";

export type ChequeFormValues = {
  id: string;
  tipo: ChequeTipo;
  status: ChequeStatus;
  numero: string;
  banco: string;
  emitente: string;
  favorecido: string | null;
  valor: number;
  dataEmissao: string;
  bomPara: string;
  clienteId: string | null;
  pedidoId: string | null;
  observacoes: string | null;
  duplicataIds: string[];
  /** Valor de todas as duplicatas já vinculadas, para somar e listar ao editar. */
  vinculadas: { id: string; numero: string; vencimento: string; valor: number; notaNumero: string; emitenteDestinatario: string }[];
};

export function ChequeDrawer({
  open,
  onClose,
  options,
  nota,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  options: ChequeFormOptions;
  /** Aberto pela nota: as duplicatas dela aparecem com um toggle cada. */
  nota?: NotaDetail;
  initial?: ChequeFormValues;
}) {
  const router = useRouter();
  // Nota de cliente: o cheque vem dele. Nota sem cliente: é a DH que paga.
  const notaCliente = initial ? undefined : nota?.cliente;
  const [tipo, setTipo] = useState<ChequeTipo>(initial?.tipo ?? (nota && !notaCliente ? "emitido" : "recebido"));
  const [numero, setNumero] = useState(initial?.numero ?? "");
  const [banco, setBanco] = useState(initial?.banco ?? "");
  const [emitente, setEmitente] = useState(initial?.emitente ?? notaCliente?.nome ?? (nota ? EMPRESA.nome : ""));
  const [favorecido, setFavorecido] = useState(initial ? (initial.favorecido ?? "") : notaCliente ? "" : (nota?.emitenteDestinatario ?? ""));
  const [valor, setValor] = useState<number | null>(initial?.valor ?? null);
  const [dataEmissao, setDataEmissao] = useState<string | null>(initial?.dataEmissao ?? todayISO());
  const [bomPara, setBomPara] = useState<string | null>(initial?.bomPara ?? null);
  const [clienteId, setClienteId] = useState<string | null>(initial ? initial.clienteId : (nota?.cliente?.id ?? null));
  const [pedidoId, setPedidoId] = useState<string | null>(initial ? initial.pedidoId : (nota?.pedido?.id ?? null));
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [selecionadas, setSelecionadas] = useState<string[]>(initial?.duplicataIds ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const editavel = !initial || isChequeEditavel(initial.status);
  const vinculadas = initial?.vinculadas ?? [];

  // Tudo o que pode ser escolhido, para somar o valor do que está selecionado.
  const valores = new Map<string, number>();
  for (const d of options.duplicatasLivres) valores.set(d.id, d.valor);
  for (const d of vinculadas) valores.set(d.id, d.valor);
  for (const d of nota?.duplicatas ?? []) valores.set(d.id, d.valor);
  const soma = sumMoney(selecionadas.map((id) => valores.get(id) ?? 0));

  const opcoesMulti = [...vinculadas, ...options.duplicatasLivres.filter((d) => !vinculadas.some((v) => v.id === d.id))].map((d) => ({
    value: d.id,
    group: `NF ${d.notaNumero} · ${d.emitenteDestinatario}`,
    label: `Dup ${d.numero}`,
    detail: formatDate(d.vencimento),
    amount: d.valor,
  }));

  function trocarTipo(next: ChequeTipo) {
    setTipo(next);
    // Só troca a sugestão: o que o usuário digitou fica como está.
    if (next === "emitido" && !emitente.trim()) setEmitente(EMPRESA.nome);
    if (next === "recebido" && emitente === EMPRESA.nome) setEmitente("");
  }

  const toggle = (id: string, ligado: boolean) => setSelecionadas((s) => (ligado ? [...s, id] : s.filter((x) => x !== id)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveCheque({
        id: initial?.id,
        notaId: nota?.id,
        tipo,
        numero,
        banco,
        emitente,
        favorecido,
        valor,
        dataEmissao,
        bomPara,
        clienteId,
        pedidoId,
        observacoes,
        duplicataIds: selecionadas,
      });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error(initial ? "Não foi possível salvar o cheque" : "Não foi possível lançar o cheque", { description: result.error });
        return;
      }
      const href = `/financeiro/cheques/${result.data.id}`;
      toast.info(initial ? `Cheque Nº ${result.data.numero} salvo` : `Cheque Nº ${result.data.numero} lançado`, {
        description: result.message,
        action: { label: "Abrir", onClick: () => router.push(href) },
      });
      onClose();
    });
  }

  const titulo = initial ? (nota ? `Editar vínculos · Cheque Nº ${initial.numero}` : `Editar cheque Nº ${initial.numero}`) : nota ? "Lançar cheque" : "Novo cheque";
  const diferenca = valor == null ? null : diferencaCheque(valor, soma);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="max-w-[560px]">
        <SheetHeader title={titulo} description={nota ? `Vinculado à nota ${nota.numero} · ${nota.emitenteDestinatario}` : "Dados do cheque e duplicatas que ele quita."} />
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetBody>
            <Field label="Tipo">
              {editavel ? (
                <Segmented
                  ariaLabel="Tipo do cheque"
                  className="self-start"
                  value={tipo}
                  onChange={trocarTipo}
                  options={[
                    { value: "emitido", label: CHEQUE_TIPO.emitido },
                    { value: "recebido", label: CHEQUE_TIPO.recebido },
                  ]}
                />
              ) : (
                <p className="text-table text-navy-900">{CHEQUE_TIPO[tipo]}</p>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Número" htmlFor="c-numero" required error={errors.numero}>
                <Input id="c-numero" className="num" value={numero} onChange={(e) => setNumero(e.target.value)} aria-invalid={!!errors.numero || undefined} />
              </Field>
              <Field label="Banco" htmlFor="c-banco" required error={errors.banco}>
                <Input id="c-banco" value={banco} onChange={(e) => setBanco(e.target.value)} aria-invalid={!!errors.banco || undefined} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Emitente" htmlFor="c-emitente" required error={errors.emitente}>
                <Input id="c-emitente" value={emitente} onChange={(e) => setEmitente(e.target.value)} aria-invalid={!!errors.emitente || undefined} />
              </Field>
              <Field label="Favorecido" htmlFor="c-favorecido" optional>
                <Input id="c-favorecido" value={favorecido} onChange={(e) => setFavorecido(e.target.value)} />
              </Field>
            </div>
            <Field label="Valor" htmlFor="c-valor" required error={errors.valor}>
              <MoneyInput id="c-valor" value={valor} onValueChange={setValor} aria-invalid={!!errors.valor || undefined} />
            </Field>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Data de emissão" htmlFor="c-emissao" required error={errors.dataEmissao}>
                <DateInput id="c-emissao" value={dataEmissao} onValueChange={setDataEmissao} aria-invalid={!!errors.dataEmissao || undefined} />
              </Field>
              <Field label="Bom para" htmlFor="c-bompara" required error={errors.bomPara}>
                <DateInput id="c-bompara" value={bomPara} onValueChange={setBomPara} aria-invalid={!!errors.bomPara || undefined} />
              </Field>
            </div>

            {!editavel ? (
              <p className="rounded-field border border-navy-100 bg-navy-50 px-3 py-2 text-caption text-navy-600">
                As duplicatas só podem ser trocadas enquanto o cheque está em carteira ou emitido.
              </p>
            ) : nota ? (
              <DuplicatasDaNota nota={nota} chequeId={initial?.id} selecionadas={selecionadas} onToggle={toggle} error={errors.duplicataIds} />
            ) : (
              <Field label="Duplicatas" optional>
                <MultiSelect
                  options={opcoesMulti}
                  value={selecionadas}
                  onValueChange={setSelecionadas}
                  placeholder="Buscar por nota..."
                  chipLabel={(o) => `${o.group.split(" · ")[0]} · ${o.label}`}
                />
              </Field>
            )}

            {editavel && selecionadas.length > 0 && (
              <div className="num flex flex-wrap items-center justify-between gap-2 rounded-field bg-navy-50 px-3 py-2 text-caption text-navy-600">
                <span>
                  Soma das duplicatas <strong className="font-medium text-navy-900">{formatBRL(soma)}</strong>
                </span>
                <span className="flex items-center gap-2">
                  {diferenca != null ? (
                    <ConciliacaoBadge diferenca={diferenca}>
                      {diferenca > 0 ? `Sobra ${formatBRL(diferenca)}` : `Falta ${formatBRL(-diferenca)}`}
                    </ConciliacaoBadge>
                  ) : null}
                  {valor !== soma && (
                    <button type="button" onClick={() => setValor(soma)} className="font-medium text-navy-900 underline underline-offset-2 focus-visible:shadow-focus focus-visible:outline-none">
                      Usar soma das duplicatas
                    </button>
                  )}
                </span>
              </div>
            )}

            <Field label="Pedido" htmlFor="c-pedido" optional>
              <Combobox
                id="c-pedido"
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
            <Field label="Cliente" htmlFor="c-cliente" optional>
              <Combobox
                id="c-cliente"
                options={options.clientes.map((c) => ({ value: c.id, label: c.nome }))}
                value={clienteId}
                onValueChange={setClienteId}
                placeholder="Vincular a um cliente"
              />
            </Field>
            <Field label="Observações" htmlFor="c-obs" optional>
              <Textarea id="c-obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" size="compact" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="compact" loading={pending}>
              {initial ? "Salvar" : "Lançar cheque"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** Um toggle por duplicata da nota. Paga ou em outro cheque fica travada, com o motivo. */
export function DuplicatasDaNota({
  nota,
  chequeId,
  selecionadas,
  onToggle,
  error,
}: {
  nota: NotaDetail;
  chequeId?: string;
  selecionadas: string[];
  onToggle: (id: string, ligado: boolean) => void;
  error?: string;
}) {
  const ligadas = nota.duplicatas.filter((d) => selecionadas.includes(d.id));
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="pb-1.5 text-table font-medium text-navy-900">
        Duplicatas desta nota <span aria-hidden className="text-danger">*</span>
      </legend>
      <ul className="overflow-hidden rounded-field border border-navy-200 bg-white [&>li+li]:border-t [&>li+li]:border-navy-100">
        {nota.duplicatas.map((d) => {
          const nesteCheque = !!chequeId && d.chequeAtivo?.id === chequeId;
          const livre = d.displayStatus === "em_aberto" || nesteCheque;
          const motivo = d.displayStatus === "paga" ? "Paga" : d.chequeAtivo && !nesteCheque ? `No cheque Nº ${d.chequeAtivo.numero}` : null;
          return (
            <li key={d.id}>
              <label className={livre ? "flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-navy-50" : "flex cursor-not-allowed items-center gap-3 bg-navy-50/60 px-3 py-2"}>
                <Switch
                  checked={selecionadas.includes(d.id)}
                  disabled={!livre}
                  aria-label={`Vincular duplicata ${d.numero}`}
                  onCheckedChange={(v) => onToggle(d.id, v)}
                />
                <span className={livre ? "num w-16 shrink-0 text-table font-medium text-navy-900" : "num w-16 shrink-0 text-table text-navy-400"}>{d.numero}</span>
                <span className={livre ? "num text-table text-navy-600" : "num text-table text-navy-400"}>{formatDate(d.vencimento)}</span>
                {motivo && <span className="text-overline text-navy-400">{motivo}</span>}
                <span className={livre ? "num ml-auto text-table font-medium text-navy-900" : "num ml-auto text-table text-navy-400"}>{formatBRL(d.valor)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="num text-caption text-navy-500">
        {ligadas.length} de {nota.duplicatas.length} · {formatBRL(sumMoney(ligadas.map((d) => d.valor)))}
      </p>
      {error && <p role="alert" className="text-overline text-danger">{error}</p>}
    </fieldset>
  );
}
