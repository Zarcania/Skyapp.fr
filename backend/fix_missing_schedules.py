#!/usr/bin/env python3
"""
Script pour créer les schedules manquants pour un chantier
"""

import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

# Charger les variables d'environnement
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL et SUPABASE_KEY doivent être définis")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fix_schedules():
    """Crée les schedules manquants pour tous les chantiers"""
    
    # 1. Récupérer tous les chantiers actifs
    print("📋 Récupération des chantiers...")
    worksites_resp = supabase.table("worksites").select("*").execute()
    
    if not worksites_resp.data:
        print("Aucun chantier trouvé")
        return
    
    print(f"✅ {len(worksites_resp.data)} chantier(s) trouvé(s)\n")
    
    for worksite in worksites_resp.data:
        worksite_id = worksite['id']
        name = worksite.get('name', 'Sans nom')
        start_date = worksite.get('start_date')
        end_date = worksite.get('end_date')
        company_id = worksite.get('company_id')
        
        if not start_date or not end_date:
            print(f"⏭️ Chantier '{name}': pas de dates définies")
            continue
        
        # Convertir en dates
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')).date()
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')).date()
        
        print(f"🏗️ Chantier: {name}")
        print(f"   Dates: {start_date} → {end_date}")
        
        # 2. Récupérer les schedules existants
        schedules_resp = supabase.table("schedules").select("*").eq("worksite_id", worksite_id).execute()
        
        if not schedules_resp.data:
            print(f"   ℹ️ Aucun schedule existant pour ce chantier\n")
            continue
        
        # Récupérer les dates existantes
        existing_dates = set()
        for schedule in schedules_resp.data:
            schedule_date = schedule.get('date')
            if schedule_date:
                if isinstance(schedule_date, str):
                    schedule_date = datetime.fromisoformat(schedule_date.replace('Z', '+00:00')).date()
                existing_dates.add(schedule_date)
        
        # 3. Identifier les dates manquantes
        expected_dates = set()
        current_date = start_date
        while current_date <= end_date:
            expected_dates.add(current_date)
            current_date += timedelta(days=1)
        
        missing_dates = sorted(expected_dates - existing_dates)
        
        if not missing_dates:
            print(f"   ✅ Tous les schedules sont présents ({len(existing_dates)} jours)\n")
            continue
        
        print(f"   ⚠️ {len(missing_dates)} date(s) manquante(s): {[str(d) for d in missing_dates]}")
        
        # 4. Utiliser le premier schedule comme template
        template = schedules_resp.data[0]
        
        # 5. Créer les schedules manquants
        new_schedules = []
        for missing_date in missing_dates:
            new_schedule = {
                "company_id": company_id,
                "worksite_id": worksite_id,
                "team_leader_id": template.get("team_leader_id"),
                "collaborator_id": template.get("collaborator_id"),
                "date": missing_date.isoformat(),
                "time": template.get("time", "08:00"),
                "shift": template.get("shift", "day"),
                "hours": template.get("hours", 7),
                "description": template.get("description", ""),
                "status": "scheduled",
                "created_by": template.get("created_by")
            }
            new_schedules.append(new_schedule)
        
        # Insérer les nouveaux schedules
        if new_schedules:
            try:
                insert_resp = supabase.table("schedules").insert(new_schedules).execute()
                print(f"   ✅ {len(new_schedules)} schedule(s) créé(s)")
            except Exception as e:
                print(f"   ❌ Erreur lors de la création: {str(e)}")
        
        print()

if __name__ == "__main__":
    print("🔧 Correction des schedules manquants\n")
    print("="*50)
    fix_schedules()
    print("="*50)
    print("✅ Terminé!")
