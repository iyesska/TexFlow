#!/usr/bin/env bash
# Installs Tectonic (if missing) and downloads, once, the LaTeX packages TexFlow needs.
#
# Documents are compiled without network access, so everything the engine may load has
# to be in its cache beforehand. This compiles a document that exercises every feature
# of the conversion, with the network available, into TECTONIC_CACHE_DIR.
#
# Usage: scripts/setup-tectonic.sh   (run from the repository root; needs network)
set -euo pipefail

TECTONIC_VERSION="0.15.0"
TECTONIC_SHA256="dfb82876f2986862996e564fa507a9e576e0c1e3bee63c2c1bd677c2543e6407"
CACHE_DIR="${TECTONIC_CACHE_DIR:-/var/cache/texflow/tectonic}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v tectonic >/dev/null 2>&1; then
  archive="$(mktemp)"
  curl -fsSL -o "$archive" \
    "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-x86_64-unknown-linux-musl.tar.gz"
  echo "${TECTONIC_SHA256}  ${archive}" | sha256sum --check --quiet
  tar -xzf "$archive" -C /usr/local/bin tectonic
  rm -f "$archive"
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$CACHE_DIR"
cp "$ROOT/pandoc/warmup.png" "$work/"

# The same conversion the application runs, so the same packages are requested.
pandoc --sandbox --from=markdown+ascii_identifiers --to=latex --standalone --listings \
  --variable=papersize:a4 \
  < "$ROOT/pandoc/warmup.md" > "$work/main.tex"

# A bare article too: documents without metadata load the default fonts.
printf '\\documentclass{article}\n\\begin{document}\nx\n\\end{document}\n' > "$work/plain.tex"

for source in main.tex plain.tex; do
  (cd "$work" && TECTONIC_CACHE_DIR="$CACHE_DIR" tectonic --chatter minimal "$source")
done

echo "Tectonic ${TECTONIC_VERSION} listo. Caché en $CACHE_DIR ($(du -sh "$CACHE_DIR" | cut -f1))."
