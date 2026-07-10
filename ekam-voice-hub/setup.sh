#!/usr/bin/env bash
set -euo pipefail

echo "========================================"
echo " Ekam Voice Hub Setup"
echo "========================================"
echo ""

# Check Python
command -v python3 >/dev/null 2>&1 || { echo "ERROR: Python 3.10+ required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js 18+ required"; exit 1; }

echo "[1/5] Creating Python virtual environment..."
python3 -m venv venv || python -m venv venv

echo "[2/5] Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# Optional: ask about premium engines
read -p "Install VoxCPM2? (y/N) " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pip install voxcpm
    echo "VoxCPM2 installed."
fi

read -p "Install KittenTTS? (y/N) " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pip install kittentts
    echo "KittenTTS installed."
fi

read -p "Install Whisper? (y/N) " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pip install openai-whisper
    echo "Whisper installed."
fi

echo ""
echo "[3/5] Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "[4/5] Building frontend..."
cd frontend
npm run build
cd ..

echo "[5/5] Setup complete!"
echo ""
echo "========================================"
echo " To start the application:"
echo "========================================"
echo ""
echo "  source venv/bin/activate"
echo "  cd backend && python main.py &"
echo "  cd frontend && npm run dev &"
echo ""
echo "  Open http://localhost:5173"
echo ""
