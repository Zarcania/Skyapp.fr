"""
Script pour créer un compte FONDATEUR
Email: contact@skyapp.fr
"""

import os
from supabase import create_client
from dotenv import load_dotenv
import secrets

# Charger les variables d'environnement
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ ERREUR: Variables d'environnement SUPABASE_URL et SUPABASE_SERVICE_KEY requises")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("\n" + "="*80)
print("                    CRÉATION COMPTE FONDATEUR SKYAPP")
print("="*80 + "\n")

# Informations du compte fondateur
email = "contact@skyapp.fr"
first_name = "Fondateur"
last_name = "Skyapp"
password = secrets.token_urlsafe(16)  # Générer un mot de passe sécurisé

print(f"📧 Email: {email}")
print(f"👤 Nom: {first_name} {last_name}")
print(f"🔑 Mot de passe temporaire: {password}")
print("\n⚠️  NOTEZ CE MOT DE PASSE - Il ne sera pas affiché à nouveau!")
print("-" * 80)

try:
    # Étape 1: Créer l'utilisateur dans Supabase Auth
    print("\n[1/3] Création de l'utilisateur dans Auth...")
    
    auth_response = supabase.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {
            "first_name": first_name,
            "last_name": last_name
        }
    })
    
    user_id = auth_response.user.id
    print(f"  ✓ Utilisateur Auth créé avec ID: {user_id}")
    
    # Étape 2: Créer l'entrée dans la table users
    print("\n[2/3] Création de l'entrée dans la table users...")
    
    user_data = {
        "id": user_id,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "role": "ADMIN",
        "is_fondateur": True,
        "is_active": True,
        "company_id": None  # Pas d'entreprise = accès à tout
    }
    
    db_response = supabase.table("users").insert(user_data).execute()
    print(f"  ✓ Utilisateur créé dans la base de données")
    
    # Étape 3: Vérification
    print("\n[3/3] Vérification du compte...")
    
    check_response = supabase.table("users").select("*").eq("id", user_id).execute()
    if check_response.data:
        user = check_response.data[0]
        print(f"  ✓ Compte vérifié:")
        print(f"    • Email: {user['email']}")
        print(f"    • Nom: {user['first_name']} {user['last_name']}")
        print(f"    • Rôle: {user['role']}")
        print(f"    • Fondateur: {'✓' if user['is_fondateur'] else '✗'}")
        print(f"    • Actif: {'✓' if user['is_active'] else '✗'}")
        print(f"    • Entreprise: {user['company_id'] or 'Aucune (accès global)'}")
    
    print("\n" + "="*80)
    print("                    ✅ COMPTE FONDATEUR CRÉÉ AVEC SUCCÈS!")
    print("="*80)
    print(f"\n📋 INFORMATIONS DE CONNEXION:")
    print(f"   • Email: {email}")
    print(f"   • Mot de passe: {password}")
    print(f"\n🔐 Privilèges:")
    print(f"   • Accès FONDATEUR complet à toute l'application")
    print(f"   • Gestion de toutes les entreprises")
    print(f"   • Création et gestion des utilisateurs")
    print(f"   • Accès à toutes les données")
    print("\n⚠️  IMPORTANT: Changez le mot de passe après la première connexion!")
    print("="*80 + "\n")

except Exception as e:
    print(f"\n❌ ERREUR lors de la création du compte: {str(e)}")
    print("\nDétails de l'erreur:")
    import traceback
    traceback.print_exc()
