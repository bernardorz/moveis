import { Fragment } from "react";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { PdfEmpresa } from "@/features/pdf/empresa";
import { pdfColors as c } from "@/features/pdf/theme";
import { addDays } from "@/lib/dates";
import { EMPRESA } from "@/lib/empresa";
import { documentLabel, formatBRL, formatDate, formatDocument, formatNumber, formatNumero, formatPercent, formatPhone } from "@/lib/format";
import type { OrcamentoDetail } from "./queries";
import type { ItemDoc } from "./schemas";
import { comodoCounts, comodoSubtotal, itemTotal, movelSubtotal, orcamentoTotals } from "./totals";

export type OrcamentoPdfData = Pick<OrcamentoDetail, "numero" | "cliente" | "vendedorNome" | "doc">;

const s = StyleSheet.create({
  page: { paddingTop: 24, paddingBottom: 38, paddingHorizontal: 32, fontFamily: "Poppins", fontSize: 8, color: c.navy900 },
  // Fica aqui, e não no Page: herdado do Page, o lineHeight faz o react-pdf não desenhar o rodapé fixo.
  // O valor é resolvido com o fontSize deste estilo (10,4 pt) e herdado assim pelos filhos.
  content: { fontSize: 8, lineHeight: 1.3 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 8, borderBottomWidth: 1.5, borderBottomColor: c.navy900 },
  muted: { color: c.navy500 },
  docInfo: { alignItems: "flex-end" },
  docTitle: { fontSize: 15, fontWeight: 600, lineHeight: 1.2, marginBottom: 2 },
  strong: { fontWeight: 500 },

  parties: { flexDirection: "row", gap: 8, marginTop: 8 },
  party: { flex: 1, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 0.75, borderColor: c.navy100, borderRadius: 6 },
  overline: { fontSize: 6.5, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", color: c.navy500, marginBottom: 2 },
  partyName: { fontSize: 9, fontWeight: 600, marginBottom: 1 },

  table: { marginTop: 8 },
  tableHead: { flexDirection: "row", backgroundColor: c.navy900, color: c.white, fontSize: 7, fontWeight: 500, paddingVertical: 4, marginBottom: 2 },
  comodoRow: { flexDirection: "row", marginBottom: 4, borderTopWidth: 0.75, borderTopColor: c.navy200 },
  comodoCol: { width: 112, paddingVertical: 4, paddingHorizontal: 6, backgroundColor: c.navy50 },
  comodoNome: { fontSize: 9, fontWeight: 600, marginBottom: 2 },
  comodoMeta: { fontSize: 7, color: c.navy500, marginBottom: 2 },
  comodoValor: { fontWeight: 600 },
  itensCol: { flex: 1 },
  movelRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingLeft: 8, paddingRight: 6, fontWeight: 600, borderBottomWidth: 0.75, borderBottomColor: c.navy200 },
  itemRow: { flexDirection: "row", paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: c.navy100 },

  colHeadComodo: { width: 112, paddingLeft: 6 },
  colDescricao: { flex: 1, paddingLeft: 8, paddingRight: 4 },
  colMaterial: { width: 124, paddingRight: 4 },
  colQtd: { width: 24, textAlign: "right", paddingRight: 4 },
  colTotal: { width: 64, textAlign: "right", paddingRight: 6 },

  empty: { paddingVertical: 12, textAlign: "center", color: c.navy500 },

  summary: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "stretch" },
  conditions: { flex: 1, flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8, paddingVertical: 6, rowGap: 4, backgroundColor: c.navy50, borderRadius: 6 },
  condition: { width: "50%", paddingRight: 8 },
  conditionValue: { fontWeight: 500 },
  totals: { width: 200, borderWidth: 0.75, borderColor: c.navy200, borderRadius: 6 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingTop: 3 },
  grandTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, marginTop: "auto", backgroundColor: c.navy900, color: c.white, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
  grandTotalLabel: { fontSize: 9, fontWeight: 500 },
  grandTotalValue: { fontSize: 12, fontWeight: 600, lineHeight: 1.2 },

  notes: { marginTop: 8, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 0.75, borderColor: c.navy100, borderRadius: 6 },

  footer: { position: "absolute", left: 32, right: 32, bottom: 14, flexDirection: "row", justifyContent: "space-between", paddingTop: 5, borderTopWidth: 0.5, borderTopColor: c.navy200, fontSize: 7, color: c.navy500 },
});

const plural = (n: number, singular: string, pluralForm: string) => `${n} ${n === 1 ? singular : pluralForm}`;

// Documento do cliente: medidas e valor unitário ficam só no editor.
function ItemRow({ item }: { item: ItemDoc }) {
  return (
    <View style={s.itemRow} wrap={false}>
      <Text style={s.colDescricao}>{item.descricao || "—"}</Text>
      <Text style={s.colMaterial}>{item.material || "—"}</Text>
      <Text style={s.colQtd}>{formatNumber(item.quantidade)}</Text>
      <Text style={[s.colTotal, s.strong]}>{formatBRL(itemTotal(item))}</Text>
    </View>
  );
}

function Condition({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.condition}>
      <Text style={s.overline}>{label}</Text>
      <Text style={s.conditionValue}>{value}</Text>
    </View>
  );
}

function OrcamentoPdf({ orcamento }: { orcamento: OrcamentoPdfData }) {
  const { doc, cliente, vendedorNome } = orcamento;
  const numero = formatNumero(orcamento.numero);
  const title = `Orçamento ${numero}`;
  const totals = orcamentoTotals(doc.comodos, { tipo: doc.descontoTipo, valor: doc.descontoValor });
  const validoAte = formatDate(addDays(doc.dataEmissao, doc.validadeDias));

  const clienteNome = cliente?.nome || doc.clienteNomeLivre;
  const clienteLinha = [
    cliente?.documento && `${documentLabel(cliente.documento)} ${formatDocument(cliente.documento)}`,
    cliente?.telefone && formatPhone(cliente.telefone),
    cliente?.email,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document title={`${title} · ${EMPRESA.nome}`} author={EMPRESA.nome} language="pt-BR">
      <Page size="A4" style={s.page}>
        <View style={s.content}>
          <View style={s.header}>
            <PdfEmpresa />
            <View style={s.docInfo}>
              <Text style={s.docTitle}>{title}</Text>
              <Text style={s.muted}>
                Emitido em <Text style={s.strong}>{formatDate(doc.dataEmissao)}</Text>
              </Text>
              <Text style={s.muted}>
                Válido até <Text style={s.strong}>{validoAte}</Text>
              </Text>
            </View>
          </View>

          <View style={s.parties}>
            <View style={s.party}>
              <Text style={s.overline}>Cliente</Text>
              <Text style={s.partyName}>{clienteNome || "Não informado"}</Text>
              {clienteLinha ? <Text style={s.muted}>{clienteLinha}</Text> : null}
            </View>
            <View style={s.party}>
              <Text style={s.overline}>Endereço da obra</Text>
              <Text>{doc.enderecoObra || "Não informado"}</Text>
              {vendedorNome ? <Text style={s.muted}>Vendedor: {vendedorNome}</Text> : null}
            </View>
          </View>

          <View style={s.table}>
            {/* `fixed` dentro da tabela repete o cabeçalho só nas páginas que ela ocupa. */}
            <View style={s.tableHead} fixed>
              <Text style={s.colHeadComodo}>Cômodo</Text>
              <Text style={s.colDescricao}>Item</Text>
              <Text style={s.colMaterial}>Material / acabamento</Text>
              <Text style={s.colQtd}>Qtd</Text>
              <Text style={s.colTotal}>Total</Text>
            </View>

            {doc.comodos.length === 0 && <Text style={s.empty}>Nenhum item neste orçamento.</Text>}

            {doc.comodos.map((comodo) => {
              const counts = comodoCounts(comodo);
              return (
                <Fragment key={comodo.id}>
                  {/* Marcador sem altura: sem esse espaço livre, o cômodo vai para a próxima página. A coluna `fixed` não
                      quebra sozinha e, num cômodo curto, invadiria o rodapé. Precisa ser irmão do cômodo anterior: o
                      react-pdf ignora minPresenceAhead no primeiro filho de um View. */}
                  <View minPresenceAhead={64} />
                  <View style={s.comodoRow}>
                    {/* `fixed` repete o cômodo se ele continuar na página seguinte e mantém as duas colunas alinhadas. */}
                    <View style={s.comodoCol} fixed>
                      <Text style={s.comodoNome}>{comodo.nome || "Cômodo sem nome"}</Text>
                      <Text style={s.comodoMeta}>
                        {plural(counts.moveis, "móvel", "móveis")} · {plural(counts.itens, "item", "itens")}
                      </Text>
                      <Text style={s.comodoValor}>{formatBRL(comodoSubtotal(comodo))}</Text>
                    </View>
                    <View style={s.itensCol}>
                      {comodo.moveis.map((movel) => (
                        <View key={movel.id}>
                          {/* O título do móvel fica sempre junto do primeiro item, nunca sozinho no fim da página. */}
                          <View wrap={false}>
                            <View style={s.movelRow}>
                              <Text>{movel.nome || "Móvel sem nome"}</Text>
                              <Text>{formatBRL(movelSubtotal(movel))}</Text>
                            </View>
                            {movel.itens[0] && <ItemRow item={movel.itens[0]} />}
                          </View>
                          {movel.itens.slice(1).map((item) => (
                            <ItemRow key={item.id} item={item} />
                          ))}
                        </View>
                      ))}
                    </View>
                  </View>
                </Fragment>
              );
            })}
          </View>

          <View style={s.summary} wrap={false}>
            <View style={s.conditions}>
              <Condition label="Forma de pagamento" value={doc.formaPagamento || "A combinar"} />
              <Condition label="Prazo de entrega" value={doc.prazoEntregaDias == null ? "A combinar" : plural(doc.prazoEntregaDias, "dia útil", "dias úteis")} />
              <Condition label="Condição de pagamento" value={doc.condicaoDetalhada || "—"} />
              <Condition label="Validade" value={`${plural(doc.validadeDias, "dia", "dias")} · até ${validoAte}`} />
            </View>
            <View style={s.totals}>
              <View style={s.totalLine}>
                <Text style={s.muted}>Subtotal</Text>
                <Text>{formatBRL(totals.subtotal)}</Text>
              </View>
              {totals.descontoTotal > 0 && (
                <View style={s.totalLine}>
                  <Text style={s.muted}>Desconto{doc.descontoTipo === "percentual" ? ` (${formatPercent(doc.descontoValor, 2)})` : ""}</Text>
                  <Text>{formatBRL(-totals.descontoTotal)}</Text>
                </View>
              )}
              <View style={s.grandTotal}>
                <Text style={s.grandTotalLabel}>Total geral</Text>
                <Text style={s.grandTotalValue}>{formatBRL(totals.total)}</Text>
              </View>
            </View>
          </View>

          {doc.observacoes ? (
            <View style={s.notes}>
              <Text style={s.overline}>Observações</Text>
              <Text>{doc.observacoes}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.footer} fixed>
          <Text>
            {EMPRESA.nome} · {title}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function renderOrcamentoPdf(orcamento: OrcamentoPdfData) {
  return renderToBuffer(<OrcamentoPdf orcamento={orcamento} />);
}
