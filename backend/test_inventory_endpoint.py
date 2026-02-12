import requests
import json

# Test avec ton token actuel
token = input("Entre ton token JWT: ")

headers = {"Authorization": f"Bearer {token}"}

try:
    response = requests.get("http://localhost:8001/api/inventory/my-checkouts", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Erreur: {e}")
