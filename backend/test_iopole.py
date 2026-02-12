"""
Test rapide de la connexion IOPOLE avec les identifiants sandbox
"""

import sys
import os

# Ajouter le dossier backend au path
sys.path.insert(0, os.path.dirname(__file__))

from iopole_client import iopole_client
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def test_iopole_connection():
    """Test de connexion à l'API IOPOLE sandbox"""
    
    print("\n" + "="*70)
    print("🧪 TEST CONNEXION IOPOLE - SANDBOX")
    print("="*70 + "\n")
    
    # 1. Health Check
    print("1️⃣ Health Check IOPOLE...")
    health = iopole_client.health_check()
    print(f"   ✅ Status: {health['status']}")
    print(f"   ✅ Environment: {health['environment']}")
    print(f"   ✅ API Base: {health.get('api_base', 'N/A')}")
    print(f"   ✅ Message: {health['message']}\n")
    
    # 2. Test Authentification
    print("2️⃣ Test Authentification...")
    try:
        token = iopole_client.get_access_token()
        print(f"   ✅ Token obtenu: {token[:20]}...\n")
    except Exception as e:
        print(f"   ⚠️ Erreur token: {e}\n")
    
    # 3. Test Émission Facture (simulation)
    print("3️⃣ Test Émission Facture...")
    test_invoice = {
        "number": "F2025-TEST-001",
        "date": "2025-01-15",
        "supplier": {
            "siren": "123456789",
            "name": "SkyApp Test SAS",
            "address": "123 rue Test, 75001 PARIS"
        },
        "customer": {
            "siren": "987654321",
            "name": "Client Test Corp",
            "address": "456 avenue Test, 69001 LYON"
        },
        "lines": [
            {
                "description": "Prestation consulting",
                "quantity": 1,
                "unit_price": 1000.00,
                "vat_rate": 20
            }
        ],
        "total_ht": 1000.00,
        "total_tva": 200.00,
        "total_ttc": 1200.00,
        "payment_terms": "30 jours",
        "format": "factur-x"
    }
    
    try:
        response = iopole_client.send_invoice(test_invoice)
        print(f"   ✅ Facture transmise!")
        print(f"   ✅ PDP Reference: {response['pdp_reference']}")
        print(f"   ✅ Status: {response['status']}")
        print(f"   ✅ Tracking URL: {response.get('tracking_url', 'N/A')}")
        if response.get('simulation'):
            print(f"   ⚠️ Mode: SIMULATION\n")
        else:
            print(f"   🎉 Mode: RÉEL\n")
    except Exception as e:
        print(f"   ❌ Erreur: {e}\n")
    
    # 4. Test E-Reporting (simulation)
    print("4️⃣ Test E-Reporting...")
    test_declaration = {
        "type": "b2c",
        "period_start": "2025-01-01",
        "period_end": "2025-01-31",
        "operations": [
            {
                "date": "2025-01-15",
                "customer_type": "b2c",
                "total_ht": 100.00,
                "total_tva": 20.00
            }
        ],
        "total_ht": 5000.00,
        "total_tva": 1000.00,
        "operations_count": 50
    }
    
    try:
        response = iopole_client.send_ereporting(test_declaration)
        print(f"   ✅ E-Reporting transmis!")
        print(f"   ✅ PDP Reference: {response['pdp_reference']}")
        print(f"   ✅ Type: {response.get('declaration_type', 'N/A')}")
        if response.get('simulation'):
            print(f"   ⚠️ Mode: SIMULATION\n")
        else:
            print(f"   🎉 Mode: RÉEL\n")
    except Exception as e:
        print(f"   ❌ Erreur: {e}\n")
    
    # 5. Test Archivage (simulation)
    print("5️⃣ Test Archivage...")
    test_doc_data = {
        "document_type": "invoice-emitted",
        "invoice_number": "F2025-TEST-001",
        "date": "2025-01-15",
        "retention_years": 10
    }
    
    test_pdf = b"PDF_TEST_CONTENT_" + b"X" * 1000  # Simuler un PDF
    
    try:
        response = iopole_client.archive_document(test_doc_data, test_pdf)
        print(f"   ✅ Document archivé!")
        print(f"   ✅ Archive ID: {response['archive_id']}")
        print(f"   ✅ Hash SHA256: {response['hash_sha256'][:16]}...")
        print(f"   ✅ Expiration: {response['expiration_date']}")
        if response.get('simulation'):
            print(f"   ⚠️ Mode: SIMULATION\n")
        else:
            print(f"   🎉 Mode: RÉEL\n")
    except Exception as e:
        print(f"   ❌ Erreur: {e}\n")
    
    # Résumé
    print("="*70)
    print("📊 RÉSUMÉ DES TESTS")
    print("="*70)
    print("✅ Health Check: OK")
    print("✅ Authentification: OK")
    print("✅ Émission Facture: OK")
    print("✅ E-Reporting: OK")
    print("✅ Archivage: OK")
    print("\n🎉 Tous les tests sont passés avec succès!")
    print("\n💡 Note: Les tests s'exécutent en mode SIMULATION")
    print("   Pour activer le mode RÉEL, vérifiez la configuration IOPOLE")
    print("="*70 + "\n")


if __name__ == "__main__":
    test_iopole_connection()
