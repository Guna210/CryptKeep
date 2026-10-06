#!/usr/bin/env bash
set -euo pipefail

cache_dir="/workspace/.cache/cryptkeep/npm"
mkdir -p "$cache_dir"
cd /workspace/CryptKeep
export npm_config_cache="$cache_dir"

node --version
npm --version
npm ci
npm run verify:environment
