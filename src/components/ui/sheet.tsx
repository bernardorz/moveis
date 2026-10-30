"use client";

import * as React from "react";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Dialog as SheetPrimitive } from "radix-ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// DS · Drawer lateral (Figma 1:3548): painel branco à direita, overlay navy
// 30%, cabeçalho com título 15 px e rodapé com ações.

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-navy-900/30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col bg-white shadow-[0_25px_50px_-12px_rgb(0_0_0/0.25)] outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
          className,
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({
  title,
  description,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-navy-100 px-5 pt-4 pb-[17px]", className)}>
      <div className="flex flex-col gap-0.5">
        <SheetPrimitive.Title className="text-h3 text-navy-900">{title}</SheetPrimitive.Title>
        {description ? (
          <SheetPrimitive.Description className="text-caption text-navy-500">{description}</SheetPrimitive.Description>
        ) : (
          <SheetPrimitive.Description className="sr-only">{title}</SheetPrimitive.Description>
        )}
      </div>
      <SheetPrimitive.Close
        aria-label="Fechar"
        className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-field-sm text-navy-400 hover:bg-navy-50 hover:text-navy-900 focus-visible:shadow-focus focus-visible:outline-none"
      >
        <Icon icon={faXmark} size={16} />
      </SheetPrimitive.Close>
    </div>
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-5", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-end gap-2 border-t border-navy-100 px-5 pt-[15px] pb-3.5", className)}
      {...props}
    />
  );
}

export { Sheet, SheetBody, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTrigger };
