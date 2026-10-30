import * as React from "react";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// Rótulo + campo + ajuda/erro. Obrigatório com "*" vermelho; opcional em cinza.

export function FieldLabel({
  htmlFor,
  required,
  optional,
  hint,
  children,
  className,
  aside,
}: {
  htmlFor?: string;
  required?: boolean;
  /** true mostra "opcional"; string mostra o texto (ex.: "pesquisável"). */
  optional?: boolean | string;
  /** Complemento em cinza no próprio rótulo (ex.: "L × A × P (mm)"). */
  hint?: string;
  children: React.ReactNode;
  className?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-table font-medium whitespace-nowrap text-navy-900"
      >
        <span>
          {children}
          {hint && <span className="font-normal text-navy-400"> {hint}</span>}
        </span>
        {required && (
          <span aria-hidden className="-ml-0.5 text-danger">
            *
          </span>
        )}
        {optional && (
          <span className="text-overline font-normal text-navy-400">
            {optional === true ? "opcional" : optional}
          </span>
        )}
      </label>
      {aside}
    </div>
  );
}

export function FieldMessage({ error, children }: { error?: boolean; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role={error ? "alert" : undefined}
      className={cn("flex items-center gap-1 text-overline", error ? "text-danger" : "text-navy-400")}
    >
      {error && <Icon icon={faCircleExclamation} size={11} />}
      {children}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  optional,
  hint,
  description,
  error,
  aside,
  className,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean | string;
  hint?: string;
  description?: React.ReactNode;
  error?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <FieldLabel htmlFor={htmlFor} required={required} optional={optional} hint={hint} aside={aside}>
          {label}
        </FieldLabel>
      )}
      {children}
      {error ? <FieldMessage error>{error}</FieldMessage> : <FieldMessage>{description}</FieldMessage>}
    </div>
  );
}
