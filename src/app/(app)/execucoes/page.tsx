import Link from "next/link";
import type { Metadata } from "next";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { Badge, StatusBadge } from "@/components/ds/badge";
import { DataTable, TBody, TD, TH, THead, TR } from "@/components/ds/data-table";
import { KpiCard } from "@/components/ds/kpi-card";
import { Icon } from "@/components/icon";
import { AppHeader } from "@/components/layout/app-header";
import { PageBody, PageTitle } from "@/components/layout/page";
import { Calendario, Legenda } from "@/features/execucoes/components/calendario";
import { AgendaProvider, LinhaAcoes } from "@/features/execucoes/components/execucoes-client";
import { getAgenda, type PedidoNaAgenda } from "@/features/execucoes/queries";
import { AVISO_LABEL, mesAtual, mesValido, nomeDoMes, somarMeses, type AvisoTipo } from "@/features/execucoes/regras";
import { todayISO } from "@/lib/dates";
import { formatDate, formatNumero, pluralize } from "@/lib/format";
import { hrefWith, param } from "@/lib/url";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Execuções" };

const PATH = "/execucoes";
const navBtn = "flex size-9 items-center justify-center rounded-field border border-navy-200 bg-white text-navy-700 hover:bg-navy-50 focus-visible:shadow-focus focus-visible:outline-none";

function Avisos({ avisos }: { avisos: AvisoTipo[] }) {
  if (avisos.length === 0) return <span className="text-navy-300">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {avisos.map((a) => (
        <Badge key={a} tone={a === "sem_data" || a === "passa_entrega" ? "warning" : "danger"}>
          {AVISO_LABEL[a]}
        </Badge>
      ))}
    </div>
  );
}

function Lista({ titulo, descricao, vazio, pedidos }: { titulo: string; descricao: string; vazio: string; pedidos: PedidoNaAgenda[] }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h3 className="text-h3 text-navy-900">
          {titulo} <span className="num font-normal text-navy-400">· {pedidos.length}</span>
        </h3>
        <p className="text-caption text-navy-500">{descricao}</p>
      </div>
      {pedidos.length === 0 ? (
        <p className="rounded-card border border-dashed border-navy-200 bg-white px-5 py-4 text-table text-navy-400">{vazio}</p>
      ) : (
        <DataTable minWidth={1040}>
          <THead>
            <TH width={260}>Pedido</TH>
            <TH width={200}>Produção</TH>
            <TH width={130}>Entrega</TH>
            <TH width={170}>Status</TH>
            <TH>Avisos</TH>
            <TH width={250}>
              <span className="sr-only">Ações</span>
            </TH>
          </THead>
          <TBody>
            {pedidos.map((p) => (
              <TR key={p.id}>
                <TD>
                  <Link href={`/pedidos/${p.id}`} className="num font-medium hover:underline focus-visible:underline focus-visible:outline-none">
                    {formatNumero(p.numero)}
                  </Link>{" "}
                  <span>{p.cliente}</span>
                </TD>
                <TD className="num whitespace-nowrap">
                  {p.producaoInicio && p.producaoFim ? `${formatDate(p.producaoInicio)} → ${formatDate(p.producaoFim)}` : <span className="text-navy-300">Sem data</span>}
                </TD>
                <TD className={cn("num", p.avisos.includes("entrega_atrasada") && "font-medium text-danger-fg")}>{formatDate(p.previsaoEntrega)}</TD>
                <TD>
                  <StatusBadge entity="pedido" status={p.status} />
                </TD>
                <TD>
                  <Avisos avisos={p.avisos} />
                </TD>
                <TD>
                  <LinhaAcoes pedido={p} />
                </TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      )}
    </section>
  );
}

export default async function ExecucoesPage({ searchParams }: PageProps<"/execucoes">) {
  const sp = await searchParams;
  const hoje = todayISO();
  const atual = mesAtual(hoje);
  const mes = mesValido(param(sp, "mes")) ?? atual;
  const agenda = await getAgenda(mes);
  const proximo = agenda.proximos[0];
  const hrefMes = (m: string) => hrefWith(PATH, sp, { mes: m === atual ? null : m });
  const titulo = nomeDoMes(mes);

  return (
    <AgendaProvider>
      <AppHeader title="Execuções" />
      <PageBody>
        <PageTitle title="Execuções" description="O que está na produção, o que entra em seguida e o que precisa de atenção." />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard size="sm" label="Em produção" value={agenda.emProducao.length} context={pluralize(agenda.emProducao.length, "pedido", "pedidos")} />
          <KpiCard
            size="sm"
            label="Próximos"
            value={agenda.proximos.length}
            context={proximo ? `Próximo: ${formatNumero(proximo.numero)} em ${formatDate(proximo.producaoInicio)}` : "Nenhum agendado"}
          />
          <KpiCard size="sm" label="Sem data" value={agenda.semData.length} context="Precisam ser agendados" />
          <KpiCard size="sm" tone={agenda.atrasados > 0 ? "alert" : "default"} label="Atrasados" value={agenda.atrasados} context="Início, produção ou entrega" />
        </div>

        <section className="overflow-hidden rounded-card border border-navy-100 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Link href={hrefMes(somarMeses(mes, -1))} aria-label="Mês anterior" className={navBtn} scroll={false}>
                <Icon icon={faChevronLeft} size={11} />
              </Link>
              <Link href={hrefMes(somarMeses(mes, 1))} aria-label="Próximo mês" className={navBtn} scroll={false}>
                <Icon icon={faChevronRight} size={11} />
              </Link>
              <h3 className="text-h3 text-navy-900 first-letter:uppercase">{titulo}</h3>
              {mes !== atual && (
                <Link href={hrefMes(atual)} scroll={false} className="rounded-field border border-navy-200 px-3 py-1.5 text-caption font-medium text-navy-700 hover:bg-navy-50 focus-visible:shadow-focus focus-visible:outline-none">
                  Hoje
                </Link>
              )}
            </div>
            <Legenda />
          </div>
          <Calendario mes={mes} hoje={hoje} semanas={agenda.semanas} pedidos={agenda.pedidos} proximos={agenda.proximos} />
        </section>

        <Lista titulo="Em produção" descricao="Pelo fim previsto." vazio="Nenhum pedido em produção agora." pedidos={agenda.emProducao} />
        <Lista titulo="Próximos" descricao="Aguardando produção, pela data de início: é o que entra em seguida." vazio="Nenhum pedido agendado para entrar." pedidos={agenda.proximos} />
        <Lista titulo="Sem data" descricao="Pedidos que ainda precisam de início e fim." vazio="Todos os pedidos estão agendados." pedidos={agenda.semData} />
        <Lista titulo="Prontos para entrega" descricao="Pela previsão de entrega." vazio="Nenhum pedido pronto aguardando entrega." pedidos={agenda.prontos} />
      </PageBody>
    </AgendaProvider>
  );
}
