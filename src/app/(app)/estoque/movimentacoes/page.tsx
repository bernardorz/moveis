import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Movimentações" };

export default function Page() {
  return (
    <ComingSoon
      title="Movimentações"
      breadcrumb={[{ label: "Estoque", href: "/estoque/materiais" }]}
      description="O histórico completo de movimentações chega na próxima fase. Registre entradas e saídas pela tela de materiais."
    />
  );
}
