"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DateInput, MoneyInput } from "@/components/ds/inputs";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { addDays, todayISO } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import { sumMoney } from "@/lib/money";
import { FORMA_PAGAMENTO, FORMAS_DUPLICATA } from "@/lib/status";
import { registrarPagamento } from "../actions";
import type { NotaDetail } from "../queries";
import { distribuirPagamento, proximoNumeroSaldo } from "../regras";
import { DuplicatasDaNota } from "./cheque-drawer";

/** Pagamento fora de cheque: quita as duplicatas ligadas ou gera uma nova com o saldo. */
export function PagamentoDrawer({
  open,
  onClose,
  nota,
  duplicataId,
}: {
  open: boolean;
  onClose: () => void;
  nota: NotaDetail;
  duplicataId?: string;
}) {
  const router = useRouter();
  const [selecionadas, setSelecionadas] = useState<string[]>(duplicataId ? [duplicataId] : []);
  const [forma, setForma] = useState("");
  const [data, setData] = useState<string | null>(todayISO());
  // Enquanto o usuário não digita, o valor acompanha a soma dos toggles.
  const [valorDigitado, setValorDigitado] = useState<number | null>(null);
  const [digitou, setDigitou] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [saldoNumero, setSaldoNumero] = useState<string | null>(null);
  const [saldoVencimento, setSaldoVencimento] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const ligadas = nota.duplicatas.filter((d) => selecionadas.includes(d.id));
  const soma = sumMoney(ligadas.map((d) => d.valor));
  const valor = digitou ? valorDigitado : ligadas.length ? soma : null;
  const distribuicao = valor != null && ligadas.length ? distribuirPagamento(ligadas, valor) : null;
  const parcial = distribuicao?.ok ? distribuicao.parcial : null;
  const erroValor = errors.valor || (distribuicao && !distribuicao.ok ? distribuicao.error : undefined);

  const origem = parcial ? nota.duplicatas.find((d) => d.id === parcial.id) : undefined;
  const numeroSugerido = parcial ? proximoNumeroSaldo(parcial.numero, nota.duplicatas.map((d) => d.numero)) : "";
  const vencimentoSugerido = origem ? addDays(origem.vencimento, 30) : null;
  const numeroFinal = saldoNumero ?? numeroSugerido;
  const vencimentoFinal = saldoVencimento ?? vencimentoSugerido;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await registrarPagamento({
        notaId: nota.id,
        duplicataIds: selecionadas,
        forma: forma || undefined,
        data,
        valor,
        observacao,
        saldoNumero: parcial ? numeroFinal : null,
        saldoVencimento: parcial ? vencimentoFinal : null,
      });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error("Não foi possível registrar o pagamento", { description: result.error });
        return;
      }
      const href = `/financeiro/recibos?lote=${result.data.loteId}`;
      toast.info("Pagamento registrado", {
        description: result.message,
        action: { label: "Gerar recibo", onClick: () => router.push(href) },
      });
      onClose();
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="max-w-[560px]">
        <SheetHeader title="Registrar pagamento" description={`Nota ${nota.numero} · ${nota.emitenteDestinatario}`} />
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetBody>
            <DuplicatasDaNota
              nota={nota}
              selecionadas={selecionadas}
              onToggle={(id, ligado) => setSelecionadas((s) => (ligado ? [...s, id] : s.filter((x) => x !== id)))}
              error={errors.duplicataIds}
            />
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Forma de pagamento" htmlFor="p-forma" required error={errors.forma}>
                <NativeSelect id="p-forma" value={forma} onChange={(e) => setForma(e.target.value)} aria-invalid={!!errors.forma || undefined} className="text-body">
                  <option value="">Selecione</option>
                  {FORMAS_DUPLICATA.map((f) => (
                    <option key={f} value={f}>
                      {FORMA_PAGAMENTO[f]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Data do pagamento" htmlFor="p-data" required error={errors.data}>
                <DateInput id="p-data" value={data} onValueChange={setData} aria-invalid={!!errors.data || undefined} />
              </Field>
            </div>
            <Field
              label="Valor recebido"
              htmlFor="p-valor"
              required
              error={erroValor}
              aside={
                digitou && ligadas.length > 0 && valor !== soma ? (
                  <button type="button" onClick={() => setDigitou(false)} className="text-caption font-medium text-navy-900 underline underline-offset-2 focus-visible:shadow-focus focus-visible:outline-none">
                    Usar soma das duplicatas
                  </button>
                ) : undefined
              }
            >
              <MoneyInput
                id="p-valor"
                value={valor}
                aria-invalid={!!erroValor || undefined}
                onValueChange={(v) => {
                  setDigitou(true);
                  setValorDigitado(v);
                  setErrors((er) => ({ ...er, valor: "" }));
                }}
              />
            </Field>

            {parcial && (
              <div className="flex flex-col gap-3 rounded-card border border-navy-100 bg-navy-50 p-4">
                <p className="num text-table text-navy-900">
                  Saldo restante <strong className="font-semibold">{formatBRL(parcial.saldo)}</strong>
                  <span className="block text-caption text-navy-500">
                    A duplicata {parcial.numero} fica paga com {formatBRL(parcial.pago)}, e o saldo vira uma nova duplicata.
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Número da nova duplicata" htmlFor="p-saldo-numero" required error={errors.saldoNumero}>
                    <Input id="p-saldo-numero" className="num" value={numeroFinal} onChange={(e) => setSaldoNumero(e.target.value)} aria-invalid={!!errors.saldoNumero || undefined} />
                  </Field>
                  <Field label="Vencimento" htmlFor="p-saldo-venc" required error={errors.saldoVencimento}>
                    <DateInput id="p-saldo-venc" value={vencimentoFinal} onValueChange={setSaldoVencimento} aria-invalid={!!errors.saldoVencimento || undefined} />
                  </Field>
                </div>
              </div>
            )}

            <Field label="Observação" htmlFor="p-obs" optional>
              <Textarea id="p-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" size="compact" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="compact" loading={pending}>
              Registrar pagamento
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
