#!/bin/sh
set -eu

for dependency in curl node git; do
  if ! command -v "$dependency" >/dev/null 2>&1; then
    echo "Missing required command: $dependency (requires curl, Node.js 18+, and Git)" >&2
    exit 1
  fi
done

temporary=$(mktemp -d "${TMPDIR:-/tmp}/skillsplace-install.XXXXXXXX")
trap 'rm -rf "$temporary"' 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

base=https://raw.githubusercontent.com/jxpeng98/skillsplace/main
mkdir -p "$temporary/scripts" "$temporary/.antigravity"
curl --fail --silent --show-error --location --retry 2 \
  "$base/scripts/install-antigravity.mjs" -o "$temporary/scripts/install-antigravity.mjs"
curl --fail --silent --show-error --location --retry 2 \
  "$base/.antigravity/catalog.json" -o "$temporary/.antigravity/catalog.json"

node "$temporary/scripts/install-antigravity.mjs" "$@"
