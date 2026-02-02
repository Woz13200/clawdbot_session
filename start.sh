#!/usr/bin/env bash
set -e

: "${PORT:=10000}"

echo "[BOOT] PORT=$PORT"

mkdir -p models/gguf

MODEL_FILE="models/gguf/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
MODEL_URL="https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"

if [ ! -f "$MODEL_FILE" ]; then
  echo "[BOOT] Downloading TinyLlama GGUF..."
  curl -L --retry 8 --retry-delay 3 --continue-at - -o "$MODEL_FILE" "$MODEL_URL"
else
  echo "[BOOT] GGUF model already present."
fi

echo "[BOOT] Starting Moltbot server..."
exec node ./server.cjs
