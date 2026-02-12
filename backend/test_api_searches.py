"""Diagnostic de l'API /searches pour chaque rôle"""
import requests
import json

# URLs
API = "http://localhost:8001/api"

# Tokens (vous devez vous connecter et récupérer les tokens depuis localStorage)
ADMIN_TOKEN = input("Collez le token Admin (depuis localStorage.getItem('token')): ")
TECH_TOKEN = input("Collez le token Technicien: ")

print()
print("=" * 80)
print("DIAGNOSTIC API /searches")
print("=" * 80)
print()

# Test avec Admin
print("🔴 TEST ADMIN")
print("-" * 80)
try:
    response = requests.get(f"{API}/searches", headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        searches = data.get('data', [])
        print(f"Nombre de recherches: {len(searches)}")
        print()
        for s in searches:
            print(f"  - {s['location'][:50]:50} | Status: {s['status']:10} | User: {s['user_id'][:8]}...")
    else:
        print(f"Erreur: {response.text}")
except Exception as e:
    print(f"Erreur: {e}")

print()
print("🔵 TEST TECHNICIEN")
print("-" * 80)
try:
    response = requests.get(f"{API}/searches", headers={"Authorization": f"Bearer {TECH_TOKEN}"})
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        searches = data.get('data', [])
        print(f"Nombre de recherches: {len(searches)}")
        print()
        for s in searches:
            print(f"  - {s['location'][:50]:50} | Status: {s['status']:10} | User: {s['user_id'][:8]}...")
    else:
        print(f"Erreur: {response.text}")
except Exception as e:
    print(f"Erreur: {e}")

print()
print("=" * 80)
