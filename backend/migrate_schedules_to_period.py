#!/usr/bin/env python3
"""
Migration: Refonte de la table schedules
Au lieu d'avoir une ligne par jour, on a une ligne par période avec start_date et end_date
"""

import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL et SUPABASE_KEY doivent être définis")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def migrate_schedules():
    """
    Étape 1: Ajouter les colonnes start_date et end_date
    Étape 2: Grouper les schedules consécutifs par (worksite_id, collaborator_id, team_leader_id)
    Étape 3: Créer un nouveau schedule avec start_date et end_date
    Étape 4: Supprimer les anciens schedules
    """
    
    print("🔄 Migration de la table schedules vers le format période\n")
    print("="*70)
    
    # Étape 1: Vérifier si les colonnes existent déjà
    print("\n📋 Étape 1: Vérification de la structure...")
    
    # Récupérer tous les schedules existants
    print("\n📋 Étape 2: Récupération des schedules existants...")
    response = supabase.table("schedules").select("*").order("date").execute()
    
    if not response.data:
        print("ℹ️ Aucun schedule à migrer")
        return
    
    print(f"✅ {len(response.data)} schedules trouvés")
    
    # Grouper par (company_id, worksite_id, collaborator_id, team_leader_id, time, hours, shift)
    print("\n📋 Étape 3: Groupement des schedules consécutifs...")
    
    groups = {}
    for schedule in response.data:
        key = (
            schedule.get('company_id'),
            schedule.get('worksite_id'),
            schedule.get('collaborator_id'),
            schedule.get('team_leader_id'),
            schedule.get('time'),
            schedule.get('hours'),
            schedule.get('shift', 'day')
        )
        
        if key not in groups:
            groups[key] = []
        groups[key].append(schedule)
    
    print(f"✅ {len(groups)} groupe(s) identifié(s)")
    
    # Pour chaque groupe, créer un schedule avec période
    print("\n📋 Étape 4: Création des nouveaux schedules avec périodes...")
    
    new_schedules = []
    old_schedule_ids = []
    
    for key, schedules_list in groups.items():
        # Trier par date
        schedules_list.sort(key=lambda s: s.get('date'))
        
        # Identifier les périodes consécutives
        periods = []
        current_period = [schedules_list[0]]
        
        for i in range(1, len(schedules_list)):
            prev_schedule = schedules_list[i-1]
            curr_schedule = schedules_list[i]
            
            # Convertir les dates
            prev_date = datetime.fromisoformat(prev_schedule['date'].replace('Z', '+00:00')).date()
            curr_date = datetime.fromisoformat(curr_schedule['date'].replace('Z', '+00:00')).date()
            
            # Vérifier si consécutif (différence de 1 jour)
            if (curr_date - prev_date).days == 1:
                current_period.append(curr_schedule)
            else:
                # Nouvelle période
                periods.append(current_period)
                current_period = [curr_schedule]
        
        # Ajouter la dernière période
        periods.append(current_period)
        
        # Créer un schedule pour chaque période
        for period in periods:
            first = period[0]
            last = period[-1]
            
            # Récupérer les IDs à supprimer
            old_schedule_ids.extend([s['id'] for s in period])
            
            # Créer le nouveau schedule
            new_schedule = {
                "company_id": first.get('company_id'),
                "worksite_id": first.get('worksite_id'),
                "team_leader_id": first.get('team_leader_id'),
                "collaborator_id": first.get('collaborator_id'),
                "start_date": first.get('date'),
                "end_date": last.get('date'),
                "time": first.get('time'),
                "shift": first.get('shift', 'day'),
                "hours": first.get('hours', 7),
                "description": first.get('description', ''),
                "status": first.get('status', 'scheduled'),
                "created_by": first.get('created_by')
            }
            new_schedules.append(new_schedule)
    
    print(f"✅ {len(new_schedules)} nouveau(x) schedule(s) à créer")
    print(f"✅ {len(old_schedule_ids)} ancien(s) schedule(s) à supprimer")
    
    # Sauvegarder les anciens schedules avant suppression
    print("\n📋 Étape 5: Sauvegarde des anciens schedules...")
    backup_table_name = f"schedules_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"ℹ️ Les anciens schedules peuvent être retrouvés avec les IDs: {old_schedule_ids[:5]}...")
    
    # Créer les nouveaux schedules
    print("\n📋 Étape 6: Insertion des nouveaux schedules...")
    
    # Note: On doit d'abord ajouter les colonnes start_date et end_date via SQL
    # Car Supabase ne permet pas de modifier la structure via l'API Python
    
    print("\n⚠️ IMPORTANT:")
    print("Avant d'exécuter cette migration, vous devez exécuter ce SQL dans Supabase:")
    print("-" * 70)
    print("""
-- Ajouter les colonnes start_date et end_date
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Rendre la colonne 'date' nullable (elle sera supprimée après)
ALTER TABLE schedules 
ALTER COLUMN date DROP NOT NULL;
""")
    print("-" * 70)
    
    # Demander confirmation
    response = input("\n❓ Avez-vous exécuté le SQL ci-dessus dans Supabase? (oui/non): ")
    
    if response.lower() != 'oui':
        print("\n⏸️ Migration annulée. Exécutez d'abord le SQL puis relancez ce script.")
        return
    
    # Insérer les nouveaux schedules
    try:
        if new_schedules:
            result = supabase.table("schedules").insert(new_schedules).execute()
            print(f"✅ {len(new_schedules)} nouveau(x) schedule(s) créé(s)")
    except Exception as e:
        print(f"❌ Erreur lors de l'insertion: {str(e)}")
        return
    
    # Supprimer les anciens schedules
    print("\n📋 Étape 7: Suppression des anciens schedules...")
    
    response = input(f"\n❓ Confirmer la suppression de {len(old_schedule_ids)} ancien(s) schedule(s)? (oui/non): ")
    
    if response.lower() != 'oui':
        print("\n⏸️ Suppression annulée. Les nouveaux ET anciens schedules coexistent.")
        print("ℹ️ Vous pouvez supprimer manuellement les anciens avec ces IDs:")
        print(old_schedule_ids)
        return
    
    try:
        for schedule_id in old_schedule_ids:
            supabase.table("schedules").delete().eq("id", schedule_id).execute()
        print(f"✅ {len(old_schedule_ids)} ancien(s) schedule(s) supprimé(s)")
    except Exception as e:
        print(f"❌ Erreur lors de la suppression: {str(e)}")
        return
    
    print("\n" + "="*70)
    print("✅ Migration terminée avec succès!")
    print("\n📝 Prochaines étapes:")
    print("1. Vérifier les nouveaux schedules dans Supabase")
    print("2. Modifier le backend pour utiliser start_date/end_date")
    print("3. Modifier le frontend pour afficher les périodes")
    print("4. Optionnel: Supprimer la colonne 'date' via SQL:")
    print("   ALTER TABLE schedules DROP COLUMN date;")

if __name__ == "__main__":
    migrate_schedules()
