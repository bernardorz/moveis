"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { faAnglesLeft, faAnglesRight, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NAV, SIDEBAR_COOKIE, isActive, type NavItem } from "./nav-config";

// Sidebar navy (Figma 1:100). Recolhida vira um rail só de ícones; o estado
// fica em cookie para o servidor renderizar já na largura certa.
export function Sidebar({
  initialCollapsed,
  estoqueAlertas,
}: {
  initialCollapsed: boolean;
  estoqueAlertas: number;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="shrink-0 bg-navy-900">
      <aside
        className={cn(
          "sticky top-0 flex h-screen flex-col overflow-y-auto bg-navy-900 transition-[width] duration-200",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className={cn("flex h-[68px] shrink-0 items-center gap-3 border-b border-white/10", collapsed ? "justify-center px-0" : "px-5")}>
          <BrandMark size={36} />
          {!collapsed && <span className="text-[17px] leading-[25.5px] font-semibold tracking-[-0.425px] text-white">DH Móveis</span>}
        </div>

        <nav aria-label="Principal" className="px-3 pt-5 pb-6">
          {NAV.map((group, gi) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              {collapsed ? (
                gi > 0 && <div className="mx-3 my-3 border-t border-white/10" />
              ) : (
                <p className={cn("px-3 pb-2 text-overline font-medium tracking-[0.55px] text-navy-400 uppercase", gi > 0 && "pt-5")}>
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavEntry
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                  estoqueAlertas={estoqueAlertas}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="mx-3 border-t border-white/10 pt-[17px] pb-6">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-field px-3 text-table text-navy-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:shadow-[0_0_0_2px_var(--color-navy-300)] focus-visible:outline-none",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <span className="flex w-5 justify-center">
              <Icon icon={collapsed ? faAnglesRight : faAnglesLeft} size={13} />
            </span>
            {!collapsed && "Recolher menu"}
          </button>
        </div>
      </aside>
    </div>
  );
}

const linkBase =
  "relative flex h-10 items-center gap-3 rounded-field px-3 text-[13.5px] leading-[20.25px] transition-colors focus-visible:shadow-[0_0_0_2px_var(--color-navy-300)] focus-visible:outline-none";

function NavEntry({
  item,
  pathname,
  collapsed,
  estoqueAlertas,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  estoqueAlertas: number;
}) {
  // Grupos ficam ativos por seção ("/financeiro/...", "/estoque/...").
  const section = `/${item.href.split("/")[1]}`;
  const active = isActive(pathname, item.children ? section : item.href);
  const [open, setOpen] = useState(active);
  const badge = item.children?.some((c) => c.badge === "estoque") ? estoqueAlertas : 0;

  const icon = (
    <span className="relative flex w-5 justify-center">
      <Icon icon={item.icon} size={13.5} />
      {collapsed && badge > 0 && <span className="absolute -top-1 -right-1.5 size-2 rounded-full bg-danger-dot ring-2 ring-navy-900" />}
    </span>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.children ? item.children[0].href : item.href}
            aria-label={item.label}
            className={cn(linkBase, "justify-center px-0", active ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white")}
          >
            {active && <ActiveIndicator />}
            {icon}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  if (!item.children) {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(linkBase, active ? "bg-white/10 font-medium text-white" : "text-navy-300 hover:bg-white/5 hover:text-white")}
      >
        {active && <ActiveIndicator />}
        {icon}
        {item.label}
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(linkBase, "w-full", active ? "font-medium text-white" : "text-navy-300 hover:bg-white/5 hover:text-white")}
      >
        {icon}
        <span className="flex-1 text-left">{item.label}</span>
        <Icon icon={faChevronDown} size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex w-[210px] flex-col gap-0.5 border-l border-white/10 pl-[17px]">
          {item.children.map((child) => {
            const childIsActive = isActive(pathname, child.href, child.href === "/financeiro");
            return (
              <Link
                key={child.href}
                href={child.href}
                aria-current={childIsActive ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-[4px] px-2 py-1.5 text-table transition-colors focus-visible:shadow-[0_0_0_2px_var(--color-navy-300)] focus-visible:outline-none",
                  childIsActive ? "bg-white/10 font-medium text-white" : "text-navy-400 hover:bg-white/5 hover:text-white",
                )}
              >
                {child.label}
                {child.badge === "estoque" && estoqueAlertas > 0 && (
                  <span className="rounded-full bg-danger-dot/90 px-1.5 text-micro font-semibold text-white" aria-label={`${estoqueAlertas} abaixo do mínimo`}>
                    {estoqueAlertas}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActiveIndicator() {
  return <span aria-hidden className="absolute inset-y-2 -left-3 w-1 rounded-r-[4px] bg-white" />;
}
