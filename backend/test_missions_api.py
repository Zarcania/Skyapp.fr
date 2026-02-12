#!/usr/bin/env python3
"""
Tester l'endpoint /technicians/{id}/missions
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = "http://localhost:8001/api"

# Token du technicien test
print("🔐 Connexion en tant que Technicien test...")

# Se connecter
login_data = {
    "email": "squimizgame@gmail.com",
    "password": "test"  # Ajustez si nécessaire
}

try:
    # Essayer de se connecter
    response = requests.post(f"{API_URL}/auth/login", json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Erreur de connexion: {response.status_code}")
        print(f"   {response.text}")
        
        # Essayer un autre mot de passe commun
        print("\n🔄 Essai avec mot de passe 'Test123!'...")
        login_data["password"] = "Test123!"
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        
        if response.status_code != 200:
            print(f"❌ Échec: {response.status_code}")
            exit(1)
    
    token = response.json().get("access_token")
    user_id = response.json().get("user", {}).get("id")
    
    print(f"✅ Connecté! User ID: {user_id}")
    
    # Récupérer les missions
    print(f"\n📋 Récupération des missions...")
    headers = {"Authorization": f"Bearer {token}"}
    
    missions_response = requests.get(f"{API_URL}/technicians/{user_id}/missions", headers=headers)
    
    print(f"   Status: {missions_response.status_code}")
    
    if missions_response.status_code == 200:
        missions = missions_response.json()
        print(f"   ✅ {len(missions)} mission(s) reçue(s)")
        
        for mission in missions:
            print(f"\n   📌 Mission {mission.get('id', '')[:8]}:")
            print(f"      - Worksite: {mission.get('worksites', {}).get('title', 'N/A')}")
            print(f"      - Start: {mission.get('start_date')}")
            print(f"      - End: {mission.get('end_date')}")
            print(f"      - Status: {mission.get('status')}")
    else:
        print(f"   ❌ Erreur: {missions_response.text}")

except Exception as e:
    print(f"❌ Erreur: {str(e)}")
