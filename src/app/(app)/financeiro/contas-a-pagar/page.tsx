import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Contas a pagar" };

export default function Page() {
  return (
    <ComingSoon
      title="Contas a pagar"
      breadcrumb={[{ label: "Financeiro", href: "/financeiro" }]}
      description="Os lançamentos de contas a pagar chegam na próxima fase."
    />
  );
}
