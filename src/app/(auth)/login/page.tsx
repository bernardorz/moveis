import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  faClipboard,
  faFileLines,
  faMoneyBill1,
} from "@fortawesome/free-regular-svg-icons";
import { faBoxesStacked } from "@fortawesome/free-solid-svg-icons";
import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/icon";
import { getSession } from "@/lib/session";
import { param, safeNext } from "@/lib/url";
import pkg from "../../../../package.json";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

const MODULOS = [
  { label: "Orçamentos", icon: faFileLines },
  { label: "Pedidos", icon: faClipboard },
  { label: "Financeiro", icon: faMoneyBill1 },
  { label: "Estoque", icon: faBoxesStacked },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const { next } = sp;
  if (await getSession()) redirect(safeNext(param(sp, "next")));

  return (
    <main className="flex min-h-screen bg-white">
      {/* Painel da marca (Figma 1:4) */}
      <section className="relative hidden w-[46%] max-w-[662px] shrink-0 flex-col justify-between overflow-hidden bg-navy-900 px-16 py-14 lg:flex">
        <div aria-hidden className="absolute -right-24 -bottom-24 size-[420px] rounded-full border border-white/10" />
        <div aria-hidden className="absolute -right-6 -bottom-6 size-[260px] rounded-full border border-white/10" />

        <div className="relative flex items-center gap-3">
          <BrandMark size={44} />
          <div>
            <p className="text-h2 tracking-[-0.5px] text-white">DH Móveis</p>
            <p className="text-caption text-navy-300">Sistema de gestão</p>
          </div>
        </div>

        <div className="relative flex max-w-[448px] flex-col gap-4">
          <p className="text-caption font-medium tracking-[2.16px] text-navy-300 uppercase">
            Móveis planejados sob medida
          </p>
          <h1 className="text-[40px] leading-[46px] font-semibold text-white">
            Do primeiro orçamento à instalação final.
          </h1>
          <p className="pt-[3px] text-body leading-[22.75px] text-navy-300">
            Um único lugar para a equipe DH Móveis controlar orçamentos, pedidos, contratos, finanças e estoque.
          </p>
          <ul className="grid grid-cols-2 gap-3 pt-4">
            {MODULOS.map((m) => (
              <li
                key={m.label}
                className="flex h-[46px] items-center gap-3 rounded-field border border-white/10 bg-white/5 px-[17px] text-body text-white"
              >
                <Icon icon={m.icon} size={14} />
                {m.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between pt-8 text-caption text-navy-400">
          <span>© {new Date().getFullYear()} DH Móveis · Uso interno</span>
          <span>v{pkg.version}</span>
        </div>
      </section>

      {/* Formulário (Figma 1:51) */}
      <section className="flex flex-1 items-center justify-center px-6 py-14 sm:px-12">
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </section>
    </main>
  );
}
