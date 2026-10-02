Write-Host "Starting Khmer DocFixer: PDF-to-PPTX Unicode Restorer..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\backend"
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000
