import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faFileLines } from "@fortawesome/free-regular-svg-icons";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// DS · Estados (Figma 1:3697): toda lista e detalhe tem vazio, carregando e erro,
// sempre com uma ação clara.

export function EmptyState({
  icon = faFileLines,
  title,
  description,
  action,
  className,
  bordered = true,
}: {
  icon?: IconDefinition;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 px-8 pt-8 pb-9 text-center",
        bordered && "rounded-card border border-navy-100",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-section border border-navy-100 bg-navy-50 text-navy-500">
        <Icon icon={icon} size={20} />
      </span>
      <p className="pt-3 text-[16px] leading-6 font-semibold text-navy-900">{title}</p>
      {description && <p className="max-w-80 pb-4 text-table text-navy-500">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  description = "Ocorreu um erro ao buscar os dados. Seus registros não foram afetados.",
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-1 rounded-card border border-danger-soft bg-danger-bg/40 p-8 text-center",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-section border border-danger-soft bg-white text-danger">
        <Icon icon={faTriangleExclamation} size={20} />
      </span>
      <p className="max-w-72 pt-3 text-[16px] leading-6 font-semibold text-danger-strong">{title}</p>
      <p className="max-w-72 pb-4 text-table text-navy-500">{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ className, label = "Carregando" }: { className?: string; label?: string }) {
  return (
    <div
      aria-busy
      aria-label={label}
      className={cn("flex flex-col gap-4 rounded-card border border-navy-100 p-5", className)}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-field" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-7 w-36" />
      <div className="flex flex-col gap-2.5 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}
