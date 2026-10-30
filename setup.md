# Setup do DH Móveis

Como rodar o projeto em uma máquina nova, carregar dados no banco e gerar um novo arquivo de seed.

## Resumo

Com Node 22 e Docker instalados, na raiz do projeto:

```bash
npm install
cp .env.example .env
docker compose up -d --wait
npm run db:migrate
npm run db:import
npm run dev
```

Abra http://localhost:3000 e entre com `admin@dhmoveis.com.br` / `dhmoveis123`.

Antes de rodar, troque o `BETTER_AUTH_SECRET` no `.env` (passo 2) e, se a porta 3000 estiver ocupada, veja [Problemas comuns](#problemas-comuns).

## Passo a passo

### 1. Pré-requisitos

- Node 22 e npm
- Docker com Docker Compose

### 2. Dependências e variáveis de ambiente

```bash
npm install
cp .env.example .env
```

Gere um segredo com `openssl rand -base64 32` e coloque em `BETTER_AUTH_SECRET`, no `.env`. As outras variáveis já vêm prontas para o banco local.

### 3. Banco de dados

```bash
docker compose up -d --wait   # sobe o Postgres 17 na porta 5432 e espera ele ficar pronto
npm run db:migrate            # cria as tabelas
```

### 4. Dados

Escolha uma das duas opções:

| | `npm run db:import` | `npm run db:seed` |
|---|---|---|
| **Origem** | Arquivo `seeds/dados.sql` | Código em `src/db/seed.ts` |
| **Conteúdo** | Cópia do banco no dia da exportação | Dados de exemplo fixos |
| **Datas** | Ficam como foram exportadas | Calculadas a partir de hoje |
| **Banco com dados** | Recusa e não grava nada | **Apaga tudo** e recria |
| **Usuários** | Os do arquivo | Admin definido em `SEED_ADMIN_*`, mais a Camila |

Use `db:import` para ter os mesmos dados do banco exportado. Como as datas ficam fixas, com o tempo surgem vencimentos e atrasos na agenda e no financeiro. Isso é esperado.

Use `db:seed` para ter dados de exemplo com vencimentos e prazos coerentes com o dia de hoje.

### 5. Rodar

```bash
npm run dev
```

Logins do `seeds/dados.sql` atual, os dois com a senha `dhmoveis123`:

| E-mail | Perfil |
|---|---|
| `admin@dhmoveis.com.br` | Administrador |
| `camila@dhmoveis.com.br` | Usuário |

## Gerar um novo seed

Para salvar o estado atual do banco local em `seeds/dados.sql`:

```bash
npm run db:export
```

O comando substitui o arquivo anterior. O banco precisa estar rodando no container `dh-moveis-db`.

**O que entra:** todos os dados do schema `public`, os usuários com as senhas em hash e a posição das sequences. Assim, o próximo orçamento, pedido, contrato ou recibo continua a numeração.

**O que fica de fora:**

- `session` e `verification`, porque guardam tokens de login. Depois de importar, todos precisam entrar de novo.
- O controle de migrations, porque o `npm run db:migrate` já o cria.
- As tabelas em si, porque o arquivo só tem dados. A estrutura vem das migrations.

O arquivo é importado por inteiro ou nada é gravado.

**Depois de criar uma migration,** gere o seed de novo. O arquivo registra a última migration que existia na exportação, e um seed antigo pode falhar se a migration nova criar uma coluna obrigatória.

**Cuidado ao versionar:** `seeds/dados.sql` não está no `.gitignore`. Ele traz nomes, CPFs, telefones e e-mails de clientes e os hashes de senha. Hoje são dados de exemplo; quando houver dados reais, não faça commit desse arquivo.

## Recomeçar do zero

Isto **apaga todo o banco local**. Se quiser guardar os dados atuais, rode `npm run db:export` antes.

```bash
docker compose down -v
docker compose up -d --wait
npm run db:migrate
npm run db:import
```

`npm run db:reset` faz o mesmo, mas termina com `db:seed`: o banco fica com os dados de exemplo, não com o seu arquivo.

## Produção (Supabase)

> Este caminho ainda não foi testado em um projeto Supabase real.

1. Configure as variáveis conforme a seção "Produção" do `README.md`.
2. Aplique as migrations com `npm run db:migrate`.
3. Só se quiser levar dados, importe o arquivo em um banco vazio, usando a conexão direta (porta 5432) e um `psql` instalado na máquina:

   ```bash
   psql "URL_DA_CONEXAO_DIRETA" -v ON_ERROR_STOP=1 -f seeds/dados.sql
   ```

`npm run db:import` só funciona no banco local. **Não rode `db:seed` em produção**, porque ele apaga os dados.

O arquivo leva as senhas de desenvolvimento acima, então não o use em produção sem trocá-las. O arquivo também usa `session_replication_role`, que exige uma permissão elevada; se o Supabase recusar, nada é gravado.

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `relation "public.user" does not exist` no `db:import` | Faltam as migrations. Rode `npm run db:migrate`. |
| `duplicate key value violates unique constraint` no `db:import` | O banco já tem dados. Veja [Recomeçar do zero](#recomeçar-do-zero). |
| `No such container: dh-moveis-db` | O banco não está rodando. Rode `docker compose up -d --wait`. |
| `column ... does not exist` ou `violates not-null constraint` no `db:import` | O seed e as migrations estão em versões diferentes. Gere o seed de novo em um banco atualizado. |
| Porta 3000 ocupada | Rode `PORT=3100 npm run dev` e ajuste `BETTER_AUTH_URL="http://localhost:3100"` no `.env`. Os dois precisam coincidir para o login funcionar. |
| Porta 5432 ocupada | Há outro Postgres na máquina. Pare esse serviço ou mude a porta no `docker-compose.yml` e nas URLs do `.env`. |
| Login recusado depois de importar | Confira se usou os logins do arquivo. As variáveis `SEED_ADMIN_*` só valem para o `db:seed`. |
