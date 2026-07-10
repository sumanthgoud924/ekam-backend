<?php
/**
 * Ekam Tools — PHP Front Controller + API Proxy
 * 
 * Handles ALL requests:
 *   /apix/*, /api/* → proxy to Python backend
 *   /*              → serve SPA index.html
 */

// ── Load environment config if present ──────────────────────────────
$configFile = __DIR__ . '/hostinger-config.php';
if (file_exists($configFile)) {
    require_once $configFile;
}

// ── Detect the original request URI ──────────────────────────────────
// Check for explicit route passed via .htaccess rewrite first
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
if (isset($_GET['ekam_route'])) {
    $requestUri = $_GET['ekam_route'];
}
$path = '/' . trim(parse_url($requestUri, PHP_URL_PATH) ?? '', '/');
$method = $_SERVER['REQUEST_METHOD'];

// ── CORS headers ─────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── API Proxy ────────────────────────────────────────────────────────
if (str_starts_with($path, '/api/') || $path === '/api' || str_starts_with($path, '/apix/') || $path === '/apix') {
    $backendUrl = getenv('BACKEND_URL') ?: 'http://localhost:8001';
    $targetUrl = rtrim($backendUrl, '/') . $path;
    $queryString = '';
    if (!empty($_GET)) {
        $filtered = $_GET;
        unset($filtered['ekam_route']);
        if (!empty($filtered)) {
            $queryString = http_build_query($filtered);
        }
    }
    if ($queryString) {
        $targetUrl .= '?' . $queryString;
    }

    // WebSocket detection
    $wsEndpoints = ['/api/tts/ws', '/api/stt/ws'];
    if (in_array($path, $wsEndpoints)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode([
            'detail' => 'WebSocket requires a direct backend connection.',
            'config' => 'Set VITE_WS_HOST in frontend .env.production to your backend domain.',
        ]);
        exit;
    }

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $targetUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 300,
        CURLOPT_CONNECTTIMEOUT => 30,
        CURLOPT_HEADERFUNCTION => function ($curl, $headerLine) {
            $header = trim($headerLine);
            $skipHeaders = ['Transfer-Encoding:', 'Connection:', 'Content-Length:'];
            foreach ($skipHeaders as $sh) {
                if (stripos($header, $sh) === 0) return strlen($headerLine);
            }
            if ($header && strpos($header, 'HTTP/') !== 0) header($header);
            return strlen($headerLine);
        },
    ]);

    // Handle file uploads
    if (!empty($_FILES)) {
        $postData = [];
        foreach ($_FILES as $key => $file) {
            if (is_array($file['tmp_name'])) {
                for ($i = 0; $i < count($file['tmp_name']); $i++) {
                    if ($file['tmp_name'][$i] && UPLOAD_ERR_NO_FILE !== $file['error'][$i]) {
                        $postData[$key] = new CURLFile(
                            $file['tmp_name'][$i],
                            $file['type'][$i],
                            $file['name'][$i]
                        );
                    }
                }
            } elseif ($file['tmp_name'] && UPLOAD_ERR_NO_FILE !== $file['error']) {
                $postData[$key] = new CURLFile($file['tmp_name'], $file['type'], $file['name']);
            }
        }
        foreach ($_POST as $key => $value) {
            $postData[$key] = $value;
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Expect:']);
    } elseif (in_array($method, ['POST', 'PUT', 'PATCH'])) {
        $input = file_get_contents('php://input');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
        $contentType = $_SERVER['CONTENT_TYPE'] ?? 'application/json';
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: $contentType"]);
    }

    switch ($method) {
        case 'GET':    curl_setopt($ch, CURLOPT_HTTPGET, true); break;
        case 'POST':   curl_setopt($ch, CURLOPT_POST, true); break;
        case 'PUT':    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT'); break;
        case 'DELETE': curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE'); break;
        case 'PATCH':  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH'); break;
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        http_response_code(502);
        header('Content-Type: application/json');
        echo json_encode([
            'detail' => 'Backend proxy error',
            'error' => $error,
            'backend_url' => $backendUrl,
            'hint' => 'Ensure the Python backend server is running.',
        ]);
        exit;
    }

    if (!headers_sent()) http_response_code($httpCode);
    echo $response;
    exit;
}

// ── SPA: Serve index.html for all other routes ──────────────────────
$spaFile = __DIR__ . '/index.html';
if (file_exists($spaFile)) {
    $ext = pathinfo($path, PATHINFO_EXTENSION);
    $mimeMap = [
        'js' => 'application/javascript', 'css' => 'text/css',
        'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg',
        'gif' => 'image/gif', 'svg' => 'image/svg+xml', 'ico' => 'image/x-icon',
        'json' => 'application/json', 'woff2' => 'font/woff2', 'woff' => 'font/woff',
        'webmanifest' => 'application/manifest+json',
    ];
    if ($ext && isset($mimeMap[$ext])) {
        header('Content-Type: ' . $mimeMap[$ext]);
    } else {
        header('Content-Type: text/html; charset=utf-8');
    }
    readfile($spaFile);
} else {
    http_response_code(500);
    echo 'SPA build not found.';
}
