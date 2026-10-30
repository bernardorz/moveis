import { cn } from "@/lib/utils";

/** Área de conteúdo abaixo da topbar: margem de página de 32 px. */
export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("flex flex-1 flex-col gap-5 px-8 pt-7 pb-10", className)}>{children}</main>;
}

/** Cabeçalho de página com título, subtítulo e ações (ex.: Materiais). */
export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-h2 text-navy-900">{title}</h2>
        {description && <p className="text-table text-navy-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
