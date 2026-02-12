# ========================================
# SCRIPT DE DEMARRAGE SKYAPP
# ========================================

$ErrorActionPreference = 'Stop'

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEMARRAGE DE SKYAPP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$root = Split-Path $PSScriptRoot -Parent
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
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; python server_supabase.py"
Start-Sleep -Seconds 8

# Vérifier que le backend est démarré
$backendOK = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8001/api/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendOK = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($backendOK) {
    Write-Host "      OK - Backend demarre et operationnel`n" -ForegroundColor Green
} else {
    Write-Host "      WARNING - Backend demarre mais pas encore pret`n" -ForegroundColor Yellow
}

# Etape 3: Frontend
Write-Host "[3/3] Demarrage du Frontend (port 3002)..." -ForegroundColor Yellow
if (!(Test-Path $frontendDir)) {
    Write-Host "      ERREUR - Repertoire frontend introuvable: $frontendDir" -ForegroundColor Red
    exit 1
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm start"

# Attendre que le frontend compile
Write-Host "      Compilation en cours..." -ForegroundColor DarkGray
Start-Sleep -Seconds 15

# Vérifier que le frontend est accessible
$frontendOK = $false
for ($i = 0; $i -lt 20; $i++) {
    $port3002 = netstat -ano | findstr ":3002" | findstr "LISTENING"
    if ($port3002) {
        $frontendOK = $true
        break
    }
    Start-Sleep -Seconds 2
}

if ($frontendOK) {
    Write-Host "      OK - Frontend demarre et accessible`n" -ForegroundColor Green
} else {
    Write-Host "      WARNING - Frontend en cours de demarrage...`n" -ForegroundColor Yellow
}

# Resultat
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SKYAPP EST DEMARRE !" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "URLs disponibles:" -ForegroundColor White
Write-Host "  - Backend:  http://127.0.0.1:8001/api/health" -ForegroundColor Cyan
Write-Host "  - API Docs: http://127.0.0.1:8001/docs" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:3002" -ForegroundColor Cyan

Write-Host "`nLes serveurs tournent dans des fenetres separees." -ForegroundColor DarkGray
Write-Host "Le frontend peut prendre 30-60 secondes pour compiler completement.`n" -ForegroundColor DarkGray

# Vérification finale
Write-Host "Verification finale..." -ForegroundColor DarkGray
Start-Sleep -Seconds 2
$backendRunning = netstat -ano | findstr ":8001" | findstr "LISTENING"
$frontendRunning = netstat -ano | findstr ":3002" | findstr "LISTENING"

Write-Host "`nStatut des services:" -ForegroundColor White
if ($backendRunning) {
    Write-Host "  [OK] Backend:  ACTIF sur port 8001" -ForegroundColor Green
} else {
    Write-Host "  [..] Backend:  EN COURS sur port 8001" -ForegroundColor Yellow
}

if ($frontendRunning) {
    Write-Host "  [OK] Frontend: ACTIF sur port 3002" -ForegroundColor Green
} else {
    Write-Host "  [..] Frontend: EN COURS sur port 3002" -ForegroundColor Yellow
}

Write-Host ""
