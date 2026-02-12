#!/usr/bin/env python3
"""
Simuler exactement ce que fait l'API /technicians/{id}/missions
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ID du technicien test
technician_id = "f874b18b-be46-4f91-a880-11d016347660"
company_id = "ce51736d-a8e3-49d9-91f1-99042719690a"

print("🔍 Simulation de l'API /technicians/{id}/missions")
print("="*70)

# Exactement ce que fait le backend
q = supabase.table("schedules").select("""
    *,
    worksites:worksite_id(id, title, client_id, status, address, start_date, end_date),
    planning_team_leaders:team_leader_id(id, first_name, last_name, user_id)
""").eq("company_id", company_id).eq("collaborator_id", technician_id)

print(f"\n📋 Query:")
print(f"   - company_id: {company_id}")
print(f"   - collaborator_id: {technician_id}")

res = q.order("start_date").order("time").execute()

print(f"\n✅ Résultats: {len(res.data)} mission(s)")

for schedule in res.data:
    print(f"\n📌 Schedule {schedule['id'][:8]}:")
    print(f"   - Start Date: {schedule.get('start_date')}")
    print(f"   - End Date: {schedule.get('end_date')}")
    print(f"   - Time: {schedule.get('time')}")
    print(f"   - Status: {schedule.get('status')}")
    
    worksite = schedule.get('worksites')
    if worksite:
        print(f"   - Worksite: {worksite.get('title')}")
        print(f"   - Worksite Dates: {worksite.get('start_date')} → {worksite.get('end_date')}")
    
    team_leader = schedule.get('planning_team_leaders')
    if team_leader:
        print(f"   - Team Leader: {team_leader.get('first_name')} {team_leader.get('last_name')}")

print("\n" + "="*70)
print("\n✅ Si vous voyez la mission ci-dessus, l'API backend fonctionne.")
print("⚠️ Si vous ne la voyez pas, c'est un problème de données en base.")
