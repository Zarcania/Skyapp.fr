#!/usr/bin/env python3
"""
Script pour forcer le rafraîchissement du profil utilisateur fondateur
"""
import os
from supabase import create_client

# Configuration Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://pcrjlfkbowjqqftwxaph.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcmpsZmtib3dqcXFmdHd4YXBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzMyMjExMiwiZXhwIjoyMDQ4ODk4MTEyfQ.v_k5xmkFKpZGYGXCGbfOVHTHVYQA66EKo8lFIwQnbm4")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("\n" + "="*50)
print("RAFRAÎCHISSEMENT PROFIL FONDATEUR")
print("="*50 + "\n")

# Récupérer l'utilisateur fondateur
email = "contact@skyapp.fr"
print(f"Recherche de l'utilisateur: {email}")

try:
    response = supabase.table("users").select("*").eq("email", email).execute()
    
    if not response.data:
        print(f"❌ Utilisateur {email} introuvable")
        exit(1)
    
    user = response.data[0]
    print(f"✅ Utilisateur trouvé:")
    print(f"   - ID: {user['id']}")
    print(f"   - Email: {user['email']}")
    print(f"   - Role: {user['role']}")
    print(f"   - is_fondateur: {user.get('is_fondateur', False)}")
    print(f"   - company_id: {user.get('company_id', 'NULL')}")
    
    if not user.get('is_fondateur'):
        print("\n⚠️  ATTENTION: is_fondateur=false")
        print("Exécutez d'abord: python backend/upgrade_to_fondateur.py")
        exit(1)
    
    print("\n✅ Le profil est correct dans la base de données")
    print("\n📝 INSTRUCTIONS:")
    print("1. Déconnectez-vous de l'application")
    print("2. Reconnectez-vous avec contact@skyapp.fr")
    print("3. Le nouveau token contiendra is_fondateur=true")
    print("\nOu bien, ouvrez la console du navigateur et exécutez:")
    print("   localStorage.removeItem('token')")
    print("   localStorage.removeItem('user')")
    print("   location.reload()")
    
except Exception as e:
    print(f"❌ Erreur: {str(e)}")
    exit(1)

print("\n" + "="*50 + "\n")
