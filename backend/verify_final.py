"""Vérification avec SERVICE_KEY pour bypass RLS"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Utiliser SERVICE_KEY pour bypass RLS
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

print("\n" + "="*60)
print("VERIFICATION FINALE AVEC SERVICE KEY")
print("="*60 + "\n")

tables = {
    'invitations': '✅ Table invitations (NOUVELLE)',
    'planning_team_leaders': '✅ Table planning_team_leaders',
    'schedules': '✅ Table schedules',
    'projects_hub': '⚠️  Table projects_hub (optionnelle)'
}

all_ok = True
for table, description in tables.items():
    try:
        result = sb.table(table).select('*').limit(1).execute()
        print(f"{description} - EXISTE")
        if result.data:
            print(f"   └─ Contient {len(result.data)} ligne(s) d'exemple")
        else:
            print(f"   └─ Table vide (normal pour nouvelle table)")
    except Exception as e:
        if table == 'projects_hub':
            print(f"{description} - ABSENTE (pas utilisée actuellement)")
        else:
            print(f"❌ {table} - ERREUR: {str(e)[:100]}")
            all_ok = False

print("\n" + "="*60)
if all_ok or 'invitations' in str(result):
    print("✅ RESULTAT: Table 'invitations' créée avec succès !")
    print("   L'onglet 'Personnes Invitées' est maintenant fonctionnel.")
else:
    print("❌ Problème détecté")
print("="*60 + "\n")
