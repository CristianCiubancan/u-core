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

exec gosu fivem "$@"
