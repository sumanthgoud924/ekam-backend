#!/bin/bash
# ─────────────────────────────────────────────────────────
# Ekam Tools — Hostinger VPS Setup Script
# ─────────────────────────────────────────────────────────
# Run this ONCE on a fresh Hostinger VPS (Ubuntu 22.04+)
# It installs all dependencies and sets up the backend as a
# systemd service so it auto-starts on reboot.
# ─────────────────────────────────────────────────────────

set -euo pipefail

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║     Ekam Tools — Hostinger VPS Setup         ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# ── 1. System dependencies ───────────────────────────
echo "[1/6] Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
    python3 python3-pip python3-venv \
    nginx certbot python3-certbot-nginx \
    redis-server \
    tesseract-ocr tesseract-ocr-eng \
    poppler-utils \
    ffmpeg \
    curl git build-essential

# ── 2. Backend directory ──────────────────────────────
echo "[2/6] Setting up backend..."
BACKEND_DIR="/opt/ekam-backend"
mkdir -p "$BACKEND_DIR/data/uploads" "$BACKEND_DIR/data/audio"

# Copy backend files (assuming this script is in the backend folder)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp -r "$SCRIPT_DIR"/*.py "$SCRIPT_DIR"/{models,routes,tts,stt,documents,translate,tools} "$BACKEND_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/requirements.txt" "$BACKEND_DIR/"

# ── 3. Python virtual environment ─────────────────────
echo "[3/6] Creating Python virtual environment..."
cd "$BACKEND_DIR"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install uvicorn[standard] gunicorn

# ── 4. systemd service ────────────────────────────────
echo "[4/6] Creating systemd service..."
cat > /etc/systemd/system/ekam-backend.service << 'SERVICE'
[Unit]
Description=Ekam Tools Backend (FastAPI)
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ekam-backend
Environment=PYTHONUNBUFFERED=1
ExecStart=/opt/ekam-backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001 --workers 4 --log-level info
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable ekam-backend
systemctl start ekam-backend
echo "[4/6] Backend service started. Check: systemctl status ekam-backend"

# ── 5. Nginx reverse proxy ────────────────────────────
echo "[5/6] Configuring Nginx..."
DOMAIN="${DOMAIN:-api.ekam.digital}"

cat > /etc/nginx/sites-available/ekam-api << NGINX
upstream ekam_backend {
    server 127.0.0.1:8001;
    keepalive 64;
}

server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL — certbot handles these after setup
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 128M;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;

    # API proxy
    location / {
        proxy_pass http://ekam_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_cache off;
    }
}

server {
    listen 80;
    server_name yourdomain.com;

    # Frontend SPA proxy — replace with actual frontend domain
    location /api/ {
        proxy_pass http://ekam_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;  # or serve static files directly
        proxy_set_header Host \$host;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/ekam-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

echo "[5/6] Nginx configured for $DOMAIN"

# ── 6. SSL via Certbot ────────────────────────────────
echo "[6/6] Obtaining SSL certificate..."
echo "NOTE: Run the following AFTER pointing your domain to this server:"
echo ""
echo "    certbot --nginx -d $DOMAIN"
echo ""

echo "╔═══════════════════════════════════════════════╗"
echo "║  Setup complete!                              ║"
echo "║                                               ║"
echo "║  Backend:  http://127.0.0.1:8001              ║"
echo "║  Service:  systemctl status ekam-backend      ║"
echo "║  Logs:     journalctl -u ekam-backend -f     ║"
echo "╚═══════════════════════════════════════════════╝"
