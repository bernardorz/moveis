"use client";

import { DecimalInput, DiscountInput } from "@/components/ds/inputs";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { addDays } from "@/lib/dates";
import { formatBRL, formatDate } from "@/lib/format";
import { FORMAS_PAGAMENTO, type OrcamentoDoc } from "../schemas";

type Patch = (patch: Partial<OrcamentoDoc>) => void;

/** Condições (Figma 1:742) + bloco de totais com desconto (spec: desconto em % ou R$ e total geral). */
export function Condicoes({
  doc,
  onChange,
  readOnly,
  totals,
}: {
  doc: OrcamentoDoc;
  onChange: Patch;
  readOnly: boolean;
  totals: { subtotal: number; descontoTotal: number; total: number };
}) {
  const formas = doc.formaPagamento && !FORMAS_PAGAMENTO.includes(doc.formaPagamento) ? [doc.formaPagamento, ...FORMAS_PAGAMENTO] : FORMAS_PAGAMENTO;
  const validoAte = addDays(doc.dataEmissao, doc.validadeDias || 0);

  return (
    <section className="rounded-card border border-navy-100 bg-white">
      <div className="border-b border-navy-100 px-5 pt-[15px] pb-[13px]">
        <h3 className="text-h3 text-navy-900">Condições</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Forma de pagamento" htmlFor="orc-forma">
          <NativeSelect id="orc-forma" value={doc.formaPagamento} disabled={readOnly} onChange={(e) => onChange({ formaPagamento: e.target.value })} className="text-body">
            <option value="">Selecione</option>
            {formas.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Condição detalhada" htmlFor="orc-cond">
          <Input
            id="orc-cond"
            value={doc.condicaoDetalhada}
            disabled={readOnly}
            onChange={(e) => onChange({ condicaoDetalhada: e.target.value })}
            placeholder="Ex.: Entrada de 30% via Pix + 6x em cheque"
          />
        </Field>
        <Field label="Prazo de entrega" htmlFor="orc-prazo">
          <DecimalInput
            id="orc-prazo"
            align="left"
            value={doc.prazoEntregaDias}
            maxFractionDigits={0}
            disabled={readOnly}
            onValueChange={(v) => onChange({ prazoEntregaDias: v == null ? null : Math.round(v) })}
            addon="dias úteis"
          />
        </Field>
        <Field label="Validade do orçamento" htmlFor="orc-validade">
          <DecimalInput
            id="orc-validade"
            align="left"
            value={doc.validadeDias}
            maxFractionDigits={0}
            disabled={readOnly}
            onValueChange={(v) => onChange({ validadeDias: Math.max(1, Math.round(v ?? 1)) })}
            addon={<span className="num">dias · até {formatDate(validoAte)}</span>}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-5 px-5 pb-5 lg:grid-cols-[1fr_340px]">
        <Field label="Observações" htmlFor="orc-obs" optional>
          <Textarea
            id="orc-obs"
            rows={4}
            value={doc.observacoes}
            disabled={readOnly}
            onChange={(e) => onChange({ observacoes: e.target.value })}
            placeholder="Medidas sujeitas a confirmação após medição técnica no local."
          />
        </Field>
        <div className="flex flex-col gap-3 rounded-card border border-navy-100 bg-navy-50/60 p-4">
          <Field label="Desconto" htmlFor="orc-desconto">
            <DiscountInput
              id="orc-desconto"
              tipo={doc.descontoTipo}
              valor={doc.descontoValor}
              subtotal={totals.subtotal}
              disabled={readOnly}
              onChange={({ tipo, valor }) => onChange({ descontoTipo: tipo, descontoValor: valor })}
            />
          </Field>
          <dl className="num flex flex-col gap-1.5 border-t border-navy-100 pt-3 text-table">
            <div className="flex justify-between text-navy-500">
              <dt>Subtotal</dt>
              <dd className="text-navy-900">{formatBRL(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-navy-500">
              <dt>Desconto</dt>
              <dd className={totals.descontoTotal > 0 ? "text-danger-fg" : "text-navy-900"}>
                {totals.descontoTotal > 0 ? formatBRL(-totals.descontoTotal) : formatBRL(0)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <dt className="font-semibold text-navy-900">Total geral</dt>
              <dd className="text-h2 text-navy-900">{formatBRL(totals.total)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
