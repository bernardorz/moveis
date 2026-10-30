import * as React from "react";
import { cn } from "@/lib/utils";

// DS · Campos (Figma 1:2502): 40 px, borda navy-200, raio 8, texto 14.
export const fieldBase =
  "w-full min-w-0 rounded-field border border-navy-200 bg-white text-body text-navy-900 transition-[border-color,box-shadow] outline-none placeholder:text-navy-400 focus-visible:border-navy-900 focus-visible:shadow-field-focus disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-500 read-only:bg-navy-50/60 aria-invalid:border-danger-border aria-invalid:focus-visible:shadow-[0_0_0_3px_rgb(220_38_38/0.12)]";

type InputProps = React.ComponentProps<"input"> & {
  /** Ícone ou texto à esquerda (ex.: ícone de telefone, prefixo "R$"). */
  leading?: React.ReactNode;
  /** Ícone ou texto à direita (ex.: calendário, "dias úteis"). */
  trailing?: React.ReactNode;
  /** Sufixo em caixa separada à direita, como "dias úteis" nas condições. */
  addon?: React.ReactNode;
  inputSize?: "sm" | "md" | "lg";
  align?: "left" | "right" | "center";
  containerClassName?: string;
};

function Input({
  className,
  type,
  leading,
  trailing,
  addon,
  inputSize = "md",
  align = "left",
  containerClassName,
  ...props
}: InputProps) {
  const input = (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldBase,
        inputSize === "sm" && "h-8 rounded-field-sm px-2.5 text-table",
        inputSize === "md" && "h-10 px-[13px]",
        inputSize === "lg" && "h-11 px-[13px]",
        leading && "pl-[37px]",
        trailing && "pr-[41px]",
        addon && "rounded-r-none",
        align === "right" && "num text-right",
        align === "center" && "num text-center",
        !leading && !trailing && !addon && containerClassName,
        className,
      )}
      {...props}
    />
  );

  if (!leading && !trailing && !addon) return input;

  return (
    <div className={cn("relative flex w-full items-stretch", containerClassName)}>
      {leading && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-table text-navy-400">
          {leading}
        </span>
      )}
      {input}
      {trailing && (
        <span className="absolute inset-y-0 right-3 flex items-center text-navy-400">{trailing}</span>
      )}
      {addon && (
        <span className="flex shrink-0 items-center rounded-r-field border border-l-0 border-navy-200 bg-navy-50 px-3 text-table whitespace-nowrap text-navy-400">
          {addon}
        </span>
      )}
    </div>
  );
}

export { Input, type InputProps };
