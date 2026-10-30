"use client";

import * as React from "react";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// DS · Modal (Figma 1:3548): overlay navy 40%, cartão branco raio 16, rodapé
// navy-50 com ações à direita.

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-navy-900/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-48px)] w-[calc(100vw-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-section bg-white shadow-[0_25px_50px_-12px_rgb(0_0_0/0.25)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            aria-label="Fechar"
            className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-field-sm text-navy-400 hover:bg-navy-50 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none"
          >
            <Icon icon={faXmark} size={14} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/** Corpo com ícone opcional à esquerda (círculo de 40 px). */
function DialogBody({
  icon,
  tone = "neutral",
  className,
  children,
}: {
  icon?: React.ReactNode;
  tone?: "neutral" | "danger";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-h-0 flex-1 gap-3.5 overflow-y-auto p-5", className)}>
      {icon && (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            tone === "danger" ? "bg-danger-bg text-danger" : "bg-navy-50 text-navy-900",
          )}
        >
          {icon}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
    </div>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-[16px] leading-6 font-semibold text-navy-900", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-table text-navy-500", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex shrink-0 items-center justify-end gap-2 border-t border-navy-100 bg-navy-50 px-5 pt-[15px] pb-3.5",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
