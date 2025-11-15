# ========================================
# SCRIPT DE REDEMARRAGE SKYAPP
# ========================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  REDEMARRAGE DE SKYAPP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$root = $PSScriptRoot

# Etape 1: Arreter
Write-Host "[1/2] Arret des serveurs..." -ForegroundColor Yellow
& "$root\stop_skyapp.ps1"

# Attendre un peu
Start-Sleep -Seconds 2

# Etape 2: Demarrer
Write-Host "`n[2/2] Demarrage des serveurs..." -ForegroundColor Yellow
& "$root\start_skyapp.ps1"

Write-Host "`nRedemarrage termine !`n" -ForegroundColor Green
