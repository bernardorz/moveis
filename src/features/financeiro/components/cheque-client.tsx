"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { faPenToSquare, faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { faArrowsRotate, faChevronDown, faEllipsis, faPlus } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ds/confirm-dialog";
import { DateInput } from "@/components/ds/inputs";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { todayISO } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import { CHEQUE_STATUS, chequeTransicoesValidas, isChequeEditavel, isChequeLiquidado, type ChequeStatus } from "@/lib/status";
import { changeChequeStatus, deleteCheque } from "../actions";
import type { ChequeDetail } from "../queries";
import { useFinanceiroDrawers } from "./financeiro-drawers";

export function NovoChequeButton({ size }: { size?: "compact" }) {
  const { open } = useFinanceiroDrawers();
  return (
    <Button size={size} onClick={() => open({ type: "cheque" })}>
      <Icon icon={faPlus} size={12} />
      Novo cheque
    </Button>
  );
}

function textoTransicao(cheque: ChequeDetail, to: ChequeStatus) {
  const tem = cheque.duplicataIds.length > 0;
  if (isChequeLiquidado(to)) {
    return {
      title: to === "compensado" ? "Marcar cheque como compensado?" : "Marcar cheque como repassado?",
      description: tem ? "As duplicatas abaixo serão baixadas automaticamente:" : "Este cheque não tem duplicatas vinculadas.",
      confirmLabel: to === "compensado" ? "Confirmar compensação" : "Confirmar repasse",
    };
  }
  if (to === "devolvido") {
    return {
      title: "Marcar cheque como devolvido?",
      description: tem
        ? "As duplicatas abaixo voltam para Em aberto e ficam livres para outro cheque. O vínculo continua no histórico deste cheque."
        : "Este cheque não tem duplicatas vinculadas.",
      confirmLabel: "Marcar como devolvido",
    };
  }
  if (cheque.status === "devolvido") {
    return {
      title: "Reapresentar cheque?",
      description: tem ? "As duplicatas abaixo voltam a ficar Em cheque:" : "O cheque volta a valer.",
      confirmLabel: "Reapresentar",
    };
  }
  return { title: `Marcar cheque como ${CHEQUE_STATUS[to].label.toLowerCase()}?`, description: "As duplicatas continuam Em cheque até a compensação.", confirmLabel: "Confirmar" };
}

export function ChequeHeaderActions({ cheque }: { cheque: ChequeDetail }) {
  const router = useRouter();
  const { open } = useFinanceiroDrawers();
  const [destino, setDestino] = useState<ChequeStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [data, setData] = useState<string | null>(todayISO());
  const [repassadoA, setRepassadoA] = useState(cheque.favorecido ?? "");
  const [pending, startTransition] = useTransition();
  const transicoes = chequeTransicoesValidas(cheque.tipo, cheque.status);
  const editavel = isChequeEditavel(cheque.status);
  const texto = destino ? textoTransicao(cheque, destino) : null;

  const confirmar = () =>
    startTransition(async () => {
      if (!destino) return;
      const r = await changeChequeStatus(cheque.id, { status: destino, data: isChequeLiquidado(destino) ? data : undefined, favorecido: destino === "repassado" ? repassadoA : undefined });
      if (!r.ok) return void toast.error("Não foi possível alterar o status", { description: r.error });
      setDestino(null);
      toast.success(`Cheque ${CHEQUE_STATUS[destino].label.toLowerCase()}`, { description: r.message ?? `Cheque Nº ${cheque.numero}` });
    });

  const remove = () =>
    startTransition(async () => {
      const r = await deleteCheque(cheque.id);
      if (!r.ok) {
        setConfirmDelete(false);
        return void toast.error("Não foi possível excluir", { description: r.error });
      }
      toast.success("Cheque excluído", { description: `Cheque Nº ${cheque.numero}` });
      router.push("/financeiro/cheques");
    });

  const editar = () =>
    open({
      type: "cheque",
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
        duplicataIds: cheque.duplicataIds,
        vinculadas: cheque.grupos.flatMap((g) =>
          g.duplicatas.map((d) => ({
            id: d.id,
            numero: d.numero,
            vencimento: d.vencimento,
            valor: d.valor,
            notaNumero: g.nota.numero,
            emitenteDestinatario: g.nota.emitenteDestinatario,
          })),
        ),
      },
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
          <DropdownMenuItem onSelect={editar}>
            <Icon icon={faPenToSquare} size={12} /> Editar cheque
          </DropdownMenuItem>
          {editavel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Icon icon={faTrashCan} size={12} /> Excluir cheque
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <Icon icon={faArrowsRotate} size={12} />
            Alterar status
            <Icon icon={faChevronDown} size={9} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {transicoes.map((to) => (
            <DropdownMenuItem key={to} onSelect={() => setDestino(to)}>
              {cheque.status === "devolvido" ? "Reapresentar" : CHEQUE_STATUS[to].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={destino != null}
        onOpenChange={(v) => !v && setDestino(null)}
        destructive={destino === "devolvido"}
        title={texto?.title ?? ""}
        description={texto?.description ?? ""}
        confirmLabel={texto?.confirmLabel ?? "Confirmar"}
        pending={pending}
        onConfirm={confirmar}
      >
        {cheque.duplicataIds.length > 0 && (
          <ul className="num flex max-h-48 flex-col gap-1 overflow-y-auto pt-1.5 text-caption text-navy-900">
            {cheque.grupos.flatMap((g) =>
              g.duplicatas.map((d) => (
                <li key={d.id} className="flex justify-between gap-3">
                  <span>
                    NF {g.nota.numero} · Dup {d.numero}
                  </span>
                  <span className="font-medium">{formatBRL(d.valor)}</span>
                </li>
              )),
            )}
          </ul>
        )}
        {destino && isChequeLiquidado(destino) && cheque.diferenca < 0 && (
          <p className="mt-2 rounded-field bg-warning-bg px-3 py-2 text-caption text-warning-fg">
            O cheque cobre {formatBRL(-cheque.diferenca)} a menos que a soma das duplicatas, mas todas serão baixadas por inteiro.
          </p>
        )}
        {destino && isChequeLiquidado(destino) && (
          <Field label={destino === "compensado" ? "Data da compensação" : "Data do repasse"} htmlFor="c-data" required className="pt-2">
            <DateInput id="c-data" value={data} onValueChange={setData} />
          </Field>
        )}
        {destino === "repassado" && (
          <Field label="Repassado a" htmlFor="c-repassado" optional className="pt-2">
            <Input id="c-repassado" value={repassadoA} onChange={(e) => setRepassadoA(e.target.value)} />
          </Field>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        destructive
        title="Excluir cheque?"
        description={`O cheque Nº ${cheque.numero} será removido e as duplicatas vinculadas voltam para Em aberto. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Voltar"
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}
