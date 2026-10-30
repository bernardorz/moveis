import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Painel financeiro" };

export default function Page() {
  return (
    <ComingSoon
      title="Painel financeiro"
      breadcrumb={[{ label: "Financeiro" }]}
      description="O painel com previsão de recebimentos chega na próxima fase."
    />
  );
}
