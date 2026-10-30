"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

// DS · Segmentado: fundo navy-50, opção ativa em branco com sombra leve.

type Option<T extends string> = { value: T; label: React.ReactNode; href?: string };

const item =
  "flex items-center justify-center gap-1.5 rounded-field-sm px-3.5 py-1.5 text-table font-medium whitespace-nowrap transition-colors focus-visible:shadow-focus focus-visible:outline-none";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  options: Option<T>[];
  value: T;
  onChange?: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center rounded-field border border-navy-100 bg-navy-50 p-[3px]", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        const classes = cn(
          item,
          size === "sm" && "px-2.5 py-1 text-caption",
          active ? "bg-white text-navy-900 shadow-[0_1px_1px_rgb(0_0_0/0.05)]" : "text-navy-500 hover:text-navy-900",
        );
        return o.href ? (
          <Link key={o.value} href={o.href} role="radio" aria-checked={active} className={classes} scroll={false}>
            {o.label}
          </Link>
        ) : (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={classes}
            onClick={() => onChange?.(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
