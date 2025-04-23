FROM ubuntu:20.04

# Install required packages
RUN apt-get update && apt-get install -y \
    git \
    curl \
    tar \
    xz-utils && \
    rm -rf /var/lib/apt/lists/*

# Build arguments for URLs (these can be overridden at build time)
ARG BINARIES_ARCHIVE_URL=https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/14482-1eed77dd20d49bab1a41f89427adafea7781a3fd/fx.tar.xz
ARG SERVER_DATA_REPO_URL=https://github.com/citizenfx/cfx-server-data

# Optionally, set environment variables (if your start.sh or runtime logic requires them)
ENV BINARIES_ARCHIVE_URL=${BINARIES_ARCHIVE_URL} \
    SERVER_DATA_REPO_URL=${SERVER_DATA_REPO_URL}

# Download and extract binaries into /root/binaries
RUN mkdir -p /root/binaries && \
    curl -L "$BINARIES_ARCHIVE_URL" -o /tmp/fx.tar.xz && \
    tar -xf /tmp/fx.tar.xz -C /root/binaries && \
    rm /tmp/fx.tar.xz



# Set executable permissions for the startup script and the binary runner script
RUN chmod +x /root/binaries/run.sh

# Define the container's startup command
CMD ["/root/binaries/run.sh"]
