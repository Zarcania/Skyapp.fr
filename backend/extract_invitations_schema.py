"""Script pour extraire le schéma de la table invitations depuis Supabase Cloud"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

# Requête pour obtenir la structure de la table depuis information_schema
query = """
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'invitations'
ORDER BY ordinal_position;
"""

try:
    result = sb.rpc('exec_sql', {'query': query}).execute()
    print("Structure de la table invitations:")
    print(result.data)
except Exception as e:
    print(f"Erreur lors de l'extraction: {e}")
    print("\nEssai avec une requête alternative...")
    
    # Alternative: essayer de décrire la table via PostgREST
    try:
        # Essayer d'insérer puis annuler pour voir la structure
        sample = sb.table('invitations').select('*').limit(1).execute()
        if sample.data:
            print("\nExemple de données (structure):")
            for key, value in sample.data[0].items():
                print(f"  {key}: {type(value).__name__}")
        else:
            print("Table vide, impossible d'extraire la structure automatiquement")
    except Exception as e2:
        print(f"Erreur alternative: {e2}")
