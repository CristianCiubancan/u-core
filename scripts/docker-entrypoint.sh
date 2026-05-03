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
# server.cfg loads via `exec reloader.cfg`. Written on every container
# boot so rotating RELOADER_API_KEY in .env + restarting is enough — no
# wizard re-run needed. We `mkdir -p` because on first boot the wizard
# hasn't created $SERVER_NAME yet, and we need the file present before
# FXServer parses server.cfg.
SERVER_NAME="${SERVER_NAME:-}"
RELOADER_API_KEY="${RELOADER_API_KEY:-}"
if [ -n "$SERVER_NAME" ] && [ -n "$RELOADER_API_KEY" ]; then
    SERVER_DIR="$TXDATA_DIR/$SERVER_NAME"
    RELOADER_CFG="$SERVER_DIR/reloader.cfg"
    mkdir -p "$SERVER_DIR"
    printf 'setr reloader_api_key "%s"\n' "$RELOADER_API_KEY" > "$RELOADER_CFG"
    chown -R fivem:fivem "$SERVER_DIR"
    chmod 0600 "$RELOADER_CFG"
fi

exec gosu fivem "$@"
