#!/usr/bin/env python3
"""
Vérification du statut fondateur
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 60)
print("VERIFICATION STATUT FONDATEUR")
print("=" * 60)

# Vérifier contact@skyapp.fr
email = "contact@skyapp.fr"
print(f"\nRecherche de l'utilisateur: {email}")

try:
    # Chercher dans users table
    response = supabase.table("users").select("*").eq("email", email).execute()
    
    if response.data:
        user = response.data[0]
        print(f"\n✓ Utilisateur trouvé:")
        print(f"  - ID: {user['id']}")
        print(f"  - Email: {user['email']}")
        print(f"  - Role: {user.get('role', 'N/A')}")
        print(f"  - is_fondateur: {user.get('is_fondateur', False)}")
        print(f"  - company_id: {user.get('company_id', 'NULL')}")
        
        if user.get('is_fondateur'):
            print(f"\n✅ FONDATEUR CONFIRMÉ")
        else:
            print(f"\n❌ PAS FONDATEUR - Correction nécessaire")
    else:
        print(f"\n❌ Utilisateur non trouvé dans la table users")
        
except Exception as e:
    print(f"\n❌ Erreur: {str(e)}")

print("\n" + "=" * 60)
