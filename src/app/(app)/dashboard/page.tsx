import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <ComingSoon
      title="Dashboard"
      breadcrumb={[]}
      description="O painel com os indicadores gerais chega na próxima fase."
    />
  );
}
