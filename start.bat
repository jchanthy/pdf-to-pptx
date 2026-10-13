@echo off
title Khmer DocFixer
echo ========================================================
echo   Khmer DocFixer: PowerPoint and Word Khmer Unicode Restorer
echo ========================================================

echo [1/2] Starting Backend Server (FastAPI on port 8000)...
start "Khmer DocFixer Backend" cmd /k "cd /d "%~dp0backend" && uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Frontend Server (Vite on port 5173)...
start "Khmer DocFixer Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening application in browser...
start http://localhost:5173/

echo ========================================================
echo   Khmer DocFixer is now running at:
echo   http://localhost:5173/
echo ========================================================
