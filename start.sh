#!/usr/bin/env bash
set -e

export DISPLAY=${DISPLAY:-:99}
export PORT=${PORT:-10000}

echo "[CDB] Xvfb $DISPLAY"
Xvfb $DISPLAY -screen 0 1280x720x24 -ac >/tmp/xvfb.log 2>&1 &
sleep 0.5

echo "[CDB] fluxbox"
fluxbox >/tmp/fluxbox.log 2>&1 &
sleep 0.5

echo "[CDB] x11vnc :5900"
x11vnc -display $DISPLAY -forever -shared -rfbport 5900 -nopw -xkb >/tmp/x11vnc.log 2>&1 &
sleep 0.5

echo "[CDB] node server :$PORT"
node src/server.js
