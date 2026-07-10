<?php
/**
 * Ekam Tools — Hostinger Configuration
 * 
 * Frontend static files are served directly.
 * API calls proxied via Cloudflare Worker → Render backend.
 */

putenv('BACKEND_URL=https://ekam-api-proxy.sumanthbsg000.workers.dev');

putenv('ADMIN_EMAIL=admin@ekam.com');
putenv('ADMIN_PASSWORD=CHANGE_ME_IN_PRODUCTION');