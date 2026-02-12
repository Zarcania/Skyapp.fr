"""Script pour mettre à jour les schedules existants avec les infos clients"""
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
print("MISE À JOUR DES INFORMATIONS CLIENTS DANS LES SCHEDULES")
print("=" * 80)
print()

try:
    # Récupérer tous les schedules avec un worksite_id mais sans client_name
    response = supabase.table("schedules").select("""
        id,
        worksite_id,
        client_name,
        worksites:worksite_id(client_id)
    """).not_.is_("worksite_id", "null").execute()
    
    schedules = response.data or []
    print(f"📋 {len(schedules)} schedules trouvés avec un worksite_id")
    print()
    
    updated_count = 0
    skipped_count = 0
    
    for schedule in schedules:
        schedule_id = schedule.get("id")
        worksite_id = schedule.get("worksite_id")
        current_client_name = schedule.get("client_name")
        
        # Si déjà rempli, passer au suivant
        if current_client_name:
            skipped_count += 1
            continue
        
        # Récupérer le client_id depuis le worksite
        worksite = schedule.get("worksites")
        if not worksite or not worksite.get("client_id"):
            print(f"⚠️  Schedule {schedule_id[:8]}... : Pas de client_id dans worksite")
            skipped_count += 1
            continue
        
        client_id = worksite["client_id"]
        
        # Récupérer les infos du client
        client_res = supabase.table("clients").select("name, prenom, nom, adresse, email, telephone").eq("id", client_id).execute()
        
        if not client_res.data:
            print(f"⚠️  Schedule {schedule_id[:8]}... : Client {client_id[:8]}... introuvable")
            skipped_count += 1
            continue
        
        client = client_res.data[0]
        
        # Construire le nom du client
        if client.get("name"):
            client_name = client["name"]
        elif client.get("prenom") or client.get("nom"):
            client_name = f"{client.get('prenom', '')} {client.get('nom', '')}".strip()
        else:
            client_name = None
        
        client_address = client.get("adresse")
        
        # Utiliser email ou phone comme contact
        if client.get("email"):
            client_contact = client["email"]
        elif client.get("telephone"):
            client_contact = client["telephone"]
        else:
            client_contact = None
        
        # Mettre à jour le schedule
        update_data = {
            "client_name": client_name,
            "client_address": client_address,
            "client_contact": client_contact
        }
        
        supabase.table("schedules").update(update_data).eq("id", schedule_id).execute()
        
        print(f"✅ Schedule {schedule_id[:8]}... mis à jour: {client_name}")
        updated_count += 1
    
    print()
    print("=" * 80)
    print(f"✅ Mise à jour terminée !")
    print(f"   - {updated_count} schedules mis à jour")
    print(f"   - {skipped_count} schedules ignorés (déjà remplis ou pas de client)")
    print("=" * 80)

except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
