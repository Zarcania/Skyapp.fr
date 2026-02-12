"""Test du filtrage des recherches"""
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
print("TEST DU FILTRAGE DES RECHERCHES")
print("=" * 80)
print()

# ID de l'admin et du technicien (à adapter)
admin_id = "22d650c3-f916-411b-b29f-744828be033b"  # admin1 test
tech_id = "f874b18b-be46-4f91-a880-11d016347660"   # Technicien test
company_id = "ce5f736d-a8e4-4a3e-b076-2c47062a92a1"

print("👤 Admin ID:", admin_id)
print("👤 Technicien ID:", tech_id)
print("🏢 Company ID:", company_id)
print()

# Récupérer toutes les recherches
all_searches = supabase.table("searches").select("id, location, status, user_id").eq("company_id", company_id).execute()

print(f"📋 Total recherches dans la company: {len(all_searches.data)}")
print()

for search in all_searches.data:
    owner = "Admin" if search['user_id'] == admin_id else "Technicien" if search['user_id'] == tech_id else "Autre"
    print(f"  - {search['location'][:50]:50} | Status: {search['status']:10} | Owner: {owner}")

print()
print("=" * 80)
print("SIMULATION DU FILTRAGE")
print("=" * 80)
print()

# Simulation pour l'admin
print("👑 VUE ADMIN (mes recherches + recherches SHARED):")
admin_query = supabase.table("searches").select("id, location, status, user_id").eq("company_id", company_id).or_(f"user_id.eq.{admin_id},status.eq.SHARED").execute()
print(f"   Résultats: {len(admin_query.data)} recherches")
for search in admin_query.data:
    owner = "Admin" if search['user_id'] == admin_id else "Technicien" if search['user_id'] == tech_id else "Autre"
    print(f"     - {search['location'][:40]:40} | Status: {search['status']:10} | Owner: {owner}")
print()

# Simulation pour le technicien
print("🔧 VUE TECHNICIEN (mes recherches uniquement):")
tech_query = supabase.table("searches").select("id, location, status, user_id").eq("company_id", company_id).eq("user_id", tech_id).execute()
print(f"   Résultats: {len(tech_query.data)} recherches")
for search in tech_query.data:
    print(f"     - {search['location'][:40]:40} | Status: {search['status']:10}")
print()

print("=" * 80)
print("CONCLUSION")
print("=" * 80)
print()
print("✅ L'admin devrait voir:")
print("   - Ses propres recherches (user_id = admin)")
print("   - Les recherches partagées (status = SHARED)")
print()
print("✅ Le technicien devrait voir:")
print("   - Uniquement ses propres recherches (user_id = technicien)")
print()
