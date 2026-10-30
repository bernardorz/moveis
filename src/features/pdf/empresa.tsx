import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { EMPRESA } from "@/lib/empresa";
import { pdfColors as c } from "./theme";

const s = StyleSheet.create({
  brand: { flexDirection: "row", gap: 10, flex: 1 },
  logo: { width: 36, height: 36, borderRadius: 6, backgroundColor: c.navy900, alignItems: "center", justifyContent: "center" },
  logoText: { color: c.white, fontSize: 14, fontWeight: 600, lineHeight: 1 },
  nome: { fontSize: 11, fontWeight: 600, marginBottom: 1 },
  linha: { color: c.navy500 },
});

/** Logo e dados da empresa, à esquerda do cabeçalho dos PDFs. Campos vazios não aparecem. */
export function PdfEmpresa() {
  const contato = [EMPRESA.cnpj && `CNPJ ${EMPRESA.cnpj}`, EMPRESA.telefone, EMPRESA.email].filter(Boolean).join(" · ");
  return (
    <View style={s.brand}>
      <View style={s.logo}>
        <Text style={s.logoText}>DH</Text>
      </View>
      <View>
        <Text style={s.nome}>{EMPRESA.nome}</Text>
        <Text style={s.linha}>{EMPRESA.descricao}</Text>
        {contato ? <Text style={s.linha}>{contato}</Text> : null}
        {EMPRESA.endereco ? <Text style={s.linha}>{EMPRESA.endereco}</Text> : null}
      </View>
    </View>
  );
}
