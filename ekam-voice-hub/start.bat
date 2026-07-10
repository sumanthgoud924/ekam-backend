@echo off
title Ekam Voice Hub

echo Starting Ekam Voice Hub...
echo.

REM Start backend
start "Ekam Backend" cmd /c "cd /d "%~dp0backend" && ..\venv\Scripts\python main.py"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend dev server
start "Ekam Frontend" cmd /c "cd /d "%~dp0frontend" && npx vite --host"

echo.
echo Ekam Voice Hub started!
echo Backend:  http://localhost:8002
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8002/docs
echo.
