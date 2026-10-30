import { addDays } from "@/lib/dates";
import { fromCents, round2, sumMoney, toCents } from "@/lib/money";
import { isChequeAtivo, type ChequeStatus, type DuplicataDisplayStatus, type NotaStatus } from "@/lib/status";

// Regras puras de notas, duplicatas e cheques. A nota não guarda status: ele
// sai das duplicatas, e o "Em cheque" da duplicata sai dos cheques vinculados.

export function duplicataDisplayStatus(
  duplicata: { status: "em_aberto" | "paga" },
  chequeStatuses: ChequeStatus[],
): DuplicataDisplayStatus {
  if (duplicata.status === "paga") return "paga";
  return chequeStatuses.some(isChequeAtivo) ? "em_cheque" : "em_aberto";
}

/** Toda nota com cheque lançado ou baixa já é parcial, até a última duplicata ser paga. */
export function notaStatus(counts: { total: number; pagas: number; emCheque: number }): NotaStatus {
  if (counts.total > 0 && counts.pagas === counts.total) return "paga";
  return counts.pagas > 0 || counts.emCheque > 0 ? "parcial" : "em_aberto";
}

export function notaResumo(duplicatas: { valor: number; displayStatus: DuplicataDisplayStatus }[]) {
  const de = (status: DuplicataDisplayStatus) => duplicatas.filter((d) => d.displayStatus === status);
  const soma = (rows: { valor: number }[]) => sumMoney(rows.map((d) => d.valor));
  const pagas = de("paga");
  const emCheque = de("em_cheque");
  const emAberto = de("em_aberto");
  return {
    status: notaStatus({ total: duplicatas.length, pagas: pagas.length, emCheque: emCheque.length }),
    pago: { valor: soma(pagas), quantidade: pagas.length },
    emCheque: { valor: soma(emCheque), quantidade: emCheque.length },
    emAberto: { valor: soma(emAberto), quantidade: emAberto.length },
  };
}

/** Divide o valor em parcelas iguais; os centavos que sobram vão para a última. */
export function parcelarNota(params: { valorTotal: number; parcelas: number; primeiroVencimento: string; intervaloDias: number }) {
  const { valorTotal, parcelas, primeiroVencimento, intervaloDias } = params;
  const totalCents = toCents(valorTotal);
  const base = Math.floor(totalCents / parcelas);
  return Array.from({ length: parcelas }, (_, i) => ({
    numero: `${i + 1}/${parcelas}`,
    vencimento: addDays(primeiroVencimento, intervaloDias * i),
    valor: fromCents(i === parcelas - 1 ? totalCents - base * (parcelas - 1) : base),
  }));
}

/** Positivo: sobra no cheque. Negativo: falta para cobrir as duplicatas. */
export const diferencaCheque = (valorCheque: number, somaDuplicatas: number) => round2(valorCheque - somaDuplicatas);

type DuplicataLivre = { id: string; numero: string; vencimento: string; valor: number };

export type DistribuicaoPagamento =
  | {
      ok: true;
      quitadas: { id: string; valor: number }[];
      /** Última duplicata, quando o valor não a cobre inteira. */
      parcial: { id: string; numero: string; pago: number; saldo: number; valorOriginal: number } | null;
    }
  | { ok: false; error: string };

/**
 * Cobre as duplicatas em ordem de vencimento. Só a última pode ficar parcial,
 * então o valor precisa alcançá-la: senão, sobraria duplicata ligada sem pagamento.
 */
export function distribuirPagamento(duplicatas: DuplicataLivre[], valor: number): DistribuicaoPagamento {
  if (duplicatas.length === 0) return { ok: false, error: "Ligue ao menos uma duplicata." };
  const ordenadas = [...duplicatas].sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.numero.localeCompare(b.numero));
  const ultima = ordenadas[ordenadas.length - 1];
  const antes = ordenadas.slice(0, -1);
  const somaAntes = toCents(sumMoney(antes.map((d) => d.valor)));
  const recebido = toCents(valor);
  const soma = somaAntes + toCents(ultima.valor);

  if (recebido <= 0) return { ok: false, error: "O valor deve ser maior que zero." };
  if (recebido > soma) return { ok: false, error: "O valor não pode passar da soma das duplicatas ligadas." };
  if (recebido <= somaAntes) return { ok: false, error: "Com esse valor, a última duplicata ligada ficaria sem pagamento. Desligue-a ou aumente o valor." };

  const paraUltima = recebido - somaAntes;
  const quitadas = antes.map((d) => ({ id: d.id, valor: d.valor }));
  if (paraUltima === toCents(ultima.valor)) return { ok: true, quitadas: [...quitadas, { id: ultima.id, valor: ultima.valor }], parcial: null };
  return {
    ok: true,
    quitadas,
    parcial: {
      id: ultima.id,
      numero: ultima.numero,
      pago: fromCents(paraUltima),
      saldo: fromCents(toCents(ultima.valor) - paraUltima),
      valorOriginal: ultima.valor,
    },
  };
}

/** Número da duplicata de saldo: "3/3" → "3/3-A"; se já houver, "3/3-B". Saldo de saldo segue a mesma letra-base. */
export function proximoNumeroSaldo(numero: string, existentes: string[]) {
  const base = numero.replace(/-[A-Z]+$/, "");
  const usados = new Set(existentes);
  for (let i = 0; i < 26; i++) {
    const candidato = `${base}-${String.fromCharCode(65 + i)}`;
    if (!usados.has(candidato)) return candidato;
  }
  let n = 27;
  while (usados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
