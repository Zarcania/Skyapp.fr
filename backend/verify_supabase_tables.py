"""
Script de vérification des tables et colonnes Supabase
Vérifie que toutes les tables et colonnes nécessaires existent
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import sys

# Charger les variables d'environnement
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERREUR: Variables SUPABASE_URL ou SUPABASE_SERVICE_KEY manquantes dans .env")
    sys.exit(1)

# Créer le client Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Tables attendues avec leurs colonnes critiques
EXPECTED_TABLES = {
    "companies": ["id", "name", "created_at"],
    "users": ["id", "email", "role", "company_id"],
    "searches": ["id", "user_id", "company_id", "status", "photos", "latitude", "longitude"],
    "clients": ["id", "company_id", "name"],
    "worksites": ["id", "company_id", "name", "client_id"],
    "quotes": ["id", "company_id", "client_id", "quote_number", "items"],
    "quote_templates": ["id", "company_id", "name", "items"],
    "projects": ["id", "company_id", "search_id", "client_id"],
    "project_notes": ["id", "project_id", "user_id", "content"],
    "invitations": ["id", "company_id", "email", "role", "token", "status", "expires_at"],
    "planning_team_leaders": ["id", "company_id", "user_id", "name"],
    "schedules": ["id", "company_id", "collaborator_id", "title", "location"],
    "invoices_electronic": ["id", "company_id", "invoice_number", "status_pdp", "direction", "customer_name"],
    "invoice_lines": ["id", "invoice_id", "designation", "quantity"],
    "materials": ["id", "company_id", "description"],
    "company_settings": ["id", "company_id"],
    "e_reporting": ["id", "company_id", "type_operation"],
    "reports": ["id", "company_id", "title"],
    "invoices_logs": ["id", "invoice_id", "action"],
    # NOUVELLES TABLES (ajoutées après analyse backend)
    "invoices_received": ["id", "company_id", "supplier_name", "invoice_number", "amount_ttc"],
    "e_reporting_declarations": ["id", "company_id", "declaration_type", "period_start", "period_end"],
    "archives_legal": ["id", "company_id", "document_type", "title", "file_url"],
}

EXPECTED_VIEWS = [
    "clients_with_company",
    "quotes_with_client_name",
]

def check_table_exists(table_name: str) -> bool:
    """Vérifie si une table existe"""
    try:
        # Essayer de faire un select avec limit 0 pour tester l'existence
        supabase.table(table_name).select("*").limit(0).execute()
        return True
    except Exception as e:
        return False

def check_table_columns(table_name: str, expected_columns: list) -> tuple:
    """Vérifie les colonnes d'une table"""
    try:
        # Récupérer une ligne pour voir les colonnes
        response = supabase.table(table_name).select("*").limit(1).execute()
        
        if response.data and len(response.data) > 0:
            existing_columns = list(response.data[0].keys())
        else:
            # Si pas de données, essayer avec un insert/select
            existing_columns = []
        
        missing_columns = [col for col in expected_columns if col not in existing_columns]
        return True, existing_columns, missing_columns
    except Exception as e:
        return False, [], expected_columns

def main():
    print("=" * 80)
    print("🔍 VÉRIFICATION DES TABLES SUPABASE")
    print("=" * 80)
    print()
    
    all_ok = True
    tables_ok = []
    tables_missing = []
    tables_incomplete = []
    
    # Vérifier chaque table
    for table_name, expected_cols in EXPECTED_TABLES.items():
        print(f"📋 Table: {table_name}")
        
        if check_table_exists(table_name):
            print(f"  ✅ Table existe")
            
            success, existing_cols, missing_cols = check_table_columns(table_name, expected_cols)
            
            if success and len(existing_cols) > 0:
                print(f"  ✅ Colonnes trouvées: {len(existing_cols)}")
                if missing_cols:
                    print(f"  ⚠️  Colonnes manquantes: {', '.join(missing_cols)}")
                    tables_incomplete.append((table_name, missing_cols))
                    all_ok = False
                else:
                    print(f"  ✅ Toutes les colonnes requises présentes")
                    tables_ok.append(table_name)
            else:
                print(f"  ⚠️  Impossible de vérifier les colonnes (table vide?)")
                print(f"  ℹ️  Colonnes attendues: {', '.join(expected_cols)}")
                tables_incomplete.append((table_name, expected_cols))
        else:
            print(f"  ❌ Table MANQUANTE")
            tables_missing.append(table_name)
            all_ok = False
        
        print()
    
    # Vérifier les vues
    print("=" * 80)
    print("🔍 VÉRIFICATION DES VUES")
    print("=" * 80)
    print()
    
    for view_name in EXPECTED_VIEWS:
        print(f"👁️  Vue: {view_name}")
        if check_table_exists(view_name):
            print(f"  ✅ Vue existe")
        else:
            print(f"  ⚠️  Vue manquante (non critique)")
        print()
    
    # Résumé
    print("=" * 80)
    print("📊 RÉSUMÉ")
    print("=" * 80)
    print()
    print(f"✅ Tables OK: {len(tables_ok)}/{len(EXPECTED_TABLES)}")
    if tables_ok:
        for t in tables_ok:
            print(f"   • {t}")
    print()
    
    if tables_missing:
        print(f"❌ Tables manquantes: {len(tables_missing)}")
        for t in tables_missing:
            print(f"   • {t}")
        print()
    
    if tables_incomplete:
        print(f"⚠️  Tables incomplètes: {len(tables_incomplete)}")
        for t, missing in tables_incomplete:
            print(f"   • {t}: manque {', '.join(missing)}")
        print()
    
    # Instructions
    if not all_ok:
        print("=" * 80)
        print("🔧 ACTION REQUISE")
        print("=" * 80)
        print()
        if tables_missing:
            print("📄 Tables manquantes détectées!")
            print("   Exécutez: TABLES_SUPABASE_MANQUANTES.sql dans Supabase SQL Editor")
            print()
        if tables_incomplete:
            print("📝 Colonnes manquantes détectées!")
            print("   Exécutez: MIGRATION_CORRECTIONS_COLONNES.sql dans Supabase SQL Editor")
            print()
    else:
        print("🎉 Toutes les tables et colonnes sont présentes!")
        print()
    
    return 0 if all_ok else 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n⚠️  Vérification interrompue")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
