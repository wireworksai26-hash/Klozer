#!/bin/bash
# Load a dump made by scripts/backup.sh into the Railway MySQL database.
#   RAILWAY_MYSQL_URL='mysql://root:PASSWORD@HOST:PORT/railway' ./scripts/railway-import.sh backups/klozer-YYYYMMDD-HHMMSS.sql.gz
# Use the PUBLIC URL of the MySQL service (Railway: MySQL > Variables > MYSQL_PUBLIC_URL), since this runs outside Railway.
# The target database should be empty. Stop the backend service first so nothing writes while it loads.
set -euo pipefail

FILE="${1:?usage: railway-import.sh <backup.sql.gz>}"
URL="${RAILWAY_MYSQL_URL:?Set RAILWAY_MYSQL_URL to the MySQL public URL}"
[ -f "$FILE" ] || { echo "File not found: $FILE" >&2; exit 1; }

# mysql://user:pass@host:port/db
rest="${URL#mysql://}"
creds="${rest%%@*}"; hostdb="${rest#*@}"
user="${creds%%:*}"; pass="${creds#*:}"
hostport="${hostdb%%/*}"; db="${hostdb#*/}"
host="${hostport%%:*}"; port="${hostport#*:}"

echo "Target: ${user}@${host}:${port}/${db}"
read -r -p "Ini mengisi database di atas dengan ${FILE}. Ketik 'import' untuk lanjut: " CONFIRM
[ "$CONFIRM" = "import" ] || { echo "Dibatalkan."; exit 1; }

if command -v mysql >/dev/null 2>&1; then
  gunzip -c "$FILE" | MYSQL_PWD="$pass" mysql -h "$host" -P "$port" -u "$user" "$db"
else
  gunzip -c "$FILE" | docker run --rm -i -e MYSQL_PWD="$pass" mysql:8.0 mysql -h "$host" -P "$port" -u "$user" "$db"
fi
echo "Import selesai. Nyalakan layanan backend; migrasi yang belum ada berjalan otomatis."
