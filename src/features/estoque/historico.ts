import { formatDimensions, formatNumber } from "@/lib/format";
import { UNIDADES, type Unidade } from "@/lib/units";

export type CampoAlterado = { campo: string; de: string; para: string };

type MaterialCampos = {
  nome: string;
  categoria: string;
  unidade: Unidade;
  chapaLargura: number | null;
  chapaAltura: number | null;
  chapaEspessura: number | null;
  corAcabamento: string | null;
  complemento: string | null;
  estoqueMinimo: number;
};

/** Valores como aparecem na tela, para o histórico não depender de ids nem de cadastros que mudam. */
function campos(m: MaterialCampos): Record<string, string> {
  const medida = m.chapaLargura || m.chapaAltura || m.chapaEspessura ? `${formatDimensions(m.chapaLargura, m.chapaAltura, m.chapaEspessura)} mm` : "";
  return {
    Nome: m.nome,
    Categoria: m.categoria,
    Unidade: UNIDADES[m.unidade].label,
    "Medida da chapa": medida,
    "Cor / acabamento": m.corAcabamento ?? "",
    Complemento: m.complemento ?? "",
    "Estoque mínimo": formatNumber(m.estoqueMinimo),
  };
}

export function diffMaterial(antes: MaterialCampos, depois: MaterialCampos): CampoAlterado[] {
  const a = campos(antes);
  const d = campos(depois);
  return Object.keys(a)
    .filter((campo) => a[campo] !== d[campo])
    .map((campo) => ({ campo, de: a[campo], para: d[campo] }));
}
