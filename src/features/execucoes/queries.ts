import { and, asc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { clientes, pedidos } from "@/db/schema";
import { todayISO } from "@/lib/dates";
import { avisosPedido, estaAtrasado, semanasDoMes } from "./regras";

const ATIVOS = ["aguardando_producao", "em_producao", "pronto"] as const;

const porData = (a: string | null, b: string | null) => (a ?? "9999").localeCompare(b ?? "9999");

/** Pedidos ativos, mais os entregues que aparecem no mês mostrado, como histórico. */
export async function getAgenda(mes: string) {
  const semanas = semanasDoMes(mes);
  const de = semanas[0][0];
  const ate = semanas.at(-1)![6];
  const today = todayISO();

  const rows = await db
    .select({
      id: pedidos.id,
      numero: pedidos.numero,
      status: pedidos.status,
      producaoInicio: pedidos.producaoInicio,
      producaoFim: pedidos.producaoFim,
      previsaoEntrega: pedidos.previsaoEntrega,
      cliente: clientes.nome,
    })
    .from(pedidos)
    .innerJoin(clientes, eq(pedidos.clienteId, clientes.id))
    .where(
      or(
        inArray(pedidos.status, ATIVOS),
        and(
          eq(pedidos.status, "entregue"),
          or(
            and(lte(pedidos.producaoInicio, ate), gte(pedidos.producaoFim, de)),
            and(gte(pedidos.previsaoEntrega, de), lte(pedidos.previsaoEntrega, ate)),
          ),
        ),
      ),
    )
    .orderBy(asc(pedidos.numero));

  const todos = rows.map((p) => {
    const avisos = avisosPedido(p, today);
    return { ...p, avisos, atrasado: estaAtrasado(avisos) };
  });
  const comDatas = (p: (typeof todos)[number]) => Boolean(p.producaoInicio && p.producaoFim);
  const aguardando = todos.filter((p) => p.status === "aguardando_producao");

  return {
    semanas,
    pedidos: todos,
    emProducao: todos.filter((p) => p.status === "em_producao").sort((a, b) => porData(a.producaoFim, b.producaoFim)),
    proximos: aguardando.filter(comDatas).sort((a, b) => porData(a.producaoInicio, b.producaoInicio)),
    semData: todos.filter((p) => (p.status === "aguardando_producao" || p.status === "em_producao") && !comDatas(p)),
    prontos: todos.filter((p) => p.status === "pronto").sort((a, b) => porData(a.previsaoEntrega, b.previsaoEntrega)),
    atrasados: todos.filter((p) => p.atrasado).length,
  };
}

export type Agenda = Awaited<ReturnType<typeof getAgenda>>;
export type PedidoNaAgenda = Agenda["pedidos"][number];
