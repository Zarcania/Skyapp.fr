"""
Script simplifié pour ajouter des données de test dans Supabase
S'adapte aux colonnes réelles des tables
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import sys
from datetime import datetime, timedelta
import uuid

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERREUR: Variables manquantes")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("🎲 GÉNÉRATION DONNÉES DE TEST\n")

try:
    # 1. COMPANY
    print("📦 Entreprise...")
    existing = supabase.table("companies").select("*").eq("name", "SkyApp BTP Test").execute()
    if existing.data:
        company_id = existing.data[0]["id"]
        print(f"  ✅ Existante: {company_id}")
    else:
        result = supabase.table("companies").insert({"name": "SkyApp BTP Test"}).execute()
        company_id = result.data[0]["id"]
        print(f"  ✅ Créée: {company_id}")
    
    # 2. USERS - Récupérer existants
    print("\n👥 Utilisateurs...")
    users = supabase.table("users").select("*").eq("company_id", company_id).limit(1).execute()
    user_id = users.data[0]["id"] if users.data else str(uuid.uuid4())
    print(f"  ✅ Utilisé: {user_id[:8]}...")
    
    # 3. CLIENTS - Simple
    print("\n🏢 Clients...")
    clients = [
        {"company_id": company_id, "nom": "Mairie de Paris", "email": "travaux@paris.fr"},
        {"company_id": company_id, "nom": "Entreprise Dupont", "email": "contact@dupont.fr"},
        {"company_id": company_id, "nom": "Copropriété Jardins", "email": "syndic@jardins.fr"}
    ]
    client_ids = []
    for c in clients:
        r = supabase.table("clients").insert(c).execute()
        client_ids.append(r.data[0]["id"])
        print(f"  ✅ {c['nom']}")
    
    # 4. SEARCHES
    print("\n🔍 Recherches...")
    searches = [
        {
            "user_id": user_id,
            "company_id": company_id,
            "location": "Paris",
            "status": "DRAFT"
        },
        {
            "user_id": user_id,
            "company_id": company_id,
            "location": "Lyon",
            "status": "DRAFT"
        }
    ]
    search_ids = []
    for idx, s in enumerate(searches):
        r = supabase.table("searches").insert(s).execute()
        search_ids.append(r.data[0]["id"])
        print(f"  ✅ Recherche {idx+1}")
    
    # 5. WORKSITES
    print("\n🏗️  Chantiers...")
    worksites = [
        {
            "company_id": company_id,
            "name": "Rénovation Tour Eiffel",
            "client_id": client_ids[0],
            "status": "IN_PROGRESS"
        },
        {
            "company_id": company_id,
            "name": "Extension Bureaux",
            "client_id": client_ids[1],
            "status": "PLANNED"
        }
    ]
    for w in worksites:
        supabase.table("worksites").insert(w).execute()
        print(f"  ✅ {w['name']}")
    
    # 6. QUOTES
    print("\n📝 Devis...")
    quotes = [
        {
            "company_id": company_id,
            "client_id": client_ids[0],
            "quote_number": f"DEV-2025-001",
            "total_ht": 45000.00,
            "total_tva": 9000.00,
            "total_ttc": 54000.00,
            "status": "SENT",
            "items": [{"designation": "Travaux", "quantity": 1, "unit_price": 45000}]
        }
    ]
    for q in quotes:
        supabase.table("quotes").insert(q).execute()
        print(f"  ✅ {q['quote_number']}")
    
    # 7. PROJECTS
    print("\n📊 Projets...")
    projects = [
        {
            "company_id": company_id,
            "search_id": search_ids[0],
            "client_id": client_ids[0],
            "name": "Projet Tour Eiffel",
            "status": "IN_PROGRESS"
        }
    ]
    project_ids = []
    for p in projects:
        r = supabase.table("projects").insert(p).execute()
        project_ids.append(r.data[0]["id"])
        print(f"  ✅ {p['name']}")
    
    # 8. PROJECT_NOTES
    print("\n📋 Notes...")
    notes = [
        {
            "project_id": project_ids[0],
            "user_id": user_id,
            "content": "Réunion de lancement effectuée"
        }
    ]
    for n in notes:
        supabase.table("project_notes").insert(n).execute()
        print(f"  ✅ Note créée")
    
    # 9. SCHEDULES
    print("\n📅 Rendez-vous...")
    schedules = [
        {
            "company_id": company_id,
            "collaborator_id": user_id,
            "title": "Visite chantier",
            "start_datetime": (datetime.now() + timedelta(days=2)).isoformat(),
            "end_datetime": (datetime.now() + timedelta(days=2, hours=2)).isoformat(),
            "status": "SCHEDULED"
        }
    ]
    for s in schedules:
        supabase.table("schedules").insert(s).execute()
        print(f"  ✅ {s['title']}")
    
    print("\n" + "="*60)
    print("✅ DONNÉES DE TEST CRÉÉES AVEC SUCCÈS!")
    print("="*60)
    print(f"\n🔑 Entreprise: {company_id}")
    print(f"📊 {len(client_ids)} clients")
    print(f"🔍 {len(search_ids)} recherches")
    print(f"🏗️  {len(worksites)} chantiers")
    print(f"📝 {len(quotes)} devis")
    print(f"📊 {len(project_ids)} projets")
    print("\n✨ Testez l'application maintenant!\n")

except Exception as e:
    print(f"\n❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
