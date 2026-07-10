// Ekam API Proxy - Cloudflare Worker
// Routes all /api/* requests to the Python FastAPI backend on Render
// Backend URL set via wrangler.toml [vars] or env.BACKEND_URL
// Deploy: npx wrangler deploy
// Test: https://ekam-api-proxy.sumanthbsg000.workers.dev/api/health

export default {
  async fetch(request, env, ctx) {
    const backendUrl = env.BACKEND_URL || 'https://ekam-backend-2-245a.onrender.com';
    const url = new URL(request.url);
    const method = request.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const targetUrl = `${backendUrl}${url.pathname}${url.search}`;

    try {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('Host', new URL(backendUrl).host);

      const backendResp = await fetch(targetUrl, {
        method: method,
        headers: requestHeaders,
        body: ['GET', 'HEAD'].includes(method) ? null : request.body,
        redirect: 'follow',
      });

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
        hint: 'Ensure the Python backend server is running on Render.',
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};