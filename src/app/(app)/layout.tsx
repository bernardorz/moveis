import { cookies } from "next/headers";
import { SIDEBAR_COOKIE } from "@/components/layout/nav-config";
import { Sidebar } from "@/components/layout/sidebar";
import { getEstoqueAlertas } from "@/features/estoque/alertas";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSession();
  const [cookieStore, alertas] = await Promise.all([cookies(), getEstoqueAlertas()]);
  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <div className="flex min-h-screen bg-navy-50">
      <Sidebar initialCollapsed={collapsed} estoqueAlertas={alertas.length} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
