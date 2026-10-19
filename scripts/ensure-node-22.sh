#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_VERSION="$(tr -d '[:space:]' < "$ROOT_DIR/.nvmrc")"
NVM_NODE_DIR="${NVM_DIR:-$HOME/.nvm}/versions/node/$NODE_VERSION/bin"
if [[ ! -x "$NVM_NODE_DIR/node" && "$NODE_VERSION" != v* ]]; then
  NVM_NODE_DIR="${NVM_DIR:-$HOME/.nvm}/versions/node/v$NODE_VERSION/bin"
fi

if [[ -x "$NVM_NODE_DIR/node" ]]; then
  export PATH="$NVM_NODE_DIR:$PATH"
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
NODE_MINOR="$(node -p 'process.versions.node.split(".")[1]' 2>/dev/null || true)"

if [[ -z "$NODE_MAJOR" || "$NODE_MAJOR" -lt 22 || "$NODE_MAJOR" -eq 22 && "$NODE_MINOR" -lt 13 ]]; then
  cat >&2 <<EOF
Golden Atlas requires Node.js >=22.13.

Run:
  nvm use

Or use the repo wrapper:
  ./pnpmw <command>

Current node:
  $(command -v node 2>/dev/null || echo "not found") $(node -v 2>/dev/null || true)
EOF
  exit 1
fi
