"""
Script pour nettoyer les schedules en double dans la base de données.
Garde uniquement le schedule le plus récent pour chaque combinaison unique.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Charger les variables d'environnement
load_dotenv()

# Configuration Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL ou SUPABASE_KEY manquant dans .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def clean_duplicate_schedules():
    """Supprime les schedules en double, garde le plus récent."""
    
    print("🔍 Recherche des schedules en double...")
    
    # Récupérer tous les schedules
    response = supabase.table("schedules").select("*").execute()
    schedules = response.data
    
    print(f"📊 Total schedules trouvés: {len(schedules)}")
    
    # Grouper par combinaison unique (date, collaborator, team_leader, worksite)
    groups = {}
    for schedule in schedules:
        key = (
            schedule.get('date'),
            schedule.get('collaborator_id'),
            schedule.get('team_leader_id'),
            schedule.get('worksite_id'),
            schedule.get('time')
        )
        
        if key not in groups:
            groups[key] = []
        groups[key].append(schedule)
    
    # Identifier et supprimer les doublons
    total_duplicates = 0
    deleted_count = 0
    
    for key, group in groups.items():
        if len(group) > 1:
            total_duplicates += len(group) - 1
            print(f"\n🔍 Trouvé {len(group)} doublons pour:")
            print(f"   Date: {key[0]}")
            print(f"   Collaborateur: {key[1]}")
            print(f"   Chef d'équipe: {key[2]}")
            print(f"   Chantier: {key[3]}")
            print(f"   Heure: {key[4]}")
            
            # Trier par created_at (garder le plus récent)
            sorted_group = sorted(group, key=lambda x: x.get('created_at', ''), reverse=True)
            
            # Garder le premier (plus récent), supprimer les autres
            to_keep = sorted_group[0]
            to_delete = sorted_group[1:]
            
            print(f"   ✅ Garde schedule ID: {to_keep['id']} (créé le {to_keep.get('created_at')})")
            
            for schedule in to_delete:
                try:
                    print(f"   ❌ Supprime schedule ID: {schedule['id']} (créé le {schedule.get('created_at')})")
                    supabase.table("schedules").delete().eq("id", schedule['id']).execute()
                    deleted_count += 1
                except Exception as e:
                    print(f"   ⚠️ Erreur lors de la suppression de {schedule['id']}: {e}")
    
    print(f"\n✅ Nettoyage terminé!")
    print(f"📊 Total doublons trouvés: {total_duplicates}")
    print(f"🗑️ Schedules supprimés: {deleted_count}")
    print(f"✅ Schedules uniques restants: {len(groups)}")

if __name__ == "__main__":
    print("🧹 Nettoyage des schedules en double")
    print("=" * 50)
    
    confirmation = input("\n⚠️ Voulez-vous vraiment supprimer les doublons? (oui/non): ")
    
    if confirmation.lower() in ['oui', 'yes', 'o', 'y']:
        clean_duplicate_schedules()
    else:
        print("❌ Opération annulée")
