"use client";

import { useState, useTransition } from "react";
import { faEnvelope, faPenToSquare, faUser } from "@fortawesome/free-regular-svg-icons";
import { faPhone, faUserPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { Combobox } from "@/components/ds/combobox";
import { Segmented } from "@/components/ds/segmented";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { documentLabel, formatDocument, formatPhone, initials } from "@/lib/format";
import { maskCpfCnpj, maskPhone } from "@/lib/masks";
import { createClienteRapido } from "../actions";
import type { OrcamentoFormOptions } from "../queries";

type Cliente = OrcamentoFormOptions["clientes"][number];
type Mode = "cadastrado" | "novo" | "sem";

export function ClienteCard({
  clienteId,
  clienteNomeLivre,
  clientes,
  onClientes,
  onChange,
  readOnly,
}: {
  clienteId: string | null;
  clienteNomeLivre: string;
  clientes: Cliente[];
  onClientes: (clientes: Cliente[]) => void;
  onChange: (next: { clienteId: string | null; clienteNomeLivre: string }) => void;
  readOnly: boolean;
}) {
  const [mode, setMode] = useState<Mode>(clienteId || !clienteNomeLivre ? "cadastrado" : "sem");
  const selected = clientes.find((c) => c.id === clienteId);

  return (
    <section className="rounded-card border border-navy-100 bg-white lg:col-span-2">
      <div className="flex flex-col gap-3 border-b border-navy-100 px-5 pt-4 pb-[13px]">
        <div>
          <h3 className="flex items-baseline gap-1.5 text-h3 text-navy-900">
            Cliente <span className="text-overline font-normal text-navy-400">opcional</span>
          </h3>
          <p className="text-caption text-navy-400">Escolha como identificar o cliente deste orçamento.</p>
        </div>
        {!readOnly && (
          <Segmented<Mode>
            ariaLabel="Como identificar o cliente"
            size="sm"
            className="self-start"
            value={mode}
            onChange={(m) => {
              setMode(m);
              if (m === "sem") onChange({ clienteId: null, clienteNomeLivre });
              if (m === "cadastrado") onChange({ clienteId, clienteNomeLivre: "" });
            }}
            options={[
              { value: "cadastrado", label: <><Icon icon={faUser} size={11} /> Cliente cadastrado</> },
              { value: "novo", label: <><Icon icon={faUserPlus} size={11} /> Cadastrar novo</> },
              { value: "sem", label: <><Icon icon={faPenToSquare} size={11} /> Sem cadastro</> },
            ]}
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5 p-5">
        {mode === "cadastrado" && (
          <>
            {!readOnly && (
              <Field label="Buscar cliente" htmlFor="orc-cliente" className="pb-2.5">
                <Combobox
                  id="orc-cliente"
                  options={clientes.map((c) => ({
                    value: c.id,
                    label: c.nome,
                    detail: c.documento ? formatDocument(c.documento) : c.telefone ? formatPhone(c.telefone) : undefined,
                    keywords: [c.documento, c.telefone, c.email].filter(Boolean).join(" "),
                  }))}
                  value={clienteId}
                  onValueChange={(id) => onChange({ clienteId: id, clienteNomeLivre: "" })}
                  placeholder="Nome, CPF/CNPJ, telefone ou e-mail"
                  searchPlaceholder="Nome, CPF/CNPJ, telefone ou e-mail"
                  onCreate={() => setMode("novo")}
                  createLabel="Cadastrar novo cliente"
                />
              </Field>
            )}
            {selected ? (
              <ClienteResumo cliente={selected} onRemove={readOnly ? undefined : () => onChange({ clienteId: null, clienteNomeLivre: "" })} />
            ) : (
              readOnly && <p className="text-table text-navy-400">Sem cliente vinculado.</p>
            )}
          </>
        )}

        {mode === "novo" && (
          <NovoClienteForm
            onCancel={() => setMode("cadastrado")}
            onCreated={(c) => {
              onClientes([...clientes, c].sort((a, b) => a.nome.localeCompare(b.nome)));
              onChange({ clienteId: c.id, clienteNomeLivre: "" });
              setMode("cadastrado");
            }}
          />
        )}

        {mode === "sem" && (
          <Field
            label="Nome do cliente"
            htmlFor="orc-nome-livre"
            optional
            description="O cadastro completo será pedido na aprovação, porque o contrato precisa dos dados."
          >
            <Input
              id="orc-nome-livre"
              value={clienteNomeLivre}
              disabled={readOnly}
              onChange={(e) => onChange({ clienteId: null, clienteNomeLivre: e.target.value })}
              placeholder="Ex.: João Pereira"
            />
          </Field>
        )}
      </div>
    </section>
  );
}

function ClienteResumo({ cliente, onRemove }: { cliente: Cliente; onRemove?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-field border border-navy-100 bg-navy-50/60 p-[17px]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-body font-semibold text-white">
        {initials(cliente.nome)}
      </span>
      <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
        <p className="text-body font-semibold text-navy-900">{cliente.nome}</p>
        <p className="num text-caption text-navy-500">
          {cliente.documento ? `${documentLabel(cliente.documento)} ${formatDocument(cliente.documento)}` : "Sem CPF/CNPJ"}
        </p>
      </div>
      <div className="num flex flex-col gap-0.5 text-caption text-navy-600">
        {cliente.telefone && (
          <span className="flex items-center gap-1.5">
            <Icon icon={faPhone} size={10} /> {formatPhone(cliente.telefone)}
          </span>
        )}
        {cliente.email && (
          <span className="flex items-center gap-1.5">
            <Icon icon={faEnvelope} size={11} /> {cliente.email}
          </span>
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover cliente do orçamento"
          className="flex size-7 items-center justify-center rounded-field-sm text-navy-400 hover:bg-navy-100 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none"
        >
          <Icon icon={faXmark} size={16} />
        </button>
      )}
    </div>
  );
}

export function ClienteFields({
  values,
  onChange,
  errors,
  requireDocumento,
  idPrefix,
}: {
  values: { nome: string; documento: string; telefone: string; email: string };
  onChange: (v: { nome: string; documento: string; telefone: string; email: string }) => void;
  errors: Record<string, string>;
  requireDocumento?: boolean;
  idPrefix: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      <Field label="Nome / Razão social" htmlFor={`${idPrefix}-nome`} required error={errors.nome} className="sm:col-span-2">
        <Input id={`${idPrefix}-nome`} value={values.nome} onChange={(e) => onChange({ ...values, nome: e.target.value })} aria-invalid={!!errors.nome || undefined} autoFocus />
      </Field>
      <Field
        label="CPF/CNPJ"
        htmlFor={`${idPrefix}-doc`}
        required={requireDocumento}
        optional={!requireDocumento}
        error={errors.documento}
        description="Alterna para CNPJ acima de 11 dígitos"
      >
        <Input
          id={`${idPrefix}-doc`}
          inputMode="numeric"
          className="num"
          value={values.documento}
          onChange={(e) => onChange({ ...values, documento: maskCpfCnpj(e.target.value) })}
          aria-invalid={!!errors.documento || undefined}
        />
      </Field>
      <Field label="Telefone" htmlFor={`${idPrefix}-tel`} optional error={errors.telefone}>
        <Input
          id={`${idPrefix}-tel`}
          inputMode="tel"
          className="num pl-[37px]"
          leading={<Icon icon={faPhone} size={11} />}
          value={values.telefone}
          onChange={(e) => onChange({ ...values, telefone: maskPhone(e.target.value) })}
          aria-invalid={!!errors.telefone || undefined}
        />
      </Field>
      <Field label="E-mail" htmlFor={`${idPrefix}-email`} optional error={errors.email} className="sm:col-span-2">
        <Input
          id={`${idPrefix}-email`}
          type="email"
          placeholder="nome@email.com"
          value={values.email}
          onChange={(e) => onChange({ ...values, email: e.target.value })}
          aria-invalid={!!errors.email || undefined}
        />
      </Field>
    </div>
  );
}

function NovoClienteForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (c: Cliente) => void }) {
  const [values, setValues] = useState({ nome: "", documento: "", telefone: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await createClienteRapido(values);
      if (!result.ok) {
        setErrors(result.fields ?? {});
        return;
      }
      toast.success("Cliente cadastrado", { description: result.data.nome });
      onCreated(result.data);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ClienteFields values={values} onChange={setValues} errors={errors} idPrefix="novo-cliente" />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="compact" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="compact" onClick={save} loading={pending}>
          Salvar cliente
        </Button>
      </div>
    </div>
  );
}
