import Link from "next/link";
import { Fragment } from "react";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/icon";
import { getEstoqueAlertas } from "@/features/estoque/alertas";
import { requireSession } from "@/lib/session";
import { CommandMenu } from "./command-menu";
import { NotificationsButton } from "./notifications";
import { UserMenu } from "./user-menu";

export type Crumb = { label: string; href?: string };

// Topbar (Figma 1:189): breadcrumb + título, busca global, alertas e usuário.
export async function AppHeader({ title, breadcrumb = [] }: { title: string; breadcrumb?: Crumb[] }) {
  const [session, alertas] = await Promise.all([requireSession(), getEstoqueAlertas()]);

  return (
    <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center gap-4 border-b border-navy-100 bg-white/95 px-8 backdrop-blur-[8px]">
      <div className="min-w-0 flex-1">
        {breadcrumb.length > 0 && (
          <nav aria-label="Trilha" className="flex items-center gap-1.5 text-caption">
            {breadcrumb.map((c, i) => (
              <Fragment key={`${c.label}-${i}`}>
                {i > 0 && <Icon icon={faChevronRight} size={8} className="text-navy-400" />}
                {c.href ? (
                  <Link href={c.href} className="text-navy-400 hover:text-navy-900 hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-navy-600">{c.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
        )}
        <h1 className="truncate text-[18px] leading-[22.5px] font-semibold text-navy-900">{title}</h1>
      </div>

      <CommandMenu />
      <NotificationsButton alertas={alertas} />
      <div className="flex items-center gap-3 border-l border-navy-100 pl-[13px]">
        <UserMenu
          name={session.user.name}
          role={session.user.role === "admin" ? "Administrador" : "Usuário"}
          image={session.user.image ?? undefined}
        />
      </div>
    </header>
  );
}
