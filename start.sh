#!/usr/bin/env bash
set -e

: "${PORT:=10000}"
export DISPLAY="${DISPLAY:-:99}"

echo "[BOOT] DISPLAY=$DISPLAY PORT=$PORT"

# X virtual display
Xvfb "$DISPLAY" -screen 0 1280x720x24 -ac +extension GLX +render -noreset &
sleep 0.5

# VNC pour debug local uniquement (facultatif)
x11vnc -display "$DISPLAY" \
  -rfbport 5900 -listen 127.0.0.1 \
  -forever -shared -nopw -noxdamage -quiet &

echo "[BOOT] Xvfb + x11vnc started"

# ✅ Lancement du backend avec interface web
# Download TinyLlama model if not already there
if [ ! -f models/gguf/tinyllama.gguf ]; then
  echo "[BOOT] Downloading TinyLlama model..."
  curl -L -o models/gguf/tinyllama.gguf https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
fi
exec node ./index.js
