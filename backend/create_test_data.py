"""
Script pour ajouter des données de test dans Supabase
Génère des données fictives pour toutes les tables
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import sys
from datetime import datetime, timedelta
import uuid
import random

# Charger les variables d'environnement
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERREUR: Variables SUPABASE_URL ou SUPABASE_SERVICE_KEY manquantes")
    sys.exit(1)

# Créer le client Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 80)
print("🎲 GÉNÉRATION DE DONNÉES DE TEST POUR SUPABASE")
print("=" * 80)
print()

# IDs à réutiliser
company_id = None
user_ids = []
client_ids = []
worksite_ids = []
search_ids = []
project_ids = []

try:
    # ========================================================================
    # 1. COMPANY - Créer une entreprise de test
    # ========================================================================
    print("📦 Création de l'entreprise de test...")
    company_data = {
        "name": "SkyApp BTP Test"
    }
    
    # Vérifier si l'entreprise existe déjà
    existing = supabase.table("companies").select("*").eq("name", "SkyApp BTP Test").execute()
    if existing.data and len(existing.data) > 0:
        company_id = existing.data[0]["id"]
        print(f"  ✅ Entreprise existante trouvée: {company_id}")
    else:
        result = supabase.table("companies").insert(company_data).execute()
        company_id = result.data[0]["id"]
        print(f"  ✅ Entreprise créée: {company_id}")
    
    # ========================================================================
    # 2. USERS - Récupérer les utilisateurs existants
    # ========================================================================
    print("\n👥 Récupération des utilisateurs existants...")
    
    # Récupérer les utilisateurs de cette entreprise
    existing_users = supabase.table("users").select("*").eq("company_id", company_id).execute()
    
    if existing_users.data and len(existing_users.data) > 0:
        for user in existing_users.data:
            user_ids.append(user["id"])
            print(f"  ✅ Utilisateur trouvé: {user.get('email', 'N/A')} ({user.get('role', 'N/A')})")
    else:
        print("  ⚠️  Aucun utilisateur trouvé. Créez-vous d'abord un compte via l'interface.")
        print("  ℹ️  Les autres données seront créées mais sans utilisateurs liés.")
        # Créer un utilisateur fictif pour les besoins du script
        user_ids = [str(uuid.uuid4())] * 4  # IDs fictifs
    
    # ========================================================================
    # 3. CLIENTS - Créer des clients de test
    # ========================================================================
    print("\n🏢 Création des clients de test...")
    clients_data = [
        {
            "company_id": company_id,
            "name": "Mairie de Paris",
            "email": "travaux@paris.fr",
            "phone": "+33 1 42 76 40 40",
            "address": "Place de l'Hôtel de Ville, 75004 Paris"
        },
        {
            "company_id": company_id,
            "name": "Entreprise Dupont SA",
            "email": "contact@dupont-sa.fr",
            "phone": "+33 1 55 44 33 22",
            "address": "45 Avenue des Champs-Élysées, 75008 Paris"
        },
        {
            "company_id": company_id,
            "name": "Copropriété Les Jardins",
            "email": "syndic@jardins.fr",
            "phone": "+33 1 99 88 77 66",
            "address": "12 Rue des Roses, 92100 Boulogne-Billancourt"
        }
    ]
    
    for client in clients_data:
        result = supabase.table("clients").insert(client).execute()
        client_ids.append(result.data[0]["id"])
        print(f"  ✅ Client créé: {client['name']}")
    
    # ========================================================================
    # 4. SEARCHES - Créer des recherches terrain de test
    # ========================================================================
    print("\n🔍 Création des recherches terrain de test...")
    searches_data = [
        {
            "user_id": user_ids[2],  # Technicien 1
            "company_id": company_id,
            "client_name": "Mairie de Paris",
            "address": "Tour Eiffel, Champ de Mars, 75007 Paris",
            "status": "COMPLETED",
            "latitude": 48.8584,
            "longitude": 2.2945,
            "photos": [],
            "notes": "Inspection de la structure métallique - RAS"
        },
        {
            "user_id": user_ids[3],  # Technicien 2
            "company_id": company_id,
            "client_name": "Entreprise Dupont SA",
            "address": "Arc de Triomphe, Place Charles de Gaulle, 75008 Paris",
            "status": "IN_PROGRESS",
            "latitude": 48.8738,
            "longitude": 2.2950,
            "photos": [],
            "notes": "Évaluation des travaux de restauration"
        },
        {
            "user_id": user_ids[2],  # Technicien 1
            "company_id": company_id,
            "client_name": "Copropriété Les Jardins",
            "address": "Cathédrale Notre-Dame, 6 Parvis Notre-Dame, 75004 Paris",
            "status": "DRAFT",
            "latitude": 48.8530,
            "longitude": 2.3499,
            "photos": [],
            "notes": "Recherche préliminaire"
        }
    ]
    
    for search in searches_data:
        result = supabase.table("searches").insert(search).execute()
        search_ids.append(result.data[0]["id"])
        print(f"  ✅ Recherche créée: {search['address']} ({search['status']})")
    
    # ========================================================================
    # 5. WORKSITES - Créer des chantiers de test
    # ========================================================================
    print("\n🏗️  Création des chantiers de test...")
    worksites_data = [
        {
            "company_id": company_id,
            "name": "Rénovation Tour Eiffel",
            "address": "Tour Eiffel, Champ de Mars, 75007 Paris",
            "client_id": client_ids[0],
            "status": "IN_PROGRESS",
            "start_date": (datetime.now() - timedelta(days=30)).date().isoformat(),
            "end_date": (datetime.now() + timedelta(days=60)).date().isoformat(),
            "description": "Travaux de rénovation de la structure métallique"
        },
        {
            "company_id": company_id,
            "name": "Extension Bureaux Dupont",
            "address": "45 Avenue des Champs-Élysées, 75008 Paris",
            "client_id": client_ids[1],
            "status": "PLANNED",
            "start_date": (datetime.now() + timedelta(days=15)).date().isoformat(),
            "end_date": (datetime.now() + timedelta(days=180)).date().isoformat(),
            "description": "Extension de 200m² de bureaux"
        },
        {
            "company_id": company_id,
            "name": "Réfection Toiture Copropriété",
            "address": "12 Rue des Roses, 92100 Boulogne-Billancourt",
            "client_id": client_ids[2],
            "status": "COMPLETED",
            "start_date": (datetime.now() - timedelta(days=90)).date().isoformat(),
            "end_date": (datetime.now() - timedelta(days=10)).date().isoformat(),
            "description": "Réfection complète de la toiture"
        }
    ]
    
    for worksite in worksites_data:
        result = supabase.table("worksites").insert(worksite).execute()
        worksite_ids.append(result.data[0]["id"])
        print(f"  ✅ Chantier créé: {worksite['name']} ({worksite['status']})")
    
    # ========================================================================
    # 6. QUOTES - Créer des devis de test
    # ========================================================================
    print("\n📝 Création des devis de test...")
    quotes_data = [
        {
            "company_id": company_id,
            "client_id": client_ids[0],
            "quote_number": f"DEV-{datetime.now().year}-001",
            "total_ht": 45000.00,
            "total_tva": 9000.00,
            "total_ttc": 54000.00,
            "status": "SENT",
            "valid_until": (datetime.now() + timedelta(days=30)).date().isoformat(),
            "items": [
                {
                    "designation": "Main d'œuvre spécialisée",
                    "quantity": 200,
                    "unit": "heures",
                    "unit_price": 85.00,
                    "total": 17000.00
                },
                {
                    "designation": "Matériaux (acier)",
                    "quantity": 5,
                    "unit": "tonnes",
                    "unit_price": 5600.00,
                    "total": 28000.00
                }
            ]
        },
        {
            "company_id": company_id,
            "client_id": client_ids[1],
            "quote_number": f"DEV-{datetime.now().year}-002",
            "total_ht": 125000.00,
            "total_tva": 25000.00,
            "total_ttc": 150000.00,
            "status": "ACCEPTED",
            "valid_until": (datetime.now() + timedelta(days=45)).date().isoformat(),
            "items": [
                {
                    "designation": "Gros œuvre extension",
                    "quantity": 200,
                    "unit": "m²",
                    "unit_price": 450.00,
                    "total": 90000.00
                },
                {
                    "designation": "Second œuvre",
                    "quantity": 200,
                    "unit": "m²",
                    "unit_price": 175.00,
                    "total": 35000.00
                }
            ]
        }
    ]
    
    for quote in quotes_data:
        result = supabase.table("quotes").insert(quote).execute()
        print(f"  ✅ Devis créé: {quote['quote_number']} ({quote['status']}) - {quote['total_ttc']}€")
    
    # ========================================================================
    # 7. PROJECTS - Créer des projets de test
    # ========================================================================
    print("\n📊 Création des projets de test...")
    projects_data = [
        {
            "company_id": company_id,
            "search_id": search_ids[0],
            "client_id": client_ids[0],
            "name": "Projet Tour Eiffel",
            "status": "IN_PROGRESS",
            "start_date": (datetime.now() - timedelta(days=30)).date().isoformat(),
            "end_date": (datetime.now() + timedelta(days=60)).date().isoformat(),
            "budget": 54000.00,
            "description": "Rénovation structure métallique Tour Eiffel"
        },
        {
            "company_id": company_id,
            "search_id": search_ids[1],
            "client_id": client_ids[1],
            "name": "Projet Extension Dupont",
            "status": "PLANNING",
            "start_date": (datetime.now() + timedelta(days=15)).date().isoformat(),
            "end_date": (datetime.now() + timedelta(days=180)).date().isoformat(),
            "budget": 150000.00,
            "description": "Extension bureaux 200m²"
        }
    ]
    
    for project in projects_data:
        result = supabase.table("projects").insert(project).execute()
        project_ids.append(result.data[0]["id"])
        print(f"  ✅ Projet créé: {project['name']} ({project['status']})")
    
    # ========================================================================
    # 8. PROJECT_NOTES - Créer des notes de projet
    # ========================================================================
    print("\n📋 Création des notes de projet...")
    notes_data = [
        {
            "project_id": project_ids[0],
            "user_id": user_ids[2],
            "content": "Réunion de lancement effectuée avec le client. Validation du planning."
        },
        {
            "project_id": project_ids[0],
            "user_id": user_ids[1],
            "content": "Commande matériaux validée. Livraison prévue semaine prochaine."
        },
        {
            "project_id": project_ids[1],
            "user_id": user_ids[0],
            "content": "En attente de la signature du devis par le client."
        }
    ]
    
    for note in notes_data:
        result = supabase.table("project_notes").insert(note).execute()
        print(f"  ✅ Note créée pour projet {note['project_id'][:8]}...")
    
    # ========================================================================
    # 9. SCHEDULES - Créer des rendez-vous
    # ========================================================================
    print("\n📅 Création des rendez-vous...")
    schedules_data = [
        {
            "company_id": company_id,
            "collaborator_id": user_ids[2],
            "title": "Visite chantier Tour Eiffel",
            "description": "Inspection mensuelle + relevé des avancées",
            "start_datetime": (datetime.now() + timedelta(days=2, hours=9)).isoformat(),
            "end_datetime": (datetime.now() + timedelta(days=2, hours=12)).isoformat(),
            "location": "Tour Eiffel, Champ de Mars, 75007 Paris",
            "status": "SCHEDULED"
        },
        {
            "company_id": company_id,
            "collaborator_id": user_ids[3],
            "title": "Réunion client Dupont",
            "description": "Présentation devis extension bureaux",
            "start_datetime": (datetime.now() + timedelta(days=5, hours=14)).isoformat(),
            "end_datetime": (datetime.now() + timedelta(days=5, hours=16)).isoformat(),
            "location": "45 Avenue des Champs-Élysées, 75008 Paris",
            "status": "SCHEDULED"
        }
    ]
    
    for schedule in schedules_data:
        result = supabase.table("schedules").insert(schedule).execute()
        print(f"  ✅ Rendez-vous créé: {schedule['title']}")
    
    # ========================================================================
    # 10. INVITATIONS - Créer des invitations
    # ========================================================================
    print("\n✉️  Création des invitations...")
    invitations_data = [
        {
            "company_id": company_id,
            "email": "nouveau.technicien@skyapp-test.fr",
            "role": "TECHNICIEN",
            "token": str(uuid.uuid4()),
            "status": "pending",
            "invited_by": user_ids[0],
            "expires_at": (datetime.now() + timedelta(days=7)).isoformat()
        }
    ]
    
    for invitation in invitations_data:
        result = supabase.table("invitations").insert(invitation).execute()
        print(f"  ✅ Invitation créée: {invitation['email']} ({invitation['role']})")
    
    # ========================================================================
    # 11. PLANNING_TEAM_LEADERS - Créer des chefs d'équipe
    # ========================================================================
    print("\n👷 Création des chefs d'équipe...")
    team_leaders_data = [
        {
            "company_id": company_id,
            "user_id": user_ids[2],
            "name": "Jean Technicien"
        }
    ]
    
    for leader in team_leaders_data:
        result = supabase.table("planning_team_leaders").insert(leader).execute()
        print(f"  ✅ Chef d'équipe créé: {leader['name']}")
    
    # ========================================================================
    # 12. MATERIALS - Créer des matériaux
    # ========================================================================
    print("\n🔨 Création des matériaux...")
    materials_data = [
        {
            "company_id": company_id,
            "description": "Poutrelles IPN 200",
            "category": "STRUCTURE",
            "st_code": "IPN-200",
            "location": "Dépôt Paris Est",
            "status": "ACTIVE"
        },
        {
            "company_id": company_id,
            "description": "Béton C25/30",
            "category": "BÉTON",
            "st_code": "BET-C25",
            "location": "Centrale béton",
            "status": "ACTIVE"
        }
    ]
    
    for material in materials_data:
        result = supabase.table("materials").insert(material).execute()
        print(f"  ✅ Matériau créé: {material['description']}")
    
    # ========================================================================
    # 13. COMPANY_SETTINGS - Créer paramètres entreprise
    # ========================================================================
    print("\n⚙️  Création des paramètres entreprise...")
    settings_data = {
        "company_id": company_id
    }
    
    result = supabase.table("company_settings").insert(settings_data).execute()
    print(f"  ✅ Paramètres créés pour l'entreprise")
    
    # ========================================================================
    # RÉSUMÉ
    # ========================================================================
    print("\n" + "=" * 80)
    print("✅ GÉNÉRATION TERMINÉE AVEC SUCCÈS!")
    print("=" * 80)
    print(f"\n📊 Données créées:")
    print(f"   • 1 entreprise")
    print(f"   • {len(user_ids)} utilisateurs")
    print(f"   • {len(client_ids)} clients")
    print(f"   • {len(search_ids)} recherches terrain")
    print(f"   • {len(worksite_ids)} chantiers")
    print(f"   • 2 devis")
    print(f"   • {len(project_ids)} projets")
    print(f"   • 3 notes de projet")
    print(f"   • 2 rendez-vous")
    print(f"   • 1 invitation")
    print(f"   • 1 chef d'équipe")
    print(f"   • 2 matériaux")
    print(f"   • 1 configuration entreprise")
    
    print(f"\n🔑 Identifiants de test:")
    print(f"   • Entreprise ID: {company_id}")
    print(f"   • Admin: admin@skyapp-test.fr")
    print(f"   • Bureau: bureau@skyapp-test.fr")
    print(f"   • Technicien 1: technicien1@skyapp-test.fr")
    print(f"   • Technicien 2: technicien2@skyapp-test.fr")
    
    print("\n✨ Vous pouvez maintenant tester l'application avec ces données!")
    print()

except Exception as e:
    print(f"\n❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
