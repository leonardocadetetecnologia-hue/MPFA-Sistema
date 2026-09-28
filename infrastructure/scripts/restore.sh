#!/usr/bin/env bash
# Restores a backup produced by backup.sh into RESTORE_DATABASE_URL.
#
#   RESTORE_DATABASE_URL=postgresql://.../mpfa_restore_check ./restore.sh backups/mpfa-....dump
#
# Safety rules:
# - checksum (.sha256) is verified when present;
# - the target database must already exist and should be an isolated one;
# - restoring over the live DATABASE_URL, or with APP_ENV=production, requires
#   RESTORE_CONFIRM=overwrite (destructive: --clean drops existing objects).
set -euo pipefail

file="${1:?usage: restore.sh <backup.dump>}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
PG_BIN="${PG_BIN_DIR:+$PG_BIN_DIR/}"

[[ -f "$file" ]] || { echo "backup not found: $file" >&2; exit 1; }

if [[ -f "$file.sha256" ]]; then
  (cd "$(dirname "$file")" && sha256sum --check --status "$(basename "$file").sha256") \
    || { echo "checksum mismatch: $file" >&2; exit 1; }
  echo "checksum ok"
fi

if [[ "${RESTORE_DATABASE_URL}" == "${DATABASE_URL:-}" || "${APP_ENV:-}" == "production" ]]; then
  if [[ "${RESTORE_CONFIRM:-}" != "overwrite" ]]; then
    echo "refusing to restore over the live/production database without RESTORE_CONFIRM=overwrite" >&2
    exit 1
  fi
fi

"${PG_BIN}pg_restore" --clean --if-exists --no-owner --no-privileges --exit-on-error \
  --dbname="$RESTORE_DATABASE_URL" "$file"

# Smoke check: migration history must be present after restore.
applied="$("${PG_BIN}psql" "$RESTORE_DATABASE_URL" -tAc 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL')"
echo "restore complete: $applied migration(s) recorded"
