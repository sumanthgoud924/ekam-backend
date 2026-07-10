<?php
header('Content-Type: text/plain');
echo "REQUEST_URI: " . ($_SERVER['REQUEST_URI'] ?? 'NOT SET') . "\n";
echo "SCRIPT_NAME: " . ($_SERVER['SCRIPT_NAME'] ?? 'NOT SET') . "\n";
echo "PHP_SELF: " . ($_SERVER['PHP_SELF'] ?? 'NOT SET') . "\n";
echo "REDIRECT_URL: " . ($_SERVER['REDIRECT_URL'] ?? 'NOT SET') . "\n";
echo "REDIRECT_STATUS: " . ($_SERVER['REDIRECT_STATUS'] ?? 'NOT SET') . "\n";
echo "ORIG_PATH_INFO: " . ($_SERVER['ORIG_PATH_INFO'] ?? 'NOT SET') . "\n";
echo "ORIG_SCRIPT_NAME: " . ($_SERVER['ORIG_SCRIPT_NAME'] ?? 'NOT SET') . "\n";
echo "PATH_INFO: " . ($_SERVER['PATH_INFO'] ?? 'NOT SET') . "\n";
echo "QUERY_STRING: " . ($_SERVER['QUERY_STRING'] ?? 'NOT SET') . "\n";
echo "X-LITE-ORIGINAL-REQUEST: " . ($_SERVER['X-LITE-ORIGINAL-REQUEST'] ?? 'NOT SET') . "\n";
echo "CONTEXT_DOCUMENT_ROOT: " . ($_SERVER['CONTEXT_DOCUMENT_ROOT'] ?? 'NOT SET') . "\n";
echo "CONTEXT_PREFIX: " . ($_SERVER['CONTEXT_PREFIX'] ?? 'NOT SET') . "\n";
echo "DOCUMENT_ROOT: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'NOT SET') . "\n";
echo "\n--- Full _SERVER keys ---\n";
foreach ($_SERVER as $k => $v) {
    if (is_string($v) && strlen($v) < 200) echo "$k: $v\n";
}
