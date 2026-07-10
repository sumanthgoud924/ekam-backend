@echo off
REM ============================================
REM Ekam Backend - Cloudflare Worker Deploy
REM ============================================

echo ============================================
echo Ekam Backend - Cloudflare Worker Deploy
echo ============================================
echo.

REM Step 1: Login to Cloudflare (first time)
echo Step 1: Login to Cloudflare...
echo If not logged in, run: npx wrangler login
echo.
npx wrangler whoami >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo You need to login first. Opening browser...
    npx wrangler login
)

REM Step 2: Deploy the Worker
echo.
echo Step 2: Deploying Cloudflare Worker...
cd /d "%~dp0"
npx wrangler deploy

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo SUCCESS! Worker deployed to api.ekam.digital
    echo ============================================
    echo.
    echo Next steps:
    echo   1. Deploy Python backend to Render
    echo   2. Update hostinger-config.php BACKEND_URL
    echo   3. Done!
) else (
    echo.
    echo ERROR: Deployment failed. Check errors above.
    pause
)