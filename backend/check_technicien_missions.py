#!/usr/bin/env python3
"""
Script pour vérifier les missions d'un technicien
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL et SUPABASE_KEY doivent être définis")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("🔍 Recherche du technicien 'Technicien test'...\n")

# Trouver le technicien
users_resp = supabase.table("users").select("*").ilike("first_name", "%technicien%").execute()

if not users_resp.data:
    print("❌ Aucun technicien trouvé")
    exit(1)

for user in users_resp.data:
    print(f"👤 Utilisateur trouvé:")
    print(f"   ID: {user['id']}")
    print(f"   Nom: {user.get('first_name')} {user.get('last_name')}")
    print(f"   Email: {user.get('email')}")
    print(f"   Role: {user.get('role')}")
    print(f"   Company ID: {user.get('company_id')}")
    
    # Chercher ses schedules
    print(f"\n📅 Schedules pour cet utilisateur:")
    
    schedules_resp = supabase.table("schedules").select("*").eq("collaborator_id", user['id']).execute()
    
    if not schedules_resp.data:
        print("   ❌ Aucun schedule trouvé")
    else:
        print(f"   ✅ {len(schedules_resp.data)} schedule(s) trouvé(s)")
        for schedule in schedules_resp.data:
            print(f"\n   📋 Schedule {schedule['id'][:8]}:")
            print(f"      - Company ID: {schedule.get('company_id')}")
            print(f"      - Worksite ID: {schedule.get('worksite_id')}")
            print(f"      - Team Leader ID: {schedule.get('team_leader_id')}")
            print(f"      - Collaborator ID: {schedule.get('collaborator_id')}")
            print(f"      - Start Date: {schedule.get('start_date')}")
            print(f"      - End Date: {schedule.get('end_date')}")
            print(f"      - Date (old): {schedule.get('date')}")
            print(f"      - Time: {schedule.get('time')}")
            print(f"      - Status: {schedule.get('status')}")
            
            # Vérifier le worksite
            if schedule.get('worksite_id'):
                worksite_resp = supabase.table("worksites").select("*").eq("id", schedule['worksite_id']).execute()
                if worksite_resp.data:
                    worksite = worksite_resp.data[0]
                    print(f"      - Worksite: {worksite.get('title')}")
    
    print("\n" + "="*70)
