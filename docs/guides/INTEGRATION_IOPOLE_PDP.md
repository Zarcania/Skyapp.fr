# 🌐 Intégration IOPOLE - Plateforme de Dématérialisation Partenaire

## 📋 Présentation IOPOLE

**IOPOLE** est une solution PDP certifiée pour la facturation électronique conforme à la réforme française DGFiP 2026-2027.

### Chiffres clés
- **+100 millions** de factures traitées par an
- **99.9%** de disponibilité garantie
- **40 pays** couverts par le réseau international
- **Certification** : Opérateur agréé par l'État français

### PDP Compatibles mentionnés
- ✅ **Yooz** - Automatisation comptable
- ✅ **Jefacture** - Facturation TPE/PME
- ✅ **Pennylane** - Gestion financière
- ✅ **Sellsy / MyUnisoft** - ERP et comptabilité

---

## 🔧 Configuration Technique

### 1. **API IOPOLE - Endpoints**

```python
# Configuration backend/server_supabase.py
IOPOLE_API_BASE = "https://api.iopole.com/v1"
IOPOLE_API_KEY = os.getenv("IOPOLE_API_KEY")
IOPOLE_CLIENT_ID = os.getenv("IOPOLE_CLIENT_ID")
IOPOLE_CLIENT_SECRET = os.getenv("IOPOLE_CLIENT_SECRET")

# Environnement (production/sandbox)
IOPOLE_ENV = os.getenv("IOPOLE_ENV", "sandbox")  # 'sandbox' ou 'production'
```

### 2. **Endpoints principaux**

#### A. Authentification OAuth2
```http
POST https://api.iopole.com/oauth/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}

Response:
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### B. Émission de facture
```http
POST https://api.iopole.com/v1/invoices/send
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "invoice": {
    "number": "F20250001",
    "date": "2025-01-15",
    "supplier": {
      "siren": "123456789",
      "name": "Mon Entreprise SAS",
      "address": "123 rue Example, 75001 PARIS"
    },
    "customer": {
      "siren": "987654321",
      "name": "Client Corp",
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
}

Response:
{
  "status": "transmitted",
  "pdp_reference": "IOPOLE-2025-ABC123",
  "tracking_url": "https://portal.iopole.com/tracking/ABC123",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### C. Réception de facture (webhook)
```http
POST https://votre-domaine.com/api/webhooks/iopole/received
Authorization: Bearer {webhook_secret}
Content-Type: application/json

{
  "event": "invoice.received",
  "data": {
    "invoice_id": "IOPOLE-RCV-XYZ789",
    "supplier_siren": "555666777",
    "invoice_number": "FOURNISSEUR-2025-001",
    "date": "2025-01-10",
    "total_ttc": 850.00,
    "format": "factur-x",
    "file_url": "https://api.iopole.com/v1/files/download/xyz789",
    "status": "received"
  }
}
```

#### D. E-Reporting
```http
POST https://api.iopole.com/v1/e-reporting/declare
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "declaration": {
    "type": "b2c",  // 'b2c', 'export', 'intra-ue'
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
}
```

#### E. Archivage légal
```http
POST https://api.iopole.com/v1/archives/store
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

{
  "document_type": "invoice-emitted",
  "invoice_number": "F20250001",
  "date": "2025-01-15",
  "retention_years": 10,
  "files": {
    "pdf": [binary],
    "xml": [binary]
  }
}

Response:
{
  "archive_id": "ARCH-2025-ABC123",
  "storage_url": "https://archives.iopole.com/ABC123",
  "hash_sha256": "a1b2c3d4e5f6...",
  "expiration_date": "2035-01-15"
}
```

---

## 🔐 Configuration .env

Ajoutez dans `backend/.env` :

```bash
# IOPOLE PDP Configuration
IOPOLE_ENV=sandbox
IOPOLE_API_BASE=https://api-sandbox.iopole.com/v1
IOPOLE_CLIENT_ID=votre_client_id
IOPOLE_CLIENT_SECRET=votre_client_secret
IOPOLE_WEBHOOK_SECRET=votre_webhook_secret

# Production (quand prêt)
# IOPOLE_ENV=production
# IOPOLE_API_BASE=https://api.iopole.com/v1
```

---

## 💻 Implémentation Backend

### Créer `backend/iopole_client.py`

```python
import os
import requests
import logging
from datetime import datetime, timedelta

class IOPOLEClient:
    def __init__(self):
        self.api_base = os.getenv("IOPOLE_API_BASE")
        self.client_id = os.getenv("IOPOLE_CLIENT_ID")
        self.client_secret = os.getenv("IOPOLE_CLIENT_SECRET")
        self.access_token = None
        self.token_expiry = None
    
    def get_access_token(self):
        """Obtenir un token OAuth2"""
        if self.access_token and self.token_expiry > datetime.utcnow():
            return self.access_token
        
        response = requests.post(
            f"{self.api_base.replace('/v1', '')}/oauth/token",
            json={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            self.access_token = data['access_token']
            self.token_expiry = datetime.utcnow() + timedelta(seconds=data['expires_in'] - 60)
            return self.access_token
        else:
            raise Exception(f"Erreur authentification IOPOLE: {response.status_code}")
    
    def send_invoice(self, invoice_data):
        """Émettre une facture via IOPOLE"""
        token = self.get_access_token()
        
        response = requests.post(
            f"{self.api_base}/invoices/send",
            headers={"Authorization": f"Bearer {token}"},
            json={"invoice": invoice_data}
        )
        
        if response.status_code in [200, 201]:
            return response.json()
        else:
            raise Exception(f"Erreur émission facture: {response.status_code} - {response.text}")
    
    def receive_invoice(self, iopole_invoice_id):
        """Récupérer une facture reçue"""
        token = self.get_access_token()
        
        response = requests.get(
            f"{self.api_base}/invoices/received/{iopole_invoice_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Erreur réception facture: {response.status_code}")
    
    def download_file(self, file_url):
        """Télécharger un fichier (PDF/XML)"""
        token = self.get_access_token()
        
        response = requests.get(
            file_url,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            return response.content
        else:
            raise Exception(f"Erreur téléchargement fichier: {response.status_code}")
    
    def send_ereporting(self, declaration_data):
        """Transmettre une déclaration e-reporting"""
        token = self.get_access_token()
        
        response = requests.post(
            f"{self.api_base}/e-reporting/declare",
            headers={"Authorization": f"Bearer {token}"},
            json={"declaration": declaration_data}
        )
        
        if response.status_code in [200, 201]:
            return response.json()
        else:
            raise Exception(f"Erreur e-reporting: {response.status_code} - {response.text}")
    
    def archive_document(self, document_data, pdf_file, xml_file=None):
        """Archiver un document"""
        token = self.get_access_token()
        
        files = {
            'pdf': ('invoice.pdf', pdf_file, 'application/pdf')
        }
        
        if xml_file:
            files['xml'] = ('invoice.xml', xml_file, 'application/xml')
        
        response = requests.post(
            f"{self.api_base}/archives/store",
            headers={"Authorization": f"Bearer {token}"},
            data=document_data,
            files=files
        )
        
        if response.status_code in [200, 201]:
            return response.json()
        else:
            raise Exception(f"Erreur archivage: {response.status_code} - {response.text}")
```

---

## 🔗 Intégration dans server_supabase.py

### Modifier les endpoints existants

```python
from iopole_client import IOPOLEClient

# Initialiser le client IOPOLE
iopole_client = IOPOLEClient()

# Modifier l'endpoint de transmission de facture
@api_router.patch("/invoices/electronic/{invoice_id}/transmit")
async def transmit_invoice_to_pdp(invoice_id: str, user_data: dict = Depends(get_current_user)):
    """Transmettre une facture au PDP (IOPOLE)"""
    try:
        company_id = await get_user_company(user_data)
        
        # Récupérer la facture
        invoice_result = supabase_service.table("invoices_electronic")\
            .select("*")\
            .eq("id", invoice_id)\
            .eq("company_id", company_id)\
            .execute()
        
        if not invoice_result.data:
            raise HTTPException(status_code=404, detail="Facture non trouvée")
        
        invoice = invoice_result.data[0]
        
        # Récupérer les lignes
        lines_result = supabase_service.table("invoice_lines")\
            .select("*")\
            .eq("invoice_id", invoice_id)\
            .order("line_number")\
            .execute()
        
        # Préparer les données pour IOPOLE
        iopole_data = {
            "number": invoice['invoice_number'],
            "date": invoice['invoice_date'],
            "supplier": {
                "siren": invoice['siren_emetteur'],
                "name": invoice['company_name'],
                "address": invoice['address_emetteur']
            },
            "customer": {
                "siren": invoice['siren_client'],
                "name": invoice['customer_name'],
                "address": invoice['address_billing']
            },
            "lines": [
                {
                    "description": line['designation'],
                    "quantity": line['quantity'],
                    "unit_price": float(line['unit_price_ht']),
                    "vat_rate": float(line['tva_rate'])
                }
                for line in lines_result.data
            ],
            "total_ht": float(invoice['total_ht']),
            "total_tva": float(invoice['total_tva']),
            "total_ttc": float(invoice['total_ttc']),
            "payment_terms": invoice['payment_terms'],
            "format": "factur-x"
        }
        
        # Envoyer à IOPOLE
        iopole_response = iopole_client.send_invoice(iopole_data)
        
        # Mettre à jour la facture
        update_data = {
            "status_pdp": "transmitted",
            "transmission_date": datetime.utcnow().isoformat(),
            "pdp_reference": iopole_response.get('pdp_reference'),
            "pdp_response": iopole_response,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        supabase_service.table("invoices_electronic")\
            .update(update_data)\
            .eq("id", invoice_id)\
            .execute()
        
        await log_invoice_action(invoice_id, "transmitted", f"Facture transmise à IOPOLE: {iopole_response.get('pdp_reference')}", user_data.get("sub"))
        
        return {
            "success": True,
            "pdp_reference": iopole_response.get('pdp_reference'),
            "tracking_url": iopole_response.get('tracking_url')
        }
        
    except Exception as e:
        logging.error(f"Erreur transmission IOPOLE: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
```

---

## 🎯 Webhooks IOPOLE

### Créer l'endpoint de réception

```python
@app.post("/api/webhooks/iopole/received")
async def iopole_webhook_received(request: Request):
    """Recevoir les notifications IOPOLE (factures reçues, statuts)"""
    try:
        # Vérifier la signature
        webhook_secret = os.getenv("IOPOLE_WEBHOOK_SECRET")
        signature = request.headers.get("X-IOPOLE-Signature")
        
        body = await request.body()
        
        # TODO: Vérifier la signature HMAC
        # expected_signature = hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()
        # if signature != expected_signature:
        #     raise HTTPException(status_code=401, detail="Signature invalide")
        
        data = await request.json()
        event_type = data.get('event')
        
        if event_type == 'invoice.received':
            # Nouvelle facture reçue
            invoice_data = data['data']
            
            # Télécharger les fichiers
            pdf_content = iopole_client.download_file(invoice_data['file_url'])
            
            # Sauvegarder dans la base
            # TODO: Implémenter la logique de sauvegarde
            
            return {"status": "processed"}
        
        elif event_type == 'invoice.status_changed':
            # Changement de statut d'une facture émise
            invoice_ref = data['data']['invoice_reference']
            new_status = data['data']['status']
            
            # Mettre à jour la base
            supabase_service.table("invoices_electronic")\
                .update({"status_pdp": new_status})\
                .eq("pdp_reference", invoice_ref)\
                .execute()
            
            return {"status": "updated"}
        
        return {"status": "unknown_event"}
        
    except Exception as e:
        logging.error(f"Erreur webhook IOPOLE: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## ✅ Checklist d'intégration

### Phase 1: Configuration (1-2 jours)
- [ ] Créer un compte IOPOLE (sandbox)
- [ ] Obtenir les credentials API (client_id, client_secret)
- [ ] Configurer les webhooks
- [ ] Tester l'authentification OAuth2

### Phase 2: Développement (3-5 jours)
- [ ] Implémenter `iopole_client.py`
- [ ] Modifier l'endpoint de transmission
- [ ] Créer l'endpoint webhook
- [ ] Ajouter la gestion des erreurs

### Phase 3: Tests (2-3 jours)
- [ ] Tester l'émission de facture (sandbox)
- [ ] Tester la réception de facture
- [ ] Tester l'e-reporting
- [ ] Tester l'archivage

### Phase 4: Production (1 jour)
- [ ] Basculer sur l'environnement production
- [ ] Configurer les credentials production
- [ ] Tests de validation finale
- [ ] Mise en production

---

## 📞 Support IOPOLE

- **Documentation API**: https://docs.iopole.com/api
- **Support technique**: support@iopole.com
- **Portail client**: https://portal.iopole.com
- **Status page**: https://status.iopole.com

---

## 💡 Avantages IOPOLE

✅ **Fiabilité** : 99.9% de disponibilité  
✅ **Volume** : +100M factures/an  
✅ **International** : 40 pays couverts  
✅ **Interopérabilité** : Compatible avec tous les PDP français (Yooz, Jefacture, Pennylane, Sellsy, MyUnisoft)  
✅ **Conformité** : Certifié DGFiP pour la réforme 2026-2027  
✅ **Formats** : Factur-X, UBL, CII supportés  

---

**Prêt pour la réforme DGFiP 2026-2027 🇫🇷**
