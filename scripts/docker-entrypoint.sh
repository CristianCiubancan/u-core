#!/usr/bin/env bash
set -euo pipefail

# Reconcile bind-mount ownership before dropping privileges.
#
# The image runs FXServer as the unprivileged `fivem` user (UID 10001).
# When `./txData` is bind-mounted from a Windows host (Docker Desktop /
# WSL2) the directory surfaces inside the container as root:root, and
# txAdmin then crashes on first write with EACCES on
# .playersDB.json.tmp. Starting as root just long enough to chown the
# bind mount, then `exec gosu fivem` to drop privileges, sidesteps that
# without leaving FXServer running with elevated rights.
TXDATA_DIR="/home/fivem/binaries/txData"
if [ -d "$TXDATA_DIR" ]; then
    chown -R fivem:fivem "$TXDATA_DIR"
fi

# Render env-sourced secrets into a sidecar cfg the wizard-deployed
# server.cfg loads via `exec reloader.cfg`. We write this on every boot so
# rotating RELOADER_API_KEY in .env + restarting the container is enough —
# no need to re-run the wizard. Skipped when SERVER_NAME isn't set or its
# txData subdir doesn't exist (i.e. wizard hasn't deployed yet); on the
# next container restart after the wizard finishes, this block fills in
# the file.
SERVER_NAME="${SERVER_NAME:-}"
RELOADER_API_KEY="${RELOADER_API_KEY:-}"
if [ -n "$SERVER_NAME" ] && [ -n "$RELOADER_API_KEY" ] && \
   [ -d "$TXDATA_DIR/$SERVER_NAME" ]; then
    RELOADER_CFG="$TXDATA_DIR/$SERVER_NAME/reloader.cfg"
    printf 'setr reloader_api_key "%s"\n' "$RELOADER_API_KEY" > "$RELOADER_CFG"
    chown fivem:fivem "$RELOADER_CFG"
    chmod 0600 "$RELOADER_CFG"
fi

exec gosu fivem "$@"
