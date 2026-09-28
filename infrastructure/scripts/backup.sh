#!/usr/bin/env bash
# PostgreSQL logical backup (pg_dump custom format) + SHA-256 checksum.
#
#   DATABASE_URL=postgresql://... BACKUP_DIR=/srv/backups/mpfa ./backup.sh
#
# Optional: PG_BIN_DIR (directory with pg_dump), APP_ENV (used in the file name),
# BACKUP_KEEP_DAYS (delete dumps older than N days; default 35, see runbook for GFS).
# Runs anywhere with pg_dump >= server version; inside compose:
#   docker compose exec -T postgres sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > file.dump
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-35}"
PG_DUMP="${PG_BIN_DIR:+$PG_BIN_DIR/}pg_dump"

mkdir -p "$BACKUP_DIR"
umask 077

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="$BACKUP_DIR/mpfa-${APP_ENV:-unknown}-$stamp.dump"

# Written to .partial first so an interrupted dump is never mistaken for a valid backup.
"$PG_DUMP" --format=custom --no-owner --no-privileges --file="$file.partial" --dbname="$DATABASE_URL"
mv "$file.partial" "$file"
(cd "$BACKUP_DIR" && sha256sum "$(basename "$file")" > "$(basename "$file").sha256")

find "$BACKUP_DIR" -name 'mpfa-*.dump*' -mtime "+$BACKUP_KEEP_DAYS" -print -delete

echo "backup written: $file ($(du -h "$file" | cut -f1))"
