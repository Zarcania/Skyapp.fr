"""Script pour appliquer la migration manuellement via l'API Supabase"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ['SUPABASE_URL']
SERVICE_KEY = os.environ['SUPABASE_SERVICE_KEY']

# Lire le fichier de migration
migration_file = '../supabase/migrations/20251212000001_create_invitations_table.sql'
with open(migration_file, 'r', encoding='utf-8') as f:
    migration_sql = f.read()

print("="*70)
print("COPIE DU CODE SQL À APPLIQUER MANUELLEMENT")
print("="*70)
print("\n1. Allez sur: https://supabase.com/dashboard/project/wursductnatclwrqvgua")
print("2. Cliquez sur 'SQL Editor' dans le menu de gauche")
print("3. Cliquez sur 'New Query'")
print("4. Copiez-collez le SQL ci-dessous:")
print("\n" + "="*70)
print(migration_sql)
print("="*70)
print("\n5. Cliquez sur 'Run' pour exécuter")
print("\n✅ Après exécution, la table 'invitations' sera créée !")
print("="*70)
