"""Voir toutes les recherches dans Supabase"""
import os
from dotenv import load_dotenv
from supabase import create_client
from pathlib import Path

# Charger les variables d'environnement
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialiser Supabase
supabase_url = os.environ['SUPABASE_URL']
supabase_service_key = os.environ.get('SUPABASE_SERVICE_KEY', '')
supabase = create_client(supabase_url, supabase_service_key)

print("=" * 80)
print("TOUTES LES RECHERCHES DANS SUPABASE")
print("=" * 80)
print()

# Récupérer TOUTES les recherches (sans filtre)
all_searches = supabase.table("searches").select("id, location, status, user_id, company_id, created_at").order("created_at", desc=True).limit(20).execute()

print(f"📋 Total: {len(all_searches.data)} recherches (20 plus récentes)")
print()

for search in all_searches.data:
    print(f"Location: {search['location'][:50]}")
    print(f"  Status: {search['status']}")
    print(f"  User ID: {search['user_id']}")
    print(f"  Company ID: {search['company_id']}")
    print(f"  Created: {search['created_at']}")
    print()
