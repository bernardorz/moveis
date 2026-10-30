"use client";

import { useState } from "react";
import { faCircleCheck } from "@fortawesome/free-regular-svg-icons";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { formatBRL, formatNumero } from "@/lib/format";
import { ClienteFields } from "./cliente-card";

export type ClienteAprovacao = { nome: string; documento: string; telefone: string; email: string };

/** Confirmação de aprovação. Sem cliente vinculado, exige os dados para o contrato. */
export function ApproveDialog({
  open,
  onOpenChange,
  numero,
  total,
  precisaCliente,
  nomeSugerido,
  pending,
  errors,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numero: number;
  total: number;
  precisaCliente: boolean;
  nomeSugerido: string;
  pending: boolean;
  errors: Record<string, string>;
  onConfirm: (cliente?: ClienteAprovacao) => void;
}) {
  const [cliente, setCliente] = useState<ClienteAprovacao>({ nome: nomeSugerido, documento: "", telefone: "", email: "" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={precisaCliente ? "max-w-[520px]" : undefined}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm(precisaCliente ? cliente : undefined);
          }}
          className="flex min-h-0 flex-col"
        >
          <DialogBody icon={<Icon icon={faCircleCheck} size={16} />}>
            <DialogTitle>Aprovar orçamento {formatNumero(numero)}?</DialogTitle>
            <DialogDescription>
              Serão criados o pedido (com a estrutura deste orçamento) e o contrato com as cláusulas padrão. Depois de
              aprovado, o orçamento não pode mais ser editado.
            </DialogDescription>
            <div className="num flex items-center justify-between pt-1.5 text-caption text-navy-900">
              <span>Valor total</span>
              <span className="font-medium">{formatBRL(total)}</span>
            </div>
            {precisaCliente && (
              <div className="mt-3 flex flex-col gap-3 border-t border-navy-100 pt-4">
                <p className="text-table font-medium text-navy-900">Dados do cliente para o contrato</p>
                <ClienteFields values={cliente} onChange={setCliente} errors={errors} requireDocumento idPrefix="aprovar-cliente" />
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" size="compact" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="compact" loading={pending}>
              Aprovar e gerar pedido
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
