#!/bin/bash
# MySQL backup used by the `backup` compose service (and runnable by hand).
#   ./scripts/backup.sh          one dump, then exit
#   ./scripts/backup.sh --loop   one dump every 24h
set -euo pipefail

: "${DB_HOST:?}" "${DB_NAME:?}" "${DB_USER:?}" "${DB_PASSWORD:?}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
OUT_DIR="${BACKUP_DIR:-/backups}"

dump_once() {
  local stamp file
  stamp="$(date -u +%Y%m%d-%H%M%S)"
  file="${OUT_DIR}/klozer-${stamp}.sql.gz"
  mkdir -p "$OUT_DIR"
  # --single-transaction: consistent snapshot without locking the app.
  MYSQL_PWD="$DB_PASSWORD" mysqldump -h "$DB_HOST" -u "$DB_USER" \
    --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF \
    "$DB_NAME" | gzip -9 > "${file}.partial"
  # Refuse an empty/truncated dump: a corrupt backup is worse than none.
  if [ "$(stat -c %s "${file}.partial")" -lt 2000 ]; then
    rm -f "${file}.partial"
    echo "[backup] FAILED: dump too small" >&2
    return 1
  fi
  mv "${file}.partial" "$file"
  find "$OUT_DIR" -name 'klozer-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
  echo "[backup] OK ${file} ($(du -h "$file" | cut -f1))"
}

if [ "${1:-}" = "--loop" ]; then
  while true; do
    if dump_once; then wait_s=86400; else wait_s=3600; echo "[backup] attempt failed, retrying in 1h" >&2; fi
    sleep "$wait_s" &
    wait $!
  done
else
  dump_once
fi
