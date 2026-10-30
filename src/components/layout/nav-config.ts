import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCalendarDays,
  faChartBar,
  faClipboard,
  faFileLines,
  faHandshake,
  faMoneyBill1,
  faUser,
} from "@fortawesome/free-regular-svg-icons";
import { faBoxesStacked } from "@fortawesome/free-solid-svg-icons";

/** Cookie com o estado da sidebar. Fica aqui porque o layout (servidor) também lê. */
export const SIDEBAR_COOKIE = "dh_sidebar_collapsed";

export type NavChild = { label: string; href: string; badge?: "estoque" };
export type NavItem = { label: string; href: string; icon: IconDefinition; children?: NavChild[] };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Geral",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: faChartBar },
      { label: "Clientes", href: "/clientes", icon: faUser },
      { label: "Orçamentos", href: "/orcamentos", icon: faFileLines },
      { label: "Pedidos", href: "/pedidos", icon: faClipboard },
      { label: "Execuções", href: "/execucoes", icon: faCalendarDays },
      { label: "Contratos", href: "/contratos", icon: faHandshake },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        label: "Financeiro",
        href: "/financeiro",
        icon: faMoneyBill1,
        children: [
          { label: "Painel", href: "/financeiro" },
          { label: "Notas e duplicatas", href: "/financeiro/notas" },
          { label: "Cheques", href: "/financeiro/cheques" },
          { label: "Recibos", href: "/financeiro/recibos" },
          { label: "Contas a pagar", href: "/financeiro/contas-a-pagar" },
          { label: "Contas a receber", href: "/financeiro/contas-a-receber" },
        ],
      },
      {
        label: "Estoque",
        href: "/estoque/materiais",
        icon: faBoxesStacked,
        children: [
          { label: "Materiais", href: "/estoque/materiais", badge: "estoque" },
          { label: "Movimentações", href: "/estoque/movimentacoes" },
        ],
      },
    ],
  },
];

export function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
