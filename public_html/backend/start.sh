#!/bin/bash
# Ekam Tools Backend — Production Startup Script for Hostinger VPS
# Usage: bash start.sh

set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$APP_DIR/venv"
PORT=${PORT:-8001}
HOST=${HOST:-0.0.0.0}
WORKERS=${WORKERS:-4}

echo "=== Ekam Tools Backend Deployment ==="
echo "App dir: $APP_DIR"
echo "Port:    $PORT"

if [ ! -d "$VENV_DIR" ]; then
    echo "[setup] Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

pip install -q -r "$APP_DIR/requirements.txt"

mkdir -p "$APP_DIR/data/uploads" "$APP_DIR/data/audio"

echo "[start] Launching FastAPI with uvicorn (workers=$WORKERS)..."
exec uvicorn main:app \
    --host "$HOST" \
    --port "$PORT" \
    --workers "$WORKERS" \
    --loop asyncio \
    --limit-concurrency 128 \
    --backlog 1024 \
    --log-level info
