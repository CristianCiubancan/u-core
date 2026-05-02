# syntax=docker/dockerfile:1.6
#
# Multi-stage build for the FXServer container.
#
# Stage 1 (`fetch`) downloads, verifies, and extracts the FXServer tarball.
# It carries `curl`, `tar`, and `xz-utils` — none of which appear in the
# final image. The committed `fxserver.sha256` checksum gates extraction so
# a tampered or stale upstream artifact halts the build.
#
# Stage 2 (`runtime`) is a minimal image with only the libs FXServer needs
# at runtime, runs as a non-root `fivem` user, and exposes a HEALTHCHECK
# against the txAdmin web UI on :40120.
#
# When you bump BINARIES_ARCHIVE_URL, you MUST also refresh fxserver.sha256
# in the same commit. To compute the new value:
#   curl -L "$BINARIES_ARCHIVE_URL" -o /tmp/fx.tar.xz
#   sha256sum /tmp/fx.tar.xz | awk '{print $1"  fx.tar.xz"}' > fxserver.sha256

# ---------- Stage 1: fetch + verify + extract ----------
FROM ubuntu:24.04 AS fetch

# Default URL must stay in sync with .env.example's BINARIES_ARCHIVE_URL.
# Bumping this requires refreshing fxserver.sha256 in the same commit.
ARG BINARIES_ARCHIVE_URL=https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/25770-8ddccd4e4dfd6a760ce18651656463f961cc4761/fx.tar.xz

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        tar \
        xz-utils && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /work
COPY fxserver.sha256 ./fxserver.sha256

# Download with strict TLS settings:
#   --proto '=https'      refuse any non-HTTPS redirect
#   --tlsv1.2             floor the TLS version
#   --fail-with-body      non-zero exit (and body) on HTTP >= 400
#   -L                    follow redirects (FiveM's CDN issues them)
RUN curl --proto '=https' --tlsv1.2 --fail-with-body -L \
        "$BINARIES_ARCHIVE_URL" -o fx.tar.xz && \
    sha256sum -c fxserver.sha256 && \
    mkdir -p /opt/fivem && \
    tar -xf fx.tar.xz -C /opt/fivem && \
    rm fx.tar.xz

# ---------- Stage 2: runtime ----------
FROM ubuntu:24.04 AS runtime

# Runtime libs only. ca-certificates for outbound TLS, tini as PID 1 to reap
# the children FXServer spawns.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        tini && \
    rm -rf /var/lib/apt/lists/*

# Non-root runtime user. UID/GID 10001 are arbitrary but high enough to avoid
# collisions with host-side service accounts when txData is bind-mounted.
RUN groupadd --system --gid 10001 fivem && \
    useradd --system --uid 10001 --gid fivem --home-dir /home/fivem \
        --shell /sbin/nologin --create-home fivem

# Re-base extracted binaries under /home/fivem so the runtime user owns them.
# /home/fivem/binaries mirrors the legacy /root/binaries layout so existing
# txData volume mounts and run.sh stay valid.
COPY --from=fetch --chown=fivem:fivem /opt/fivem /home/fivem/binaries

USER fivem
WORKDIR /home/fivem/binaries

# txAdmin web UI listens on 40120; HEALTHCHECK exits non-zero when it's
# unreachable, so docker (and `depends_on: condition: service_healthy` on
# downstream services) can react. `bash -c '</dev/tcp/...'` avoids needing
# curl in the final image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD bash -c '</dev/tcp/127.0.0.1/40120' || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/home/fivem/binaries/run.sh"]
