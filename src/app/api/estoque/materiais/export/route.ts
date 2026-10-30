import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { listMateriais, type MateriaisFilters } from "@/features/estoque/queries";
import { formatDecimal } from "@/lib/format";
import { UNIDADES, type Unidade } from "@/lib/units";

// Exporta a listagem de materiais (com os mesmos filtros da tela) em CSV
// compatível com Excel pt-BR (separador ";", BOM UTF-8).
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const unidade = sp.get("unidade");
  const filters: MateriaisFilters = {
    q: sp.get("q") || undefined,
    categoria: sp.get("categoria") || undefined,
    unidade: unidade && unidade in UNIDADES ? (unidade as Unidade) : undefined,
    abaixo: sp.get("abaixo") === "1",
  };

  // Sem paginação: lê todas as páginas.
  const all = [];
  for (let page = 1; ; page++) {
    const { rows, total } = await listMateriais({ ...filters, page });
    all.push(...rows);
    if (all.length >= total || rows.length === 0) break;
  }

  const header = ["Código", "Material", "Categoria", "Unidade", "Cor/acabamento", "Medida (mm)", "Saldo atual", "Estoque mínimo", "Custo médio", "Valor em estoque", "Abaixo do mínimo"];
  const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = all.map((m) =>
    [
      m.codigo,
      m.nome,
      m.categoria,
      UNIDADES[m.unidade as Unidade].label,
      m.corAcabamento ?? "",
      m.chapaLargura ? `${m.chapaLargura} x ${m.chapaAltura} x ${m.chapaEspessura}` : "",
      String(m.saldoAtual).replace(".", ","),
      String(m.estoqueMinimo).replace(".", ","),
      formatDecimal(m.custoMedio),
      formatDecimal(m.saldoAtual * m.custoMedio),
      m.saldoAtual < m.estoqueMinimo ? "Sim" : "Não",
    ]
      .map(esc)
      .join(";"),
  );
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="materiais-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
