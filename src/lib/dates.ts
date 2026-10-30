// Datas de negócio trafegam como string ISO "YYYY-MM-DD" (colunas `date`),
// sempre interpretadas no fuso de São Paulo, sem conversão de horário.

const TZ = "America/Sao_Paulo";

export function todayISO(now: Date = new Date()) {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

export function parseISODate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

export function diffInDays(fromIso: string, toIso: string) {
  return Math.round((parseISODate(toIso).getTime() - parseISODate(fromIso).getTime()) / 86_400_000);
}

const isWeekend = (date: Date) => date.getUTCDay() === 0 || date.getUTCDay() === 6;

/** Soma dias úteis (seg–sex). Feriados não são considerados. */
export function addBusinessDays(iso: string, days: number) {
  const date = parseISODate(iso);
  let remaining = days;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (!isWeekend(date)) remaining--;
  }
  return toISODate(date);
}

/** "DD/MM/AAAA" → "YYYY-MM-DD"; retorna null se inválida. */
export function parseBRDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, d, m, y] = match;
  const iso = `${y}-${m}-${d}`;
  const date = parseISODate(iso);
  if (toISODate(date) !== iso) return null;
  return iso;
}
