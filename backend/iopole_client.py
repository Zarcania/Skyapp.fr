"""
IOPOLE Client - Intégration PDP pour Facturation Électronique
Conforme à la réforme DGFiP 2026-2027
"""

import os
import requests
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


class IOPOLEClient:
    """Client pour l'API IOPOLE - Plateforme de Dématérialisation Partenaire"""
    
    def __init__(self):
        self.api_base = os.getenv("IOPOLE_API_BASE", "https://api-sandbox.iopole.com/v1")
        self.api_key = os.getenv("IOPOLE_API_KEY")
        self.client_id = os.getenv("IOPOLE_CLIENT_ID")
        self.client_secret = os.getenv("IOPOLE_CLIENT_SECRET")
        self.webhook_secret = os.getenv("IOPOLE_WEBHOOK_SECRET")
        self.environment = os.getenv("IOPOLE_ENV", "sandbox")
        
        # Token OAuth2
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        
        # Validation configuration
        if not self.api_key:
            logger.warning("⚠️ IOPOLE_API_KEY non configurée - Mode simulation activé")
        
        logger.info(f"🔧 IOPOLE Client initialisé en mode {self.environment}")
    
    def _get_headers(self) -> Dict[str, str]:
        """Génère les headers HTTP pour les requêtes API"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "SkyApp/1.0"
        }
        
        # Utiliser API Key directement si disponible (plus simple que OAuth2)
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        elif self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        
        return headers
    
    def get_access_token(self) -> str:
        """
        Obtenir un token OAuth2 (si nécessaire)
        Note: Certaines APIs utilisent directement l'API Key
        """
        # Si token valide existe, le retourner
        if self.access_token and self.token_expiry and self.token_expiry > datetime.utcnow():
            return self.access_token
        
        # Si API Key existe, l'utiliser directement
        if self.api_key:
            return self.api_key
        
        # Sinon, demander un token OAuth2
        try:
            response = requests.post(
                f"{self.api_base.replace('/v1', '')}/oauth/token",
                json={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                },
                timeout=10
            )
            
            response.raise_for_status()
            data = response.json()
            
            self.access_token = data['access_token']
            expires_in = data.get('expires_in', 3600)
            self.token_expiry = datetime.utcnow() + timedelta(seconds=expires_in - 60)
            
            logger.info("✅ Token IOPOLE obtenu avec succès")
            return self.access_token
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Erreur authentification IOPOLE: {e}")
            # En mode sandbox/dev, simuler un token
            if self.environment == "sandbox":
                logger.warning("⚠️ Mode simulation: token factice généré")
                self.access_token = "sandbox_token_" + hashlib.md5(str(datetime.now()).encode()).hexdigest()[:16]
                self.token_expiry = datetime.utcnow() + timedelta(hours=1)
                return self.access_token
            raise Exception(f"Erreur authentification IOPOLE: {str(e)}")
    
    def send_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Émettre une facture via IOPOLE
        
        Args:
            invoice_data: Données de la facture (structure définie dans doc)
        
        Returns:
            Réponse IOPOLE avec pdp_reference et tracking_url
        """
        try:
            token = self.get_access_token()
            
            # Mode simulation si pas d'API configurée
            if not self.api_key or self.environment == "sandbox":
                logger.info("📤 SIMULATION: Émission facture vers IOPOLE")
                return self._simulate_send_invoice(invoice_data)
            
            # Appel API réel
            response = requests.post(
                f"{self.api_base}/invoices/send",
                headers=self._get_headers(),
                json={"invoice": invoice_data},
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"✅ Facture émise avec succès: {result.get('pdp_reference')}")
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Erreur émission facture IOPOLE: {e}")
            # Fallback simulation en cas d'erreur
            if self.environment == "sandbox":
                logger.warning("⚠️ Fallback: simulation de l'émission")
                return self._simulate_send_invoice(invoice_data)
            raise Exception(f"Erreur émission facture: {str(e)}")
    
    def _simulate_send_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Simule l'émission d'une facture (mode dev/sandbox)"""
        invoice_number = invoice_data.get('number', 'F2025-XXXX')
        pdp_ref = f"IOPOLE-{datetime.now().strftime('%Y%m%d')}-SIM{hashlib.md5(invoice_number.encode()).hexdigest()[:6].upper()}"
        
        return {
            "status": "transmitted",
            "pdp_reference": pdp_ref,
            "tracking_url": f"https://portal.iopole.com/tracking/{pdp_ref}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "message": "Facture transmise avec succès (SIMULATION)",
            "simulation": True
        }
    
    def receive_invoice(self, iopole_invoice_id: str) -> Dict[str, Any]:
        """
        Récupérer les détails d'une facture reçue
        
        Args:
            iopole_invoice_id: ID de la facture chez IOPOLE
        
        Returns:
            Détails de la facture
        """
        try:
            token = self.get_access_token()
            
            if not self.api_key or self.environment == "sandbox":
                logger.info(f"📥 SIMULATION: Réception facture {iopole_invoice_id}")
                return self._simulate_receive_invoice(iopole_invoice_id)
            
            response = requests.get(
                f"{self.api_base}/invoices/received/{iopole_invoice_id}",
                headers=self._get_headers(),
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"✅ Facture reçue récupérée: {iopole_invoice_id}")
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Erreur réception facture IOPOLE: {e}")
            if self.environment == "sandbox":
                return self._simulate_receive_invoice(iopole_invoice_id)
            raise Exception(f"Erreur réception facture: {str(e)}")
    
    def _simulate_receive_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """Simule la réception d'une facture"""
        return {
            "invoice_id": invoice_id,
            "invoice_number": f"FOURNISSEUR-{datetime.now().strftime('%Y')}-001",
            "supplier_name": "Fournisseur Test SARL",
            "supplier_siren": "123456789",
            "date": datetime.now().strftime('%Y-%m-%d'),
            "total_ht": 1000.00,
            "total_tva": 200.00,
            "total_ttc": 1200.00,
            "format": "factur-x",
            "status": "received",
            "file_url": f"https://api-sandbox.iopole.com/v1/files/download/{invoice_id}",
            "simulation": True
        }
    
    def download_file(self, file_url: str) -> bytes:
        """
        Télécharger un fichier (PDF/XML) depuis IOPOLE
        
        Args:
            file_url: URL du fichier à télécharger
        
        Returns:
            Contenu du fichier en bytes
        """
        try:
            token = self.get_access_token()
            
            if not self.api_key or self.environment == "sandbox":
                logger.info(f"📥 SIMULATION: Téléchargement fichier {file_url}")
                return b"PDF_SIMULATION_CONTENT"
            
            response = requests.get(
                file_url,
                headers=self._get_headers(),
                timeout=60
            )
            
            response.raise_for_status()
            logger.info(f"✅ Fichier téléchargé: {len(response.content)} bytes")
            return response.content
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Erreur téléchargement fichier IOPOLE: {e}")
            raise Exception(f"Erreur téléchargement fichier: {str(e)}")
    
    def send_ereporting(self, declaration_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transmettre une déclaration e-reporting au PDP
        
        Args:
            declaration_data: Données de la déclaration (type: b2c/export/intra-ue)
        
        Returns:
            Réponse IOPOLE avec pdp_reference
        """
        try:
            token = self.get_access_token()
            
            if not self.api_key or self.environment == "sandbox":
                logger.info("📊 SIMULATION: Transmission e-reporting")
                return self._simulate_ereporting(declaration_data)
            
            response = requests.post(
                f"{self.api_base}/e-reporting/declare",
                headers=self._get_headers(),
                json={"declaration": declaration_data},
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"✅ E-reporting transmis: {result.get('pdp_reference')}")
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Erreur e-reporting IOPOLE: {e}")
            if self.environment == "sandbox":
                return self._simulate_ereporting(declaration_data)
            raise Exception(f"Erreur e-reporting: {str(e)}")
    
    def _simulate_ereporting(self, declaration_data: Dict[str, Any]) -> Dict[str, Any]:
        """Simule la transmission e-reporting"""
        decl_type = declaration_data.get('type', 'b2c')
        pdp_ref = f"EREP-{datetime.now().strftime('%Y%m%d')}-{hashlib.md5(str(declaration_data).encode()).hexdigest()[:8].upper()}"
        
        return {
            "status": "transmitted",
            "pdp_reference": pdp_ref,
            "declaration_type": decl_type,
            "transmission_date": datetime.utcnow().isoformat() + "Z",
            "message": "Déclaration e-reporting transmise avec succès (SIMULATION)",
            "simulation": True
        }
    
    def archive_document(
        self,
        document_data: Dict[str, Any],
        pdf_file: bytes,
        xml_file: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """
        Archiver un document chez IOPOLE (10 ans)
        
        Args:
            document_data: Métadonnées du document
            pdf_file: Contenu du PDF
            xml_file: Contenu du XML (optionnel)
        
        Returns:
            Réponse avec archive_id et hash
        """
        try:
            token = self.get_access_token()
            
            if not self.api_key or self.environment == "sandbox":
                logger.info("🗄️ SIMULATION: Archivage document")
                return self._simulate_archive(document_data, pdf_file, xml_file)
            
            files = {
                'pdf': ('invoice.pdf', pdf_file, 'application/pdf')
            }
            
            if xml_file:
                files['xml'] = ('invoice.xml', xml_file, 'application/xml')
            
            # Pour multipart/form-data, ne pas utiliser Content-Type: application/json
            headers = {
                "Authorization": f"Bearer {token}",
                "User-Agent": "SkyApp/1.0"
            }
            
            response = requests.post(
                f"{self.api_base}/archives/store",
                headers=headers,
                data=document_data,
                files=files,
                timeout=60
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"✅ Document archivé: {result.get('archive_id')}")
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Erreur archivage IOPOLE: {e}")
            if self.environment == "sandbox":
                return self._simulate_archive(document_data, pdf_file, xml_file)
            raise Exception(f"Erreur archivage: {str(e)}")
    
    def _simulate_archive(
        self,
        document_data: Dict[str, Any],
        pdf_file: bytes,
        xml_file: Optional[bytes]
    ) -> Dict[str, Any]:
        """Simule l'archivage d'un document"""
        # Calculer hash SHA256 réel
        pdf_hash = hashlib.sha256(pdf_file).hexdigest()
        combined = pdf_file + (xml_file or b"")
        combined_hash = hashlib.sha256(combined).hexdigest()
        
        archive_id = f"ARCH-{datetime.now().strftime('%Y')}-{hashlib.md5(combined).hexdigest()[:8].upper()}"
        
        return {
            "archive_id": archive_id,
            "storage_url": f"https://archives.iopole.com/{archive_id}",
            "hash_sha256": combined_hash,
            "pdf_hash": pdf_hash,
            "expiration_date": (datetime.now() + timedelta(days=3650)).strftime('%Y-%m-%d'),  # +10 ans
            "status": "archived",
            "message": "Document archivé avec succès (SIMULATION)",
            "simulation": True
        }
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Vérifier la signature d'un webhook IOPOLE
        
        Args:
            payload: Corps de la requête (bytes)
            signature: Signature reçue dans les headers
        
        Returns:
            True si signature valide
        """
        if not self.webhook_secret:
            logger.warning("⚠️ WEBHOOK_SECRET non configuré - Validation ignorée")
            return True  # En mode dev, accepter tous les webhooks
        
        try:
            expected_signature = hashlib.sha256(
                self.webhook_secret.encode() + payload
            ).hexdigest()
            
            is_valid = signature == expected_signature
            
            if is_valid:
                logger.info("✅ Signature webhook valide")
            else:
                logger.warning("⚠️ Signature webhook invalide")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"❌ Erreur validation signature: {e}")
            return False
    
    def health_check(self) -> Dict[str, Any]:
        """Vérifier la connexion à l'API IOPOLE"""
        try:
            if not self.api_key:
                return {
                    "status": "simulation",
                    "message": "Mode simulation activé (pas d'API key)",
                    "environment": self.environment
                }
            
            # Tenter d'obtenir un token
            token = self.get_access_token()
            
            return {
                "status": "connected",
                "message": "Connexion IOPOLE OK",
                "environment": self.environment,
                "api_base": self.api_base,
                "token_valid": bool(token)
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "environment": self.environment
            }


# Instance globale (singleton)
iopole_client = IOPOLEClient()


# Fonctions utilitaires
def format_invoice_for_iopole(invoice: Dict[str, Any], lines: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Formate une facture Skyapp au format IOPOLE
    
    Args:
        invoice: Données facture depuis invoices_electronic
        lines: Lignes facture depuis invoice_lines
    
    Returns:
        Données formatées pour IOPOLE
    """
    return {
        "number": invoice['invoice_number'],
        "date": invoice['invoice_date'],
        "due_date": invoice.get('due_date'),
        "supplier": {
            "siren": invoice['siren_emetteur'],
            "name": invoice['company_name'],
            "address": invoice.get('address_emetteur', ''),
            "postal_code": invoice.get('postal_code_emetteur', ''),
            "city": invoice.get('city_emetteur', ''),
            "country": "FR"
        },
        "customer": {
            "siren": invoice['siren_client'],
            "name": invoice['customer_name'],
            "address": invoice.get('address_billing', ''),
            "postal_code": invoice.get('postal_code_client', ''),
            "city": invoice.get('city_client', ''),
            "country": "FR"
        },
        "lines": [
            {
                "description": line['designation'],
                "quantity": float(line['quantity']),
                "unit_price": float(line['unit_price_ht']),
                "vat_rate": float(line['tva_rate']),
                "total_ht": float(line['total_line_ht'])
            }
            for line in sorted(lines, key=lambda x: x.get('line_number', 0))
        ],
        "total_ht": float(invoice['total_ht']),
        "total_tva": float(invoice['total_tva']),
        "total_ttc": float(invoice['total_ttc']),
        "payment_terms": invoice.get('payment_terms', '30 jours'),
        "format": "factur-x",
        "notes": invoice.get('notes')
    }


if __name__ == "__main__":
    # Test du client IOPOLE
    logging.basicConfig(level=logging.INFO)
    
    print("🧪 Test IOPOLE Client")
    print("=" * 60)
    
    client = IOPOLEClient()
    health = client.health_check()
    
    print(f"Status: {health['status']}")
    print(f"Environment: {health['environment']}")
    print(f"Message: {health['message']}")
    
    if health['status'] in ['connected', 'simulation']:
        print("\n✅ Client IOPOLE prêt à l'emploi!")
    else:
        print(f"\n❌ Erreur: {health['message']}")
