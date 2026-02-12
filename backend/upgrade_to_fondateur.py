"""
Script pour transformer un compte existant en FONDATEUR
Email: contact@skyapp.fr
"""

import os
from supabase import create_client
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ ERREUR: Variables d'environnement SUPABASE_URL et SUPABASE_SERVICE_KEY requises")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("\n" + "="*80)
print("                 TRANSFORMATION EN COMPTE FONDATEUR")
print("="*80 + "\n")

email = "contact@skyapp.fr"

try:
    # Étape 1: Vérifier si le compte existe
    print(f"[1/3] Recherche du compte {email}...")
    
    user_response = supabase.table("users").select("*").eq("email", email).execute()
    
    if not user_response.data:
        print(f"❌ Aucun compte trouvé pour {email}")
        print("\n💡 Recherche dans Auth...")
        
        # Le compte n'existe pas dans la table users mais existe dans Auth
        # On doit récupérer l'ID depuis Auth
        auth_users = supabase.auth.admin.list_users()
        auth_user = None
        for u in auth_users:
            if u.email == email:
                auth_user = u
                break
        
        if not auth_user:
            print(f"❌ Compte introuvable dans Auth")
            exit(1)
        
        print(f"  ✓ Compte trouvé dans Auth: {auth_user.id}")
        
        # Vérifier si le compte existe dans users avec cet ID
        user_by_id = supabase.table("users").select("*").eq("id", str(auth_user.id)).execute()
        
        if user_by_id.data:
            # Le compte existe mais avec un email différent - mettre à jour
            print(f"  ⚠️  Compte trouvé avec un email différent: {user_by_id.data[0].get('email')}")
            print(f"  → Mise à jour vers {email}...")
            
            update_data = {
                "email": email,
                "first_name": "Fondateur",
                "last_name": "Skyapp",
                "role": "ADMIN",
                "is_fondateur": True,
                "company_id": None
            }
            
            update_response = supabase.table("users").update(update_data).eq("id", str(auth_user.id)).execute()
            user = update_response.data[0]
            print(f"  ✓ Compte mis à jour")
        else:
            # Créer l'entrée dans la table users
            user_data = {
                "id": str(auth_user.id),
                "email": email,
                "first_name": "Fondateur",
                "last_name": "Skyapp",
                "role": "ADMIN",
                "is_fondateur": True,
                "company_id": None
            }
            
            insert_response = supabase.table("users").insert(user_data).execute()
            user = insert_response.data[0]
            print(f"  ✓ Entrée créée dans la table users")
        
    else:
        user = user_response.data[0]
        print(f"  ✓ Compte trouvé: {user.get('first_name', 'N/A')} {user.get('last_name', 'N/A')}")
        print(f"    • Rôle actuel: {user['role']}")
        print(f"    • Fondateur: {'✓' if user.get('is_fondateur') else '✗'}")
        
        # Étape 2: Mettre à jour le compte
        print(f"\n[2/3] Transformation en compte FONDATEUR...")
        
        update_data = {
            "role": "ADMIN",
            "is_fondateur": True,
            "company_id": None  # Retirer l'association d'entreprise pour accès global
        }
        
        update_response = supabase.table("users").update(update_data).eq("email", email).execute()
        user = update_response.data[0]
        print(f"  ✓ Compte mis à jour")
    
    # Étape 3: Vérification finale
    print(f"\n[3/3] Vérification du compte...")
    
    final_check = supabase.table("users").select("*").eq("email", email).execute()
    if final_check.data:
        user = final_check.data[0]
        print(f"  ✓ Configuration finale:")
        print(f"    • Email: {user['email']}")
        print(f"    • Nom: {user.get('first_name', 'N/A')} {user.get('last_name', 'N/A')}")
        print(f"    • Rôle: {user['role']}")
        print(f"    • Fondateur: {'✓ OUI' if user.get('is_fondateur') else '✗ NON'}")
        print(f"    • Entreprise: {user['company_id'] or 'Aucune (accès global)'}")
    
    print("\n" + "="*80)
    print("               ✅ COMPTE FONDATEUR CONFIGURÉ AVEC SUCCÈS!")
    print("="*80)
    print(f"\n🏆 Privilèges FONDATEUR:")
    print(f"   • Accès complet à toute l'application")
    print(f"   • Gestion de toutes les entreprises")
    print(f"   • Création et gestion de tous les utilisateurs")
    print(f"   • Accès à toutes les données multi-tenant")
    print(f"\n📧 Email de connexion: {email}")
    print(f"🔑 Utilisez le mot de passe existant ou réinitialisez-le via l'interface")
    print("="*80 + "\n")

except Exception as e:
    print(f"\n❌ ERREUR: {str(e)}")
    import traceback
    traceback.print_exc()
