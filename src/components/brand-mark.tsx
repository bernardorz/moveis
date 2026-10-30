import { cn } from "@/lib/utils";

/** Logo "DH" em caixa branca, usado no login (44) e na sidebar (36). */
export function BrandMark({ size = 36, className }: { size?: 36 | 44; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-field bg-white font-bold text-navy-900",
        size === 44 ? "size-11 text-[18px] tracking-[-0.45px]" : "size-9 text-[15px] tracking-[-0.4px]",
        className,
      )}
    >
      DH
    </span>
  );
}
