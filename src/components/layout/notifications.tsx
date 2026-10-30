"use client";

import Link from "next/link";
import { faBell } from "@fortawesome/free-regular-svg-icons";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatQuantity, type Unidade } from "@/lib/units";

type Alerta = { id: string; nome: string; codigo: string; saldoAtual: number; estoqueMinimo: number; unidade: Unidade };

export function NotificationsButton({ alertas }: { alertas: Alerta[] }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={alertas.length ? `Notificações (${alertas.length})` : "Notificações"}
        className="relative flex size-10 items-center justify-center rounded-field text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none"
      >
        <Icon icon={faBell} size={16} />
        {alertas.length > 0 && (
          <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-danger-dot ring-2 ring-white" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-navy-100 px-4 py-3">
          <p className="text-h3 text-navy-900">Notificações</p>
        </div>
        {alertas.length === 0 ? (
          <p className="px-4 py-6 text-center text-table text-navy-400">Nenhum alerta no momento.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {alertas.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/estoque/materiais?abaixo=1`}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-navy-50"
                >
                  <Icon icon={faTriangleExclamation} size={12} className="mt-1 text-danger" />
                  <span className="flex flex-col">
                    <span className="text-table font-medium text-navy-900">{a.nome}</span>
                    <span className="num text-caption text-navy-500">
                      Saldo {formatQuantity(a.saldoAtual, a.unidade)} · mín. {formatQuantity(a.estoqueMinimo, a.unidade)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
