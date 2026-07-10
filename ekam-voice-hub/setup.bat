@echo off
REM Ekam Voice Hub - Windows Setup Script

echo ========================================
echo  Ekam Voice Hub Setup
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Install Python 3.10+ from python.org
    pause
    exit /b 1
)

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Install Node.js 18+ from nodejs.org
    pause
    exit /b 1
)

echo [1/5] Creating Python virtual environment...
if not exist "venv" python -m venv venv

echo [2/5] Installing Python dependencies...
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo [WARN] Some packages failed. Check errors above.
)

REM Optional engines
echo.
echo [OPTIONAL] Install premium TTS engines?
echo  [1] Skip (use Edge-TTS and gTTS only)
echo  [2] Install VoxCPM2 (30 languages, 2B model, ~8GB VRAM)
echo  [3] Install KittenTTS (lightweight CPU, ~25MB)
echo  [4] Install Openai-Whisper (speech recognition)
echo.

choice /c 1234 /n /m "Select option (1-4): "
if %errorlevel%==2 (
    pip install voxcpm
    echo VoxCPM2 installed.
)
if %errorlevel%==3 (
    pip install kittentts
    echo KittenTTS installed.
)
if %errorlevel%==4 (
    pip install openai-whisper
    echo Whisper installed.
)

echo [3/5] Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo [4/5] Building frontend...
cd frontend
call npm run build
cd ..

echo [5/5] Setup complete!
echo.
echo ========================================
echo  To start the application:
echo  ========================================
echo.
echo  1. Activate venv: venv\Scripts\activate
echo  2. Start backend:  cd backend ^&^& python main.py
echo  3. Start frontend: cd frontend ^&^& npm run dev
echo     (in a separate terminal)
echo.
echo  4. Open browser:  http://localhost:5173
echo.
pause
