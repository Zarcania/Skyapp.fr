import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path('backend/.env'))

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

# Récupérer la structure de la table worksites
print("Structure de la table 'worksites':")
print()

# Essayer de récupérer un worksite pour voir les colonnes
result = supabase.table('worksites').select('*').limit(1).execute()

if result.data:
    print("Colonnes disponibles:")
    for key in result.data[0].keys():
        print(f"  - {key}")
else:
    # Si pas de données, créer un test
    companies = supabase.table('companies').select('*').limit(1).execute()
    users = supabase.table('users').select('*').limit(1).execute()
    
    if companies.data and users.data:
        test_data = {
            "company_id": companies.data[0]['id'],
            "created_by": users.data[0]['id'],
            "title": "Test structure",
            "status": "PLANNED",
            "progress": 0
        }
        
        try:
            result = supabase.table('worksites').insert(test_data).execute()
            print("Colonnes disponibles:")
            for key in result.data[0].keys():
                print(f"  - {key}")
            # Supprimer le test
            supabase.table('worksites').delete().eq('id', result.data[0]['id']).execute()
        except Exception as e:
            print(f"Erreur: {str(e)}")
