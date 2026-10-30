import { addDays, parseISODate, todayISO, toISODate } from "@/lib/dates";
import type { PedidoStatus } from "@/lib/status";

// Regras puras da agenda: avisos calculados na leitura e montagem do calendário.

export type AvisoTipo = "inicio_atrasado" | "producao_atrasada" | "entrega_atrasada" | "passa_entrega" | "sem_data";

export const AVISO_LABEL: Record<AvisoTipo, string> = {
  inicio_atrasado: "Início atrasado",
  producao_atrasada: "Produção atrasada",
  entrega_atrasada: "Entrega atrasada",
  passa_entrega: "Termina depois da entrega",
  sem_data: "Sem data",
};

type PedidoAgenda = {
  status: PedidoStatus;
  producaoInicio: string | null;
  producaoFim: string | null;
  previsaoEntrega: string | null;
};

export function avisosPedido(p: PedidoAgenda, today = todayISO()): AvisoTipo[] {
  const avisos: AvisoTipo[] = [];
  const naoIniciado = p.status === "aguardando_producao";
  const produzindo = naoIniciado || p.status === "em_producao";
  if (naoIniciado && p.producaoInicio && p.producaoInicio < today) avisos.push("inicio_atrasado");
  if (produzindo && p.producaoFim && p.producaoFim < today) avisos.push("producao_atrasada");
  if ((produzindo || p.status === "pronto") && p.previsaoEntrega && p.previsaoEntrega < today) avisos.push("entrega_atrasada");
  if (produzindo && p.producaoFim && p.previsaoEntrega && p.producaoFim > p.previsaoEntrega) avisos.push("passa_entrega");
  if (produzindo && (!p.producaoInicio || !p.producaoFim)) avisos.push("sem_data");
  return avisos;
}

/** Atraso de verdade: "Sem data" e "Termina depois da entrega" são alertas de planejamento. */
export const estaAtrasado = (avisos: AvisoTipo[]) => avisos.some((a) => a === "inicio_atrasado" || a === "producao_atrasada" || a === "entrega_atrasada");

export const mesAtual = (today = todayISO()) => today.slice(0, 7);

export function mesValido(mes: string | undefined) {
  return mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : undefined;
}

export function somarMeses(mes: string, delta: number) {
  const [ano, m] = mes.split("-").map(Number);
  const data = new Date(Date.UTC(ano, m - 1 + delta, 1));
  return toISODate(data).slice(0, 7);
}

/** "2026-11" → "novembro de 2026". */
export function nomeDoMes(mes: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(parseISODate(`${mes}-01`));
}

/** Semanas completas, de segunda a domingo, que cobrem o mês. */
export function semanasDoMes(mes: string): string[][] {
  const primeiro = `${mes}-01`;
  const diaSemana = (parseISODate(primeiro).getUTCDay() + 6) % 7; // segunda = 0
  const ultimoDoMes = addDays(`${somarMeses(mes, 1)}-01`, -1);
  const semanas: string[][] = [];
  let dia = addDays(primeiro, -diaSemana);
  while (dia <= ultimoDoMes) {
    semanas.push(Array.from({ length: 7 }, (_, i) => addDays(dia, i)));
    dia = addDays(dia, 7);
  }
  return semanas;
}

export type BarraEvento = {
  id: string;
  inicio: string;
  fim: string;
  /** Menor sobe no calendário. */
  prioridade?: number;
};
export type Barra = {
  id: string;
  /** 0 = segunda. */
  coluna: number;
  dias: number;
  linha: number;
  /** A barra vem da semana anterior ou segue para a próxima. */
  continuaAntes: boolean;
  continuaDepois: boolean;
};

/**
 * Corta cada evento nos limites da semana e o coloca na primeira linha livre,
 * começando pelos de maior prioridade, depois os que iniciam antes e, no empate, os mais longos.
 */
export function barrasDaSemana(semana: string[], eventos: BarraEvento[]) {
  const de = semana[0];
  const ate = semana[6];
  const ordenados = eventos
    .filter((e) => e.inicio <= ate && e.fim >= de)
    .map((e) => {
      const inicio = e.inicio < de ? de : e.inicio;
      const fim = e.fim > ate ? ate : e.fim;
      return { evento: e, coluna: semana.indexOf(inicio), dias: semana.indexOf(fim) - semana.indexOf(inicio) + 1 };
    })
    .sort((a, b) => (a.evento.prioridade ?? 0) - (b.evento.prioridade ?? 0) || a.coluna - b.coluna || b.dias - a.dias || a.evento.id.localeCompare(b.evento.id));

  // Colunas ocupadas por linha: com prioridade, as barras não chegam em ordem de coluna.
  const ocupadas: number[][] = [];
  const barras: Barra[] = ordenados.map(({ evento, coluna, dias }) => {
    let linha = ocupadas.findIndex((colunas) => !colunas.some((c) => c >= coluna && c < coluna + dias));
    if (linha === -1) linha = ocupadas.length;
    ocupadas[linha] = [...(ocupadas[linha] ?? []), ...Array.from({ length: dias }, (_, i) => coluna + i)];
    return { id: evento.id, coluna, dias, linha, continuaAntes: evento.inicio < de, continuaDepois: evento.fim > ate };
  });
  return { barras, linhas: ocupadas.length };
}
