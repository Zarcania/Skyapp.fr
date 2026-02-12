"""Vérifie que la migration materials a bien été appliquée"""
from dotenv import load_dotenv
import os
load_dotenv()
from supabase import create_client

sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

# Test nouvelles colonnes materials
print("=== TABLE materials ===")
r = sb.table('materials').select('id, name, serial_number, brand, model, condition, end_of_life, next_maintenance_date').limit(3).execute()
print(f"OK - {len(r.data)} materiels trouves")
for m in r.data:
    print(f"  - {m.get('name')}: condition={m.get('condition')}, brand={m.get('brand')}, end_of_life={m.get('end_of_life')}")

# Test table maintenance_logs
print()
print("=== TABLE material_maintenance_logs ===")
r2 = sb.table('material_maintenance_logs').select('*').limit(1).execute()
print(f"OK - Table existe, {len(r2.data)} logs")

print()
print("MIGRATION APPLIQUEE AVEC SUCCES !")
