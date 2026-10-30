"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { faCreditCard, faFileLines, faMoneyBill1, faPenToSquare, faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { faArrowRotateLeft, faCheck, faEllipsis, faLink, faPlus } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ds/confirm-dialog";
import { RowActions } from "@/components/ds/row-actions";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isChequeEditavel } from "@/lib/status";
import { deleteNota, reabrirDuplicata } from "../actions";
import type { DuplicataView, NotaDetail } from "../queries";
import { useFinanceiroDrawers } from "./financeiro-drawers";

export function NovaNotaButton({ size }: { size?: "compact" }) {
  const { open } = useFinanceiroDrawers();
  return (
    <Button size={size} onClick={() => open({ type: "nota" })}>
      <Icon icon={faPlus} size={12} />
      Nova nota
    </Button>
  );
}

export function NotaHeaderActions({ nota }: { nota: NotaDetail }) {
  const router = useRouter();
  const { open } = useFinanceiroDrawers();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const temLivre = nota.duplicatas.some((d) => d.displayStatus === "em_aberto");

  const remove = () =>
    startTransition(async () => {
      const r = await deleteNota(nota.id);
      if (!r.ok) {
        setConfirm(false);
        return void toast.error("Não foi possível excluir", { description: r.error });
      }
      toast.success("Nota excluída", { description: `Nota ${nota.numero}` });
      router.push("/financeiro/notas");
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Mais ações">
            <Icon icon={faEllipsis} size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={() =>
              open({
                type: "nota",
                nota: {
                  id: nota.id,
                  numero: nota.numero,
                  emitenteDestinatario: nota.emitenteDestinatario,
                  dataEmissao: nota.dataEmissao,
                  valorTotal: nota.valorTotal,
                  observacoes: nota.observacoes ?? "",
                  clienteId: nota.cliente?.id ?? null,
                  pedidoId: nota.pedido?.id ?? null,
                  duplicatas: nota.duplicatas.map((d) => ({
                    id: d.id,
                    numero: d.numero,
                    vencimento: d.vencimento,
                    valor: d.valor,
                    congelada: d.displayStatus !== "em_aberto",
                    temVinculo: d.temVinculo,
                    saldo: d.origemId != null,
                  })),
                },
              })
            }
          >
            <Icon icon={faPenToSquare} size={12} /> Editar nota
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
            <Icon icon={faTrashCan} size={12} /> Excluir nota
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="secondary" disabled={!temLivre} onClick={() => open({ type: "cheque", nota })}>
        <Icon icon={faCreditCard} size={14} />
        Lançar cheque
      </Button>
      <Button disabled={!temLivre} onClick={() => open({ type: "pagamento", nota })}>
        <Icon icon={faMoneyBill1} size={14} />
        Registrar pagamento
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        destructive
        title="Excluir nota?"
        description={`A nota ${nota.numero} e suas ${nota.duplicatas.length} duplicatas serão removidas. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Voltar"
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}

export function DuplicataRowActions({ nota, duplicata }: { nota: NotaDetail; duplicata: DuplicataView }) {
  const router = useRouter();
  const { open } = useFinanceiroDrawers();
  const [, startTransition] = useTransition();

  const reabrir = () =>
    startTransition(async () => {
      const r = await reabrirDuplicata(duplicata.id);
      if (!r.ok) return void toast.error("Não foi possível reabrir", { description: r.error });
      toast.success(r.message ?? "Duplicata reaberta", { description: `Duplicata ${duplicata.numero}` });
    });

  // Em cheque, a baixa vem do próprio cheque; paga por cheque só volta devolvendo o cheque.
  if (duplicata.displayStatus === "em_cheque" || (duplicata.displayStatus === "paga" && duplicata.chequeAtivo)) {
    return <span aria-hidden className="ml-auto block size-7" />;
  }

  return (
    <RowActions label={`Ações da duplicata ${duplicata.numero}`}>
      {duplicata.displayStatus === "em_aberto" ? (
        <DropdownMenuItem onSelect={() => open({ type: "pagamento", nota, duplicataId: duplicata.id })}>
          <Icon icon={faCheck} size={12} /> Registrar pagamento
        </DropdownMenuItem>
      ) : (
        <>
          {duplicata.pagamento && (
            <DropdownMenuItem onSelect={() => router.push(`/financeiro/recibos?lote=${duplicata.pagamento!.loteId}`)}>
              <Icon icon={faFileLines} size={12} /> Gerar recibo
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={reabrir}>
            <Icon icon={faArrowRotateLeft} size={12} /> Reabrir duplicata
          </DropdownMenuItem>
        </>
      )}
    </RowActions>
  );
}

/** Editar quais duplicatas da nota este cheque quita. */
export function EditarVinculosAction({ nota, cheque }: { nota: NotaDetail; cheque: NotaDetail["cheques"][number] }) {
  const { open } = useFinanceiroDrawers();
  if (!isChequeEditavel(cheque.status)) return null;
  return (
    <RowActions label={`Ações do cheque ${cheque.numero}`}>
      <DropdownMenuItem
        onSelect={() =>
          open({
            type: "cheque",
            nota,
            cheque: {
              id: cheque.id,
              tipo: cheque.tipo,
              status: cheque.status,
              numero: cheque.numero,
              banco: cheque.banco,
              emitente: cheque.emitente,
              favorecido: cheque.favorecido,
              valor: cheque.valor,
              dataEmissao: cheque.dataEmissao,
              bomPara: cheque.bomPara,
              clienteId: cheque.clienteId,
              pedidoId: cheque.pedidoId,
              observacoes: cheque.observacoes,
              duplicataIds: [...cheque.duplicataIds, ...cheque.outrasDuplicatas.map((d) => d.id)],
              vinculadas: cheque.outrasDuplicatas.map((d) => ({ id: d.id, numero: "", vencimento: "", valor: d.valor, notaNumero: "", emitenteDestinatario: "" })),
            },
          })
        }
      >
        <Icon icon={faLink} size={12} /> Editar vínculos
      </DropdownMenuItem>
    </RowActions>
  );
}
