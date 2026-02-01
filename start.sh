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
exec node index.js
