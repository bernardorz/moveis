const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

/** 0–999 por extenso. */
function grupo(n: number) {
  if (n === 100) return "cem";
  const partes: string[] = [];
  if (n >= 100) partes.push(CENTENAS[Math.floor(n / 100)]);
  const resto = n % 100;
  if (resto >= 20) {
    partes.push(DEZENAS[Math.floor(resto / 10)]);
    if (resto % 10) partes.push(UNIDADES[resto % 10]);
  } else if (resto > 0) {
    partes.push(UNIDADES[resto]);
  }
  return partes.join(" e ");
}

const ESCALAS = [
  ["", ""],
  ["mil", "mil"],
  ["milhão", "milhões"],
  ["bilhão", "bilhões"],
];

function inteiroPorExtenso(n: number) {
  const grupos: { valor: number; texto: string }[] = [];
  for (let escala = 0, resto = n; resto > 0; escala++, resto = Math.floor(resto / 1000)) {
    const valor = resto % 1000;
    if (valor === 0) continue;
    const nome = ESCALAS[escala][valor === 1 ? 0 : 1];
    // "mil reais", não "um mil reais".
    const texto = escala === 1 && valor === 1 ? "mil" : [grupo(valor), nome].filter(Boolean).join(" ");
    grupos.unshift({ valor, texto });
  }
  // O último grupo só leva "e" quando é menor que 100 ou centena exata: "mil e cem", "mil duzentos e trinta".
  return grupos.reduce((acc, g, i) => {
    if (i === 0) return g.texto;
    const ultimo = i === grupos.length - 1;
    return `${acc}${ultimo && (g.valor < 100 || g.valor % 100 === 0) ? " e " : " "}${g.texto}`;
  }, "");
}

/** 1234.56 → "mil duzentos e trinta e quatro reais e cinquenta e seis centavos". */
export function valorPorExtenso(valor: number) {
  const totalCentavos = Math.round((valor + Number.EPSILON) * 100);
  const reais = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;
  const partes: string[] = [];
  if (reais > 0) {
    // "um milhão de reais": milhão ou bilhão exato pede o "de".
    const de = reais % 1_000_000 === 0 ? " de" : "";
    partes.push(`${inteiroPorExtenso(reais)}${de} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos > 0) partes.push(`${grupo(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return partes.length ? partes.join(" e ") : "zero real";
}
