@echo off
echo Starting BK FOOD + AI Server...
cd bkfood_ai

REM Install dependencies first
echo Installing AI dependencies...
pip install -r requirements.txt -q

REM Try different Python commands
python 5_api_server.py 2>nul && goto :start_next || (
    python3 5_api_server.py 2>nul && goto :start_next || (
        py 5_api_server.py 2>nul && goto :start_next || (
            echo ERROR: Python not found. Please install Python and try again.
            echo.
            echo To install Python:
            echo 1. Download from https://python.org
            echo 2. Run installer with "Add Python to PATH" checked
            echo 3. Restart this terminal
            pause
            exit /b 1
        )
    )
)

:start_next
cd ..
echo Starting Next.js...
npm run dev
