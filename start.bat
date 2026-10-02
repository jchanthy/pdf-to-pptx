@echo off
echo ========================================================
echo   Khmer DocFixer: PDF-to-PPTX Unicode Restorer
echo ========================================================
echo Starting backend server on http://localhost:8000 ...
cd /d "%~dp0backend"
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000
pause
