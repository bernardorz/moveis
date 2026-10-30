"use client";

import { faCircleCheck } from "@fortawesome/free-regular-svg-icons";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";

// DS · Modal de confirmação: explica a consequência. Ação destrutiva em
// vermelho e sempre com confirmação.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive,
  pending,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={destructive ? "max-w-[400px]" : undefined}>
        <DialogBody
          tone={destructive ? "danger" : "neutral"}
          icon={<Icon icon={destructive ? faTriangleExclamation : faCircleCheck} size={16} />}
        >
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {children}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" size="compact" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "destructive" : "primary"} size="compact" loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
