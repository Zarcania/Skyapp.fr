"""
Script pour vérifier les schedules d'un chantier spécifique
Version mise à jour pour start_date/end_date
"""

import os
from datetime import datetime, timedelta
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

# Récupérer tous les schedules
response = supabase.table("schedules").select("*, worksites(title, start_date, end_date)").execute()

print(f"\n📊 Total schedules dans la base: {len(response.data)}")

# Grouper par chantier
by_worksite = {}
for schedule in response.data:
    worksite_id = schedule.get('worksite_id', 'sans-chantier')
    if worksite_id not in by_worksite:
        by_worksite[worksite_id] = []
    by_worksite[worksite_id].append(schedule)

print(f"\n🏗️ Nombre de chantiers: {len(by_worksite)}")

# Analyser chaque chantier
for worksite_id, schedules in by_worksite.items():
    worksite = schedules[0].get('worksites')
    worksite_name = worksite.get('title') if worksite else 'Sans nom'
    
    print(f"\n🏗️ Chantier: {worksite_name}")
    print(f"   ID: {worksite_id}")
    
    if worksite:
        worksite_start = worksite.get('start_date')
        worksite_end = worksite.get('end_date')
        
        if worksite_start and worksite_end:
            print(f"   Dates chantier: {worksite_start} → {worksite_end}")
            
            # Vérifier les schedules avec start_date/end_date
            print(f"   Nombre de schedules: {len(schedules)}")
            
            for schedule in schedules:
                schedule_start = schedule.get('start_date')
                schedule_end = schedule.get('end_date')
                
                if schedule_start and schedule_end:
                    print(f"   📅 Schedule: {schedule_start} → {schedule_end}")
                    
                    # Vérifier si les dates correspondent
                    if schedule_start == worksite_start and schedule_end == worksite_end:
                        print(f"   ✅ Les dates du schedule correspondent au chantier")
                    else:
                        print(f"   ⚠️ Les dates ne correspondent pas:")
                        print(f"      Chantier: {worksite_start} → {worksite_end}")
                        print(f"      Schedule: {schedule_start} → {schedule_end}")
                else:
                    print(f"   ⚠️ Schedule sans start_date/end_date")

print("\n" + "="*50)
