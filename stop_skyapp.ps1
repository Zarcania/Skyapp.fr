# ========================================
# SCRIPT D'ARRET SKYAPP
# ========================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ARRET DE SKYAPP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Compter et arreter les processus
$pythonProcesses = Get-Process | Where-Object { $_.ProcessName -like '*python*' } -ErrorAction SilentlyContinue
$nodeProcesses = Get-Process | Where-Object { $_.ProcessName -eq 'node' } -ErrorAction SilentlyContinue

$totalProcesses = 0
if ($pythonProcesses) { $totalProcesses += $pythonProcesses.Count }
if ($nodeProcesses) { $totalProcesses += $nodeProcesses.Count }

if ($totalProcesses -eq 0) {
    Write-Host "Aucun processus SkyApp actif.`n" -ForegroundColor DarkGray
    exit 0
}

Write-Host "Arret de $totalProcesses processus..." -ForegroundColor Yellow

if ($pythonProcesses) {
    Write-Host "  - $($pythonProcesses.Count) processus Python" -ForegroundColor White
    $pythonProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
}

if ($nodeProcesses) {
    Write-Host "  - $($nodeProcesses.Count) processus Node.js" -ForegroundColor White
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 1

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  SKYAPP ARRETE AVEC SUCCES !" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Pour redemarrer: " -NoNewline -ForegroundColor DarkGray
Write-Host ".\start_skyapp.ps1`n" -ForegroundColor Cyan
