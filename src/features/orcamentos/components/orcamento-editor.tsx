"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  faCalendar,
  faCircleCheck,
  faFileLines,
  faFilePdf,
  faHourglass,
  faPaperPlane,
  faTrashCan,
} from "@fortawesome/free-regular-svg-icons";
import {
  faArrowRotateLeft,
  faBan,
  faCheck,
  faCircleExclamation,
  faCircleNotch,
  faEllipsis,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ds/badge";
import { ConfirmDialog } from "@/components/ds/confirm-dialog";
import { DateInput } from "@/components/ds/inputs";
import { RecordChip } from "@/components/ds/record-chip";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { addDays } from "@/lib/dates";
import { formatDate, formatNumero, formatTime } from "@/lib/format";
import { isOrcamentoEditable } from "@/lib/status";
import {
  approveOrcamento,
  changeOrcamentoStatus,
  deleteOrcamento,
  duplicateOrcamento,
  saveOrcamento,
} from "../actions";
import type { OrcamentoDetail, OrcamentoFormOptions } from "../queries";
import type { OrcamentoDoc } from "../schemas";
import { orcamentoTotals } from "../totals";
import { ApproveDialog, type ClienteAprovacao } from "./approve-dialog";
import { ClienteCard } from "./cliente-card";
import { Condicoes } from "./condicoes";
import { DuplicarIcon, Estrutura } from "./estrutura";

type SaveState = { status: "saved" | "pending" | "saving" | "error"; at: Date };

const AUTOSAVE_MS = 800;

export function OrcamentoEditor({ orcamento, options }: { orcamento: OrcamentoDetail; options: OrcamentoFormOptions }) {
  const router = useRouter();
  const [doc, setDoc] = useState<OrcamentoDoc>(orcamento.doc);
  const [clientes, setClientes] = useState(options.clientes);
  const [save, setSave] = useState<SaveState>({ status: "saved", at: new Date(orcamento.updatedAt) });
  const [collapsed, setCollapsed] = useState<Set<string>>(() => initialCollapsed(orcamento.doc));
  const [dialog, setDialog] = useState<"approve" | "delete" | null>(null);
  const [approveErrors, setApproveErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const readOnly = !isOrcamentoEditable(orcamento.displayStatus);
  const totals = useMemo(
    () => orcamentoTotals(doc.comodos, { tipo: doc.descontoTipo, valor: doc.descontoValor }),
    [doc.comodos, doc.descontoTipo, doc.descontoValor],
  );

  // Autosave com debounce. `version` evita que uma resposta antiga sobrescreva o estado.
  const version = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(doc);
  const runSaveRef = useRef<() => Promise<boolean>>(async () => true);
  useEffect(() => {
    latest.current = doc;
  }, [doc]);

  const runSave = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const v = ++version.current;
    setSave((s) => ({ ...s, status: "saving" }));
    const result = await saveOrcamento(orcamento.id, latest.current);
    if (v !== version.current) return result.ok;
    if (result.ok) {
      setSave({ status: "saved", at: new Date(result.data.savedAt) });
    } else {
      setSave((s) => ({ ...s, status: "error" }));
      toast.error("Não foi possível salvar", {
        description: result.error,
        action: { label: "Tentar de novo", onClick: () => void runSaveRef.current() },
      });
    }
    return result.ok;
  }, [orcamento.id]);
  useEffect(() => {
    runSaveRef.current = runSave;
  }, [runSave]);

  const update = useCallback(
    (patch: Partial<OrcamentoDoc>) => {
      if (readOnly) return;
      setDoc((d) => ({ ...d, ...patch }));
      setSave((s) => ({ ...s, status: "pending" }));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void runSave(), AUTOSAVE_MS);
    },
    [readOnly, runSave],
  );

  // Salva antes de sair da página se houver alteração pendente.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timer.current || save.status === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [save.status]);
  useEffect(() => () => {
    if (timer.current) void runSave();
  }, [runSave]);

  async function flush() {
    if (timer.current || save.status !== "saved") return runSave();
    return true;
  }

  function act(fn: () => Promise<void>) {
    startTransition(async () => {
      if (!(await flush())) return;
      await fn();
    });
  }

  const statusAction = (action: "enviar" | "recusar" | "reabrir" | "renovar", message: string) =>
    act(async () => {
      const r = await changeOrcamentoStatus(orcamento.id, action);
      if (!r.ok) return void toast.error("Não foi possível alterar o status", { description: r.error });
      toast.success(message, { description: `Orçamento ${formatNumero(orcamento.numero)}` });
      router.refresh();
    });

  const duplicate = () =>
    act(async () => {
      const r = await duplicateOrcamento(orcamento.id);
      if (!r.ok) return void toast.error("Não foi possível duplicar", { description: r.error });
      toast.success("Orçamento duplicado", { description: r.message });
      router.push(`/orcamentos/${r.data.id}`);
    });

  const openPdf = () => {
    // A aba abre já no clique: depois de um await, o navegador a bloquearia como pop-up.
    const tab = window.open("", "_blank");
    startTransition(async () => {
      if (!(await flush())) return void tab?.close();
      if (tab) tab.location.href = `/orcamentos/${orcamento.id}/pdf`;
      else toast.error("Não foi possível abrir o PDF", { description: "Permita pop-ups para este site e tente de novo." });
    });
  };

  const approve = (cliente?: ClienteAprovacao) =>
    act(async () => {
      const r = await approveOrcamento(orcamento.id, cliente);
      if (!r.ok) {
        setApproveErrors(r.fields ?? {});
        if (!r.fields) toast.error("Não foi possível aprovar", { description: r.error });
        return;
      }
      setDialog(null);
      const href = `/pedidos/${r.data.pedidoId}`;
      toast.info(`Pedido ${formatNumero(r.data.pedidoNumero)} criado`, {
        description: `A partir do Orçamento ${formatNumero(r.data.orcamentoNumero)} aprovado.`,
        action: { label: "Abrir", onClick: () => router.push(href) },
      });
      router.push(href);
    });

  const remove = () =>
    startTransition(async () => {
      const r = await deleteOrcamento(orcamento.id);
      if (!r.ok) return void toast.error("Não foi possível excluir", { description: r.error });
      toast.success("Orçamento excluído", { description: `Orçamento ${formatNumero(orcamento.numero)}` });
      router.push("/orcamentos");
    });

  const status = orcamento.displayStatus;
  const validoAte = addDays(doc.dataEmissao, doc.validadeDias);
  const clienteNome = clientes.find((c) => c.id === doc.clienteId)?.nome ?? doc.clienteNomeLivre;

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho do registro (Figma 1:227) */}
      <section className="flex flex-wrap items-center gap-4 rounded-card border border-navy-100 bg-white p-[21px]">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-card bg-navy-900 text-white">
            <Icon icon={faFileLines} size={18} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-h2 text-navy-900">Orçamento {formatNumero(orcamento.numero)}</h2>
              <StatusBadge entity="orcamento" status={status} />
              {orcamento.pedido && (
                <RecordChip kind="pedido" href={`/pedidos/${orcamento.pedido.id}`}>
                  Pedido {formatNumero(orcamento.pedido.numero)}
                </RecordChip>
              )}
            </div>
            <div className="num flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-navy-500">
              <span className="flex items-center gap-1">
                <Icon icon={faCalendar} size={12} /> Emitido em <strong className="font-medium text-navy-900">{formatDate(doc.dataEmissao)}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Icon icon={faHourglass} size={12} /> Válido até{" "}
                <strong className={status === "expirado" ? "font-medium text-danger-fg" : "font-medium text-navy-900"}>{formatDate(validoAte)}</strong>
              </span>
            </div>
            {!readOnly && <SaveIndicator state={save} />}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" aria-label="Mais ações">
                <Icon icon={faEllipsis} size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {(status === "rascunho" || status === "enviado" || status === "expirado") && (
                <DropdownMenuItem onSelect={() => statusAction("recusar", "Orçamento marcado como recusado")}>
                  <Icon icon={faBan} size={12} /> Marcar como recusado
                </DropdownMenuItem>
              )}
              {(status === "recusado" || status === "enviado") && (
                <DropdownMenuItem onSelect={() => statusAction("reabrir", "Orçamento reaberto como rascunho")}>
                  <Icon icon={faArrowRotateLeft} size={12} /> Voltar para rascunho
                </DropdownMenuItem>
              )}
              {status === "expirado" && (
                <DropdownMenuItem onSelect={() => statusAction("renovar", "Validade renovada a partir de hoje")}>
                  <Icon icon={faHourglass} size={12} /> Renovar validade
                </DropdownMenuItem>
              )}
              {status !== "aprovado" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                    <Icon icon={faTrashCan} size={12} /> Excluir orçamento
                  </DropdownMenuItem>
                </>
              )}
              {status === "aprovado" && <DropdownMenuItem disabled>Sem ações disponíveis</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="secondary" onClick={duplicate} disabled={pending}>
            <DuplicarIcon size={14} />
            Duplicar
          </Button>
          <Button variant="secondary" onClick={openPdf} disabled={pending}>
            <Icon icon={faFilePdf} size={14} />
            Visualizar PDF
          </Button>
          {status === "rascunho" && (
            <Button variant="secondary" onClick={() => statusAction("enviar", "Orçamento marcado como enviado")} disabled={pending}>
              <Icon icon={faPaperPlane} size={14} />
              Marcar como enviado
            </Button>
          )}
          {(status === "rascunho" || status === "enviado") && (
            <Button
              onClick={() => {
                setApproveErrors({});
                setDialog("approve");
              }}
              disabled={pending}
            >
              <Icon icon={faCheck} size={12} />
              Aprovar
            </Button>
          )}
          {orcamento.pedido && (
            <Button asChild>
              <Link href={`/pedidos/${orcamento.pedido.id}`}>Abrir pedido</Link>
            </Button>
          )}
        </div>
      </section>

      {readOnly && (
        <p className="flex items-center gap-2 rounded-field border border-navy-100 bg-white px-4 py-2.5 text-table text-navy-600">
          <Icon icon={faCircleExclamation} size={12} className="text-navy-400" />
          {status === "aprovado" && "Orçamento aprovado: a estrutura foi copiada para o pedido e não pode mais ser editada."}
          {status === "recusado" && "Orçamento recusado. Volte para rascunho para editar novamente."}
          {status === "expirado" && "A validade deste orçamento venceu. Renove a validade para editar ou aprovar."}
        </p>
      )}

      {/* Cliente + dados (Figma 1:279) */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <ClienteCard
          clienteId={doc.clienteId}
          clienteNomeLivre={doc.clienteNomeLivre}
          clientes={clientes}
          onClientes={setClientes}
          onChange={update}
          readOnly={readOnly}
        />
        <section className="rounded-card border border-navy-100 bg-white">
          <div className="border-b border-navy-100 px-5 pt-[15px] pb-[13px]">
            <h3 className="text-h3 text-navy-900">Dados do orçamento</h3>
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data de emissão" htmlFor="orc-emissao">
                <DateInput id="orc-emissao" value={doc.dataEmissao} disabled={readOnly} onValueChange={(v) => v && update({ dataEmissao: v })} />
              </Field>
              <Field label="Vendedor" htmlFor="orc-vendedor">
                <NativeSelect
                  id="orc-vendedor"
                  value={doc.vendedorId ?? ""}
                  disabled={readOnly}
                  onChange={(e) => update({ vendedorId: e.target.value || null })}
                  className="text-body"
                >
                  <option value="">Sem vendedor</option>
                  {options.vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Endereço da obra" htmlFor="orc-endereco" optional>
              <Input
                id="orc-endereco"
                value={doc.enderecoObra}
                disabled={readOnly}
                onChange={(e) => update({ enderecoObra: e.target.value })}
                placeholder="Rua, número, complemento · cidade"
              />
            </Field>
          </div>
        </section>
      </div>

      <Estrutura
        comodos={doc.comodos}
        onChange={(comodos) => update({ comodos })}
        readOnly={readOnly}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        materiais={options.materiais}
      />

      <Condicoes doc={doc} onChange={update} readOnly={readOnly} totals={totals} />

      {dialog === "approve" && (
        <ApproveDialog
          open
          onOpenChange={(v) => !v && setDialog(null)}
          numero={orcamento.numero}
          total={totals.total}
          precisaCliente={!doc.clienteId}
          nomeSugerido={clienteNome}
          pending={pending}
          errors={approveErrors}
          onConfirm={approve}
        />
      )}
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(v) => !v && setDialog(null)}
        destructive
        title="Excluir orçamento?"
        description={`“Orçamento ${formatNumero(orcamento.numero)}${clienteNome ? ` · ${clienteNome}` : ""}” será removido. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Voltar"
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state.status === "saving" || state.status === "pending")
    return (
      <span className="flex items-center gap-1 text-caption text-navy-400" aria-live="polite">
        <Icon icon={faCircleNotch} size={11} className={state.status === "saving" ? "animate-spin" : undefined} />
        {state.status === "saving" ? "Salvando..." : "Alterações pendentes"}
      </span>
    );
  if (state.status === "error")
    return (
      <span className="flex items-center gap-1 text-caption text-danger" aria-live="polite">
        <Icon icon={faCircleExclamation} size={11} /> Não foi possível salvar
      </span>
    );
  return (
    <span className="num flex items-center gap-1 text-caption text-success-fg" aria-live="polite">
      <Icon icon={faCircleCheck} size={12} /> Salvo automaticamente às {formatTime(state.at)}
    </span>
  );
}

/** Abre o primeiro cômodo e o primeiro móvel; o resto começa recolhido (como no Figma). */
function initialCollapsed(doc: OrcamentoDoc) {
  const set = new Set<string>();
  doc.comodos.forEach((c, ci) => {
    if (ci > 0) set.add(c.id);
    c.moveis.forEach((m, mi) => {
      if (ci > 0 || mi > 0) set.add(m.id);
    });
  });
  return set;
}
