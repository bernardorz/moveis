import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Clientes" };

export default function Page() {
  return (
    <ComingSoon
      title="Clientes"
      breadcrumb={[]}
      description="Cadastro e histórico de clientes chegam na próxima fase. Por enquanto, cadastre clientes pelo orçamento."
    />
  );
}
