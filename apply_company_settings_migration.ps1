# Script pour appliquer la migration company_settings à Supabase
# Assurez-vous que Supabase est démarré

Write-Host "🔄 Application de la migration company_settings..." -ForegroundColor Cyan

# Lire le fichier SQL
$migrationSQL = Get-Content "supabase\migrations\20251119_company_settings.sql" -Raw

# Appliquer la migration via psql
$env:PGPASSWORD = "postgres"
$result = $migrationSQL | psql -h localhost -p 54322 -U postgres -d postgres

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration appliquée avec succès!" -ForegroundColor Green
    Write-Host "La table company_settings a été créée dans Supabase" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de l'application de la migration" -ForegroundColor Red
    Write-Host "Vous pouvez copier-coller le SQL dans l'éditeur Supabase:" -ForegroundColor Yellow
    Write-Host "http://localhost:54323 -> SQL Editor" -ForegroundColor Cyan
}
