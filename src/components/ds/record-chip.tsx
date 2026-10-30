import Link from "next/link";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBuilding,
  faClipboard,
  faCreditCard,
  faFileLines,
  faHandshake,
  faNewspaper,
  faUser,
} from "@fortawesome/free-regular-svg-icons";
import { faBoxesStacked, faLinkSlash } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// DS · Vínculos entre registros (Figma 1:2907): chips clicáveis que levam ao
// registro relacionado.

export type RecordKind =
  | "cliente"
  | "orcamento"
  | "pedido"
  | "contrato"
  | "cheque"
  | "nota"
  | "fornecedor"
  | "material"
  | "recibo";

const ICONS: Record<RecordKind, IconDefinition> = {
  cliente: faUser,
  orcamento: faFileLines,
  pedido: faClipboard,
  contrato: faHandshake,
  cheque: faCreditCard,
  nota: faNewspaper,
  fornecedor: faBuilding,
  material: faBoxesStacked,
  recibo: faFileLines,
};

const chip =
  "inline-flex h-[22px] max-w-full shrink-0 items-center gap-1.5 rounded-field-sm border px-[9px] text-caption whitespace-nowrap";

export function RecordChip({
  kind,
  href,
  children,
  dot,
  after,
  className,
}: {
  kind: RecordKind;
  href?: string;
  children: React.ReactNode;
  /** Ponto de status depois do texto (ex.: contrato assinado em verde). */
  dot?: "success" | "info" | "warning" | "danger";
  /** Texto depois do ponto (ex.: "Assinado"). */
  after?: React.ReactNode;
  className?: string;
}) {
  const content = (
    <>
      <Icon icon={ICONS[kind]} size={10} className="text-navy-500" />
      <span className="truncate">{children}</span>
      {dot && (
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            dot === "success" && "bg-success-dot",
            dot === "info" && "bg-info-dot",
            dot === "warning" && "bg-warning-dot",
            dot === "danger" && "bg-danger-dot",
          )}
        />
      )}
      {after}
    </>
  );
  const classes = cn(chip, "border-navy-100 bg-navy-50 font-medium text-navy-900", className);
  if (!href) return <span className={classes}>{content}</span>;
  return (
    <Link
      href={href}
      className={cn(classes, "transition-colors hover:border-navy-200 hover:bg-navy-100 focus-visible:shadow-focus focus-visible:outline-none")}
    >
      {content}
    </Link>
  );
}

export function NoLinkChip({ children = "Sem vínculo" }: { children?: React.ReactNode }) {
  return (
    <span className={cn(chip, "border-dashed border-navy-200 text-navy-400")}>
      <Icon icon={faLinkSlash} size={10} />
      {children}
    </span>
  );
}
