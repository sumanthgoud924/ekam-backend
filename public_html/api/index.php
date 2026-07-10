<?php
/**
 * Ekam Tools API Proxy
 *
 * Routes API requests from public_html/api/* to the Python FastAPI backend.
 * Works on Hostinger shared hosting where Python cannot run directly.
 *
 * Configuration:
 *   Set BACKEND_URL env var in hosting panel (default: http://localhost:8001)
 *
 * WebSocket endpoints (/api/tts/ws, /api/stt/ws) require a direct connection
 * to the backend — this proxy returns a 400 with setup instructions.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Resolve the original API path ─────────────────────────────────────
// Different Apache/PHP configs expose the original URI in different ways
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/api/index.php';

// Reconstruct the original path: strip the script name from the URI
$path = '/' . trim(str_replace($scriptName, '', $requestUri), '/');
// Fallback: use REQUEST_URI directly
if (!$path || $path === '/') {
    $path = parse_url($requestUri, PHP_URL_PATH);
}

$backendUrl = getenv('BACKEND_URL') ?: 'http://localhost:8001';
$targetUrl = rtrim($backendUrl, '/') . $path;
$queryString = $_SERVER['QUERY_STRING'] ?? '';
if ($queryString) {
    $targetUrl .= '?' . $queryString;
}

// ── WebSocket detection ────────────────────────────────────────────────
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

// ── cURL proxy ─────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
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
            if (stripos($header, $sh) === 0) {
                return strlen($headerLine);
            }
        }
        if ($header && strpos($header, 'HTTP/') !== 0) {
            header($header);
        }
        return strlen($headerLine);
    },
]);

// Handle file uploads (multipart/form-data)
if (!empty($_FILES)) {
    $postData = [];
    foreach ($_FILES as $key => $file) {
        if (is_array($file['tmp_name'])) {
            // Multiple files with same key (e.g. files[])
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
$info = curl_getinfo($ch);
curl_close($ch);

// ── Response ───────────────────────────────────────────────────────────
if ($error) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'detail' => 'Backend proxy error',
        'error' => $error,
        'backend_url' => $backendUrl,
        'target' => $targetUrl,
        'hint' => 'Ensure the Python backend server is running. See hostinger-setup.md.',
    ]);
    exit;
}

if (!headers_sent()) {
    http_response_code($httpCode);
}

echo $response;
