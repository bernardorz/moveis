import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App interno, 100% autenticado e dinâmico: sem Cache Components/PPR,
  // as páginas que leem sessão e banco são renderizadas a cada request.
  cacheComponents: false,
  devIndicators: false,
  // As fontes dos PDFs são lidas do disco em runtime; o trace não as encontra sozinho.
  outputFileTracingIncludes: {
    "/orcamentos/*/pdf": ["src/features/pdf/fonts/*"],
    "/financeiro/recibos/*/pdf": ["src/features/pdf/fonts/*"],
  },
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
