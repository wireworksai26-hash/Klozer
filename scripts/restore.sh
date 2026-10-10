#!/bin/bash
# Restore a dump produced by backup.sh.   ./scripts/restore.sh backups/klozer-YYYYMMDD-HHMMSS.sql.gz
# This REPLACES the current database contents. Stop the backend first:  docker compose stop backend
set -euo pipefail

FILE="${1:?usage: restore.sh <backup.sql.gz>}"
[ -f "$FILE" ] || { echo "File not found: $FILE" >&2; exit 1; }

read -r -p "Ini akan MENIMPA database saat ini dengan ${FILE}. Ketik 'restore' untuk lanjut: " CONFIRM
[ "$CONFIRM" = "restore" ] || { echo "Dibatalkan."; exit 1; }

set -a; . ./.env; set +a
gunzip -c "$FILE" | docker compose exec -T -e MYSQL_PWD="$DB_ROOT_PASSWORD" db mysql -uroot "${DB_NAME:-klozer_db}"
echo "Restore selesai. Jalankan: docker compose up -d backend"
