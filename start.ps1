Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Khmer DocFixer: PowerPoint & Word Khmer Restorer" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "Starting Backend (FastAPI on port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$PSScriptRoot\backend'; uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "Starting Frontend (Vite on port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$PSScriptRoot\frontend'; npm run dev"

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173/"

Write-Host "Khmer DocFixer is running at http://localhost:5173/" -ForegroundColor Green
