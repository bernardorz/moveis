import { faGears, faTruck } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { formatDate, formatNumero } from "@/lib/format";
import { PEDIDO_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { PedidoNaAgenda } from "../queries";
import { barrasDaSemana } from "../regras";
import { AbrirPedidoAgenda } from "./execucoes-client";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const ALTURA_BARRA = 24;
const ALTURA_BARRA_ATIVA = 30;

// Em produção e próximos são o foco da agenda: barras cheias e no topo da semana. O atraso muda a cor, mas não tira o destaque.
function corBarra(p: PedidoNaAgenda) {
  if (p.status === "em_producao") return p.atrasado ? "bg-danger text-white" : "bg-navy-900 text-white";
  if (p.status === "aguardando_producao") return p.atrasado ? "bg-danger-bg text-danger-strong shadow-[inset_0_0_0_2px_var(--color-danger)]" : "bg-warning text-navy-900";
  if (p.atrasado) return "bg-danger-bg text-danger-fg shadow-[inset_0_0_0_1px_var(--color-danger-soft)]";
  if (p.status === "pronto") return "bg-info-bg text-info-fg shadow-[inset_0_0_0_1px_rgb(59_130_246/0.25)]";
  return "bg-navy-100 text-navy-500";
}

const estaAtivo = (p: PedidoNaAgenda) => p.status === "em_producao" || p.status === "aguardando_producao";

function prioridade(p: PedidoNaAgenda) {
  if (p.status === "em_producao") return 0;
  return p.status === "aguardando_producao" ? 1 : 2;
}

const LEGENDA = [
  { label: "Em produção", cor: "bg-navy-900" },
  { label: "Próximos, na ordem de entrada", cor: "bg-warning" },
  { label: "Pronto", cor: "bg-info-bg shadow-[inset_0_0_0_1px_rgb(59_130_246/0.35)]" },
  { label: "Entregue", cor: "bg-navy-100" },
  { label: "Atrasado", cor: "bg-danger" },
];

export function Legenda() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-navy-500">
      {LEGENDA.map((l) => (
        <li key={l.label} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("h-3 w-5 rounded-[3px]", l.cor)} />
          {l.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <Icon icon={faTruck} size={10} />
        Previsão de entrega
      </li>
    </ul>
  );
}

export function Calendario({ mes, hoje, semanas, pedidos, proximos }: { mes: string; hoje: string; semanas: string[][]; pedidos: PedidoNaAgenda[]; proximos: PedidoNaAgenda[] }) {
  const agendados = pedidos.filter((p) => p.producaoInicio && p.producaoFim);
  const eventos = agendados.map((p) => ({ id: p.id, inicio: p.producaoInicio!, fim: p.producaoFim!, prioridade: prioridade(p) }));
  const porId = new Map(pedidos.map((p) => [p.id, p]));
  const ordem = new Map(proximos.map((p, i) => [p.id, i + 1]));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[860px]">
        <div className="grid grid-cols-7 border-b border-navy-100">
          {DIAS.map((d) => (
            <div key={d} className="px-2 py-2 text-caption font-medium text-navy-500">
              {d}
            </div>
          ))}
        </div>
        {semanas.map((semana) => {
          const { barras, linhas } = barrasDaSemana(semana, eventos);
          const entregas = semana.map((dia) => pedidos.filter((p) => p.previsaoEntrega === dia));
          return (
            <div key={semana[0]} className="relative border-b border-navy-100 last:border-b-0">
              {/* Fundo dos dias */}
              <div aria-hidden className="absolute inset-0 grid grid-cols-7">
                {semana.map((dia) => (
                  <div key={dia} className={cn("border-r border-navy-100 last:border-r-0", !dia.startsWith(mes) && "bg-navy-50/70", dia === hoje && "bg-info-bg/50")} />
                ))}
              </div>

              <div className="relative grid grid-cols-7 content-start gap-y-1 pb-2" style={{ minHeight: 104 }}>
                {semana.map((dia) => (
                  <div key={dia} className="px-2 pt-1.5" style={{ gridRow: 1 }}>
                    <span
                      className={cn(
                        "num inline-flex size-6 items-center justify-center rounded-full text-caption",
                        dia === hoje ? "bg-navy-900 font-semibold text-white" : dia.startsWith(mes) ? "text-navy-900" : "text-navy-300",
                      )}
                    >
                      {Number(dia.slice(8))}
                    </span>
                  </div>
                ))}

                {barras.map((b) => {
                  const p = porId.get(b.id)!;
                  const ativo = estaAtivo(p);
                  const posicao = ordem.get(p.id);
                  return (
                    <AbrirPedidoAgenda
                      key={b.id}
                      pedido={p}
                      title={`${formatDate(p.producaoInicio)} → ${formatDate(p.producaoFim)} · ${PEDIDO_STATUS[p.status].label}`}
                      ariaLabel={`Pedido ${formatNumero(p.numero)}, ${p.cliente}, ${PEDIDO_STATUS[p.status].label}${posicao ? `, ${posicao}º a entrar` : ""}, produção de ${formatDate(p.producaoInicio)} a ${formatDate(p.producaoFim)}`}
                      style={{ gridColumn: `${b.coluna + 1} / span ${b.dias}`, gridRow: b.linha + 2, height: ativo ? ALTURA_BARRA_ATIVA : ALTURA_BARRA }}
                      className={cn(
                        "mx-1 flex min-w-0 items-center gap-1.5 self-center overflow-hidden rounded-field-sm px-2 text-left text-caption whitespace-nowrap transition-opacity hover:opacity-85 focus-visible:shadow-focus focus-visible:outline-none",
                        ativo ? "font-semibold" : "font-medium",
                        corBarra(p),
                        b.continuaAntes && "ml-0 rounded-l-none",
                        b.continuaDepois && "mr-0 rounded-r-none",
                      )}
                    >
                      {p.status === "em_producao" && (
                        <span className="shrink-0">
                          <Icon icon={faGears} size={12} />
                        </span>
                      )}
                      {posicao && <span className={cn("num shrink-0 rounded-[3px] px-1 text-overline text-white", p.atrasado ? "bg-danger" : "bg-navy-900")}>{posicao}º</span>}
                      <span className="truncate">
                        <span className="num">{formatNumero(p.numero)}</span> {p.cliente}
                      </span>
                    </AbrirPedidoAgenda>
                  );
                })}

                {entregas.map((lista, i) =>
                  lista.length ? (
                    <div key={semana[i]} className="flex flex-col gap-1 px-1" style={{ gridColumn: i + 1, gridRow: linhas + 2 }}>
                      {lista.map((p) => (
                        <AbrirPedidoAgenda
                          key={p.id}
                          pedido={p}
                          ariaLabel={`Previsão de entrega do pedido ${formatNumero(p.numero)}, ${p.cliente}`}
                          title={`Previsão de entrega · ${p.cliente}`}
                          className={cn(
                            "num flex items-center gap-1 truncate rounded-field-sm border bg-white px-1.5 py-0.5 text-left text-overline font-medium hover:bg-navy-50 focus-visible:shadow-focus focus-visible:outline-none",
                            p.avisos.includes("entrega_atrasada") ? "border-danger-soft text-danger-fg" : p.status === "entregue" ? "border-navy-100 text-navy-400" : "border-navy-200 text-navy-700",
                          )}
                        >
                          <Icon icon={faTruck} size={9} />
                          Entrega {formatNumero(p.numero)}
                        </AbrirPedidoAgenda>
                      ))}
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
