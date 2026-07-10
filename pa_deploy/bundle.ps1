# Bundle backend files for PythonAnywhere
$src = "E:\Mobile App\Ekam Multi Purpose app\public_html\backend"
$dst = "E:\Mobile App\Ekam Multi Purpose app\pa_deploy"

# Items to copy recursively
$items = @(
    "main.py", "config.py", "ai_client.py", "database.py", ".env"
    "requirements.txt", "asgi.py", "bootstrap.py", "setup.sh"
    "models", "routes", "tts", "stt", "documents", "translate", "tools"
)

# Remove existing copies
foreach ($item in $items) {
    $target = Join-Path $dst $item
    if (Test-Path $target) {
        Remove-Item -Recurse -Force $target
    }
}

# Copy items
foreach ($item in $items) {
    $srcPath = Join-Path $src $item
    $dstPath = Join-Path $dst $item
    if (Test-Path $srcPath) {
        if ((Get-Item $srcPath).PSIsContainer) {
            Copy-Item -Recurse $srcPath $dstPath
        } else {
            Copy-Item $srcPath $dstPath
        }
        Write-Host "  Copied: $item"
    } else {
        Write-Host "  SKIP (not found): $item" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Bundle ready at: $dst" -ForegroundColor Green
Write-Host "Size: $((Get-ChildItem -Recurse $dst | Measure-Object Length -Sum).Sum / 1KB -as [int]) KB"
