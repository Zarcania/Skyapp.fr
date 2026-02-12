"""Test direct de l'endpoint materials"""
import requests

# Token stocké dans le navigateur (récupérer depuis localStorage.getItem('token'))
token = input("Collez votre token depuis localStorage: ").strip()

headers = {"Authorization": f"Bearer {token}"}
url = "http://localhost:8001/api/materials"

print(f"\nTest GET {url}")
print(f"Token: {token[:50]}...")

try:
    r = requests.get(url, headers=headers)
    print(f"\nStatus: {r.status_code}")
    print(f"Response: {r.text[:500]}")
except Exception as e:
    print(f"Erreur: {e}")
