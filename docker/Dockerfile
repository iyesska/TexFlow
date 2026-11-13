# syntax=docker/dockerfile:1
#
# TexFlow: the Next.js server plus the tools it runs on documents (Pandoc, Tectonic)
# and the sandbox it runs them in (bubblewrap).
#
# Build from the repository root:
#   docker build -f docker/Dockerfile -t texflow .
#
# The runtime is Ubuntu 24.04 because its Pandoc (3.1) is the version the conversion
# is tested against.

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# A self-contained server in .next/standalone, without node_modules to copy around.
ENV NEXT_OUTPUT=standalone
RUN pnpm build

FROM ubuntu:24.04 AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TECTONIC_CACHE_DIR=/var/cache/texflow/tectonic \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends bubblewrap ca-certificates curl fontconfig pandoc \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/local/bin/node /usr/local/bin/node

WORKDIR /app
COPY pandoc ./pandoc
COPY scripts/setup-tectonic.sh ./scripts/setup-tectonic.sh
# Downloads Tectonic and, while the build still has network, every LaTeX package the
# conversion can ask for. At run time documents are compiled with no network at all.
RUN ./scripts/setup-tectonic.sh && chmod -R a+rX /var/cache/texflow

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# The server never runs as root, and owns nothing it serves.
RUN useradd --system --uid 10001 --no-create-home texflow
USER texflow

EXPOSE 3000
CMD ["node", "server.js"]
