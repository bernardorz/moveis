"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Combobox } from "@/components/ds/combobox";
import { DateInput, DecimalInput, MoneyInput } from "@/components/ds/inputs";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet";
import { todayISO } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import { lineTotal, round4, weightedAverageCost } from "@/lib/money";
import { formatQuantity, UNIDADES, type Unidade } from "@/lib/units";
import { createFornecedor, registrarEntrada } from "../actions";
import type { EstoqueFormOptions } from "../queries";

export function EntradaDrawer({
  open,
  onClose,
  options,
  materialId: initialMaterialId,
}: {
  open: boolean;
  onClose: () => void;
  options: EstoqueFormOptions;
  materialId?: string;
}) {
  const [materialId, setMaterialId] = useState<string | null>(initialMaterialId ?? null);
  const [data, setData] = useState<string | null>(todayISO());
  const [quantidade, setQuantidade] = useState<number | null>(null);
  const [valorUnitario, setValorUnitario] = useState<number | null>(null);
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [fornecedores, setFornecedores] = useState(options.fornecedores);
  const [novoFornecedor, setNovoFornecedor] = useState<string | null>(null);
  const [numeroNota, setNumeroNota] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const material = options.materiais.find((m) => m.id === materialId);
  const unidade = material?.unidade as Unidade | undefined;
  const total = quantidade && valorUnitario != null ? lineTotal(quantidade, valorUnitario) : null;
  const custoApos =
    material && quantidade && valorUnitario != null
      ? weightedAverageCost({ saldo: material.saldoAtual, custoMedio: material.custoMedio, quantidade, custoUnitario: valorUnitario })
      : null;

  function addFornecedor(nome: string) {
    startTransition(async () => {
      const result = await createFornecedor({ nome });
      if (!result.ok) {
        toast.error("Não foi possível cadastrar", { description: result.error });
        return;
      }
      setFornecedores((f) => [...f, result.data].sort((a, b) => a.nome.localeCompare(b.nome)));
      setFornecedorId(result.data.id);
      setNovoFornecedor(null);
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await registrarEntrada({ materialId, data, quantidade, valorUnitario, fornecedorId, numeroNota });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error("Não foi possível registrar", { description: result.error });
        return;
      }
      toast.success("Entrada registrada", { description: result.message });
      onClose();
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader title="Registrar entrada" description="Compra ou recebimento de material." />
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetBody>
            <Field label="Material" htmlFor="e-material" required error={errors.materialId}>
              <Combobox
                id="e-material"
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
              <Field label="Data" htmlFor="e-data" required error={errors.data}>
                <DateInput id="e-data" value={data} onValueChange={setData} />
              </Field>
              <Field label="Quantidade" htmlFor="e-qtd" required error={errors.quantidade}>
                <DecimalInput
                  id="e-qtd"
                  value={quantidade}
                  onValueChange={setQuantidade}
                  addon={unidade ? UNIDADES[unidade].plural : undefined}
                  aria-invalid={!!errors.quantidade || undefined}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Valor unitário" htmlFor="e-unit" required error={errors.valorUnitario}>
                <MoneyInput id="e-unit" value={valorUnitario} onValueChange={setValorUnitario} aria-invalid={!!errors.valorUnitario || undefined} />
              </Field>
              <Field label="Valor total" htmlFor="e-total" description="Edite para calcular o unitário.">
                <MoneyInput
                  id="e-total"
                  value={total}
                  onValueChange={(v) => setValorUnitario(v != null && quantidade ? round4(v / quantidade) : valorUnitario)}
                />
              </Field>
            </div>
            <Field label="Fornecedor" htmlFor="e-forn" optional>
              {novoFornecedor != null ? (
                <div className="flex gap-2">
                  <Input autoFocus value={novoFornecedor} onChange={(e) => setNovoFornecedor(e.target.value)} placeholder="Nome do fornecedor" containerClassName="flex-1" />
                  <Button type="button" variant="secondary" onClick={() => addFornecedor(novoFornecedor)} disabled={novoFornecedor.trim().length < 2}>
                    Adicionar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setNovoFornecedor(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Combobox
                  id="e-forn"
                  options={fornecedores.map((f) => ({ value: f.id, label: f.nome }))}
                  value={fornecedorId}
                  onValueChange={setFornecedorId}
                  placeholder="Selecione o fornecedor"
                  onCreate={(q) => setNovoFornecedor(q)}
                  createLabel="Cadastrar fornecedor"
                />
              )}
            </Field>
            <Field label="Nº da nota" htmlFor="e-nf" optional>
              <Input id="e-nf" value={numeroNota} onChange={(e) => setNumeroNota(e.target.value)} placeholder="Ex.: 58.390" />
            </Field>

            {material && unidade && (
              <div className="num rounded-card border border-navy-100 bg-navy-50 px-4 py-3 text-caption text-navy-600">
                <p>
                  Saldo: <strong className="font-medium text-navy-900">{formatQuantity(material.saldoAtual, unidade)}</strong>
                  {quantidade ? (
                    <>
                      {" → "}
                      <strong className="font-medium text-success-fg">{formatQuantity(material.saldoAtual + quantidade, unidade)}</strong>
                    </>
                  ) : null}{" "}
                  {UNIDADES[unidade].plural}
                </p>
                <p>
                  Custo médio: <strong className="font-medium text-navy-900">{formatBRL(material.custoMedio)}</strong>
                  {custoApos != null && (
                    <>
                      {" → "}
                      <strong className="font-medium text-navy-900">{formatBRL(custoApos)}</strong>
                    </>
                  )}
                </p>
              </div>
            )}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" size="compact" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="compact" loading={pending}>
              Registrar entrada
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
