"use client";

import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { formatBRL } from "@/lib/format";

// DS · Gráfico de barras agrupadas (Figma 1:3228): previsto #C9CFDE ×
// realizado #101830, grade horizontal navy-100, sem grade vertical, eixo Y
// com R$, marcador do mês atual e tooltip navy com valor formatado.

export type BarDatum = { mes: string; previsto: number; realizado: number };

const compactBRL = (v: number) =>
  v >= 1000 ? `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v / 1000)} mil` : formatBRL(v);

function NavyTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-field bg-navy-900 px-3 py-2 text-caption text-white shadow-popover">
      <p className="pb-1 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="num flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-navy-300">
            <span className="size-2 rounded-[2px]" style={{ background: p.dataKey === "previsto" ? "#c9cfde" : "#ffffff" }} />
            {p.dataKey === "previsto" ? "A receber" : "Recebido"}
          </span>
          {formatBRL(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

export function BarChart({ data, mesAtual, height = 260 }: { data: BarDatum[]; mesAtual?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} barGap={4} barCategoryGap="28%" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#eef0f5" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#8a93ad", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} width={72} tick={{ fill: "#8a93ad", fontSize: 11 }} tickFormatter={compactBRL} />
        <Tooltip cursor={{ fill: "rgb(16 24 48 / 0.04)" }} content={<NavyTooltip />} />
        {mesAtual && <ReferenceLine x={mesAtual} stroke="#b9c0d2" strokeDasharray="3 3" />}
        <Bar dataKey="previsto" name="A receber" fill="#c9cfde" radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="realizado" name="Recebido" fill="#101830" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </RBarChart>
    </ResponsiveContainer>
  );
}
