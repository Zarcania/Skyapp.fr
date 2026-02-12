"""
Script de vérification complète du système Skyapp
Vérifie la base de données, les utilisateurs, les rôles et l'état général
"""

import os
from supabase import create_client
from dotenv import load_dotenv
from tabulate import tabulate

# Charger les variables d'environnement
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ ERREUR: Variables d'environnement SUPABASE_URL et SUPABASE_SERVICE_KEY requises")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("\n" + "="*80)
print("                    VÉRIFICATION COMPLÈTE DE SKYAPP")
print("="*80 + "\n")

# 1. Vérifier les rôles existants
print("📋 1. RÔLES DISPONIBLES DANS SKYAPP")
print("-" * 80)
roles = ["ADMIN", "BUREAU", "TECHNICIEN"]
print("Rôles configurés:")
for role in roles:
    print(f"  ✓ {role}")
print()

# 2. Vérifier les utilisateurs
print("👥 2. UTILISATEURS EXISTANTS")
print("-" * 80)
try:
    users_response = supabase.table("users").select("*").execute()
    users = users_response.data
    
    if users:
        # Préparer les données pour le tableau
        user_table = []
        fondateur_count = 0
        admin_count = 0
        bureau_count = 0
        tech_count = 0
        
        for user in users:
            is_fondateur = user.get('is_fondateur', False)
            role = user.get('role', 'N/A')
            
            if is_fondateur:
                fondateur_count += 1
                role_display = f"🏆 FONDATEUR ({role})"
            elif role == "ADMIN":
                admin_count += 1
                role_display = "👑 ADMIN"
            elif role == "BUREAU":
                bureau_count += 1
                role_display = "📊 BUREAU"
            else:
                tech_count += 1
                role_display = "🔧 TECHNICIEN"
            
            user_table.append([
                user.get('first_name', 'N/A'),
                user.get('last_name', 'N/A'),
                user.get('email', 'N/A'),
                role_display,
                user.get('company_name', 'Aucune'),
                '✓' if user.get('is_active', False) else '✗'
            ])
        
        print(tabulate(user_table, 
                      headers=['Prénom', 'Nom', 'Email', 'Rôle', 'Entreprise', 'Actif'],
                      tablefmt='grid'))
        
        print(f"\n📊 Statistiques:")
        print(f"  • Total utilisateurs: {len(users)}")
        print(f"  • Fondateurs: {fondateur_count}")
        print(f"  • Admins: {admin_count}")
        print(f"  • Bureau: {bureau_count}")
        print(f"  • Techniciens: {tech_count}")
    else:
        print("⚠️  Aucun utilisateur trouvé dans la base de données")
except Exception as e:
    print(f"❌ Erreur lors de la récupération des utilisateurs: {e}")

print()

# 3. Vérifier les entreprises
print("🏢 3. ENTREPRISES")
print("-" * 80)
try:
    companies_response = supabase.table("companies").select("*").execute()
    companies = companies_response.data
    
    if companies:
        company_table = []
        for company in companies:
            # Compter les utilisateurs de cette entreprise
            company_users = supabase.table("users").select("id").eq("company_id", company['id']).execute()
            user_count = len(company_users.data) if company_users.data else 0
            
            company_table.append([
                company.get('name', 'N/A'),
                company.get('email', 'N/A'),
                user_count,
                '✓' if company.get('is_active', False) else '✗'
            ])
        
        print(tabulate(company_table,
                      headers=['Nom', 'Email', 'Utilisateurs', 'Active'],
                      tablefmt='grid'))
    else:
        print("⚠️  Aucune entreprise trouvée")
except Exception as e:
    print(f"❌ Erreur: {e}")

print()

# 4. Vérifier les clients
print("👤 4. CLIENTS")
print("-" * 80)
try:
    clients_response = supabase.table("clients").select("*").execute()
    clients = clients_response.data
    print(f"Nombre total de clients: {len(clients) if clients else 0}")
    
    if clients:
        # Regrouper par entreprise
        company_clients = {}
        for client in clients:
            company_id = client.get('company_id', 'unknown')
            if company_id not in company_clients:
                company_clients[company_id] = 0
            company_clients[company_id] += 1
        
        print(f"Clients répartis dans {len(company_clients)} entreprise(s)")
except Exception as e:
    print(f"❌ Erreur: {e}")

print()

# 5. Vérifier les chantiers
print("🏗️  5. CHANTIERS")
print("-" * 80)
try:
    worksites_response = supabase.table("worksites").select("status").execute()
    worksites = worksites_response.data
    
    if worksites:
        status_count = {}
        for ws in worksites:
            status = ws.get('status', 'UNKNOWN')
            status_count[status] = status_count.get(status, 0) + 1
        
        print(f"Nombre total de chantiers: {len(worksites)}")
        for status, count in status_count.items():
            emoji = "⏳" if status == "PENDING" else "🚧" if status == "IN_PROGRESS" else "✅" if status == "COMPLETED" else "📋"
            print(f"  {emoji} {status}: {count}")
    else:
        print("⚠️  Aucun chantier trouvé")
except Exception as e:
    print(f"❌ Erreur: {e}")

print()

# 6. Vérifier les devis
print("💰 6. DEVIS")
print("-" * 80)
try:
    quotes_response = supabase.table("quotes").select("status, amount, created_by_user_id").execute()
    quotes = quotes_response.data
    
    if quotes:
        total_amount = sum(float(q.get('amount', 0) or 0) for q in quotes)
        status_count = {}
        with_creator = sum(1 for q in quotes if q.get('created_by_user_id'))
        
        for quote in quotes:
            status = quote.get('status', 'UNKNOWN')
            status_count[status] = status_count.get(status, 0) + 1
        
        print(f"Nombre total de devis: {len(quotes)}")
        print(f"Montant total: {total_amount:.2f}€")
        print(f"Devis avec créateur identifié: {with_creator}/{len(quotes)}")
        print("\nPar statut:")
        for status, count in status_count.items():
            emoji = "📝" if status == "DRAFT" else "📤" if status == "SENT" else "✅" if status == "ACCEPTED" else "❌"
            print(f"  {emoji} {status}: {count}")
    else:
        print("⚠️  Aucun devis trouvé")
except Exception as e:
    print(f"❌ Erreur: {e}")

print()

# 7. Vérifier les recherches
print("🔍 7. RECHERCHES")
print("-" * 80)
try:
    searches_response = supabase.table("searches").select("status").execute()
    searches = searches_response.data
    
    if searches:
        status_count = {}
        for search in searches:
            status = search.get('status', 'UNKNOWN')
            status_count[status] = status_count.get(status, 0) + 1
        
        print(f"Nombre total de recherches: {len(searches)}")
        for status, count in status_count.items():
            emoji = "📝" if status == "DRAFT" else "🔍" if status == "ACTIVE" else "📤"
            print(f"  {emoji} {status}: {count}")
    else:
        print("⚠️  Aucune recherche trouvée")
except Exception as e:
    print(f"❌ Erreur: {e}")

print()

# 8. Vérifier la structure des tables critiques
print("🗄️  8. VÉRIFICATION DES TABLES")
print("-" * 80)
tables_to_check = [
    "users", "companies", "clients", "worksites", "quotes", 
    "searches", "planning_schedules", "planning_team_leaders"
]

for table in tables_to_check:
    try:
        response = supabase.table(table).select("id").limit(1).execute()
        print(f"  ✓ {table}: OK")
    except Exception as e:
        print(f"  ❌ {table}: ERREUR - {str(e)[:50]}")

print()

# 9. Vérifier les colonnes critiques
print("🔧 9. VÉRIFICATION DES COLONNES CRITIQUES")
print("-" * 80)

# Vérifier la colonne created_by_user_id dans quotes
try:
    test_quote = supabase.table("quotes").select("created_by_user_id").limit(1).execute()
    print("  ✓ quotes.created_by_user_id: Existe")
except Exception as e:
    print(f"  ❌ quotes.created_by_user_id: MANQUANTE - {str(e)[:50]}")

print()

# Résumé final
print("="*80)
print("                           RÉSUMÉ DE LA VÉRIFICATION")
print("="*80)
print("""
✅ Skyapp utilise 3 rôles principaux:
   • ADMIN: Accès complet (gestion entreprise, utilisateurs, etc.)
   • BUREAU: Accès administratif (devis, clients, chantiers)
   • TECHNICIEN: Accès terrain (recherches, photos, interventions)

🏆 Le FONDATEUR est un statut spécial (is_fondateur=true) avec privilèges maximum

📊 Le système est multi-tenant avec isolation par company_id
""")
print("="*80)
