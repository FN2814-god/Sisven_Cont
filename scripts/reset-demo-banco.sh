#!/usr/bin/env bash
# ============================================================================
# Revierte la conciliación bancaria de la empresa demo a estado PENDIENTE,
# para poder re-grabar la escena de conciliación tantas veces como haga falta.
#
# Uso:
#   ./scripts/reset-demo-banco.sh
#   SQLITE_FILE=./data/otra.db ./scripts/reset-demo-banco.sh
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/../backend"
DB="${SQLITE_FILE:-./data/sisven.db}"

if [ ! -f "$DB" ]; then
  echo "No se encontró la base de datos: $DB"
  exit 1
fi

sqlite3 "$DB" <<'SQL'
UPDATE bank_statements
   SET status = 'PENDIENTE',
       matched_movement_id = NULL,
       reconciliation_type = NULL;
UPDATE bank_movements SET status = 'PENDIENTE';
DELETE FROM bank_reconciliations;
SELECT 'Partidas pendientes: ' || COUNT(*) FROM bank_statements WHERE status = 'PENDIENTE';
SQL
echo "Conciliación reiniciada. El extracto vuelve a estar PENDIENTE."
