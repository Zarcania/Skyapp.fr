#!/usr/bin/env python3
"""
Vérifier que la colonne is_fondateur existe dans la table users
"""
import os
from supabase import create_client

# Configuration Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://pcrjlfkbowjqqftwxaph.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcmpsZmtib3dqcXFmdHd4YXBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzMyMjExMiwiZXhwIjoyMDQ4ODk4MTEyfQ.v_k5xmkFKpZGYGXCGbfOVHTHVYQA66EKo8lFIwQnbm4")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("\n" + "="*60)
print("VÉRIFICATION COLONNE is_fondateur")
print("="*60 + "\n")

try:
    # Récupérer l'utilisateur contact@skyapp.fr
    email = "contact@skyapp.fr"
    print(f"🔍 Récupération de {email}...")
    
    response = supabase.table("users").select("*").eq("email", email).execute()
    
    if not response.data:
        print(f"❌ Utilisateur {email} introuvable !")
        exit(1)
    
    user = response.data[0]
    print(f"✅ Utilisateur trouvé\n")
    
    print("📋 Colonnes retournées par Supabase:")
    for key in sorted(user.keys()):
        value = user[key]
        if key == 'is_fondateur':
            print(f"   ✅ {key}: {value} <-- COLONNE TROUVÉE")
        else:
            print(f"      {key}: {value}")
    
    print()
    if 'is_fondateur' not in user:
        print("❌ PROBLÈME: La colonne 'is_fondateur' n'existe PAS dans la table users !")
        print("\n📝 SOLUTION:")
        print("   Exécute cette migration dans Supabase SQL Editor:")
        print("   ALTER TABLE users ADD COLUMN IF NOT EXISTS is_fondateur boolean DEFAULT false;")
        print("   UPDATE users SET is_fondateur = true WHERE email = 'contact@skyapp.fr';")
    else:
        if user['is_fondateur']:
            print("✅ TOUT EST BON: is_fondateur = true")
        else:
            print("⚠️  PROBLÈME: is_fondateur = false")
            print("\n📝 SOLUTION:")
            print("   UPDATE users SET is_fondateur = true WHERE email = 'contact@skyapp.fr';")
    
except Exception as e:
    print(f"❌ Erreur: {str(e)}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n" + "="*60 + "\n")
