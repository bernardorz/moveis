import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config as faConfig } from "@fortawesome/fontawesome-svg-core";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

faConfig.autoAddCss = false;

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "DH Móveis", template: "%s · DH Móveis" },
  description: "Sistema de gestão de orçamentos, pedidos, financeiro e estoque",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} h-full`}>
      <body className="min-h-full">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
