import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Contratos" };

export default function Page() {
  return (
    <ComingSoon
      title="Contratos"
      breadcrumb={[]}
      description="A listagem de contratos chega na próxima fase. Cada contrato está disponível no detalhe do pedido."
    />
  );
}
