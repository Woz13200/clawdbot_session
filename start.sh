#!/usr/bin/env bash
set -euo pipefail

: "${PORT:=10000}"

echo "[BOOT] PORT=$PORT"

mkdir -p models/gguf

MODEL_PATH="models/gguf/tinyllama.gguf"

# ✅ TinyLlama instruct GGUF (choisis un lien direct .gguf)
# IMPORTANT: si le lien ci-dessous ne marche pas, on le remplacera par ton URL HF exacte.
MODEL_URL="https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"

if [ ! -f "$MODEL_PATH" ]; then
  echo "[BOOT] Downloading model..."
  curl -L --retry 8 --retry-delay 2 --fail -o "$MODEL_PATH" "$MODEL_URL"
fi

echo "[BOOT] Model ready: $MODEL_PATH ($(du -h "$MODEL_PATH" | awk '{print $1}'))"

exec node ./index.js
