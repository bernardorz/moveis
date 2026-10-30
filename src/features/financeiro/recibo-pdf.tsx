import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { PdfEmpresa } from "@/features/pdf/empresa";
import { pdfColors as c } from "@/features/pdf/theme";
import { parseISODate } from "@/lib/dates";
import { EMPRESA } from "@/lib/empresa";
import { valorPorExtenso } from "@/lib/extenso";
import { documentLabel, formatBRL, formatDate, formatDocument, formatNumero } from "@/lib/format";
import { FORMA_PAGAMENTO } from "@/lib/status";
import type { ReciboDetail } from "./recibos-queries";

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 40, paddingHorizontal: 40, fontFamily: "Poppins", fontSize: 10, color: c.navy900 },
  // lineHeight fica aqui, e não no Page: herdado do Page, faz o react-pdf não desenhar o rodapé fixo.
  content: { fontSize: 10, lineHeight: 1.5 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: c.navy900 },
  headerRight: { alignItems: "flex-end" },
  titulo: { fontSize: 16, fontWeight: 600, lineHeight: 1.2 },
  muted: { color: c.navy500 },
  cancelado: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: c.danger, borderRadius: 6, backgroundColor: c.dangerBg, color: c.danger },
  canceladoTitulo: { fontSize: 13, fontWeight: 600, letterSpacing: 1 },
  valor: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6, backgroundColor: c.navy900, color: c.white },
  valorLabel: { fontSize: 10, fontWeight: 500 },
  valorNumero: { fontSize: 18, fontWeight: 600, lineHeight: 1.2 },
  texto: { marginTop: 16, fontSize: 11, lineHeight: 1.7 },
  strong: { fontWeight: 600 },
  dados: { flexDirection: "row", marginTop: 16, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: c.navy50 },
  dado: { flex: 1 },
  overline: { fontSize: 7, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", color: c.navy500 },
  dadoValor: { fontWeight: 500 },
  observacoes: { marginTop: 12 },
  local: { marginTop: 28, textAlign: "right" },
  assinatura: { marginTop: 52, alignSelf: "center", width: 280, paddingTop: 5, borderTopWidth: 0.75, borderTopColor: c.navy900, textAlign: "center" },
  footer: { position: "absolute", left: 40, right: 40, bottom: 16, flexDirection: "row", justifyContent: "space-between", paddingTop: 5, borderTopWidth: 0.5, borderTopColor: c.navy200, fontSize: 7, color: c.navy500 },
});

/** "2026-10-30" → "30 de outubro de 2026". */
function dataPorExtenso(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(parseISODate(iso));
}

function ReciboPdf({ recibo }: { recibo: ReciboDetail }) {
  const numero = formatNumero(recibo.numero).replace("#", "");
  const title = `Recibo Nº ${numero}`;
  const documento = recibo.pagadorDocumento ? `, ${documentLabel(recibo.pagadorDocumento)} ${formatDocument(recibo.pagadorDocumento)}` : "";
  const data = dataPorExtenso(recibo.data);

  return (
    <Document title={`${title} · ${EMPRESA.nome}`} author={EMPRESA.nome} language="pt-BR">
      <Page size="A4" style={s.page}>
        <View style={s.content}>
          <View style={s.header}>
            <PdfEmpresa />
            <View style={s.headerRight}>
              <Text style={s.titulo}>{title}</Text>
              <Text style={s.muted}>{formatDate(recibo.data)}</Text>
            </View>
          </View>

          {recibo.canceladoEm ? (
            <View style={s.cancelado}>
              <Text style={s.canceladoTitulo}>CANCELADO</Text>
              <Text>Este recibo não tem validade. Motivo: {recibo.canceladoMotivo}</Text>
            </View>
          ) : null}

          <View style={s.valor}>
            <Text style={s.valorLabel}>Valor</Text>
            <Text style={s.valorNumero}>{formatBRL(recibo.valor)}</Text>
          </View>

          <Text style={s.texto}>
            Recebemos de <Text style={s.strong}>{recibo.pagadorNome}</Text>
            {documento}, a importância de <Text style={s.strong}>{formatBRL(recibo.valor)}</Text> ({valorPorExtenso(recibo.valor)}), referente a{" "}
            <Text style={s.strong}>{recibo.descricao}</Text>.
          </Text>

          <View style={s.dados}>
            <View style={s.dado}>
              <Text style={s.overline}>Forma de pagamento</Text>
              <Text style={s.dadoValor}>{FORMA_PAGAMENTO[recibo.forma]}</Text>
            </View>
            {recibo.pedidoNumero != null ? (
              <View style={s.dado}>
                <Text style={s.overline}>Pedido</Text>
                <Text style={s.dadoValor}>{formatNumero(recibo.pedidoNumero)}</Text>
              </View>
            ) : null}
          </View>

          {recibo.observacoes ? (
            <View style={s.observacoes}>
              <Text style={s.overline}>Observações</Text>
              <Text>{recibo.observacoes}</Text>
            </View>
          ) : null}

          <Text style={s.local}>{EMPRESA.cidade ? `${EMPRESA.cidade}, ${data}` : data}</Text>
          <Text style={s.assinatura}>{EMPRESA.nome}</Text>
        </View>

        <View style={s.footer} fixed>
          <Text>
            {EMPRESA.nome} · {title}
          </Text>
          {recibo.emitidoPor ? <Text>Emitido por {recibo.emitidoPor}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}

export function renderReciboPdf(recibo: ReciboDetail) {
  return renderToBuffer(<ReciboPdf recibo={recibo} />);
}
