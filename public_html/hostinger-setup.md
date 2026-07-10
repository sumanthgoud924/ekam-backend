# Ekam Tools — Hostinger Deployment Guide

## Overview

| Component | Hosting | Location |
|-----------|---------|----------|
| **Frontend** (React SPA) | Hostinger Shared Hosting | `public_html/` |
| **Backend** (Python FastAPI) | Hostinger VPS / Cloud Server | `backend/` |

## Option A: Shared Hosting (Frontend Only)

1. Upload everything inside `public_html/` to your Hostinger `public_html/` via FTP
2. Deploy the backend on a Hostinger VPS (Option B) or a cloud service (Render, Railway, PythonAnywhere)
3. Update `api/index.php` backend URL to your actual backend:
   ```php
   putenv('BACKEND_URL=https://your-backend.com');
   ```
4. Update `sw.js` if needed to skip API caching on your domain
5. Enable HTTPS in Hostinger hPanel → SSL

## Option B: VPS (Full Stack)

### Backend Setup (Hostinger VPS)

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Upload backend files
# (from your local machine)
scp -r public_html/backend/* root@your-vps-ip:/opt/ekam-backend/

# Run setup
ssh root@your-vps-ip
bash /opt/ekam-backend/hostinger-vps-setup.sh

# After SSL is configured:
certbot --nginx -d api.yourdomain.com
```

### Frontend Setup (Shared Hosting)

Same as Option A but point `BACKEND_URL` to your VPS:
```php
putenv('BACKEND_URL=https://api.yourdomain.com');
```

## Verifying the Connection

After deployment, verify the API works:

```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{"status":"ok","version":"2.0.0","ai_enabled":true,...}
```

## Important Notes

- **WebSocket endpoints** (`/api/tts/ws`, `/api/stt/ws`) require a direct backend connection
- The PHP proxy in `api/index.php` handles HTTP API calls but **not WebSocket**
- For WebSocket support, the frontend must connect directly to the backend domain
- Set `VITE_WS_HOST` in the frontend build to your backend domain

## File Structure

```
public_html/
├── assets/           # Built JS/CSS (from Vite build)
├── icons/            # PWA icons
├── api/
│   ├── .htaccess     # Disables rewrite for API routes
│   └── index.php     # PHP proxy to Python backend
├── backend/
│   ├── main.py       # FastAPI application
│   ├── *.py          # Backend modules
│   ├── requirements.txt
│   ├── start.sh      # Production startup script
│   └── hostinger-vps-setup.sh  # VPS setup script
├── index.html
├── manifest.json
├── sw.js
├── .htaccess         # SPA routing + security
├── robots.txt
├── 404.html
├── hostinger-config.php  # Runtime configuration
└── hostinger-setup.md    # This file
```
