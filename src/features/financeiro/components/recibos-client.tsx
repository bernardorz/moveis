"use client";

import { useState, useTransition } from "react";
import { faFilePdf, faPenToSquare } from "@fortawesome/free-regular-svg-icons";
import { faBan, faPlus } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ds/confirm-dialog";
import { RowActions } from "@/components/ds/row-actions";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { formatNumero } from "@/lib/format";
import { cancelarRecibo } from "../recibos-actions";
import type { ReciboRow } from "../recibos-queries";
import { useFinanceiroDrawers } from "./financeiro-drawers";

export function NovoReciboButton({ size }: { size?: "compact" }) {
  const { open } = useFinanceiroDrawers();
  return (
    <Button size={size} onClick={() => open({ type: "recibo" })}>
      <Icon icon={faPlus} size={12} />
      Novo recibo
    </Button>
  );
}

export function ReciboRowActions({ recibo }: { recibo: ReciboRow }) {
  const { open } = useFinanceiroDrawers();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const numero = formatNumero(recibo.numero);

  const cancelar = () =>
    startTransition(async () => {
      const r = await cancelarRecibo(recibo.id, { motivo });
      if (!r.ok) {
        setError(r.fields?.motivo);
        if (!r.fields) toast.error("Não foi possível cancelar", { description: r.error });
        return;
      }
      setCancelOpen(false);
      toast.success(`Recibo ${numero} cancelado`, { description: "O número continua registrado." });
    });

  return (
    <>
      <RowActions label={`Ações do recibo ${numero}`}>
        <DropdownMenuItem asChild>
          <a href={`/financeiro/recibos/${recibo.id}/pdf`} target="_blank" rel="noreferrer">
            <Icon icon={faFilePdf} size={12} /> Visualizar PDF
          </a>
        </DropdownMenuItem>
        {!recibo.canceladoEm && (
          <>
            <DropdownMenuItem
              onSelect={() =>
                open({
                  type: "recibo",
                  recibo: {
                    id: recibo.id,
                    numero: recibo.numero,
                    tipo: recibo.tipo,
                    data: recibo.data,
                    clienteId: recibo.clienteId,
                    pagadorNome: recibo.pagadorNome,
                    pagadorDocumento: recibo.pagadorDocumento,
                    valor: recibo.valor,
                    forma: recibo.forma,
                    descricao: recibo.descricao,
                    pedidoId: recibo.pedidoId,
                    observacoes: recibo.observacoes,
                  },
                })
              }
            >
              <Icon icon={faPenToSquare} size={12} /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setCancelOpen(true)}>
              <Icon icon={faBan} size={12} /> Cancelar recibo
            </DropdownMenuItem>
          </>
        )}
      </RowActions>
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        destructive
        title={`Cancelar recibo ${numero}?`}
        description="O número continua registrado e o PDF passa a sair com a marca de cancelado. Esta ação não pode ser desfeita."
        confirmLabel="Cancelar recibo"
        cancelLabel="Voltar"
        pending={pending}
        onConfirm={cancelar}
      >
        <Field label="Motivo" htmlFor={`rc-${recibo.id}`} required error={error} className="pt-2">
          <Textarea id={`rc-${recibo.id}`} value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} aria-invalid={!!error || undefined} />
        </Field>
      </ConfirmDialog>
    </>
  );
}
