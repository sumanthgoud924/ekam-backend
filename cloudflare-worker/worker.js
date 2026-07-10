// Ekam API Proxy - Cloudflare Worker
// Routes all /api/* requests to the Python FastAPI backend
// Deploy: npx wrangler deploy
// Route: api.ekam.digital/*

const BACKEND_URL = 'https://ekam-backend.onrender.com';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
    };

    // Handle preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check (return quickly without proxying)
    if (url.pathname === '/api/health') {
      try {
        const resp = await fetch(`${BACKEND_URL}/api/health`, {
          headers: { 'User-Agent': 'Cloudflare-Worker' },
        });
        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          status: resp.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ status: 'error', detail: e.message }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build the backend URL
    const targetUrl = `${BACKEND_URL}${url.pathname}${url.search}`;

    // Forward the request to the Python backend
    try {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('Host', new URL(BACKEND_URL).host);

      const backendResp = await fetch(targetUrl, {
        method: method,
        headers: requestHeaders,
        body: method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' ? request.body : null,
        redirect: 'follow',
      });

      // Build response with CORS
      const responseHeaders = new Headers(backendResp.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        responseHeaders.set(key, value);
      }

      return new Response(backendResp.body, {
        status: backendResp.status,
        statusText: backendResp.statusText,
        headers: responseHeaders,
      });

    } catch (e) {
      return new Response(JSON.stringify({
        detail: 'Backend unavailable',
        error: e.message,
        hint: 'Ensure the Python backend server is running.',
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};