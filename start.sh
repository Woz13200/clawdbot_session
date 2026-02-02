#!/usr/bin/env bash
set -e

: "${PORT:=10000}"
echo "[BOOT] PORT=$PORT"

exec node ./index.cjs
