import Link from "next/link";
import { faHourglass } from "@fortawesome/free-regular-svg-icons";
import { EmptyState } from "@/components/ds/states";
import { Button } from "@/components/ui/button";
import { AppHeader, type Crumb } from "./app-header";
import { PageBody } from "./page";

/** Página de módulo ainda não implementado nesta fase. */
export function ComingSoon({ title, breadcrumb, description }: { title: string; breadcrumb?: Crumb[]; description: string }) {
  return (
    <>
      <AppHeader title={title} breadcrumb={breadcrumb} />
      <PageBody>
        <div className="rounded-section border border-navy-100 bg-white p-8">
          <EmptyState
            bordered={false}
            icon={faHourglass}
            title="Em breve"
            description={description}
            action={
              <Button asChild size="compact">
                <Link href="/orcamentos">Ir para orçamentos</Link>
              </Button>
            }
          />
        </div>
      </PageBody>
    </>
  );
}
