# Script pour libérer les ports Supabase bloqués par Windows
# À exécuter en tant qu'Administrateur

Write-Host "Arrêt du service NAT..." -ForegroundColor Yellow
net stop winnat

Write-Host "`nLibération des ports 54320-54327..." -ForegroundColor Yellow
# Redémarrer le service NAT
net start winnat

Write-Host "`nEssayez maintenant: supabase start" -ForegroundColor Green
Write-Host "Si cela ne fonctionne pas, redémarrez Windows." -ForegroundColor Yellow
