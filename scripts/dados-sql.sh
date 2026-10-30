#!/usr/bin/env bash
# Exporta os dados do Postgres local para seeds/dados.sql e importa esse arquivo de volta.
# Uso: bash scripts/dados-sql.sh exportar|importar
set -euo pipefail

CONTAINER="dh-moveis-db"
DB_USER="dh"
DB_NAME="${DB_NAME:-dh_moveis}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ARQUIVO="$RAIZ/seeds/dados.sql"

exportar() {
  # Sem local: o trap roda depois que a função termina.
  dump="$(mktemp)"
  erros="$(mktemp)"
  trap 'rm -f "$dump" "$erros"' EXIT

  # Sessões e verificações ficam de fora: guardam tokens de login, não dados do sistema.
  if ! docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" \
    --data-only --schema=public --column-inserts --no-owner --no-privileges \
    --exclude-table-data=public.session --exclude-table-data=public.verification \
    >"$dump" 2>"$erros"; then
    cat "$erros" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$ARQUIVO")"
  local ultima
  ultima="$(ls "$RAIZ"/drizzle/*.sql | tail -1 | xargs basename)"
  {
    echo "-- Dados do banco $DB_NAME, exportados em $(date '+%Y-%m-%d %H:%M') com: npm run db:export"
    echo "-- Última migration no momento da exportação: $ultima"
    echo "-- Importe em um banco migrado e vazio com: npm run db:import"
    echo
    # Tudo ou nada. O modo replica permite a referência de duplicatas a elas mesmas (origem_id),
    # que depende da ordem das linhas.
    echo "BEGIN;"
    echo "SET LOCAL session_replication_role = replica;"
    # \restrict e transaction_timeout não existem em psql e Postgres mais antigos.
    grep -vE '^\\(un)?restrict |^SET transaction_timeout' "$dump"
    echo "COMMIT;"
  } >"$ARQUIVO.tmp"
  mv "$ARQUIVO.tmp" "$ARQUIVO"
  echo "Exportado para seeds/dados.sql"
}

importar() {
  if [ ! -f "$ARQUIVO" ]; then
    echo "seeds/dados.sql não existe. Gere com: npm run db:export" >&2
    exit 1
  fi
  if ! docker exec -i "$CONTAINER" psql -q -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" <"$ARQUIVO" >/dev/null; then
    echo "Importação cancelada, nada foi gravado. O banco precisa estar migrado e vazio (veja setup.md)." >&2
    exit 1
  fi
  echo "Importado de seeds/dados.sql para $DB_NAME"
}

case "${1:-}" in
  exportar) exportar ;;
  importar) importar ;;
  *)
    echo "Uso: bash scripts/dados-sql.sh exportar|importar" >&2
    exit 1
    ;;
esac
