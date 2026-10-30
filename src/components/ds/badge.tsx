import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faClock } from "@fortawesome/free-regular-svg-icons";
import {
  faArrowDown,
  faArrowUp,
  faEquals,
  faMinus,
  faPlus,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import {
  CHEQUE_STATUS,
  CONTA_STATUS,
  CONTRATO_STATUS,
  DUPLICATA_STATUS,
  NOTA_STATUS,
  RECIBO_STATUS,
  ORCAMENTO_STATUS,
  PEDIDO_STATUS,
  type Tone,
} from "@/lib/status";
import { cn } from "@/lib/utils";

// DS · Status (Figma 1:2730): pílula com ponto (ou ícone) + texto, anel de 1 px
// na cor semântica a 20%. Nunca só cor.

const TONES: Record<Tone, { pill: string; dot: string }> = {
  success: { pill: "bg-success-bg text-success-fg shadow-[0_0_0_1px_rgb(5_150_105/0.2)]", dot: "bg-success-dot" },
  warning: { pill: "bg-warning-bg text-warning-fg shadow-[0_0_0_1px_rgb(217_119_6/0.2)]", dot: "bg-warning-dot" },
  danger: { pill: "bg-danger-bg text-danger-fg shadow-[0_0_0_1px_rgb(220_38_38/0.2)]", dot: "bg-danger-dot" },
  info: { pill: "bg-info-bg text-info-fg shadow-[0_0_0_1px_rgb(37_99_235/0.2)]", dot: "bg-info-dot" },
  neutral: { pill: "bg-neutral-bg text-neutral-fg shadow-[0_0_0_1px_rgb(100_116_139/0.2)]", dot: "bg-neutral-dot" },
  muted: { pill: "bg-neutral-bg text-[#64748b] shadow-[0_0_0_1px_rgb(100_116_139/0.2)]", dot: "bg-[#cbd5e1]" },
};

export function Badge({
  tone,
  icon,
  dotClassName,
  className,
  children,
}: {
  tone: Tone;
  /** Substitui o ponto por um ícone de 10 px. */
  icon?: IconDefinition;
  dotClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-caption font-medium whitespace-nowrap",
        t.pill,
        className,
      )}
    >
      {icon ? (
        <Icon icon={icon} size={10} />
      ) : (
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", t.dot, dotClassName)} />
      )}
      {children}
    </span>
  );
}

// Tons de ponto específicos do Figma para as etapas do pedido.
const PEDIDO_DOT: Partial<Record<keyof typeof PEDIDO_STATUS, string>> = {
  aguardando_producao: "bg-[#fbbf24]",
  em_producao: "bg-[#d97706]",
};

type Entity = "orcamento" | "pedido" | "contrato" | "nota" | "duplicata" | "cheque" | "conta" | "recibo";

const MAPS = {
  orcamento: ORCAMENTO_STATUS,
  pedido: PEDIDO_STATUS,
  contrato: CONTRATO_STATUS,
  nota: NOTA_STATUS,
  recibo: RECIBO_STATUS,
  duplicata: DUPLICATA_STATUS,
  cheque: CHEQUE_STATUS,
  conta: CONTA_STATUS,
} as const;

export function StatusBadge<E extends Entity>({
  entity,
  status,
  className,
}: {
  entity: E;
  status: keyof (typeof MAPS)[E];
  className?: string;
}) {
  const meta = (MAPS[entity] as Record<string, { label: string; tone: Tone }>)[status as string];
  if (!meta) return null;
  const dot = entity === "pedido" ? PEDIDO_DOT[status as keyof typeof PEDIDO_DOT] : undefined;
  return (
    <Badge tone={meta.tone} dotClassName={dot} className={className}>
      {meta.label}
    </Badge>
  );
}

export function VenceEmBadge({ dias }: { dias: number }) {
  return (
    <Badge tone="warning" icon={faClock}>
      {dias === 0 ? "Vence hoje" : `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`}
    </Badge>
  );
}

export function EstoqueBadge({ kind }: { kind: "abaixo" | "entrada" | "saida" }) {
  if (kind === "abaixo")
    return (
      <Badge tone="danger" icon={faTriangleExclamation}>
        Abaixo do mínimo
      </Badge>
    );
  if (kind === "entrada")
    return (
      <Badge tone="success" icon={faArrowDown}>
        Entrada
      </Badge>
    );
  return (
    <Badge tone="danger" icon={faArrowUp}>
      Saída
    </Badge>
  );
}

/** Conciliação do cheque: diferença entre o valor do cheque e a soma das duplicatas. */
export function ConciliacaoBadge({ diferenca, children }: { diferenca: number; children?: React.ReactNode }) {
  if (Math.abs(diferenca) < 0.005)
    return (
      <Badge tone="success" icon={faEquals}>
        Confere
      </Badge>
    );
  return diferenca > 0 ? (
    <Badge tone="info" icon={faPlus}>
      {children ?? "Sobra"}
    </Badge>
  ) : (
    <Badge tone="danger" icon={faMinus}>
      {children ?? "Falta"}
    </Badge>
  );
}

/** Variação de quantidade em texto colorido ("+ 10 chapas" / "− 4 chapas"). */
export function DeltaText({ value, children }: { value: number; children: React.ReactNode }) {
  return (
    <span className={cn("num text-table font-semibold whitespace-nowrap", value >= 0 ? "text-success-fg" : "text-danger-fg")}>
      {children}
    </span>
  );
}
