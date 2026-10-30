import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// DS · Stepper de status (Figma 1:3315): concluído em verde, atual navy com
// halo, futuro em contorno. Cancelado: tudo cinza + data e motivo.

export type Step = { label: string; detail?: string; state: "done" | "current" | "future" };

export function Stepper({ steps, cancelled }: { steps: Step[]; cancelled?: { detail: string } }) {
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex">
        {steps.map((step, i) => {
          const last = i === steps.length - 1;
          const nextDone = steps[i + 1] && step.state === "done" && !cancelled;
          return (
            <li key={step.label} className={cn("flex min-w-0 flex-col", last ? "shrink-0" : "flex-1")} aria-current={step.state === "current" ? "step" : undefined}>
              <div className="flex items-center">
                <span
                  className={cn(
                    "num flex size-9 shrink-0 items-center justify-center rounded-full text-body font-semibold",
                    cancelled
                      ? step.state === "future"
                        ? "border border-navy-200 bg-white text-navy-300"
                        : "bg-navy-200 text-white"
                      : step.state === "done"
                        ? "bg-success text-white"
                        : step.state === "current"
                          ? "bg-navy-900 text-white shadow-[0_0_0_4px_rgb(16_24_48/0.12)]"
                          : "border border-navy-200 bg-white text-navy-400",
                  )}
                >
                  {step.state === "done" ? <Icon icon={faCheck} size={12} /> : i + 1}
                </span>
                {!last && <span className={cn("mx-3 h-0.5 flex-1 rounded-full", nextDone ? "bg-success" : "bg-navy-100")} />}
              </div>
              <p
                className={cn(
                  "pt-2.5 text-body",
                  cancelled ? "text-navy-400" : step.state === "future" ? "text-navy-400" : "font-medium text-navy-900",
                  step.state === "current" && !cancelled && "font-semibold",
                )}
              >
                {step.label}
              </p>
              <p className="num text-caption text-navy-400">{step.detail ?? "—"}</p>
            </li>
          );
        })}
      </ol>
      {cancelled && (
        <p className="flex items-center gap-2 self-start rounded-field bg-neutral-bg px-3.5 py-2 text-caption text-neutral-fg">
          <Icon icon={faCircleXmark} size={12} />
          {cancelled.detail}
        </p>
      )}
    </div>
  );
}
