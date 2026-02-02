#!/usr/bin/env bash
set -e

: "${PORT:=10000}"

echo "[BOOT] PORT=$PORT"

mkdir -p models/gguf

# Téléchargement modèle (choisis UNE seule URL valide plus bas)
MODEL_PATH="models/gguf/tinyllama.gguf"

if [ ! -f "$MODEL_PATH" ]; then
  echo "[BOOT] Downloading TinyLlama GGUF..."
  # ✅ OPTION A (recommandée): Hugging Face (mets une vraie URL directe .gguf)
  # curl -L --retry 5 --retry-delay 2 -o "$MODEL_PATH" "https://huggingface.co/<USER>/<REPO>/resolve/main/<FILE>.gguf"

  # ✅ OPTION B: un autre hébergement direct .gguf
  # curl -L --retry 5 --retry-delay 2 -o "$MODEL_PATH" "https://<TON_URL_DIRECT>.gguf"

  echo "[BOOT] ERROR: No model URL configured in start.sh"
  exit 1
fi

echo "[BOOT] Model ready: $MODEL_PATH"
exec node ./index.js
