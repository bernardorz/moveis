import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// DS · Cards de KPI (Figma 1:3228): rótulo, valor, contexto e ação. Alerta
// usa borda e faixa lateral vermelhas.

export function KpiCard({
  label,
  value,
  context,
  icon,
  tone = "default",
  progress,
  action,
  size = "md",
  className,
}: {
  label: string;
  value: React.ReactNode;
  context?: React.ReactNode;
  icon?: IconDefinition;
  tone?: "default" | "success" | "alert";
  /** 0–1: barra de progresso verde abaixo do valor. */
  progress?: number;
  action?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-card border bg-white",
        size === "md" ? "gap-3 p-5" : "gap-1 p-[17px]",
        tone === "alert" ? "border-danger-soft shadow-[inset_4px_0_0_var(--color-danger)]" : "border-navy-100",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-navy-500", size === "md" ? "text-table" : "text-caption")}>{label}</p>
        {icon && (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-field",
              tone === "alert" ? "bg-danger-bg text-danger" : "bg-navy-50 text-navy-700",
            )}
          >
            <Icon icon={icon} size={14} />
          </span>
        )}
      </div>
      <p
        className={cn(
          "num font-semibold",
          size === "md" ? "text-h1" : "text-h2",
          tone === "alert" ? "text-danger-fg" : tone === "success" ? "text-success-fg" : "text-navy-900",
        )}
      >
        {value}
      </p>
      {progress != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-navy-100" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
        </div>
      )}
      {(context || action) && (
        <div className={cn("flex items-center justify-between gap-3", size === "md" && "border-t border-navy-100 pt-3")}>
          {context && <p className={cn("num text-navy-400", size === "md" ? "text-caption" : "text-overline")}>{context}</p>}
          {action}
        </div>
      )}
    </div>
  );
}
