"""Test de l'endpoint /technicians/{id}/missions"""
import os
from dotenv import load_dotenv
from supabase import create_client

# Charger les variables d'environnement
load_dotenv()

# Initialiser Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(supabase_url, supabase_key)

# ID du technicien
technician_id = "f874b18b-be46-4f91-a880-11d016347660"
company_id = "ce5f736d-a8e4-4a3e-b076-2c47062a92a1"

print(f"🔍 Test de la requête pour le technicien {technician_id}")
print()

try:
    # Requête exactement comme dans le backend
    response = supabase.table("schedules").select("""
        *,
        worksites:worksite_id(id, title, client_id, status, address, start_date, end_date, clients:client_id(id, name, prenom, nom, address)),
        planning_team_leaders:team_leader_id(id, first_name, last_name, user_id)
    """).eq("company_id", company_id).eq("collaborator_id", technician_id).not_.is_("start_date", "null").order("start_date", desc=False).order("time").execute()
    
    print(f"✅ Succès ! {len(response.data)} missions trouvées")
    print()
    
    for schedule in response.data:
        print(f"📋 Mission ID: {schedule.get('id')}")
        print(f"   Worksite: {schedule.get('worksites', {}).get('title', 'N/A')}")
        print(f"   Client: {schedule.get('worksites', {}).get('clients', {})}")
        print(f"   Start: {schedule.get('start_date')}")
        print(f"   End: {schedule.get('end_date')}")
        print()
        
except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
