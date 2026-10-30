import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Contas a receber" };

export default function Page() {
  return (
    <ComingSoon
      title="Contas a receber"
      breadcrumb={[{ label: "Financeiro", href: "/financeiro" }]}
      description="Os lançamentos de contas a receber chegam na próxima fase. As parcelas de cada pedido aparecem no detalhe do pedido."
    />
  );
}
