import Link from "next/link";
import type { Metadata } from "next";
import {
  faCalendar,
  faCalendarCheck,
  faChartBar,
  faCircleDot,
  faCircleXmark,
  faClipboard,
  faClock,
  faCreditCard,
  faFileLines,
  faHandshake,
  faHourglass,
  faKeyboard,
  faMoneyBill1,
  faRectangleList,
  faSquare,
  faTrashCan,
  faUser,
  faWindowMaximize,
} from "@fortawesome/free-regular-svg-icons";
import {
  faArrowLeft,
  faArrowUpFromBracket,
  faCheck,
  faEllipsis,
  faFilter,
  faFont,
  faLink,
  faListOl,
  faPalette,
  faPlus,
  faRotateRight,
  faRulerCombined,
  faSitemap,
  faTable,
} from "@fortawesome/free-solid-svg-icons";
import { faFilePdf } from "@fortawesome/free-regular-svg-icons";
import { ConciliacaoBadge, DeltaText, EstoqueBadge, StatusBadge, VenceEmBadge } from "@/components/ds/badge";
import { ActiveFilters, ClearFiltersLink, FilterBar, SearchField } from "@/components/ds/filter-bar";
import { FileUploadDemo } from "@/components/ds/file-upload";
import { KpiCard } from "@/components/ds/kpi-card";
import { NoLinkChip, RecordChip } from "@/components/ds/record-chip";
import { EmptyState, ErrorState, LoadingState } from "@/components/ds/states";
import { Stepper } from "@/components/ds/stepper";
import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  AbasDemo,
  ArvoreDemo,
  CamposDemo,
  ChartDemo,
  OverlaysDemo,
  SelecaoDemo,
  TabelaDemo,
  ToastTrigger,
  UploadStates,
} from "./demos";

export const metadata: Metadata = { title: "Design System" };

const NAV = [
  { group: "Fundamentos", items: [["cores", "Cores", faPalette], ["tipografia", "Tipografia", faFont], ["espacamento", "Espaçamento e raio", faRulerCombined]] },
  { group: "Ações e entrada", items: [["botoes", "Botões", faSquare], ["campos", "Campos", faKeyboard], ["selecao", "Seleção", faRectangleList]] },
  {
    group: "Dados",
    items: [["status", "Status", faCircleDot], ["vinculos", "Vínculos", faLink], ["filtros", "Filtros e abas", faFilter], ["tabela", "Tabela", faTable], ["cards", "Cards e gráfico", faChartBar]],
  },
  {
    group: "Padrões",
    items: [["stepper", "Stepper", faListOl], ["arvore", "Árvore do orçamento", faSitemap], ["overlays", "Modais e toasts", faWindowMaximize], ["estados", "Estados", faHourglass], ["upload", "Upload", faArrowUpFromBracket]],
  },
] as const;

const NAVY = [
  ["50", "#F6F7FA"], ["100", "#EEF0F5"], ["200", "#DCE0EA"], ["300", "#B9C0D2"], ["400", "#8A93AD"], ["500", "#5A6688"],
  ["600", "#3D4A6E"], ["700", "#2A3557"], ["800", "#1B2542"], ["900", "#101830"], ["950", "#0A1022"],
] as const;

const SEMANTICAS = [
  { nome: "Verde · sucesso", uso: "Pago, aprovado, compensado, assinado", cores: ["#ECFDF5", "#059669", "#047857"], badge: <StatusBadge entity="duplicata" status="paga" /> },
  { nome: "Âmbar · atenção", uso: "Pendente, em produção, vence em breve", cores: ["#FFFBEB", "#F59E0B", "#B45309"], badge: <StatusBadge entity="duplicata" status="em_aberto" /> },
  { nome: "Vermelho · crítico", uso: "Vencido, recusado, devolvido, estoque baixo", cores: ["#FEF2F2", "#DC2626", "#B91C1C"], badge: <StatusBadge entity="conta" status="vencido" /> },
  { nome: "Azul · informativo", uso: "Enviado, depositado, pronto", cores: ["#EFF6FF", "#3B82F6", "#1D4ED8"], badge: <StatusBadge entity="orcamento" status="enviado" /> },
  { nome: "Cinza · inativo", uso: "Rascunho, cancelado, expirado", cores: ["#F1F5F9", "#94A3B8", "#475569"], badge: <StatusBadge entity="orcamento" status="rascunho" /> },
];

const TIPOS = [
  ["Display · 32/40 · 600", "text-display", "Orçamento #0248"],
  ["H1 · 24/32 · 600", "text-h1", "Detalhe do pedido"],
  ["H2 · 20/28 · 600", "text-h2", "Contas a receber"],
  ["H3 · 15/22 · 600", "text-h3", "Próximos vencimentos"],
  ["Body · 14/22 · 400", "text-body", "Medidas sujeitas a confirmação após medição técnica no local."],
  ["Tabela · 13/20 · 400", "text-table", "MDF Branco TX 18 mm · Chapas · 2750 × 1840 × 18 mm"],
  ["Rótulo · 13/20 · 500", "text-table font-medium", "CPF/CNPJ"],
  ["Legenda · 12/16 · 400", "text-caption text-navy-500", "Salvo automaticamente às 14:32"],
  ["Overline · 11 · 600", "eyebrow", "Cômodo"],
] as const;

function Section({ id, title, description, aside, children, bodyClassName = "p-7" }: { id: string; title: string; description: string; aside?: React.ReactNode; children: React.ReactNode; bodyClassName?: string }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-section border border-navy-100 bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-navy-100 px-7 pt-6 pb-[21px]">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-section text-navy-900">{title}</h2>
          <p className="text-table text-navy-500">{description}</p>
        </div>
        {aside}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => <p className="eyebrow pb-3">{children}</p>;

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-navy-50">
      <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between bg-navy-900 px-10">
        <div className="flex items-center gap-4">
          <BrandMark size={36} />
          <div>
            <p className="text-body font-semibold text-white">DH Móveis</p>
            <p className="text-overline text-navy-300">Design System · v1.0</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-caption text-navy-300 md:inline">Tokens · Componentes · Padrões · pt-BR</span>
          <span className="rounded-full border border-white/20 px-3 py-1 text-overline font-medium text-white">Atualizado em 14/05/2025</span>
          <Link href="/" className="flex items-center gap-1.5 text-caption font-medium text-white hover:underline">
            <Icon icon={faArrowLeft} size={11} /> Sistema
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] gap-8 px-10 pt-8 pb-16">
        <aside className="sticky top-[100px] hidden h-fit w-56 shrink-0 lg:block">
          <nav aria-label="Seções do design system" className="flex flex-col gap-5">
            {NAV.map((g) => (
              <div key={g.group}>
                <p className="px-3 pb-1 text-overline font-semibold tracking-[0.55px] text-navy-400 uppercase">{g.group}</p>
                {g.items.map(([id, label, icon]) => (
                  <a key={id} href={`#${id}`} className="flex h-8 items-center gap-2.5 rounded-field px-3 text-table text-navy-600 hover:bg-white hover:text-navy-900">
                    <span className="flex w-4 justify-center text-navy-400">
                      <Icon icon={icon} size={12} />
                    </span>
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-8">
          {/* Intro (Figma 1:1979) */}
          <section className="rounded-section bg-navy-900 p-8">
            <p className="text-caption font-medium tracking-[2.16px] text-navy-300 uppercase">Sistema de componentes</p>
            <h1 className="pt-3 text-[32px] leading-10 font-semibold text-white">Claro, profissional e eficiente.</h1>
            <p className="max-w-[680px] pt-3 text-body text-navy-300">
              Base visual do sistema de gestão DH Móveis: tokens, componentes e padrões para telas de uso diário intenso, com muitas tabelas e formulários.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-6 md:grid-cols-4">
              {[
                ["Fonte", "Poppins", false],
                ["Primária", "#101830", true],
                ["Moeda", "R$ 1.234,56", false],
                ["Data", "DD/MM/AAAA", false],
              ].map(([k, v, mono]) => (
                <div key={String(k)} className="rounded-field border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-caption text-navy-300">{k}</p>
                  <p className={mono ? "font-mono text-table text-white" : "text-table font-medium text-white"}>{v}</p>
                </div>
              ))}
            </div>
          </section>

          <Section id="cores" title="Cores" description="Navy para estrutura e ação; neutros azulados para fundo e divisórias; cores semânticas suaves, usadas principalmente em badges e alertas.">
            <Eyebrow>Primária · navy</Eyebrow>
            <div className="grid grid-cols-6 gap-2 lg:grid-cols-11">
              {NAVY.map(([tom, hex]) => (
                <div key={tom}>
                  <div
                    className={tom === "900" ? "h-16 rounded-field bg-navy-900 shadow-[0_0_0_2px_white,0_0_0_4px_#101830]" : "h-16 rounded-field border border-transparent"}
                    style={{ background: hex, borderColor: tom === "50" ? "#eef0f5" : undefined }}
                  />
                  <p className={tom === "900" ? "pt-1.5 text-caption font-semibold text-navy-900" : "pt-1.5 text-caption font-medium text-navy-900"}>{tom === "900" ? "900 · base" : tom}</p>
                  <p className="font-mono text-overline text-navy-400">{hex}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-8 pt-8 lg:grid-cols-2">
              <div>
                <Eyebrow>Superfícies e uso</Eyebrow>
                <ul className="divide-y divide-navy-100 rounded-card border border-navy-100">
                  {[
                    ["#ffffff", "Superfície · cards, formulários", "white"],
                    ["#f6f7fa", "Fundo da página · hover · zebra", "navy-50"],
                    ["#eef0f5", "Divisórias · bordas suaves", "navy-100"],
                    ["#dce0ea", "Borda de campos", "navy-200"],
                    ["#5a6688", "Texto secundário", "navy-500"],
                    ["#101830", "Sidebar · títulos · cabeçalho de tabela · botões", "navy-900"],
                  ].map(([hex, uso, token]) => (
                    <li key={token} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="size-7 shrink-0 rounded-field-sm border border-navy-200" style={{ background: hex }} />
                      <span className="flex-1 text-table text-navy-900">{uso}</span>
                      <span className="font-mono text-overline text-navy-400">{token}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <Eyebrow>Semânticas</Eyebrow>
                <ul className="flex flex-col gap-2.5">
                  {SEMANTICAS.map((s) => (
                    <li key={s.nome} className="flex items-center gap-3 rounded-card border border-navy-100 p-[13px]">
                      <span className="flex">
                        {s.cores.map((c, i) => (
                          <span key={c} className="size-7 rounded-field-sm shadow-[0_0_0_2px_white]" style={{ background: c, marginRight: i < 2 ? -4 : 0 }} />
                        ))}
                      </span>
                      <span className="flex-1">
                        <span className="block text-table font-medium text-navy-900">{s.nome}</span>
                        <span className="block text-caption text-navy-400">{s.uso}</span>
                      </span>
                      {s.badge}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section id="tipografia" title="Tipografia" description="Poppins em todo o sistema. Semibold para títulos e cabeçalhos de tabela, Medium para botões e rótulos, Regular para texto e células. Números sempre com algarismos tabulares.">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
              <ul className="divide-y divide-navy-100">
                {TIPOS.map(([spec, cls, sample]) => (
                  <li key={spec} className="flex items-baseline gap-6 py-3">
                    <span className="w-44 shrink-0 font-mono text-overline text-navy-400">{spec}</span>
                    <span className={`${cls} min-w-0 truncate text-navy-900`}>{sample}</span>
                  </li>
                ))}
              </ul>
              <div className="self-start rounded-card border border-navy-100 bg-navy-50/60 p-5">
                <Eyebrow>Algarismos tabulares</Eyebrow>
                <div className="num overflow-hidden rounded-field border border-navy-100 bg-white text-table">
                  <div className="flex justify-between bg-navy-900 px-4 py-2 text-caption font-semibold text-white">
                    <span>Descrição</span>
                    <span>Valor</span>
                  </div>
                  {[["Bancada da ilha", "R$ 6.200,00"], ["Passa-prato", "R$ 1.420,00"], ["Gavetas", "R$ 2.250,00"]].map(([d, v], i) => (
                    <div key={d} className={i % 2 ? "flex justify-between bg-navy-50/60 px-4 py-2" : "flex justify-between px-4 py-2"}>
                      <span>{d}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-navy-200 bg-navy-50 px-4 py-2 font-semibold">
                    <span>Subtotal</span>
                    <span>R$ 9.870,00</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-1.5 pt-4 text-caption text-navy-500">
                  <li className="flex items-center gap-1.5"><Icon icon={faCheck} size={11} className="text-success" /> Moeda alinhada à direita</li>
                  <li className="flex items-start gap-1.5"><Icon icon={faCheck} size={11} className="mt-[3px] text-success" /> <span><code className="font-mono">tabular-nums</code> em valores, datas e quantidades</span></li>
                  <li className="flex items-center gap-1.5"><Icon icon={faCheck} size={11} className="text-success" /> Negativos com “−” e cor vermelha</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section id="espacamento" title="Espaçamento, raio, sombra e ícones" description="Escala base de 4 px. Espaço generoso, mas sem desperdício.">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div>
                <Eyebrow>Espaçamento</Eyebrow>
                <ul className="flex flex-col gap-2">
                  {[[4, 1], [8, 2], [12, 3], [16, 4, "gaps de grid"], [20, 5, "padding de card"], [24, 6], [32, 8, "margem da página"], [48, 12]].map(([px, step, uso]) => (
                    <li key={px} className="flex items-center gap-3">
                      <span className="w-14 font-mono text-overline text-navy-400">{px} · {step}</span>
                      <span className="h-3 rounded-[2px] bg-navy-900" style={{ width: Number(px) }} />
                      {uso && <span className="text-caption text-navy-400">{uso}</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <Eyebrow>Raio e sombra</Eyebrow>
                <div className="grid grid-cols-2 gap-3">
                  {[["rounded-field-sm", "6 px", "Campos de tabela"], ["rounded-field", "8 px", "Botões · campos"], ["rounded-card", "12 px", "Cards"], ["rounded-section shadow-modal border-navy-100", "16 px + sombra", "Modais"]].map(([cls, t, uso]) => (
                    <div key={t} className={`flex h-20 flex-col items-center justify-center border border-navy-200 bg-white ${cls}`}>
                      <span className="text-caption font-medium text-navy-900">{t}</span>
                      <span className="font-mono text-overline text-navy-400">{uso}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Eyebrow>Iconografia · contorno, traço uniforme</Eyebrow>
                <div className="grid grid-cols-4 gap-2">
                  {[[faChartBar, "Dashboard"], [faUser, "Clientes"], [faFileLines, "Orçamentos"], [faClipboard, "Pedidos"], [faHandshake, "Contratos"], [faMoneyBill1, "Financeiro"], [faCreditCard, "Cheques"], [faCalendar, "Datas"]].map(([icon, label]) => (
                    <div key={String(label)} className="flex flex-col items-center gap-1.5 rounded-field border border-navy-100 py-3.5 text-navy-900">
                      <Icon icon={icon as typeof faUser} size={18} />
                      <span className="text-overline text-navy-500">{String(label)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section id="botoes" title="Botões" description="Uma ação primária por área. Rótulos curtos no infinitivo ou substantivo (“Salvar”, “Novo orçamento”).">
            <Eyebrow>Variantes</Eyebrow>
            <div className="flex flex-wrap items-center gap-3">
              <Button><Icon icon={faPlus} size={12} /> Novo orçamento</Button>
              <Button variant="secondary"><Icon icon={faFilePdf} size={14} /> Gerar PDF</Button>
              <Button variant="ghost">Cancelar</Button>
              <Button variant="destructive"><Icon icon={faTrashCan} size={12} /> Excluir</Button>
              <Button variant="secondary" size="icon" aria-label="Mais ações"><Icon icon={faEllipsis} size={14} /></Button>
              <Button variant="link">Link de texto</Button>
            </div>
            <div className="grid grid-cols-1 gap-7 pt-7 md:grid-cols-2">
              <div>
                <Eyebrow>Tamanhos</Eyebrow>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Pequeno · 32</Button>
                  <Button>Médio · 40</Button>
                  <Button size="lg">Grande · 44</Button>
                </div>
              </div>
              <div>
                <Eyebrow>Estados</Eyebrow>
                <div className="flex flex-wrap items-center gap-3">
                  <Button className="bg-navy-800">Hover</Button>
                  <Button className="shadow-focus">Foco</Button>
                  <Button loading>Salvando...</Button>
                  <Button disabled>Desabilitado</Button>
                </div>
              </div>
            </div>
          </Section>

          <Section id="campos" title="Campos" description="Obrigatório marcado com *; opcional indicado em cinza. Máscaras brasileiras aplicadas durante a digitação.">
            <CamposDemo />
          </Section>

          <Section id="selecao" title="Seleção" description="Select simples para listas curtas; select pesquisável para clientes, pedidos e materiais; multisseleção para vincular duplicatas a cheques.">
            <SelecaoDemo />
          </Section>

          <Section id="status" title="Status" description="Todo status do sistema usa uma das cinco cores semânticas, sempre com ponto e texto (nunca só cor).">
            <ul className="divide-y divide-navy-100 rounded-card border border-navy-100">
              {[
                ["Orçamento", (["rascunho", "enviado", "aprovado", "recusado", "expirado"] as const).map((s) => <StatusBadge key={s} entity="orcamento" status={s} />)],
                ["Pedido", (["aguardando_producao", "em_producao", "pronto", "entregue", "cancelado"] as const).map((s) => <StatusBadge key={s} entity="pedido" status={s} />)],
                ["Contrato", (["gerado", "assinado"] as const).map((s) => <StatusBadge key={s} entity="contrato" status={s} />)],
                ["Nota", (["em_aberto", "parcial", "paga"] as const).map((s) => <StatusBadge key={s} entity="nota" status={s} />)],
                ["Duplicata", (["em_aberto", "em_cheque", "paga"] as const).map((s) => <StatusBadge key={s} entity="duplicata" status={s} />)],
                ["Cheque", (["em_carteira", "emitido", "depositado", "compensado", "devolvido", "repassado"] as const).map((s) => <StatusBadge key={s} entity="cheque" status={s} />)],
                ["Recibo", (["emitido", "cancelado"] as const).map((s) => <StatusBadge key={s} entity="recibo" status={s} />)],
                ["Contas a pagar / receber", [...(["em_aberto", "pago", "recebido", "vencido"] as const).map((s) => <StatusBadge key={s} entity="conta" status={s} />), <VenceEmBadge key="v" dias={3} />]],
                ["Estoque", [<EstoqueBadge key="a" kind="abaixo" />, <EstoqueBadge key="e" kind="entrada" />, <EstoqueBadge key="s" kind="saida" />, <DeltaText key="p" value={10}>+ 10 chapas</DeltaText>, <DeltaText key="m" value={-4}>− 4 chapas</DeltaText>]],
                ["Conciliação de cheque", [<ConciliacaoBadge key="c" diferenca={0} />, <ConciliacaoBadge key="s" diferenca={120}>Sobra R$ 120,00</ConciliacaoBadge>, <ConciliacaoBadge key="f" diferenca={-85.4}>Falta R$ 85,40</ConciliacaoBadge>]],
              ].map(([label, badges]) => (
                <li key={String(label)} className="flex items-center gap-3 px-5 py-4">
                  <span className="w-40 shrink-0 text-table font-medium text-navy-900">{label as string}</span>
                  <span className="flex flex-wrap items-center gap-2">{badges as React.ReactNode}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="vinculos" title="Vínculos entre registros" description="Chips clicáveis que levam ao registro relacionado — usados em tabelas, cabeçalhos e formulários.">
            <div className="flex flex-wrap gap-2.5">
              <RecordChip kind="cliente" href="#vinculos">Cliente: Maria Silva</RecordChip>
              <RecordChip kind="orcamento" href="#vinculos">Orçamento #0248</RecordChip>
              <RecordChip kind="pedido" href="#vinculos">Pedido #0131</RecordChip>
              <RecordChip kind="contrato" href="#vinculos" dot="success">Contrato #0098</RecordChip>
              <RecordChip kind="cheque" href="#vinculos">Cheque Nº 000412</RecordChip>
              <RecordChip kind="nota" href="#vinculos">NF 58.214 · Dup 2/3</RecordChip>
              <RecordChip kind="fornecedor" href="#vinculos">Fornecedor: Duratex S.A.</RecordChip>
              <RecordChip kind="material" href="#vinculos">MDF Branco TX 18 mm</RecordChip>
              <NoLinkChip />
            </div>
          </Section>

          <Section id="filtros" title="Barra de filtros e abas" description="Padrão de listagem: busca, status, período, cliente e pedido. Filtros ativos aparecem como chips removíveis.">
            <FilterBar active={<ActiveFilters filters={[{ label: "Status: Em carteira", removeHref: "#filtros" }, { label: "Cliente: Maria Silva", removeHref: "#filtros" }]} />}>
              <SearchField placeholder="Buscar número, emitente..." />
              <NativeSelect aria-label="Status" containerClassName="w-36" defaultValue="">
                <option value="">Status: todos</option>
                <option>Em carteira</option>
              </NativeSelect>
              <Button variant="secondary" className="font-normal">
                <Icon icon={faCalendar} size={13} /> 01/05/2025 – 31/05/2025
              </Button>
              <NativeSelect aria-label="Cliente" containerClassName="w-28" defaultValue="">
                <option value="">Cliente</option>
              </NativeSelect>
              <NativeSelect aria-label="Pedido" containerClassName="w-28" defaultValue="">
                <option value="">Pedido</option>
              </NativeSelect>
              <ClearFiltersLink href="#filtros" />
            </FilterBar>
            <div className="pt-7">
              <AbasDemo />
            </div>
          </Section>

          <Section id="tabela" title="Tabela de dados" description="Cabeçalho navy, zebra suave, hover, ordenação, ações por linha, linha de totais e modo compacto.">
            <TabelaDemo />
            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-4 text-caption text-navy-500">
              <li>• Linha confortável 44 px · compacta 32 px</li>
              <li>• Última linha: skeleton de carregamento</li>
              <li>• Ordenação ativa com seta; inativa com ícone neutro</li>
            </ul>
          </Section>

          <Section id="cards" title="Cards, KPIs e gráfico de barras" description="KPI com rótulo, valor, contexto e ação. Alertas usam borda e faixa laterais vermelhas.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <KpiCard label="A receber este mês" value="R$ 96.450,00" icon={faCalendarCheck} progress={0.43} context={<span className="flex w-full justify-between"><span>Recebido R$ 41.208,00</span></span>} action={<span className="num text-caption font-semibold text-navy-900">43%</span>} />
              <KpiCard label="Pedidos em produção" value="8" icon={faClipboard} context="3 entregas em 15 dias" action={<Link href="/pedidos" className="text-caption font-medium text-navy-900 hover:underline">Ver pedidos</Link>} />
              <KpiCard label="Valores vencidos" value="R$ 14.870,00" icon={faClock} tone="alert" context="6 títulos" action={<span className="text-caption font-medium text-danger-fg">Ver vencidos</span>} />
            </div>
            <div className="grid grid-cols-1 gap-5 pt-5 lg:grid-cols-[1fr_300px]">
              <div className="rounded-card border border-navy-100 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3">
                  <div>
                    <p className="text-h3 text-navy-900">Recebimentos previstos por mês</p>
                    <p className="text-caption text-navy-400">Barras agrupadas · A receber x Recebido</p>
                  </div>
                  <div className="flex items-center gap-4 text-caption text-navy-600">
                    <span className="flex items-center gap-1.5"><span className="size-3 rounded-[3px] bg-chart-previsto" /> A receber</span>
                    <span className="flex items-center gap-1.5"><span className="size-3 rounded-[3px] bg-navy-900" /> Recebido</span>
                  </div>
                </div>
                <ChartDemo />
              </div>
              <div className="self-start rounded-card border border-navy-100 p-5">
                <Eyebrow>Regras do gráfico</Eyebrow>
                <ul className="flex flex-col gap-3 text-table text-navy-900">
                  <li className="flex items-center gap-3"><span className="size-6 rounded-field-sm bg-chart-previsto" /> Previsto · <span className="font-mono text-overline text-navy-400">#C9CFDE</span></li>
                  <li className="flex items-center gap-3"><span className="size-6 rounded-field-sm bg-navy-900" /> Realizado · <span className="font-mono text-overline text-navy-400">#101830</span></li>
                  <li className="flex items-center gap-3"><span className="h-px w-6 border-t border-dashed border-navy-300" /> Marcador do mês atual</li>
                </ul>
                <p className="pt-4 text-caption text-navy-500">Grade horizontal navy-100, sem grade vertical, eixo Y com prefixo R$, tooltip navy com valor formatado.</p>
              </div>
            </div>
          </Section>

          <Section id="stepper" title="Stepper de status" description="Usado no detalhe do pedido. Concluído (verde), atual (navy com halo), futuro (contorno).">
            <Stepper
              steps={[
                { label: "Aguardando produção", detail: "13/05/2025", state: "done" },
                { label: "Em produção", detail: "Desde 22/05/2025", state: "current" },
                { label: "Pronto", state: "future" },
                { label: "Entregue/Instalado", detail: "Previsto 21/07/2025", state: "future" },
              ]}
            />
            <p className="mt-4 inline-flex items-center gap-2 rounded-field bg-neutral-bg px-3.5 py-2 text-caption text-neutral-fg">
              <Icon icon={faCircleXmark} size={12} />
              Pedido cancelado: o stepper fica cinza e exibe a data e o motivo do cancelamento.
            </p>
          </Section>

          <Section id="arvore" title="Linhas da árvore do orçamento" description="Três níveis com recuo e peso visual decrescentes: Cômodo → Móvel → Item. Subtotal sempre no cabeçalho do grupo." bodyClassName="p-7 [&>section]:border-0 [&>section>div:first-of-type]:hidden">
            <ArvoreDemo />
          </Section>

          <Section id="overlays" title="Modais, drawer e toasts" description="Confirmação explica a consequência. Ações destrutivas em vermelho e sempre com confirmação." aside={<ToastTrigger />}>
            <OverlaysDemo />
            <p className="pt-3 text-caption text-navy-400">Toasts no canto inferior direito, 4 s. Use “Disparar toast” para ver os quatro tipos.</p>
          </Section>

          <Section id="estados" title="Estados vazios, carregamento e erro" description="Toda lista e detalhe tem os três estados, sempre com uma ação clara.">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <EmptyState
                title="Nenhum orçamento ainda"
                description="Este cliente ainda não possui orçamentos. Crie o primeiro para começar."
                action={<Button size="compact"><Icon icon={faPlus} size={11} /> Novo orçamento</Button>}
              />
              <div>
                <LoadingState />
              </div>
              <ErrorState
                title="Não foi possível carregar os cheques"
                action={<Button variant="secondary" size="compact"><Icon icon={faRotateRight} size={11} /> Tentar novamente</Button>}
              />
            </div>
          </Section>

          <Section id="upload" title="Upload de arquivo" description="Anexo do contrato assinado: arrastar e soltar, progresso, pré-visualização, substituir ou remover.">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <FileUploadDemo />
              <UploadStates />
            </div>
          </Section>

          <p className="text-center text-caption text-navy-400">DH Móveis · Design System v1.0 · Uso interno</p>
        </main>
      </div>
    </div>
  );
}
