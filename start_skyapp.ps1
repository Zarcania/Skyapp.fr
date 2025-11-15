# ========================================
# SCRIPT DE DEMARRAGE SKYAPP
# ========================================

$ErrorActionPreference = 'Stop'

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEMARRAGE DE SKYAPP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$root = $PSScriptRoot
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'

# Etape 1: Nettoyage
Write-Host "[1/3] Nettoyage des processus existants..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like '*python*' -or $_.ProcessName -eq 'node' } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "      OK - Processus nettoyes`n" -ForegroundColor Green

# Etape 2: Backend
Write-Host "[2/3] Demarrage du Backend (port 8001)..." -ForegroundColor Yellow
if (!(Test-Path $backendDir)) {
    Write-Host "      ERREUR - Repertoire backend introuvable: $backendDir" -ForegroundColor Red
    exit 1
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; python -m uvicorn server_supabase:app --host 127.0.0.1 --port 8001 --reload"
Start-Sleep -Seconds 5
Write-Host "      OK - Backend demarre`n" -ForegroundColor Green

# Etape 3: Frontend
Write-Host "[3/3] Demarrage du Frontend (port 3002)..." -ForegroundColor Yellow
if (!(Test-Path $frontendDir)) {
    Write-Host "      ERREUR - Repertoire frontend introuvable: $frontendDir" -ForegroundColor Red
    exit 1
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm start"
Start-Sleep -Seconds 3
Write-Host "      OK - Frontend demarre`n" -ForegroundColor Green

# Resultat
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SKYAPP EST DEMARRE !" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "URLs disponibles:" -ForegroundColor White
Write-Host "  - Backend:  http://127.0.0.1:8001/api/health" -ForegroundColor Cyan
Write-Host "  - API Docs: http://127.0.0.1:8001/docs" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:3002" -ForegroundColor Cyan

Write-Host "`nLes serveurs tournent dans des fenetres separees." -ForegroundColor DarkGray
Write-Host "Attends 30-60 secondes pour que tout soit pret.`n" -ForegroundColor DarkGray
