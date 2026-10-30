import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import { CLAUSULAS_PADRAO } from "@/features/contratos/clausulas-padrao";
import { orcamentoTotals } from "@/features/orcamentos/totals";
import { addBusinessDays, addDays, todayISO } from "@/lib/dates";
import { EMPRESA } from "@/lib/empresa";
import { lineTotal, weightedAverageCost } from "@/lib/money";
import type { Unidade } from "@/lib/units";
import { db, type Transaction } from "./index";
import * as s from "./schema";

// Seed de desenvolvimento: recria todos os dados com base nas telas do Figma.
// As datas são relativas a hoje para que os status (validade, vencimentos)
// façam sentido sempre que o seed for executado.

const T = todayISO();
const d = (days: number) => addDays(T, days);

type SeedItem = [descricao: string, qtd: number, l: number | null, a: number | null, p: number | null, material: string, valorUnit: number];
type SeedTree = { nome: string; moveis: { nome: string; itens: SeedItem[] }[] }[];

const ARVORE_MARIA: SeedTree = [
  {
    nome: "Cozinha",
    moveis: [
      {
        nome: "Ilha",
        itens: [
          ["Bancada da ilha", 1, 2400, 900, 1100, "Quartzo Branco Prime 20 mm", 6200],
          ["Passa-prato", 1, 1200, 450, 40, "MDF Louro Freijó 18 mm", 1420],
          ["Gavetas com corrediça oculta", 4, 600, 180, 550, "MDF Branco TX 18 mm", 562.5],
        ],
      },
      {
        nome: "Armários superiores",
        itens: [
          ["Módulo superior com portas basculantes", 3, 800, 700, 350, "MDF Branco TX 18 mm", 1640],
          ["Nicho aberto com LED", 2, 600, 350, 350, "MDF Louro Freijó 18 mm", 950],
          ["Cantoneira superior", 1, 900, 700, 350, "MDF Branco TX 18 mm", 1600],
        ],
      },
      {
        nome: "Armários inferiores",
        itens: [
          ["Balcão da pia com 2 portas", 1, 1200, 850, 600, "MDF Branco TX 18 mm", 3200],
          ["Balcão do cooktop com gavetões", 1, 900, 850, 600, "MDF Branco TX 18 mm", 3450],
          ["Torre quente", 1, 600, 2200, 600, "MDF Cinza Grafite 18 mm", 2900],
          ["Rodapé em alumínio", 1, 3200, 100, 18, "Alumínio escovado", 800],
        ],
      },
    ],
  },
  {
    nome: "Suíte master",
    moveis: [
      {
        nome: "Guarda-roupa casal",
        itens: [
          ["Corpo do guarda-roupa", 1, 2800, 2600, 600, "MDF Branco TX 18 mm", 9800],
          ["Portas de correr com espelho", 2, 1400, 2600, 20, "Espelho bronze 4 mm", 2650],
          ["Gaveteiro interno", 1, 900, 600, 500, "MDF Louro Freijó 18 mm", 1450],
          ["Cabideiro e sapateira", 1, 1800, 400, 550, "Alumínio escovado", 680],
          ["Iluminação LED interna", 1, null, null, null, "Perfil de LED 3000K", 520],
        ],
      },
      {
        nome: "Cabeceira painel",
        itens: [
          ["Painel ripado", 1, 2400, 1200, 30, "MDF Louro Freijó 18 mm", 2780],
          ["Criados-mudos suspensos", 2, 500, 300, 400, "MDF Louro Freijó 18 mm", 425],
        ],
      },
    ],
  },
  {
    nome: "Home office",
    moveis: [
      {
        nome: "Bancada com nichos",
        itens: [
          ["Bancada", 1, 1800, 750, 600, "MDF Cinza Grafite 18 mm", 2650],
          ["Nichos superiores", 3, 600, 300, 300, "MDF Branco TX 18 mm", 480],
          ["Gaveteiro volante", 1, 450, 600, 500, "MDF Branco TX 18 mm", 1290],
          ["Painel de fundo", 1, 1800, 900, 18, "MDF Louro Freijó 18 mm", 1580],
        ],
      },
    ],
  },
];

const ARVORE_SIMPLES = (nome: string, movel: string, itens: SeedItem[]): SeedTree => [
  { nome, moveis: [{ nome: movel, itens }] },
];

function treeForTotals(tree: SeedTree) {
  return tree.map((c) => ({
    moveis: c.moveis.map((m) => ({
      itens: m.itens.map(([, quantidade, , , , , valorUnitario]) => ({ quantidade, valorUnitario })),
    })),
  }));
}

async function insertTree(
  tx: Transaction,
  target: "orcamento" | "pedido",
  parentId: string,
  tree: SeedTree,
) {
  for (const [ci, comodo] of tree.entries()) {
    const [c] =
      target === "orcamento"
        ? await tx
            .insert(s.orcamentoComodos)
            .values({ orcamentoId: parentId, nome: comodo.nome, ordem: ci })
            .returning()
        : await tx
            .insert(s.pedidoComodos)
            .values({ pedidoId: parentId, nome: comodo.nome, ordem: ci })
            .returning();
    for (const [mi, movel] of comodo.moveis.entries()) {
      const movelTable = target === "orcamento" ? s.orcamentoMoveis : s.pedidoMoveis;
      const [m] = await tx
        .insert(movelTable)
        .values({ comodoId: c.id, nome: movel.nome, ordem: mi })
        .returning();
      const itemTable = target === "orcamento" ? s.orcamentoItens : s.pedidoItens;
      await tx.insert(itemTable).values(
        movel.itens.map(([descricao, quantidade, largura, altura, profundidade, material, valorUnitario], ii) => ({
          movelId: m.id,
          descricao,
          quantidade,
          largura,
          altura,
          profundidade,
          material,
          valorUnitario,
          ordem: ii,
        })),
      );
    }
  }
}

async function createUser(tx: Transaction, name: string, email: string, password: string, role: string) {
  const id = crypto.randomUUID();
  await tx.insert(s.user).values({ id, name, email, role, emailVerified: true });
  await tx.insert(s.account).values({
    id: crypto.randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(password),
  });
  return id;
}

async function main() {
  const adminName = process.env.SEED_ADMIN_NAME ?? "Ricardo Dias";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@dhmoveis.com.br";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "dhmoveis123";

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      TRUNCATE TABLE
        material_alteracoes, movimentacoes_estoque, materiais, material_categorias,
        recibos, pagamentos, cheque_duplicatas, cheques, duplicatas, notas, contas,
        contratos, pedido_itens, pedido_moveis, pedido_comodos, pedido_status_historico, pedidos,
        orcamento_itens, orcamento_moveis, orcamento_comodos, orcamentos,
        clientes, fornecedores,
        verification, session, account, "user"
      CASCADE
    `);

    // Usuários
    const ricardo = await createUser(tx, adminName, adminEmail, adminPassword, "admin");
    const camila = await createUser(tx, "Camila Rocha", "camila@dhmoveis.com.br", adminPassword, "user");

    // Clientes e fornecedores
    const clientesRows = await tx
      .insert(s.clientes)
      .values([
        { nome: "Maria Silva", documento: "12345678909", telefone: "41998124471", email: "maria.silva@gmail.com" },
        { nome: "Mariana Teixeira", documento: "98765432100", telefone: "41991230987" },
        { nome: "Ana Maria Prado", telefone: "41988771203" },
        { nome: "Carlos Mendes", documento: "32165498700", telefone: "41999881122", email: "carlos.mendes@outlook.com" },
        { nome: "Ana Beatriz Costa", documento: "45678912344", telefone: "41987654321" },
        { nome: "Fernando Rocha", telefone: "41996541230", email: "fernando.rocha@gmail.com" },
        { nome: "Juliana Prado", documento: "74185296311" },
      ])
      .returning();
    const cliente = Object.fromEntries(clientesRows.map((c) => [c.nome, c.id])) as Record<string, string>;

    const fornecedoresRows = await tx
      .insert(s.fornecedores)
      .values([
        { nome: "Duratex S.A.", documento: "97837181000147" },
        { nome: "Häfele Brasil" },
        { nome: "Ciser Parafusos" },
        { nome: "Rehau" },
        { nome: "Vidraçaria Curitiba" },
      ])
      .returning();
    const fornecedor = Object.fromEntries(fornecedoresRows.map((f) => [f.nome, f.id])) as Record<string, string>;

    // Orçamentos
    type SeedOrcamento = {
      numero: number;
      status: "rascunho" | "enviado" | "aprovado" | "recusado";
      clienteId?: string;
      clienteNomeLivre?: string;
      dataEmissao: string;
      tree: SeedTree;
      desconto?: number;
      vendedorId: string;
    };

    const condicoes = {
      enderecoObra: "Rua Padre Anchieta, 1820 · ap. 1204 · Curitiba",
      formaPagamento: "Entrada + parcelas em cheque",
      condicaoDetalhada: "Entrada de 30% via Pix + 6x em cheque",
      prazoEntregaDias: 45,
      validadeDias: 15,
      observacoes:
        "Medidas sujeitas a confirmação após medição técnica no local. Eletrodomésticos e cuba não inclusos. Instalação inclusa para Curitiba e região metropolitana.",
    };

    const orcamentosSeed: SeedOrcamento[] = [
      {
        numero: 245,
        status: "aprovado",
        clienteId: cliente["Carlos Mendes"],
        dataEmissao: d(-95),
        vendedorId: ricardo,
        tree: ARVORE_SIMPLES("Área gourmet", "Bancada gourmet", [
          ["Bancada com cooktop", 1, 2600, 900, 650, "MDF Cinza Grafite 18 mm", 7800],
          ["Adega embutida", 1, 600, 900, 600, "MDF Louro Freijó 18 mm", 2350],
        ]),
      },
      {
        numero: 246,
        status: "aprovado",
        clienteId: cliente["Ana Beatriz Costa"],
        dataEmissao: d(-62),
        vendedorId: camila,
        tree: ARVORE_SIMPLES("Quarto infantil", "Cama com gavetas", [
          ["Cama solteiro com gavetas", 1, 1980, 450, 900, "MDF Branco TX 18 mm", 4200],
          ["Escrivaninha suspensa", 1, 1200, 750, 500, "MDF Louro Freijó 18 mm", 1650],
        ]),
      },
      {
        numero: 247,
        status: "rascunho",
        clienteNomeLivre: "João Pereira",
        dataEmissao: d(-40),
        vendedorId: camila,
        tree: ARVORE_SIMPLES("Lavanderia", "Armário aéreo", [
          ["Armário aéreo 2 portas", 1, 1400, 600, 350, "MDF Branco TX 18 mm", 1850],
        ]),
      },
      {
        numero: 248,
        status: "aprovado",
        clienteId: cliente["Maria Silva"],
        dataEmissao: d(-30),
        vendedorId: ricardo,
        tree: ARVORE_MARIA,
        desconto: 5,
      },
      {
        numero: 249,
        status: "enviado",
        clienteId: cliente["Fernando Rocha"],
        dataEmissao: d(-5),
        vendedorId: ricardo,
        tree: ARVORE_SIMPLES("Sala de estar", "Painel de TV", [
          ["Painel ripado para TV", 1, 2800, 2400, 30, "MDF Louro Freijó 18 mm", 5400],
          ["Rack suspenso", 1, 2200, 400, 450, "MDF Cinza Grafite 18 mm", 3100],
        ]),
      },
      {
        numero: 250,
        status: "recusado",
        clienteId: cliente["Juliana Prado"],
        dataEmissao: d(-12),
        vendedorId: camila,
        tree: ARVORE_SIMPLES("Banheiro social", "Gabinete", [
          ["Gabinete com 2 gavetas", 1, 800, 550, 450, "MDF Branco TX 18 mm", 1980],
        ]),
      },
      {
        numero: 252,
        status: "rascunho",
        clienteId: cliente["Maria Silva"],
        dataEmissao: d(-1),
        vendedorId: ricardo,
        tree: ARVORE_MARIA,
      },
      {
        numero: 253,
        status: "aprovado",
        clienteId: cliente["Fernando Rocha"],
        dataEmissao: d(-8),
        vendedorId: ricardo,
        tree: ARVORE_SIMPLES("Home office", "Bancada de trabalho", [
          ["Bancada em L", 1, 2400, 750, 600, "MDF Cinza Grafite 18 mm", 3650],
          ["Armário baixo", 2, 800, 700, 400, "MDF Branco TX 18 mm", 1280],
        ]),
      },
      {
        numero: 254,
        status: "aprovado",
        clienteId: cliente["Juliana Prado"],
        dataEmissao: d(-3),
        vendedorId: camila,
        tree: ARVORE_SIMPLES("Banheiro social", "Gabinete", [
          ["Gabinete com 2 gavetas", 1, 800, 550, 450, "MDF Branco TX 18 mm", 1980],
        ]),
      },
    ];

    const orcamentoIds: Record<number, string> = {};
    for (const o of orcamentosSeed) {
      const [row] = await tx
        .insert(s.orcamentos)
        .values({
          numero: o.numero,
          status: o.status,
          clienteId: o.clienteId,
          clienteNomeLivre: o.clienteNomeLivre,
          dataEmissao: o.dataEmissao,
          vendedorId: o.vendedorId,
          descontoTipo: "percentual",
          descontoValor: o.desconto ?? 0,
          ...condicoes,
          enviadoEm: o.status !== "rascunho" ? new Date(`${addDays(o.dataEmissao, 1)}T12:00:00-03:00`) : null,
          aprovadoEm: o.status === "aprovado" ? new Date(`${addDays(o.dataEmissao, 2)}T12:00:00-03:00`) : null,
          recusadoEm: o.status === "recusado" ? new Date(`${addDays(o.dataEmissao, 3)}T12:00:00-03:00`) : null,
        })
        .returning();
      orcamentoIds[o.numero] = row.id;
      await insertTree(tx, "orcamento", row.id, o.tree);
    }

    // Pedidos (a partir dos orçamentos aprovados)
    type SeedPedido = {
      numero: number;
      contrato: number;
      orcamento: number;
      clienteId: string;
      dataPedido: string;
      historico: { status: (typeof s.pedidoStatus.enumValues)[number]; data: string }[];
      contratoAssinado: boolean;
      /** Datas da agenda de execuções, quando já agendado. */
      producao?: [string, string];
    };

    const pedidosSeed: SeedPedido[] = [
      {
        numero: 129,
        contrato: 96,
        orcamento: 245,
        clienteId: cliente["Carlos Mendes"],
        dataPedido: d(-92),
        historico: [
          { status: "aguardando_producao", data: d(-92) },
          { status: "em_producao", data: d(-80) },
          { status: "pronto", data: d(-45) },
          { status: "entregue", data: d(-38) },
        ],
        contratoAssinado: true,
        producao: [d(-80), d(-46)],
      },
      {
        numero: 130,
        contrato: 97,
        orcamento: 246,
        clienteId: cliente["Ana Beatriz Costa"],
        dataPedido: d(-59),
        historico: [
          { status: "aguardando_producao", data: d(-59) },
          { status: "em_producao", data: d(-50) },
          { status: "pronto", data: d(-4) },
        ],
        contratoAssinado: true,
        producao: [d(-50), d(-5)],
      },
      {
        numero: 131,
        contrato: 98,
        orcamento: 248,
        clienteId: cliente["Maria Silva"],
        dataPedido: d(-28),
        historico: [
          { status: "aguardando_producao", data: d(-28) },
          { status: "em_producao", data: d(-19) },
        ],
        contratoAssinado: true,
        producao: [d(-19), d(9)],
      },
      {
        numero: 132,
        contrato: 99,
        orcamento: 253,
        clienteId: cliente["Fernando Rocha"],
        dataPedido: d(-6),
        historico: [{ status: "aguardando_producao", data: d(-6) }],
        contratoAssinado: true,
        producao: [d(5), d(22)],
      },
      {
        numero: 133,
        contrato: 100,
        orcamento: 254,
        clienteId: cliente["Juliana Prado"],
        dataPedido: d(-2),
        historico: [{ status: "aguardando_producao", data: d(-2) }],
        contratoAssinado: false,
      },
    ];

    const pedidoIds: Record<number, string> = {};
    for (const p of pedidosSeed) {
      const o = orcamentosSeed.find((x) => x.numero === p.orcamento)!;
      const totals = orcamentoTotals(treeForTotals(o.tree), { tipo: "percentual", valor: o.desconto ?? 0 });
      const [row] = await tx
        .insert(s.pedidos)
        .values({
          numero: p.numero,
          orcamentoId: orcamentoIds[p.orcamento],
          clienteId: p.clienteId,
          status: p.historico[p.historico.length - 1].status,
          dataPedido: p.dataPedido,
          prazoEntregaDias: condicoes.prazoEntregaDias,
          previsaoEntrega: addBusinessDays(p.dataPedido, condicoes.prazoEntregaDias),
          producaoInicio: p.producao?.[0],
          producaoFim: p.producao?.[1],
          enderecoObra: p.numero === 131 ? "R. Padre Anchieta, 1820 · ap. 1204" : condicoes.enderecoObra,
          vendedorId: o.vendedorId,
          formaPagamento: condicoes.formaPagamento,
          condicaoDetalhada: condicoes.condicaoDetalhada,
          observacoes: condicoes.observacoes,
          subtotal: totals.subtotal,
          descontoTipo: "percentual",
          descontoValor: o.desconto ?? 0,
          descontoTotal: totals.descontoTotal,
          total: totals.total,
        })
        .returning();
      pedidoIds[p.numero] = row.id;
      await insertTree(tx, "pedido", row.id, o.tree);
      await tx.insert(s.pedidoStatusHistorico).values(
        p.historico.map((h) => ({
          pedidoId: row.id,
          status: h.status,
          data: new Date(`${h.data}T10:00:00-03:00`),
          userId: o.vendedorId,
        })),
      );
      await tx.insert(s.contratos).values({
        numero: p.contrato,
        pedidoId: row.id,
        status: p.contratoAssinado ? "assinado" : "gerado",
        clausulas: CLAUSULAS_PADRAO,
        geradoEm: new Date(`${p.dataPedido}T10:00:00-03:00`),
        assinadoEm: p.contratoAssinado ? new Date(`${addDays(p.dataPedido, 2)}T15:00:00-03:00`) : null,
      });

      // Recebimentos: entrada de 30% via Pix + 6 parcelas em cheque.
      const entrada = Math.round(totals.total * 0.3 * 100) / 100;
      const restante = Math.round((totals.total - entrada) * 100) / 100;
      const parcela = Math.floor((restante / 6) * 100) / 100;
      const ultima = Math.round((restante - parcela * 5) * 100) / 100;
      await tx.insert(s.contas).values({
        tipo: "receber",
        descricao: `Entrada · Pedido #${String(p.numero).padStart(4, "0")}`,
        valor: entrada,
        vencimento: p.dataPedido,
        formaPagamento: "pix",
        categoria: "Venda",
        status: "pago",
        pagoEm: p.dataPedido,
        valorPago: entrada,
        clienteId: p.clienteId,
        pedidoId: row.id,
      });
      const grupo = crypto.randomUUID();
      const bancos = ["Itaú", "Itaú", "Bradesco", "Bradesco", "Banco do Brasil", "Santander"];
      for (let i = 0; i < 6; i++) {
        const valor = i === 5 ? ultima : parcela;
        const vencimento = addDays(p.dataPedido, 30 * (i + 1));
        const quitada = vencimento < T;
        await tx.insert(s.contas).values({
          tipo: "receber",
          descricao: `Parcela ${i + 1}/6 · Pedido #${String(p.numero).padStart(4, "0")}`,
          valor,
          vencimento,
          formaPagamento: "cheque",
          categoria: "Venda",
          parcelaNumero: i + 1,
          parcelaTotal: 6,
          grupoParcelamentoId: grupo,
          status: quitada ? "pago" : "em_aberto",
          pagoEm: quitada ? vencimento : null,
          valorPago: quitada ? valor : null,
          clienteId: p.clienteId,
          pedidoId: row.id,
        });
        await tx.insert(s.cheques).values({
          numero: String(400 + p.numero * 10 + i).padStart(6, "0"),
          banco: bancos[i],
          emitente: clientesRows.find((c) => c.id === p.clienteId)!.nome,
          valor,
          dataEmissao: p.dataPedido,
          bomPara: vencimento,
          status: quitada ? "compensado" : "em_carteira",
          clienteId: p.clienteId,
          pedidoId: row.id,
        });
      }
    }

    // Notas, duplicatas e contas a pagar
    const [nf1] = await tx
      .insert(s.notas)
      .values({ numero: "58.214", emitenteDestinatario: "Duratex S.A.", dataEmissao: d(-40), valorTotal: 23737.2 })
      .returning();
    const [nf2] = await tx
      .insert(s.notas)
      .values({ numero: "12.877", emitenteDestinatario: "Häfele Brasil", dataEmissao: d(-20), valorTotal: 9230 })
      .returning();
    const dupsNf1 = await tx
      .insert(s.duplicatas)
      .values([
        { notaId: nf1.id, numero: "1/3", vencimento: d(-10), valor: 7912.4, status: "paga", pagaEm: d(-10) },
        { notaId: nf1.id, numero: "2/3", vencimento: d(20), valor: 7912.4 },
        { notaId: nf1.id, numero: "3/3", vencimento: d(50), valor: 7912.4 },
      ])
      .returning();
    const dupsNf2 = await tx
      .insert(s.duplicatas)
      .values([
        { notaId: nf2.id, numero: "1/2", vencimento: d(10), valor: 4615 },
        { notaId: nf2.id, numero: "2/2", vencimento: d(40), valor: 4615 },
      ])
      .returning();
    const [chequeRepasse] = await tx
      .insert(s.cheques)
      .values({
        numero: "000287",
        banco: "Itaú",
        emitente: "Carlos Mendes",
        valor: 12527.4,
        dataEmissao: d(-6),
        bomPara: d(12),
        status: "em_carteira",
        clienteId: cliente["Carlos Mendes"],
      })
      .returning();
    await tx.insert(s.chequeDuplicatas).values([
      { chequeId: chequeRepasse.id, duplicataId: dupsNf1[1].id },
      { chequeId: chequeRepasse.id, duplicataId: dupsNf2[0].id },
    ]);
    // Nota com 10 duplicatas: 5 quitadas por um cheque emitido pela empresa.
    const [nf3] = await tx
      .insert(s.notas)
      .values({ numero: "31.902", emitenteDestinatario: "Arauco do Brasil", dataEmissao: d(-5), valorTotal: 18000 })
      .returning();
    const dupsNf3 = await tx
      .insert(s.duplicatas)
      .values(
        Array.from({ length: 10 }, (_, i) => ({
          notaId: nf3.id,
          numero: `${i + 1}/10`,
          vencimento: d(25 + 30 * i),
          valor: 1800,
        })),
      )
      .returning();
    const [chequeEmitido] = await tx
      .insert(s.cheques)
      .values({
        tipo: "emitido",
        numero: "001053",
        banco: "Itaú",
        emitente: EMPRESA.nome,
        favorecido: nf3.emitenteDestinatario,
        valor: 9000,
        dataEmissao: d(-2),
        bomPara: d(25),
        status: "emitido",
      })
      .returning();
    await tx.insert(s.chequeDuplicatas).values(dupsNf3.slice(0, 5).map((dup) => ({ chequeId: chequeEmitido.id, duplicataId: dup.id })));

    // Nota de cliente ligada a um pedido: 3 duplicatas de R$ 300, a última paga com
    // R$ 200 em dinheiro, o que gerou o saldo 3/3-A de R$ 100.
    const pedidoRef = { id: pedidoIds[131], clienteId: cliente["Maria Silva"] };
    const [nf4] = await tx
      .insert(s.notas)
      .values({ numero: "1.042", emitenteDestinatario: "Maria Silva", dataEmissao: d(-60), valorTotal: 900, clienteId: pedidoRef.clienteId, pedidoId: pedidoRef.id })
      .returning();
    const dupsNf4 = await tx
      .insert(s.duplicatas)
      .values([
        { notaId: nf4.id, numero: "1/3", vencimento: d(-30), valor: 300, status: "paga", pagaEm: d(-30) },
        { notaId: nf4.id, numero: "2/3", vencimento: d(-15), valor: 300, status: "paga", pagaEm: d(-15) },
        { notaId: nf4.id, numero: "3/3", vencimento: d(-2), valor: 200, valorOriginal: 300, status: "paga", pagaEm: d(-2) },
      ])
      .returning();
    await tx.insert(s.duplicatas).values({ notaId: nf4.id, numero: "3/3-A", vencimento: d(28), valor: 100, origemId: dupsNf4[2].id });
    await tx.insert(s.pagamentos).values([
      { duplicataId: dupsNf4[0].id, loteId: crypto.randomUUID(), forma: "pix", valor: 300, data: d(-30), userId: ricardo },
      { duplicataId: dupsNf4[1].id, loteId: crypto.randomUUID(), forma: "cartao_debito", valor: 300, data: d(-15), userId: ricardo },
      { duplicataId: dupsNf4[2].id, loteId: crypto.randomUUID(), forma: "dinheiro", valor: 200, data: d(-2), userId: ricardo },
    ]);
    // Nota de fornecedor, sem cheque, paga no Pix.
    const [nf5] = await tx
      .insert(s.notas)
      .values({ numero: "7.310", emitenteDestinatario: "Ferragens Curitiba", dataEmissao: d(-8), valorTotal: 1240.5 })
      .returning();
    const [dupNf5] = await tx
      .insert(s.duplicatas)
      .values({ notaId: nf5.id, numero: "1/1", vencimento: d(-1), valor: 1240.5, status: "paga", pagaEm: d(-1) })
      .returning();
    await tx.insert(s.pagamentos).values({ duplicataId: dupNf5.id, loteId: crypto.randomUUID(), forma: "pix", valor: 1240.5, data: d(-1), userId: ricardo });

    await tx.insert(s.recibos).values([
      { tipo: "corte", data: d(-3), pagadorNome: "João Pereira", valor: 180, forma: "dinheiro", descricao: "Corte de 2 chapas de MDF 18 mm trazidas pelo cliente", userId: ricardo },
      { tipo: "montagem", data: d(-1), pagadorNome: "Ana Maria Prado", pagadorDocumento: "12345678909", valor: 650, forma: "pix", descricao: "Montagem de guarda-roupa de 6 portas", userId: ricardo },
      { tipo: "pedido", data: d(-2), clienteId: pedidoRef.clienteId, pedidoId: pedidoRef.id, pagadorNome: "Maria Silva", valor: 200, forma: "dinheiro", descricao: "Pagamento da duplicata 3/3 da nota 1.042", userId: ricardo },
    ]);

    await tx.insert(s.contas).values([
      {
        tipo: "pagar",
        descricao: "Aluguel do galpão",
        valor: 4800,
        vencimento: d(3),
        formaPagamento: "boleto",
        categoria: "Despesas fixas",
      },
      {
        tipo: "pagar",
        descricao: "Energia elétrica",
        valor: 1260.35,
        vencimento: d(-2),
        formaPagamento: "boleto",
        categoria: "Despesas fixas",
      },
      {
        tipo: "pagar",
        descricao: "Compra de chapas · NF 58.214",
        valor: 7912.4,
        vencimento: d(20),
        formaPagamento: "boleto",
        categoria: "Matéria-prima",
        parcelaNumero: 2,
        parcelaTotal: 3,
        fornecedorId: fornecedor["Duratex S.A."],
      },
    ]);

    // Estoque
    const categoriasRows = await tx
      .insert(s.materialCategorias)
      .values([
        { nome: "Chapas", prefixo: "CH", ordem: 1 },
        { nome: "Ferragens", prefixo: "FE", ordem: 2 },
        { nome: "Dobradiças", prefixo: "DB", ordem: 3 },
        { nome: "Parafusos", prefixo: "PA", ordem: 4 },
        { nome: "Acessórios", prefixo: "AC", ordem: 5 },
      ])
      .returning();
    const categoria = Object.fromEntries(categoriasRows.map((c) => [c.nome, c.id])) as Record<string, string>;

    type SeedMaterial = {
      codigo: string;
      nome: string;
      categoria: string;
      unidade: Unidade;
      chapa?: [number, number, number];
      cor: string;
      complemento?: string;
      saldo: number;
      minimo: number;
      custo: number;
      fornecedor: string;
      /** Quantidade debitada para o Pedido #0131. */
      saidaPedido?: number;
    };

    const materiaisSeed: SeedMaterial[] = [
      { codigo: "CH-0012", nome: "MDF Branco TX 18 mm", categoria: "Chapas", unidade: "chapa", chapa: [2750, 1840, 18], cor: "Branco TX", saldo: 6, minimo: 15, custo: 214.5, fornecedor: "Duratex S.A.", saidaPedido: 8 },
      { codigo: "CH-0018", nome: "MDF Louro Freijó 18 mm", categoria: "Chapas", unidade: "chapa", chapa: [2750, 1840, 18], cor: "Louro Freijó", saldo: 3, minimo: 8, custo: 289.9, fornecedor: "Duratex S.A.", saidaPedido: 5 },
      { codigo: "CH-0021", nome: "MDF Cinza Grafite 18 mm", categoria: "Chapas", unidade: "chapa", chapa: [2750, 1840, 18], cor: "Cinza Grafite", saldo: 14, minimo: 6, custo: 248.7, fornecedor: "Duratex S.A.", saidaPedido: 3 },
      { codigo: "CH-0004", nome: "MDF Branco 6 mm (fundo)", categoria: "Chapas", unidade: "chapa", chapa: [2750, 1840, 6], cor: "Branco", saldo: 22, minimo: 10, custo: 98.4, fornecedor: "Duratex S.A." },
      { codigo: "DB-0007", nome: "Dobradiça curva 35 mm c/ amortecedor", categoria: "Dobradiças", unidade: "unidade", cor: "Niquelado", saldo: 40, minimo: 100, custo: 12.9, fornecedor: "Häfele Brasil", saidaPedido: 36 },
      { codigo: "DB-0005", nome: "Dobradiça reta 35 mm c/ amortecedor", categoria: "Dobradiças", unidade: "unidade", cor: "Niquelado", saldo: 168, minimo: 100, custo: 11.8, fornecedor: "Häfele Brasil" },
      { codigo: "FE-0031", nome: "Corrediça oculta 450 mm (par)", categoria: "Ferragens", unidade: "unidade", cor: "Zincado", saldo: 4, minimo: 12, custo: 68.4, fornecedor: "Häfele Brasil", saidaPedido: 8 },
      { codigo: "AC-0044", nome: "Puxador perfil alumínio", categoria: "Acessórios", unidade: "metro_linear", cor: "Alumínio escovado", saldo: 46.5, minimo: 20, custo: 38.5, fornecedor: "Häfele Brasil" },
      { codigo: "PA-0010", nome: "Parafuso 4,0 x 40 mm", categoria: "Parafusos", unidade: "caixa", cor: "Zincado", complemento: "cx. 500 un", saldo: 1, minimo: 5, custo: 46, fornecedor: "Ciser Parafusos" },
      { codigo: "PA-0006", nome: "Parafuso 3,5 x 16 mm", categoria: "Parafusos", unidade: "caixa", cor: "Zincado", complemento: "cx. 1000 un", saldo: 9, minimo: 4, custo: 32, fornecedor: "Ciser Parafusos" },
      { codigo: "AC-0019", nome: "Fita de borda PVC 22 mm", categoria: "Acessórios", unidade: "metro_linear", cor: "Branco TX", saldo: 840, minimo: 300, custo: 0.62, fornecedor: "Rehau", saidaPedido: 134 },
      { codigo: "AC-0052", nome: "Vidro reflecta bronze 4 mm", categoria: "Acessórios", unidade: "m2", cor: "Bronze", saldo: 7.2, minimo: 3, custo: 189, fornecedor: "Vidraçaria Curitiba" },
    ];

    for (const [i, m] of materiaisSeed.entries()) {
      const saida = m.saidaPedido ?? 0;
      const entradaQtd = m.saldo + saida;
      const custoMedio = weightedAverageCost({ saldo: 0, custoMedio: 0, quantidade: entradaQtd, custoUnitario: m.custo });
      const [row] = await tx
        .insert(s.materiais)
        .values({
          codigo: m.codigo,
          nome: m.nome,
          categoriaId: categoria[m.categoria],
          unidade: m.unidade,
          chapaLargura: m.chapa?.[0],
          chapaAltura: m.chapa?.[1],
          chapaEspessura: m.chapa?.[2],
          corAcabamento: m.cor,
          complemento: m.complemento,
          estoqueMinimo: m.minimo,
          saldoAtual: m.saldo,
          custoMedio,
        })
        .returning();
      await tx.insert(s.materialAlteracoes).values({
        materialId: row.id,
        tipo: "cadastro",
        userId: ricardo,
        createdAt: new Date(`${d(-30)}T09:00:00-03:00`),
      });
      await tx.insert(s.movimentacoesEstoque).values({
        materialId: row.id,
        tipo: "entrada",
        createdAt: new Date(`${d(-25)}T10:00:00-03:00`),
        data: d(-25),
        quantidade: entradaQtd,
        custoUnitario: m.custo,
        valorTotal: lineTotal(entradaQtd, m.custo),
        saldoApos: entradaQtd,
        custoMedioApos: custoMedio,
        fornecedorId: fornecedor[m.fornecedor],
        numeroNota: String(58300 + i * 7).replace(/(\d{2})(\d{3})/, "$1.$2"),
        userId: ricardo,
      });
      if (saida > 0) {
        await tx.insert(s.movimentacoesEstoque).values({
          materialId: row.id,
          tipo: "saida",
          createdAt: new Date(`${d(-15)}T14:00:00-03:00`),
          data: d(-15),
          quantidade: saida,
          custoUnitario: custoMedio,
          valorTotal: lineTotal(saida, custoMedio),
          saldoApos: m.saldo,
          custoMedioApos: custoMedio,
          observacao: "Produção · Cozinha e Suíte master",
          pedidoId: pedidoIds[131],
          clienteId: cliente["Maria Silva"],
          userId: ricardo,
        });
      }
    }

    // Sequências continuam após os números do seed.
    await tx.execute(sql`SELECT setval('orcamento_numero_seq', (SELECT max(numero) FROM orcamentos))`);
    await tx.execute(sql`SELECT setval('pedido_numero_seq', (SELECT max(numero) FROM pedidos))`);
    await tx.execute(sql`SELECT setval('contrato_numero_seq', (SELECT max(numero) FROM contratos))`);
  });

  console.log(`Seed concluído. Login: ${adminEmail} / ${adminPassword}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
