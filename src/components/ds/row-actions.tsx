"use client";

import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Botão "⋮" de 28 px com o menu de ações da linha. */
export function RowActions({ label = "Ações", children }: { label?: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="ml-auto flex size-7 items-center justify-center rounded-field-sm text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none aria-expanded:bg-navy-100"
      >
        <Icon icon={faEllipsisVertical} size={13} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
