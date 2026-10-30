# DH Móveis — Sistema de gestão

Sistema web interno da DH Móveis para orçamentos, pedidos, contratos, financeiro e estoque. É só para controle: não há integração com bancos, gateways de pagamento nem emissão fiscal.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Drizzle ORM · Better Auth · PostgreSQL.

## O que já funciona

| Módulo | Situação |
|---|---|
| Login, proteção de rotas, sidebar e topbar (busca Ctrl+K, alertas de estoque) | Pronto |
| Design System (`/design-system`) | Pronto |
| Orçamentos: listagem, editor com autosave, duplicar, status, aprovar, PDF | Pronto |
| Pedidos: listagem, detalhe, troca de status, cancelamento com motivo | Pronto |
| Execuções: agenda da produção com calendário, próximos, avisos de atraso e previsão de entrega | Pronto |
| Contratos: gerado na aprovação, cláusulas padrão, marcar como assinado (na aba do pedido) | Parcial |
| Estoque: materiais, entradas, saídas, custo médio, alerta de mínimo, CSV, histórico do item | Pronto |
| Financeiro: notas e duplicatas, cheques, pagamentos com quitação parcial, recibos em PDF | Pronto |
| PDF do contrato, anexo do contrato assinado, painel financeiro, contas a pagar e a receber, CRUD de Clientes, Dashboard, Movimentações | Próxima fase (páginas "Em breve"; o schema do banco já existe) |

## Rodando localmente

Pré-requisitos: Node 22 e Docker. O guia completo, incluindo como importar e gerar seeds em SQL, está em [setup.md](setup.md).

```bash
npm install
cp .env.example .env          # depois troque BETTER_AUTH_SECRET: openssl rand -base64 32
npm run db:up                 # sobe o Postgres em Docker (porta 5432)
npm run db:migrate            # aplica as migrations
npm run db:seed               # cria usuários e dados de exemplo
npm run dev                   # http://localhost:3000
```

Login do seed: `admin@dhmoveis.com.br` / `dhmoveis123` (configurável em `SEED_ADMIN_*` no `.env`).

> **Atenção:** `npm run db:seed` apaga todos os dados antes de recriar. As datas são relativas ao dia em que ele roda.

**Porta 3000 ocupada?** Rode `PORT=3100 npm run dev` e ajuste `BETTER_AUTH_URL="http://localhost:3100"` no `.env`. As duas precisam coincidir para o login funcionar.

### Scripts

| Script | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` / `test` | TypeScript, ESLint, Vitest |
| `npm run db:up` / `db:down` | Sobe ou para o Postgres local |
| `npm run db:generate` | Gera uma migration a partir do schema |
| `npm run db:migrate` | Aplica as migrations |
| `npm run db:seed` | Recria os dados de exemplo |
| `npm run db:export` | Salva os dados do banco local em `seeds/dados.sql` |
| `npm run db:import` | Carrega `seeds/dados.sql` em um banco migrado e vazio |
| `npm run db:reset` | Apaga o volume do banco e recria tudo |
| `npm run db:studio` | Abre o Drizzle Studio |

`scripts/screenshot.mjs` captura telas com o Chrome instalado na máquina, para comparar com o Figma:

```bash
node scripts/screenshot.mjs ./shots /orcamentos,/pedidos --login --full
```

## Produção (Supabase)

O Supabase é usado só como Postgres gerenciado: autenticação é pelo Better Auth, com as tabelas no próprio banco. Local e produção usam o mesmo código e mudam apenas as variáveis de ambiente.

| Variável | Valor em produção |
|---|---|
| `DATABASE_URL` | Pooler do Supabase em modo transaction (porta **6543**). O app desliga prepared statements automaticamente nessa URL. |
| `DIRECT_URL` | Conexão direta (porta **5432**), usada pelas migrations. |
| `BETTER_AUTH_SECRET` | Segredo próprio, diferente do local. |
| `BETTER_AUTH_URL` | URL pública do app. |

Para aplicar as migrations em produção, rode `npm run db:migrate` com essas variáveis. **Não rode `db:seed` em produção**: ele apaga os dados.

A conexão com um projeto Supabase real ainda não foi testada.

## Organização do código

```
src/
  app/
    (auth)/login/        Login
    (app)/               Telas autenticadas (sidebar + topbar)
    design-system/       Referência visual do DS
    api/                 Better Auth e exportação CSV
  components/
    ui/                  Primitivos (shadcn reestilizado com os tokens)
    ds/                  Componentes do DS: badge, tabela, stepper, KPI, inputs...
    layout/              Sidebar, topbar, busca global
  features/              orcamentos, pedidos, estoque, contratos, search
                         (queries, server actions, schemas zod, componentes)
  db/                    Schema Drizzle, conexão e seed
  lib/                   auth, sessão, dinheiro, datas, máscaras, status, unidades
drizzle/                 Migrations
```

Convenções:

- **Tokens:** cores, tipografia e raios ficam em `src/app/globals.css`. Use `text-navy-500`, `text-table`, `rounded-card` etc. em vez de valores soltos.
- **`cn`:** importe de `@/lib/utils`, não do pacote `cn`. A versão local conhece os tokens; sem ela, `text-body` e `text-navy-500` se anulam.
- **Dinheiro:** o banco usa `numeric`; os cálculos passam por `src/lib/money.ts`, em centavos.
- **Datas:** colunas `date` trafegam como `YYYY-MM-DD` (`src/lib/dates.ts`).
- **Status derivados:** "Expirado" e "Vencido" não são gravados; são calculados na leitura (`src/lib/status.ts`). O mesmo vale para o status da nota e o "Em cheque" da duplicata (`src/features/financeiro/regras.ts`).
- **Cheques e duplicatas:** tudo é lançado à mão. Uma duplicata fica em um cheque ativo por vez; compensar ou repassar dá baixa nela, e devolver reabre. O vínculo com a nota existe por meio das duplicatas.
- **Pagamento parcial:** a duplicata fica paga com o valor recebido (`valor_original` guarda o anterior), e o saldo vira uma nova duplicata com `origem_id`. A soma das duplicatas continua igual ao total da nota.
- **Recibos:** são só documentos e não alteram o financeiro. Recibo emitido é cancelado, nunca excluído.
- **Ícones:** Font Awesome 6 Free, fixado na v6 porque o Figma usa essa versão. A exceção é o ícone de duplicar (`public/icons/duplicar-*.svg`), exportado do Figma por não ter equivalente exato no pacote.
- **Server actions:** toda action chama `requireSession()`. O `proxy.ts` só faz a checagem otimista do cookie.
- **PDFs:** gerados no servidor com `@react-pdf/renderer`; o orçamento fica em `src/features/orcamentos/pdf.tsx`. Os dados da empresa no cabeçalho ficam em `src/lib/empresa.ts`, e os estilos não usam os tokens CSS (`src/features/pdf/theme.ts` repete os valores).
- **Cache:** `cacheComponents` está desligado em `next.config.ts`, porque o app é autenticado e dinâmico.

## Design

Figma: [DH Móveis](https://www.figma.com/design/MzkQsC5kjzlvImvsHVVtsI/DH-Moveis). Nós principais: Design System `1:1869`, Login `1:2`, Orçamento `1:98`, Pedido `1:821`, Materiais `1:1279`.
