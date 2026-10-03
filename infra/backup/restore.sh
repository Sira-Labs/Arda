#!/bin/sh
# Restores a backup into a SEPARATE database for the monthly restore drill:
#   restore.sh latest | <object path below the bucket, e.g. postgres/daily/2026/09/arda-….dump>
# Requires ARDA_RESTORE_DATABASE_URL and refuses to touch ARDA_BACKUP_DATABASE_URL.
set -eu
. /opt/arda-backup/lib.sh

: "${ARDA_RESTORE_DATABASE_URL:?ARDA_RESTORE_DATABASE_URL is required (a scratch database)}"
if [ "${ARDA_RESTORE_DATABASE_URL}" = "${ARDA_BACKUP_DATABASE_URL:-}" ]; then
  log error restore.refused reason="target is the production database"
  exit 2
fi
configure_remote
prefix="${ARDA_BACKUP_PREFIX:-postgres}"

object=${1:-latest}
if [ "$object" = latest ]; then
  object=$(rclone lsf -R --files-only "$BACKUP_ROOT/$prefix/daily" | sort | tail -n 1)
  [ -n "$object" ] || { log error restore.no_backup; exit 1; }
  object="$prefix/daily/$object"
fi

work=$(mktemp -d /tmp/arda-restore.XXXXXX)
trap 'rm -rf "$work"' EXIT
log info restore.download object="$object"
rclone copyto "$BACKUP_ROOT/$object" "$work/restore.dump"
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$ARDA_RESTORE_DATABASE_URL" "$work/restore.dump"
log info restore.done object="$object"
