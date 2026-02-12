"""Script pour appliquer la migration invitations sur Supabase Cloud"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Utiliser la service key pour avoir les permissions nécessaires
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

# Lire le fichier de migration
migration_file = '../supabase/migrations/20251212000001_create_invitations_table.sql'
with open(migration_file, 'r', encoding='utf-8') as f:
    migration_sql = f.read()

print("="*60)
print("APPLICATION DE LA MIGRATION: invitations table")
print("="*60)
print("\nContenu de la migration:")
print("-"*60)
print(migration_sql[:500] + "..." if len(migration_sql) > 500 else migration_sql)
print("-"*60)

# Note: Supabase ne permet pas d'exécuter du SQL arbitraire via l'API REST
# Il faut utiliser le Supabase Studio ou le CLI pour appliquer les migrations

print("\n⚠️  IMPORTANT:")
print("   Les migrations SQL doivent être appliquées via Supabase CLI:")
print("   1. Assurez-vous que Supabase CLI est lié à votre projet cloud")
print("   2. Exécutez: supabase db push")
print("\n   Ou via Supabase Studio:")
print("   1. Allez sur https://supabase.com/dashboard")
print("   2. Sélectionnez votre projet")
print("   3. SQL Editor > New Query")
print("   4. Collez le contenu de la migration")
print("   5. Exécutez")

print("\n" + "="*60)
print("Fichier de migration créé avec succès:")
print(f"  {migration_file}")
print("="*60)
