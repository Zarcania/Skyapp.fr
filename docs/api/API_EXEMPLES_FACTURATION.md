# 📡 API FACTURATION ÉLECTRONIQUE - EXEMPLES

## 🔑 Authentification

Tous les endpoints nécessitent un token JWT dans les headers :

```bash
Authorization: Bearer <votre_token>
```

---

## 📤 POST /api/invoices/electronic

**Créer une nouvelle facture électronique**

### Request

```bash
POST http://127.0.0.1:8001/api/invoices/electronic
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```json
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "customer_name": "ACME Corporation",
  "siren_client": "123456789",
  "address_billing": "15 Avenue des Champs-Élysées\n75008 PARIS",
  "address_delivery": "20 Rue de la Paix\n75002 PARIS",
  "invoice_date": "2024-11-19",
  "due_date": "2024-12-19",
  "payment_terms": "30 jours",
  "payment_method": "virement",
  "total_ht": 1500.00,
  "total_tva": 300.00,
  "total_ttc": 1800.00,
  "notes": "Merci pour votre confiance",
  "lines": [
    {
      "line_number": 1,
      "designation": "Développement application web",
      "description": "Module de facturation électronique conforme 2026",
      "quantity": 5,
      "unit": "jour",
      "unit_price_ht": 800.00,
      "tva_rate": 20
    },
    {
      "line_number": 2,
      "designation": "Formation utilisateurs",
      "description": "Formation à l'utilisation du module",
      "quantity": 1,
      "unit": "jour",
      "unit_price_ht": 500.00,
      "tva_rate": 20
    }
  ]
}
```

### Response (201 Created)

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "invoice_number": "F20240001",
  "message": "Facture créée avec succès"
}
```

### Erreurs possibles

```json
// SIREN invalide
{
  "detail": "SIREN client invalide (9 chiffres obligatoires)"
}

// Pas d'entreprise
{
  "detail": "Vous devez appartenir à une entreprise"
}

// Token manquant
{
  "detail": "Not authenticated"
}
```

---

## 📥 GET /api/invoices/electronic

**Lister les factures électroniques**

### Request simple

```bash
GET http://127.0.0.1:8001/api/invoices/electronic
Authorization: Bearer <token>
```

### Request avec filtres

```bash
# Filtrer par statut
GET http://127.0.0.1:8001/api/invoices/electronic?status=draft

# Filtrer par direction
GET http://127.0.0.1:8001/api/invoices/electronic?direction=outgoing

# Combiner les filtres
GET http://127.0.0.1:8001/api/invoices/electronic?status=accepted&direction=outgoing
```

### Filtres disponibles

| Paramètre | Valeurs | Description |
|-----------|---------|-------------|
| `status` | draft, pending, transmitted, accepted, rejected, received, archived | Statut de la facture |
| `direction` | outgoing, incoming | Facture émise ou reçue |

### Response (200 OK)

```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "company_id": "550e8400-e29b-41d4-a716-446655440000",
    "customer_id": "660e8400-e29b-41d4-a716-446655440001",
    "invoice_number": "F20240001",
    "invoice_date": "2024-11-19",
    "due_date": "2024-12-19",
    "customer_name": "ACME Corporation",
    "siren_client": "123456789",
    "address_billing": "15 Avenue des Champs-Élysées\n75008 PARIS",
    "address_delivery": "20 Rue de la Paix\n75002 PARIS",
    "total_ht": 1500.00,
    "total_tva": 300.00,
    "total_ttc": 1800.00,
    "format": "pdf",
    "status_pdp": "draft",
    "direction": "outgoing",
    "payment_terms": "30 jours",
    "payment_method": "virement",
    "file_url_pdf": null,
    "file_url_xml": null,
    "file_hash_sha256": null,
    "pdp_tracking_id": null,
    "pdp_provider": null,
    "pdp_sent_at": null,
    "created_by": "user-uuid",
    "created_at": "2024-11-19T10:30:00.000Z",
    "updated_at": "2024-11-19T10:30:00.000Z"
  },
  {
    "id": "8d0e7680-8536-51ef-b18e-f08fd2f91bf8",
    "invoice_number": "F20240002",
    "customer_name": "Tech Solutions SAS",
    "total_ttc": 2400.00,
    "status_pdp": "transmitted",
    "...": "..."
  }
]
```

---

## 🔍 GET /api/invoices/electronic/{invoice_id}

**Récupérer une facture avec ses lignes**

### Request

```bash
GET http://127.0.0.1:8001/api/invoices/electronic/7c9e6679-7425-40de-944b-e07fc1f90ae7
Authorization: Bearer <token>
```

### Response (200 OK)

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "customer_id": "660e8400-e29b-41d4-a716-446655440001",
  "invoice_number": "F20240001",
  "invoice_date": "2024-11-19",
  "due_date": "2024-12-19",
  "customer_name": "ACME Corporation",
  "siren_client": "123456789",
  "address_billing": "15 Avenue des Champs-Élysées\n75008 PARIS",
  "address_delivery": "20 Rue de la Paix\n75002 PARIS",
  "total_ht": 1500.00,
  "total_tva": 300.00,
  "total_ttc": 1800.00,
  "format": "pdf",
  "status_pdp": "draft",
  "direction": "outgoing",
  "payment_terms": "30 jours",
  "payment_method": "virement",
  "notes": "Merci pour votre confiance",
  "file_url_pdf": null,
  "file_url_xml": null,
  "created_at": "2024-11-19T10:30:00.000Z",
  "updated_at": "2024-11-19T10:30:00.000Z",
  "lines": [
    {
      "id": "line-uuid-1",
      "invoice_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "line_number": 1,
      "designation": "Développement application web",
      "description": "Module de facturation électronique conforme 2026",
      "quantity": 5.00,
      "unit": "jour",
      "unit_price_ht": 800.00,
      "tva_rate": 20.00,
      "tva_amount": 800.00,
      "total_ht": 4000.00,
      "total_ttc": 4800.00,
      "catalog_item_id": null
    },
    {
      "id": "line-uuid-2",
      "invoice_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "line_number": 2,
      "designation": "Formation utilisateurs",
      "description": "Formation à l'utilisation du module",
      "quantity": 1.00,
      "unit": "jour",
      "unit_price_ht": 500.00,
      "tva_rate": 20.00,
      "tva_amount": 100.00,
      "total_ht": 500.00,
      "total_ttc": 600.00,
      "catalog_item_id": null
    }
  ]
}
```

### Erreurs possibles

```json
// Facture non trouvée
{
  "detail": "Facture non trouvée"
}

// Pas d'accès (autre entreprise)
{
  "detail": "Facture non trouvée"
}
```

---

## 🧪 Exemples avec cURL

### Créer une facture

```bash
curl -X POST http://127.0.0.1:8001/api/invoices/electronic \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customer_name": "Test Client",
    "siren_client": "123456789",
    "address_billing": "123 Rue Test\n75001 Paris",
    "invoice_date": "2024-11-19",
    "due_date": "2024-12-19",
    "payment_terms": "30 jours",
    "payment_method": "virement",
    "total_ht": 1000.00,
    "total_tva": 200.00,
    "total_ttc": 1200.00,
    "lines": [
      {
        "line_number": 1,
        "designation": "Prestation",
        "quantity": 1,
        "unit_price_ht": 1000.00,
        "tva_rate": 20
      }
    ]
  }'
```

### Lister les factures

```bash
curl -X GET http://127.0.0.1:8001/api/invoices/electronic \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Récupérer une facture

```bash
curl -X GET http://127.0.0.1:8001/api/invoices/electronic/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🐍 Exemples avec Python requests

### Installation

```bash
pip install requests
```

### Script complet

```python
import requests
import json
from datetime import datetime, timedelta

API_BASE = "http://127.0.0.1:8001/api"
TOKEN = "votre_token_jwt"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Créer une facture
invoice_data = {
    "customer_name": "Client Python",
    "siren_client": "987654321",
    "address_billing": "456 Boulevard Test\n75002 PARIS",
    "invoice_date": datetime.now().strftime("%Y-%m-%d"),
    "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
    "payment_terms": "30 jours",
    "payment_method": "virement",
    "total_ht": 2000.00,
    "total_tva": 400.00,
    "total_ttc": 2400.00,
    "lines": [
        {
            "line_number": 1,
            "designation": "Service A",
            "quantity": 2,
            "unit_price_ht": 800.00,
            "tva_rate": 20
        },
        {
            "line_number": 2,
            "designation": "Service B",
            "quantity": 1,
            "unit_price_ht": 400.00,
            "tva_rate": 10
        }
    ]
}

# POST - Créer
response = requests.post(
    f"{API_BASE}/invoices/electronic",
    headers=headers,
    json=invoice_data
)
print("Création:", response.json())
invoice_id = response.json()["id"]

# GET - Lister
response = requests.get(
    f"{API_BASE}/invoices/electronic",
    headers=headers
)
print("Liste:", len(response.json()), "factures")

# GET - Détails
response = requests.get(
    f"{API_BASE}/invoices/electronic/{invoice_id}",
    headers=headers
)
invoice = response.json()
print(f"Facture {invoice['invoice_number']}: {invoice['total_ttc']}€")
print(f"Lignes: {len(invoice['lines'])}")
```

---

## 🔐 Codes de statut HTTP

| Code | Signification | Description |
|------|---------------|-------------|
| 200 | OK | Requête réussie (GET) |
| 201 | Created | Facture créée avec succès (POST) |
| 400 | Bad Request | Données invalides (SIREN, champs manquants...) |
| 401 | Unauthorized | Token manquant ou invalide |
| 404 | Not Found | Facture non trouvée |
| 500 | Internal Server Error | Erreur serveur |

---

## 📋 Validation SIREN

Le SIREN est **OBLIGATOIRE** et doit respecter :
- Exactement **9 chiffres**
- Uniquement des **chiffres** (0-9)
- Pas d'espaces, tirets ou caractères spéciaux

### Exemples valides
```
✅ 123456789
✅ 987654321
✅ 000000001
```

### Exemples invalides
```
❌ 12345678     (8 chiffres)
❌ 1234567890   (10 chiffres)
❌ 12345678A    (contient lettre)
❌ 123 456 789  (contient espaces)
❌ 123-456-789  (contient tirets)
❌ ""           (vide)
```

---

## 🧪 Tester l'API avec Postman

### Importer la collection

1. Créer une nouvelle requête
2. Méthode : `POST`
3. URL : `http://127.0.0.1:8001/api/invoices/electronic`
4. Headers :
   - `Content-Type: application/json`
   - `Authorization: Bearer <TOKEN>`
5. Body (raw JSON) : Copier l'exemple ci-dessus

---

## 📚 Documentation interactive

Swagger UI disponible sur :
```
http://127.0.0.1:8001/docs
```

Redoc disponible sur :
```
http://127.0.0.1:8001/redoc
```

---

**Version API** : 1.0.0  
**Date** : 19 novembre 2024  
**Endpoint Base** : http://127.0.0.1:8001/api
