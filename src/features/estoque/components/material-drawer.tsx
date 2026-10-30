"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DecimalInput, DimensionsInput } from "@/components/ds/inputs";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet";
import { UNIDADE_OPTIONS, type Unidade } from "@/lib/units";
import { saveMaterial } from "../actions";

export type MaterialFormValues = {
  id?: string;
  codigo?: string;
  nome: string;
  categoriaId: string;
  unidade: Unidade;
  chapaLargura: number | null;
  chapaAltura: number | null;
  chapaEspessura: number | null;
  corAcabamento: string;
  complemento: string;
  estoqueMinimo: number | null;
  saldoAtual?: number;
  custoMedio?: number;
};

export function MaterialDrawer({
  open,
  onClose,
  categorias,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  categorias: { id: string; nome: string; prefixo: string }[];
  initial?: MaterialFormValues;
}) {
  const [values, setValues] = useState<MaterialFormValues>(
    initial ?? {
      nome: "",
      categoriaId: categorias[0]?.id ?? "",
      unidade: "chapa",
      chapaLargura: 2750,
      chapaAltura: 1840,
      chapaEspessura: 18,
      corAcabamento: "",
      complemento: "",
      estoqueMinimo: null,
    },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof MaterialFormValues>(k: K, v: MaterialFormValues[K]) => setValues((s) => ({ ...s, [k]: v }));
  const isChapa = values.unidade === "chapa" || values.unidade === "m2";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveMaterial({
        ...values,
        chapaLargura: isChapa ? values.chapaLargura : null,
        chapaAltura: isChapa ? values.chapaAltura : null,
        chapaEspessura: isChapa ? values.chapaEspessura : null,
      });
      if (!result.ok) {
        setErrors(result.fields ?? {});
        toast.error("Não foi possível salvar", { description: result.error });
        return;
      }
      toast.success(result.message ?? "Material salvo", { description: values.nome });
      onClose();
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader
          title={values.id ? "Editar material" : "Novo material"}
          description={values.codigo ? `Código ${values.codigo}` : "O código é gerado pela categoria."}
        />
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetBody>
            <Field label="Nome" htmlFor="m-nome" required error={errors.nome}>
              <Input id="m-nome" value={values.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: MDF Branco TX 18 mm" aria-invalid={!!errors.nome || undefined} autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Categoria" htmlFor="m-cat" required error={errors.categoriaId}>
                <NativeSelect id="m-cat" value={values.categoriaId} onChange={(e) => set("categoriaId", e.target.value)} disabled={!!values.id}>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Unidade de medida" htmlFor="m-un" required>
                <NativeSelect id="m-un" value={values.unidade} onChange={(e) => set("unidade", e.target.value as Unidade)}>
                  {UNIDADE_OPTIONS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            {isChapa && (
              <Field label="Medida da chapa" hint="L × A × E (mm)" optional>
                <DimensionsInput
                  value={{ largura: values.chapaLargura, altura: values.chapaAltura, profundidade: values.chapaEspessura }}
                  onValueChange={(v) => setValues((s) => ({ ...s, chapaLargura: v.largura, chapaAltura: v.altura, chapaEspessura: v.profundidade }))}
                  ariaLabelPrefix="Chapa: "
                />
              </Field>
            )}
            <Field label="Cor / acabamento" htmlFor="m-cor" optional>
              <Input id="m-cor" value={values.corAcabamento} onChange={(e) => set("corAcabamento", e.target.value)} placeholder="Ex.: Branco TX" />
            </Field>
            <Field label="Complemento" htmlFor="m-comp" optional description="Aparece sob o nome na listagem (ex.: cx. 500 un).">
              <Input id="m-comp" value={values.complemento} onChange={(e) => set("complemento", e.target.value)} />
            </Field>
            <Field label="Estoque mínimo" htmlFor="m-min" required error={errors.estoqueMinimo} description="Abaixo deste saldo o material entra em alerta.">
              <DecimalInput id="m-min" value={values.estoqueMinimo} onValueChange={(v) => set("estoqueMinimo", v)} aria-invalid={!!errors.estoqueMinimo || undefined} />
            </Field>
            {!values.id && (
              <p className="rounded-field bg-navy-50 px-3 py-2 text-caption text-navy-500">
                Saldo e custo médio são calculados pelas entradas e saídas. Use “Registrar entrada” para lançar o estoque inicial.
              </p>
            )}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" size="compact" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="compact" loading={pending}>
              Salvar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
