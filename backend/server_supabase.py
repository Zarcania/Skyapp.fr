from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

logger.info("=" * 100)
logger.info("CHARGEMENT DU FICHIER server_supabase.py - CODE MIS A JOUR LE 29 JANVIER 2026")
logger.info("=" * 100)
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, date, timezone
from decimal import Decimal
import tempfile
import io
import asyncio
import aiofiles
import shutil
from supabase import create_client, Client
from enum import Enum

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as ReportLabImage, PageBreak, KeepTogether
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.utils import ImageReader
from PIL import Image as PILImage
import qrcode
import base64
import secrets

# IOPOLE Client for electronic invoicing
try:
    from iopole_client import iopole_client, format_invoice_for_iopole
    IOPOLE_AVAILABLE = True
    logging.info("✅ Client IOPOLE chargé avec succès")
except ImportError as e:
    IOPOLE_AVAILABLE = False
    logging.warning(f"⚠️ Client IOPOLE non disponible: {e}")

# AI Service for intelligent assistance
try:
    from ai_service import init_ai_service, get_ai_service
    AI_SERVICE_AVAILABLE = True
    logging.info("✅ Service IA chargé avec succès")
except ImportError as e:
    AI_SERVICE_AVAILABLE = False
    logging.warning(f"⚠️ Service IA non disponible: {e}")

# Configuration
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_anon_key = os.environ['SUPABASE_ANON_KEY']
supabase_service_key = os.environ.get('SUPABASE_SERVICE_KEY', '')
ALLOW_DEV_LOGIN = os.environ.get('ALLOW_DEV_LOGIN', '0') in ('1', 'true', 'True', 'yes', 'on')
# Founder email (unique creator of the application)
FOUNDER_EMAIL = os.environ.get('FOUNDER_EMAIL', 'contact@skyapp.fr').lower()

# Clients Supabase (anon pour auth, service pour admin)
supabase_anon: Client = create_client(supabase_url, supabase_anon_key)
supabase_service: Client = create_client(supabase_url, supabase_service_key) if supabase_service_key else None

# Create uploads directory
UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Lifespan context manager pour remplacer @app.on_event
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        mode = "service" if supabase_service is not None else "anon"
        logging.info("SkyApp Supabase API starting... mode=%s host=127.0.0.1 port=8001", mode)
        logging.info("Health: http://127.0.0.1:8001/api/health  Docs: http://127.0.0.1:8001/docs")
    except Exception:
        pass
    
    yield
    
    # Shutdown (si besoin)
    pass

# Create the main app
app = FastAPI(
    title="SkyApp API Supabase", 
    description="API pour l'application SkyApp avec Supabase",
    lifespan=lifespan
)

# ============================================================
# CORS - Configuré IMMÉDIATEMENT après la création de l'app
# ============================================================
_dev_origins = [
    "http://localhost:3000",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3002",
]
_production_origins = [
    "https://skyapp.fr",
    "https://www.skyapp.fr",
    "https://skyapp-frontend.onrender.com",
]

# Toujours inclure les origines de production + dev
_allow_origins = _dev_origins + _production_origins

# Si ALLOWED_ORIGINS est défini, ajouter aussi ces origines
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env.strip() == "*":
    _allow_origins = ["*"]
elif allowed_origins_env.strip():
    _extra = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
    # Fusionner avec les origines de base (sans doublons)
    for o in _extra:
        if o not in _allow_origins:
            _allow_origins.append(o)

logging.info(f"🌐 CORS origins autorisées: {_allow_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler pour les erreurs de validation Pydantic
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logging.error(f"❌ Erreur de validation Pydantic:")
    logging.error(f"  URL: {request.url}")
    logging.error(f"  Body: {await request.body()}")
    logging.error(f"  Erreurs: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(exc.body)}
    )

# Pas de middleware - cause des problèmes avec le body parsing

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
# Security: disable auto_error to allow custom handling (esp. in tests)
security = HTTPBearer(auto_error=False)

# Enums (correspondent aux types PostgreSQL)
class UserRole(str, Enum):
    ADMIN = "ADMIN"
    BUREAU = "BUREAU" 
    TECHNICIEN = "TECHNICIEN"

class SearchStatus(str, Enum):
    DRAFT = "DRAFT"  # Nouveau statut pour brouillon
    ACTIVE = "ACTIVE"
    SHARED = "SHARED"
    SHARED_TO_BUREAU = "SHARED_TO_BUREAU"
    PROCESSED = "PROCESSED"
    ARCHIVED = "ARCHIVED"

class QuoteStatus(str, Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"

class WorksiteStatus(str, Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class WorksiteSource(str, Enum):
    QUOTE = "QUOTE"
    MANUAL = "MANUAL"

# Modèles Pydantic
class Company(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    nom: str
    prenom: str
    role: UserRole
    company_id: str
    actif: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class RegisterRequest(BaseModel):
    email: str
    password: str
    nom: str
    prenom: str
    company_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class InviteRequest(BaseModel):
    email: str
    nom: Optional[str] = ""
    prenom: Optional[str] = ""
    role: Optional[str] = "TECHNICIEN"  # TECHNICIEN, BUREAU, ou ADMIN

class Search(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    nom: Optional[str] = None
    prenom: Optional[str] = None
    location: str
    description: str
    observations: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photos: Optional[List[Dict]] = []
    status: SearchStatus = SearchStatus.ACTIVE
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SearchCreate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    location: str
    description: str
    observations: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[SearchStatus] = None  # Permet d'envoyer ACTIVE ou DRAFT explicite

class SearchUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    location: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    description: Optional[str] = None
    observations: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[SearchStatus] = None
    search_type: Optional[str] = None

class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    nom: str
    email: str
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ClientCreate(BaseModel):
    nom: str
    email: str
    telephone: Optional[str] = None
    adresse: Optional[str] = None

class Quote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    client_id: str
    title: str
    description: str
    amount: float
    status: QuoteStatus = QuoteStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class QuoteCreate(BaseModel):
    client_id: str
    title: str
    description: str
    amount: float

class Worksite(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    client_id: Optional[str] = None
    client_name: Optional[str] = ""
    quote_id: Optional[str] = None
    company_id: str
    source: WorksiteSource = WorksiteSource.MANUAL
    status: WorksiteStatus = WorksiteStatus.PLANNED
    description: Optional[str] = ""
    address: Optional[str] = ""
    amount: Optional[float] = 0.0
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WorksiteCreate(BaseModel):
    title: str
    client_id: Optional[str] = None
    client_name: Optional[str] = ""
    quote_id: Optional[str] = None
    description: Optional[str] = ""
    address: Optional[str] = ""
    amount: Optional[float] = 0.0
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectCreate(BaseModel):
    name: str
    client_id: str
    search_id: Optional[str] = None
    status: Optional[str] = "RECHERCHE"
    priority: Optional[str] = "NORMAL"
    category: Optional[str] = None
    estimated_value: Optional[float] = None
    tags: Optional[List[str]] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    estimated_value: Optional[float] = None
    final_value: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    expected_duration_days: Optional[int] = None
    quote_id: Optional[str] = None
    worksite_id: Optional[str] = None
    report_id: Optional[str] = None
    progress: Optional[int] = None

class ProjectNoteCreate(BaseModel):
    content: str
    note_type: Optional[str] = "COMMENT"

class UserProfileUpdate(BaseModel):
    """Modèle pour la mise à jour du profil utilisateur"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

# Fonctions utilitaires Supabase
async def get_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Récupère l'utilisateur à partir du token Supabase JWT"""
    logger.debug(f"🔑 get_user_from_token appelé - credentials présents: {credentials is not None}")
    try:
        # Autoriser le mode test sans en-tête Authorization (pour pytest)
        if credentials is None:
            # Pytest définit cette variable d'environnement lors de l'exécution des tests
            if os.environ.get("PYTEST_CURRENT_TEST"):
                return {
                    "id": "user-1",
                    "email": "t@t.com",
                    "role": "TECHNICIEN",
                    "company_id": "comp-1",
                }
            # Mode dev autorisé explicitement via env
            if ALLOW_DEV_LOGIN:
                return {
                    "id": "dev",
                    "email": FOUNDER_EMAIL,
                    "role": "ADMIN",
                    "company_id": None,
                }
            raise HTTPException(status_code=401, detail="Authorization manquant")

        # Dev fallback: token spécial généré par le mode dev
        if credentials.credentials.startswith('dev_token_') and ALLOW_DEV_LOGIN:
            return {
                "id": credentials.credentials.replace('dev_token_', ''),
                "email": "skyapp@gmail.com",
                "role": "ADMIN",
                "company_id": None,
            }

        # Vérifier le token avec Supabase
        user_response = supabase_anon.auth.get_user(credentials.credentials)
        
        if user_response.user is None:
            raise HTTPException(status_code=401, detail="Token invalide")
        
        # Récupérer les informations utilisateur complètes
        # 1) Essayer avec la clé service si disponible
        if supabase_service is not None:
            try:
                user_data = supabase_service.table("users").select("*").eq("id", user_response.user.id).execute()
                if user_data.data:
                    user_info = user_data.data[0]
                    logger.debug(f"🔐 User data from service: id={user_info.get('id')}, email={user_info.get('email')}, is_fondateur={user_info.get('is_fondateur')}")
                    return user_info
            except Exception as e:
                logger.error(f"❌ Service client error: {e}")
                pass

        # 2) Fallback: tenter avec le client anonyme (si RLS le permet)
        try:
            user_data = supabase_anon.table("users").select("*").eq("id", user_response.user.id).execute()
            if user_data.data:
                user_info = user_data.data[0]
                logger.debug(f"🔐 User data from anon: id={user_info.get('id')}, email={user_info.get('email')}, is_fondateur={user_info.get('is_fondateur')}")
                return user_info
        except Exception as e:
            logger.error(f"❌ Anon client error: {e}")
            pass

        # 3) Dernier recours: retourner un profil minimal issu du token
        minimal = {
            "id": user_response.user.id,
            "email": getattr(user_response.user, "email", None),
            "role": None,
            "company_id": None,
        }
        # Marquer fondateur si applicable
        if (minimal.get("email") or "").lower() == FOUNDER_EMAIL:
            minimal["is_founder"] = True
            # Élever les droits côté API si nécessaire
            minimal.setdefault("role", "ADMIN")
        return minimal
        
    except Exception as e:
        logger.error(f"❌ ERREUR dans get_user_from_token: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=401, detail=f"Erreur d'authentification: {str(e)}")

async def get_user_company(user_data: dict) -> str:
    """Récupère l'ID de l'entreprise de l'utilisateur"""
    return user_data.get("company_id")

def require_admin(user_data: dict):
    """Lève 403 si l'utilisateur n'est pas ADMIN ou BUREAU (fondateur inclus).
    Utilisé pour: clients, devis, chantiers, planning, invitations.
    """
    if not user_data:
        raise HTTPException(status_code=401, detail="Non authentifié")
    # Fondateur traité comme ADMIN
    if (user_data.get("email") or "").lower() == FOUNDER_EMAIL:
        return
    role = user_data.get("role")
    if role not in ["ADMIN", "BUREAU"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

def require_full_admin(user_data: dict):
    """Lève 403 si l'utilisateur n'est pas ADMIN (fondateur inclus).
    Utilisé pour: statistiques entreprise, suppression compte admin.
    BUREAU n'a PAS accès.
    """
    if not user_data:
        raise HTTPException(status_code=401, detail="Non authentifié")
    # Fondateur traité comme ADMIN
    if (user_data.get("email") or "").lower() == FOUNDER_EMAIL:
        return
    role = user_data.get("role")
    if role != "ADMIN":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs uniquement")

def require_role(user_data: dict, allowed_roles: List[str]):
    """Lève 403 si l'utilisateur n'a pas un des rôles autorisés."""
    if not user_data:
        raise HTTPException(status_code=401, detail="Non authentifié")
    # Fondateur traité comme ADMIN
    if (user_data.get("email") or "").lower() == FOUNDER_EMAIL:
        return
    if user_data.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail=f"Accès réservé aux rôles: {', '.join(allowed_roles)}")

# Routes de base
@api_router.get("/")
async def root():
    return {"message": "SkyApp API avec Supabase - Opérationnel", "version": "2.0"}

@api_router.get("/health")
async def health_check():
    try:
        # Initialiser le service IA si disponible
        if AI_SERVICE_AVAILABLE and supabase_service is not None:
            try:
                init_ai_service(supabase_service)
                logging.info("✅ Service IA initialisé")
            except Exception as e:
                logging.warning(f"⚠️ Impossible d'initialiser le service IA: {e}")
        
        # Vérifier l'accès DB via clé service si disponible
        if supabase_service is not None:
            try:
                supabase_service.table("companies").select("id").limit(1).execute()
                return {
                    "status": "OK", 
                    "database": "Connected", 
                    "service": "SkyApp Supabase", 
                    "mode": "service",
                    "ai_service": AI_SERVICE_AVAILABLE,
                    "iopole": IOPOLE_AVAILABLE
                }
            except Exception as e:
                # Service key invalide
                return {"status": "DEGRADED", "database": "ServiceKeyInvalid", "error": str(e), "service": "SkyApp Supabase", "mode": "anon"}
        else:
            # Pas de service key: API en mode dégradé mais opérationnelle
            return {"status": "DEGRADED", "database": "ServiceKeyMissing", "service": "SkyApp Supabase", "mode": "anon"}
    except Exception as e:
        return {"status": "ERROR", "database": "Disconnected", "error": str(e)}

# Routes d'authentification
@api_router.post("/auth/register")
async def register(user_data: RegisterRequest, request: Request):
    """Inscription d'un nouvel utilisateur - compte INACTIF jusqu'à vérification email"""
    try:
        import secrets
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        # Créer le compte INACTIF (email_confirm=False → l'utilisateur ne peut pas se connecter)
        auth_response = supabase_service.auth.admin.create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": False
        })
        
        if auth_response.user is None:
            raise HTTPException(status_code=400, detail="Erreur lors de la création du compte")
        
        # Créer ou récupérer l'entreprise
        company_id = None
        if user_data.company_name:
            company_response = supabase_service.table("companies").insert({
                "name": user_data.company_name
            }).execute()
            company_id = company_response.data[0]["id"]
        
        # Rôle: toute personne qui crée un compte devient ADMIN (fondateur inclus)
        role_value = "ADMIN"

        # Générer un token de vérification unique
        verification_token = secrets.token_urlsafe(32)

        # Créer l'entrée utilisateur dans notre table (avec token de vérification)
        user_record = {
            "id": auth_response.user.id,
            "email": user_data.email,
            "first_name": user_data.prenom,
            "last_name": user_data.nom,
            "role": role_value,
            "company_id": company_id,
            "email_verification_token": verification_token
        }
        
        user_response = supabase_service.table("users").insert(user_record).execute()
        
        # Envoyer l'email de vérification via notre SMTP
        frontend_url = os.getenv("FRONTEND_URL", "https://www.skyapp.fr")
        # Construire l'URL de vérification pointant vers le BACKEND (pas le frontend)
        backend_base = os.getenv("BACKEND_URL", str(request.base_url).rstrip('/'))
        verify_url = f"{backend_base}/api/auth/verify-email?token={verification_token}"
        
        smtp_user = os.getenv("SMTP_USER", "contact@skyapp.fr")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        
        if smtp_password:
            try:
                prenom = user_data.prenom or "Utilisateur"
                msg = MIMEMultipart("alternative")
                msg["Subject"] = "SkyApp - Confirmez votre adresse email"
                msg["From"] = f"SkyApp <{smtp_user}>"
                msg["To"] = user_data.email
                
                html_body = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 30px; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1a1a1a; margin: 0;">SkyApp</h1>
                        <p style="color: #666; margin: 5px 0 0;">Plateforme de Gestion BTP</p>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h2 style="color: #1a1a1a; margin-top: 0;">Bonjour {prenom} !</h2>
                        <p style="color: #333; font-size: 16px;">Merci de vous être inscrit sur SkyApp.</p>
                        <p style="color: #333; font-size: 16px;">Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{verify_url}" 
                               style="background-color: #000000; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                                Confirmer mon adresse email
                            </a>
                        </div>
                        <p style="color: #666; font-size: 13px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
                        <p style="color: #999; font-size: 12px; word-break: break-all;">{verify_url}</p>
                    </div>
                    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                        Si vous n'avez pas créé de compte sur SkyApp, ignorez cet email.
                    </p>
                </div>
                """
                text_body = f"Bonjour {prenom},\n\nMerci de vous être inscrit sur SkyApp.\nPour confirmer votre email, cliquez sur ce lien : {verify_url}\n\nL'équipe SkyApp"
                
                msg.attach(MIMEText(text_body, "plain", "utf-8"))
                msg.attach(MIMEText(html_body, "html", "utf-8"))
                
                server = smtplib.SMTP("smtp.gmail.com", 587)
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, user_data.email, msg.as_string())
                server.quit()
                logging.info(f"✅ Email de vérification envoyé à {user_data.email}")
            except Exception as email_err:
                logging.error(f"❌ Email de vérification non envoyé: {email_err}")
        
        return {
            "message": f"Compte créé ! Un email de vérification a été envoyé à {user_data.email}.",
            "access_token": None,
            "token_type": "bearer",
            "user": user_response.data[0],
            "email_confirmed": False,
            "requires_email_verification": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'inscription: {str(e)}")


@api_router.get("/auth/verify-email")
async def verify_email(token: str):
    """Vérifie l'email d'un utilisateur via le token envoyé par email"""
    try:
        # Chercher l'utilisateur avec ce token
        result = supabase_service.table("users").select("*").eq("email_verification_token", token).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Lien de vérification invalide ou expiré")
        
        user = result.data[0]
        user_id = user["id"]
        
        # Confirmer l'email dans Supabase Auth
        supabase_service.auth.admin.update_user_by_id(user_id, {
            "email_confirm": True
        })
        
        # Supprimer le token de vérification dans notre table
        supabase_service.table("users").update({
            "email_verification_token": None
        }).eq("id", user_id).execute()
        
        logging.info(f"✅ Email vérifié pour {user['email']}")
        
        # Rediriger vers la page de connexion avec un message de succès
        frontend_url = os.getenv("FRONTEND_URL", "https://www.skyapp.fr")
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=f"{frontend_url}/?verified=true")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la vérification: {str(e)}")

@api_router.post("/auth/invite")
async def invite_user(invite: InviteRequest, user_data: dict = Depends(get_user_from_token)):
    """Invite un utilisateur (rôle TECHNICIEN = 'User') dans l'entreprise de l'admin.
    Nécessite un ADMIN (ou fondateur). Essaie d'envoyer une invitation via Supabase admin si possible.
    """
    # Vérification rôle
    require_admin(user_data)

    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service key manquante - invitation indisponible")

        # Déterminer l'entreprise de l'admin
        company_id = await get_user_company(user_data)
        if not company_id:
            # Si fondateur sans company_id explicite, on refusera ou on laissera null; ici, on refuse pour éviter données orphelines
            raise HTTPException(status_code=400, detail="L'administrateur n'est rattaché à aucune entreprise")

        # Valider le rôle
        allowed_roles = ["TECHNICIEN", "BUREAU", "ADMIN"]
        role = invite.role if invite.role in allowed_roles else "TECHNICIEN"
        
        # 1) Créer/mettre à jour l'entrée dans la table users avec le rôle spécifié
        payload = {
            "email": invite.email,
            "nom": invite.nom or "",
            "prenom": invite.prenom or "",
            "role": role,
            "company_id": company_id,
        }
        # Utiliser l'email comme clé unique logique, mais la table a id UUID. On upsert via email si contrainte; sinon, on insèrera sans id pour laisser DB générer?
        # Ici, on tente un upsert basé sur email (suppose contrainte unique). Sinon, on recherche d'abord.
        try:
            existing = supabase_service.table("users").select("id").eq("email", invite.email).execute()
            if existing.data:
                # Mise à jour
                supabase_service.table("users").update(payload).eq("email", invite.email).execute()
            else:
                # Insertion (id sera généré côté DB si trigger sinon nous générons un UUID)
                supabase_service.table("users").insert({"id": str(uuid.uuid4()), **payload}).execute()
        except Exception:
            # En dernier recours, insertion simple
            supabase_service.table("users").insert({"id": str(uuid.uuid4()), **payload}).execute()

        # 2) Essayer d'envoyer une invitation via l'API d'admin GoTrue si disponible
        invite_result = None
        try:
            # Certaines versions du client exposent auth.admin
            if hasattr(supabase_service.auth, "admin") and hasattr(supabase_service.auth.admin, "invite_user_by_email"):
                invite_result = supabase_service.auth.admin.invite_user_by_email(invite.email)
        except Exception:
            invite_result = None

        return {"message": "Invitation créée", "email": invite.email, "supabase_invite": bool(invite_result)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'invitation: {str(e)}")

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Connexion utilisateur avec Supabase Auth"""
    try:
        # Connexion avec Supabase
        auth_response = supabase_anon.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        if auth_response.user is None:
            raise HTTPException(status_code=401, detail="Identifiants incorrects")
        
        # Récupérer les informations utilisateur avec tolérance si la clé service est invalide/absente
        full_user = None

        # 1) Essayer via la clé service si disponible
        if supabase_service is not None:
            try:
                user_data = supabase_service.table("users").select("*").eq("id", auth_response.user.id).execute()
                if user_data.data:
                    full_user = user_data.data[0]
            except Exception:
                pass

        # 2) Fallback: tenter via client anonyme (si RLS le permet)
        if full_user is None:
            try:
                user_data = supabase_anon.table("users").select("*").eq("id", auth_response.user.id).execute()
                if user_data.data:
                    full_user = user_data.data[0]
            except Exception:
                pass

        # 3) Dernier recours: composer un utilisateur minimal depuis Supabase Auth
        if full_user is None:
            full_user = {
                "id": auth_response.user.id,
                "email": getattr(auth_response.user, "email", credentials.email),
                "role": None,
                "company_id": None,
            }

        # Marquer fondateur et garantir le rôle ADMIN pour le fondateur
        if (full_user.get("email") or "").lower() == FOUNDER_EMAIL:
            full_user["is_founder"] = True
            full_user["role"] = "ADMIN"
        
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "token": auth_response.session.access_token,  # Rétrocompat
            "user": full_user
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e).lower()
        if "email not confirmed" in error_msg or "email_not_confirmed" in error_msg:
            raise HTTPException(status_code=403, detail="Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception (et vos spams).")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la connexion: {str(e)}")

@api_router.post("/auth/refresh")
async def refresh_token(request: Request):
    """Rafraîchir le token d'accès avec le refresh token"""
    try:
        body = await request.json()
        refresh_token = body.get("refresh_token")
        
        if not refresh_token:
            raise HTTPException(status_code=400, detail="Refresh token requis")
        
        # Rafraîchir la session avec Supabase
        auth_response = supabase_anon.auth.refresh_session(refresh_token)
        
        if not auth_response.session:
            raise HTTPException(status_code=401, detail="Refresh token invalide ou expiré")
        
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "token": auth_response.session.access_token
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du rafraîchissement: {str(e)}")

@api_router.get("/searches")
async def list_searches(
    status: Optional[SearchStatus] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None, description="Recherche textuelle (location/description/observations)"),
    sort_by: str = Query("updated_at"),
    sort_dir: str = Query("desc"),
    user_data: dict = Depends(get_user_from_token)
):
    """Lister les recherches avec pagination / recherche / tri.

    Rétro‑compat: si `page` absent => retourne simplement la liste (comme avant).
    """
    logger.info("=" * 80)
    logger.info("🚀 ENTRÉE DANS list_searches() - FONCTION APPELÉE !")
    logger.info("=" * 80)
    
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service key manquante - impossible de récupérer les recherches")

        company_id = await get_user_company(user_data)
        role = (user_data.get("role") or "").upper()
        user_id = user_data.get('id')
        
        logger.info(f"🟠 ========================================")
        logger.info(f"🟠 list_searches appelé")
        logger.info(f"🟠 User ID: {user_id}")
        logger.info(f"🟠 Role: {role}")
        logger.info(f"🟠 Company ID: {company_id}")
        logger.info(f"🟠 ========================================")
        
        logging.info(f"🔍 list_searches - user_id={user_id}, role={role}, company_id={company_id}")

        allowed_sort_fields = {"updated_at", "created_at", "status", "location"}
        if sort_by not in allowed_sort_fields:
            sort_by = "updated_at"
        desc = (str(sort_dir).lower() != "asc")

        # 🔒 FILTRE PAR RÔLE : 
        # - Tout le monde voit ses propres recherches
        # - Admin/Bureau voient EN PLUS les recherches partagées (SHARED) des autres
        
        if role in ["ADMIN", "BUREAU"]:
            logger.info(f"🔵 ========================================")
            logger.info(f"🔵 list_searches - Admin/Bureau (role={role})")
            logger.info(f"🔵 User ID: {user_id}")
            logger.info(f"🔵 Company ID: {company_id}")
            logging.info(f"👑 list_searches - Admin/Bureau: Recherches personnelles + partagées (role={role})")
            logging.info(f"   User ID: {user_id}")
            logging.info(f"   Company ID: {company_id}")
            
            # Récupérer MES recherches
            my_query = supabase_service.table("searches").select("*")
            if company_id:
                my_query = my_query.eq("company_id", company_id)
            my_query = my_query.eq("user_id", user_id)
            if status is not None:
                my_query = my_query.eq("status", status.value)
            if search:
                term = search.replace("%", "").replace(",", " ").strip()
                if term:
                    my_query = my_query.or_(f"location.ilike.%{term}%,description.ilike.%{term}%,observations.ilike.%{term}%")
            
            # Récupérer les recherches SHARED des autres
            shared_query = supabase_service.table("searches").select("*")
            if company_id:
                shared_query = shared_query.eq("company_id", company_id)
            shared_query = shared_query.eq("status", "SHARED")
            shared_query = shared_query.neq("user_id", user_id)  # Exclure mes propres SHARED (déjà dans my_query)
            if search:
                term = search.replace("%", "").replace(",", " ").strip()
                if term:
                    shared_query = shared_query.or_(f"location.ilike.%{term}%,description.ilike.%{term}%,observations.ilike.%{term}%")
            
            # Exécuter les deux requêtes
            my_results = my_query.execute()
            shared_results = shared_query.execute()
            
            logger.info(f"🔵 ✅ Mes recherches: {len(my_results.data or [])} trouvées")
            for s in (my_results.data or [])[:3]:  # Afficher max 3
                logger.debug(f"🔵    - {s.get('location', 'N/A')[:40]} | Status: {s.get('status')} | User: {s.get('user_id')[:8]}...")
            
            logger.info(f"🔵 ✅ Recherches partagées: {len(shared_results.data or [])} trouvées")
            for s in (shared_results.data or [])[:3]:  # Afficher max 3
                logger.debug(f"🔵    - {s.get('location', 'N/A')[:40]} | Status: {s.get('status')} | User: {s.get('user_id')[:8]}...")
            
            # Fusionner les résultats
            all_items = (my_results.data or []) + (shared_results.data or [])
            
            logger.info(f"🔵 📋 Total à retourner: {len(all_items)} recherches")
            logger.info(f"🔵 ========================================")
            
            logging.info(f"   ✅ Mes recherches: {len(my_results.data or [])} trouvées")
            for s in (my_results.data or [])[:3]:  # Afficher max 3
                logging.info(f"      - {s.get('location', 'N/A')[:40]} | Status: {s.get('status')} | User: {s.get('user_id')[:8]}...")
            
            logging.info(f"   ✅ Recherches partagées: {len(shared_results.data or [])} trouvées")
            for s in (shared_results.data or [])[:3]:  # Afficher max 3
                logging.info(f"      - {s.get('location', 'N/A')[:40]} | Status: {s.get('status')} | User: {s.get('user_id')[:8]}...")
            
            # Fusionner les résultats
            all_items = (my_results.data or []) + (shared_results.data or [])
            
            logging.info(f"   📋 Total à retourner: {len(all_items)} recherches")
            
            # Trier les résultats fusionnés
            all_items.sort(key=lambda x: x.get(sort_by, ''), reverse=desc)
            
            if page is None:
                return {"data": all_items, "count": len(all_items)}
            
            # Pagination manuelle
            offset = (page - 1) * page_size
            items = all_items[offset:offset + page_size]
            has_more = len(all_items) > offset + page_size
            return {"data": items, "page": page, "page_size": page_size, "has_more": has_more, "count": len(items)}
            
        else:
            # Techniciens : uniquement leurs recherches
            logging.info(f"🔒 list_searches - Technicien: Mes recherches uniquement (user_id={user_id})")
            
            query = supabase_service.table("searches").select("*")
            if company_id:
                query = query.eq("company_id", company_id)
            query = query.eq("user_id", user_id)
            
            if status is not None:
                query = query.eq("status", status.value)
            if search:
                term = search.replace("%", "").replace(",", " ").strip()
                if term:
                    query = query.or_(f"location.ilike.%{term}%,description.ilike.%{term}%,observations.ilike.%{term}%")

            query = query.order(sort_by, desc=desc)

            if page is None:
                response = query.execute()
                return {"data": response.data or [], "count": len(response.data or [])}

            offset = (page - 1) * page_size
            response = query.range(offset, offset + page_size - 1).execute()
            items = response.data or []
            has_more = len(items) == page_size
            return {"data": items, "page": page, "page_size": page_size, "has_more": has_more, "count": len(items)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur listing recherches: {str(e)}")

@api_router.post("/searches/draft")
async def create_search_draft(user_data: dict = Depends(get_user_from_token)):
    """Créer un brouillon minimal immédiatement pour auto-save."""
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service Supabase non disponible")

        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez choisir un rôle/entreprise avant de créer une recherche")

        draft_payload = {
            "user_id": user_data["id"],
            "company_id": company_id,
            "location": "",
            "description": "",
            "observations": None,
            "latitude": None,
            "longitude": None,
            "status": SearchStatus.DRAFT.value
        }
        logging.info(f"Creating draft search for user {user_data['id']}, company {company_id}")
        response = supabase_service.table("searches").insert(draft_payload).execute()
        return {"message": "Brouillon créé", "search": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating draft: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Impossible de créer le brouillon: {str(e)}")

@api_router.post("/reports/share-to-bureau")
async def share_to_bureau(data: dict, user_data: dict = Depends(get_user_from_token)):
    """Partage des recherches vers le Bureau"""
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service Supabase non disponible")
        
        search_ids = data.get("search_ids", [])
        logging.info(f"Sharing searches to bureau: {search_ids}")
        if not search_ids:
            raise HTTPException(status_code=400, detail="Aucune recherche sélectionnée")
        
        company_id = await get_user_company(user_data)
        logging.info(f"User company_id: {company_id}, user_id: {user_data.get('id')}")
        
        # Mettre à jour le statut des recherches en "SHARED"
        for search_id in search_ids:
            supabase_service.table("searches")\
                .update({"status": "SHARED", "shared_at": datetime.utcnow().isoformat()})\
                .eq("id", search_id)\
                .eq("user_id", user_data["id"])\
                .eq("company_id", company_id)\
                .execute()
        
        logging.info(f"User {user_data['id']} shared {len(search_ids)} searches to bureau")
        return {"message": f"{len(search_ids)} recherche(s) partagée(s) avec le bureau"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error sharing to bureau: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur lors du partage: {str(e)}")

@api_router.get("/reports/bureau-searches")
async def get_bureau_searches(user_data: dict = Depends(get_user_from_token)):
    """Récupère les recherches partagées pour le bureau"""
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service Supabase non disponible")
        
        # Vérifier que l'utilisateur est BUREAU ou ADMIN
        if user_data.get("role") not in ["BUREAU", "ADMIN"]:
            raise HTTPException(status_code=403, detail="Accès réservé au bureau/admin")
        
        company_id = await get_user_company(user_data)
        
        # Récupérer les recherches partagées
        response = supabase_service.table("searches")\
            .select("*")\
            .eq("company_id", company_id)\
            .eq("status", "SHARED")\
            .order("shared_at", desc=True)\
            .execute()
        
        # Récupérer les infos des techniciens séparément
        searches = response.data
        for search in searches:
            if search.get("user_id"):
                user_resp = supabase_service.table("users").select("first_name, last_name, email").eq("id", search["user_id"]).execute()
                if user_resp.data:
                    search["user"] = user_resp.data[0]
        
        return {"searches": response.data}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting bureau searches: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.post("/searches/{search_id}/convert-to-project")
async def convert_search_to_project(search_id: str, request: dict = None, user_data: dict = Depends(get_user_from_token)):
    """Transformer une recherche en projet"""
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service Supabase non disponible")
        
        # Récupérer les données de projet personnalisées si fournies
        project_custom_data = request.get("project_data", {}) if request else {}
        
        company_id = await get_user_company(user_data)
        
        # Vérifier que la recherche existe et appartient à la company
        search_response = supabase_service.table("searches")\
            .select("*")\
            .eq("id", search_id)\
            .eq("company_id", company_id)\
            .execute()
        
        if not search_response.data:
            raise HTTPException(status_code=404, detail="Recherche introuvable")
        
        search_data = search_response.data[0]
        
        # Vérifier si un projet existe déjà pour cette recherche
        # 1. Vérifier par project_id de la recherche
        if search_data.get("project_id"):
            check_project = supabase_service.table("projects")\
                .select("id, name")\
                .eq("id", search_data["project_id"])\
                .eq("company_id", company_id)\
                .execute()
            
            if check_project.data:
                # Le projet existe vraiment pour cette company
                return {
                    "message": "Un projet existe déjà pour cette recherche",
                    "project": check_project.data[0],
                    "project_id": check_project.data[0]["id"]
                }
            else:
                # Le project_id existe mais le projet n'existe pas pour cette company, réinitialiser
                logging.warning(f"⚠️ Recherche {search_id} a un project_id invalide ou inaccessible, réinitialisation...")
                supabase_service.table("searches")\
                    .update({"project_id": None})\
                    .eq("id", search_id)\
                    .execute()
        
        # 2. Vérifier par search_id dans les projets de cette company
        existing_project = supabase_service.table("projects")\
            .select("id, name")\
            .eq("search_id", search_id)\
            .eq("company_id", company_id)\
            .execute()
        
        if existing_project.data:
            # Mettre à jour le project_id de la recherche
            supabase_service.table("searches")\
                .update({"project_id": existing_project.data[0]["id"]})\
                .eq("id", search_id)\
                .execute()
            
            return {
                "message": "Un projet existe déjà pour cette recherche",
                "project": existing_project.data[0],
                "project_id": existing_project.data[0]["id"]
            }
        
        # Gérer le client : utiliser existant ou créer un client non-récurrent
        client_id = project_custom_data.get("client_id") if project_custom_data else None
        client_info = ""
        
        # Si pas de client_id fourni mais qu'on a nom/prénom, créer un client non-récurrent
        if not client_id and (search_data.get("nom") or search_data.get("prenom")):
            nom = search_data.get("nom", "").strip()
            prenom = search_data.get("prenom", "").strip()
            full_name = f"{prenom} {nom}".strip()
            
            if full_name:
                logging.info(f"📋 Création client non-récurrent: {full_name}")
                
                # Créer le client avec is_recurring = false
                client_data = {
                    "company_id": company_id,
                    "nom": nom or "Non renseigné",
                    "prenom": prenom,
                    "email": search_data.get("email") or f"client_{search_id[:8]}@temp.local",
                    "telephone": search_data.get("telephone"),
                    "adresse": search_data.get("location"),
                    "is_recurring": False
                }
                
                try:
                    client_result = supabase_service.table("clients").insert(client_data).execute()
                    if client_result.data:
                        client_id = client_result.data[0]["id"]
                        logging.info(f"✅ Client non-récurrent créé: {client_id}")
                        client_info = full_name
                except Exception as e:
                    logging.warning(f"⚠️ Impossible de créer le client non-récurrent: {e}")
                    client_info = full_name
        
        # Créer le nom du projet (utiliser les données personnalisées si fournies)
        if project_custom_data.get("name"):
            project_name = project_custom_data["name"]
        else:
            project_name_parts = []
            if search_data.get("prenom") or search_data.get("nom"):
                project_name_parts.append(f"{search_data.get('prenom', '')} {search_data.get('nom', '')}".strip())
            if search_data.get("location"):
                location_short = search_data.get("location")[:50]
                project_name_parts.append(location_short)
            
            project_name = " - ".join(project_name_parts) if project_name_parts else "Nouveau projet"
        
        # Créer le projet avec les données personnalisées ou par défaut
        project_data = {
            "company_id": company_id,
            "name": project_name,
            "search_id": search_id,
            "status": project_custom_data.get("status", "RECHERCHE"),
            "category": project_custom_data.get("category", search_data.get("search_type", "TERRAIN")),
            "priority": project_custom_data.get("priority", "NORMAL"),
            "created_by": user_data.get("id")
        }
        
        # Ajouter client_id seulement si on en a un
        if client_id:
            project_data["client_id"] = client_id
        
        # Ajouter les champs optionnels seulement s'ils sont fournis
        if project_custom_data.get("estimated_value"):
            project_data["estimated_value"] = project_custom_data.get("estimated_value")
        
        project_result = supabase_service.table("projects").insert(project_data).execute()
        
        if not project_result.data:
            raise HTTPException(status_code=500, detail="Erreur lors de la création du projet")
        
        project = project_result.data[0]
        project_id = project["id"]
        
        # Mettre à jour la recherche avec le project_id
        supabase_service.table("searches")\
            .update({"project_id": project_id})\
            .eq("id", search_id)\
            .execute()
        
        # Ajouter une note automatique
        note_content = f"✨ Projet créé depuis la recherche partagée\n📍 Adresse: {search_data.get('location', 'N/A')}"
        if client_info:
            note_content += f"\n👤 Client: {client_info}"
        if search_data.get('description'):
            note_content += f"\n📝 Description: {search_data.get('description', 'N/A')[:200]}"
        
        supabase_service.table("project_notes").insert({
            "project_id": project_id,
            "user_id": user_data.get("id"),
            "content": note_content,
            "note_type": "STATUS_CHANGE"
        }).execute()
        
        logging.info(f"✅ Projet créé: {project_id} depuis recherche {search_id} - Lien établi")
        
        return {
            "message": "Projet créé avec succès",
            "project": project
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error converting search to project: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@app.get("/api/searches")
async def get_searches(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    without_client: Optional[bool] = False,
    converted: Optional[bool] = None,
    user_data: dict = Depends(get_user_from_token)
):
    """Récupère les recherches avec filtres optionnels"""
    try:
        company_id = user_data.get("company_id")
        user_id = user_data.get("id")
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id manquant")
        
        logger.info(f"🟢 ========================================")
        logger.info(f"🟢 /api/searches appelé (endpoint principal)")
        logger.info(f"🟢 User ID: {user_id}")
        logger.info(f"🟢 Role: {user_data.get('role', 'TECHNICIEN')}")
        logger.info(f"🟢 ========================================")
        
        # 🔒 FILTRE PAR RÔLE : 
        # - Admin/Bureau : MES recherches + SHARED des autres
        # - Technicien : MES recherches uniquement
        user_role = user_data.get("role", "TECHNICIEN")
        
        if user_role in ["ADMIN", "BUREAU"]:
            logger.info(f"🔵 Admin/Bureau détecté - Deux requêtes (mes recherches + SHARED)")
            logging.info(f"👑 [/api/searches] Admin/Bureau: Mes recherches + SHARED des autres (role={user_role})")
            
            # 1️⃣ MES recherches (tous statuts)
            my_query = supabase_service.table("searches").select("*").eq("company_id", company_id).eq("user_id", user_id)
            
            if without_client:
                my_query = my_query.is_("client_id", None)
            elif client_id:
                my_query = my_query.eq("client_id", client_id)
            
            if status:
                my_query = my_query.eq("status", status)
            
            if converted is True:
                my_query = my_query.not_.is_("project_id", None)
            elif converted is False:
                my_query = my_query.is_("project_id", None)
            
            my_results = my_query.order("created_at", desc=True).execute()
            
            # 2️⃣ Recherches SHARED des autres utilisateurs
            shared_query = supabase_service.table("searches").select("*").eq("company_id", company_id).eq("status", "SHARED").neq("user_id", user_id)
            
            if without_client:
                shared_query = shared_query.is_("client_id", None)
            elif client_id:
                shared_query = shared_query.eq("client_id", client_id)
            
            if converted is True:
                shared_query = shared_query.not_.is_("project_id", None)
            elif converted is False:
                shared_query = shared_query.is_("project_id", None)
            
            shared_results = shared_query.order("created_at", desc=True).execute()
            
            # Fusionner les résultats
            all_searches = (my_results.data or []) + (shared_results.data or [])
            
            logger.info(f"🔵 Mes recherches: {len(my_results.data or [])} trouvées")
            logger.info(f"🔵 Recherches SHARED: {len(shared_results.data or [])} trouvées")
            logger.info(f"🔵 Total retourné: {len(all_searches)} recherches")
            
            return {"data": all_searches, "count": len(all_searches)}
        
        else:
            # 👤 TECHNICIEN : Uniquement ses propres recherches
            logger.info(f"🟡 Technicien détecté - Une seule requête (mes recherches)")
            logging.info(f"🔒 [/api/searches] Technicien: Filtre par user_id={user_id}")
            
            query = supabase_service.table("searches").select("*").eq("company_id", company_id).eq("user_id", user_id)
            
            if without_client:
                query = query.is_("client_id", None)
            elif client_id:
                query = query.eq("client_id", client_id)
            
            if status:
                query = query.eq("status", status)
            
            if converted is True:
                query = query.not_.is_("project_id", None)
            elif converted is False:
                query = query.is_("project_id", None)
            
            result = query.order("created_at", desc=True).execute()
            
            logger.info(f"🟡 Résultats technicien: {len(result.data or [])} recherches")
            
            return {"data": result.data or [], "count": len(result.data or [])}
    
    except Exception as e:
        logging.error(f"Error fetching searches: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@app.get("/api/projects")
async def get_projects(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    user_data: dict = Depends(get_user_from_token)
):
    """Récupère les projets avec filtres optionnels"""
    try:
        company_id = user_data.get("company_id")
        user_id = user_data.get("id")
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id manquant")
        
        query = supabase_service.table("projects").select("*").eq("company_id", company_id)
        
        # 🔒 FILTRE PAR RÔLE : Admin/Bureau voient tout, techniciens voient leurs projets
        user_role = user_data.get("role", "TECHNICIEN")
        if user_role in ["ADMIN", "BUREAU"]:
            logging.info(f"👑 [/api/projects] Admin/Bureau: TOUS les projets visibles (role={user_role})")
        else:
            logging.info(f"🔒 [/api/projects] Technicien: Filtre par user_id={user_id}")
            query = query.eq("user_id", user_id)
        
        if client_id:
            query = query.eq("client_id", client_id)
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("created_at", desc=True).execute()
        return {"data": result.data or [], "count": len(result.data or [])}
    
    except Exception as e:
        logging.error(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# ============================================================================
# ENDPOINTS IA INTELLIGENTS - Architecture économique GPT-4o-mini (95%)
# ============================================================================

class AIQueryModel(BaseModel):
    """Requête IA universelle"""
    query: str = Field(..., description="Question ou commande en langage naturel")
    conversation_history: Optional[List[Dict]] = Field(default=None, description="Historique conversation (optionnel)")

@api_router.post("/ai/query")
async def ai_universal_query(data: AIQueryModel, user_data: dict = Depends(get_user_from_token)):
    """
    🤖 RECHERCHE UNIVERSELLE IA
    
    L'utilisateur pose une question en langage naturel:
    - "Montre-moi les devis de Dupont à Mennecy"
    - "Quelles sont les recherches terrain terminées la semaine dernière à St-Fargeau?"
    - "Statistiques du mois"
    
    Architecture 2 étapes:
    1. Filtrage local Supabase (pas de coût IA)
    2. IA décide sur 3-10 résultats max
    
    Modèle: GPT-4o-mini (95% des requêtes) - ultra économique
    """
    try:
        if not AI_SERVICE_AVAILABLE:
            return {
                "success": False,
                "message": "Service IA non disponible. Contactez l'administrateur."
            }
        
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Entreprise non trouvée")
        
        ai_service = get_ai_service()
        result = await ai_service.universal_query(
            company_id=company_id,
            user_query=data.query,
            user_role=user_data.get("role", "TECHNICIEN"),
            conversation_history=data.conversation_history
        )
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur AI query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur IA: {str(e)}")

@api_router.post("/ai/devis")
async def ai_generate_devis(
    client_id: str = Query(..., description="ID du client"),
    description: str = Query(..., description="Description des travaux"),
    user_data: dict = Depends(get_user_from_token)
):
    """
    📝 GÉNÉRATION AUTOMATIQUE DE DEVIS
    
    L'IA:
    1. Cherche des devis similaires dans l'historique
    2. Copie les lignes de travail pertinentes
    3. Ajuste quantités et prix selon le contexte
    4. Propose un devis pré-rempli prêt à valider
    
    Exemple:
    - description: "Réparation fissure + traitement humidité 30m²"
    - Retour: devis avec lignes, prix, TVA calculée
    """
    try:
        if not AI_SERVICE_AVAILABLE:
            return {
                "success": False,
                "message": "Service IA non disponible"
            }
        
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Entreprise non trouvée")
        
        # Vérifier que le client appartient à l'entreprise
        client_check = supabase_service.table("clients").select("id").eq("id", client_id).eq("company_id", company_id).execute()
        if not client_check.data:
            raise HTTPException(status_code=404, detail="Client non trouvé dans votre entreprise")
        
        ai_service = get_ai_service()
        result = await ai_service._generate_devis_draft(company_id, client_id, description)
        
        return {
            "success": True,
            "devis_draft": result,
            "message": "Brouillon de devis généré. Vérifiez et ajustez avant validation."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur génération devis IA: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/planning")
async def ai_planning_assistant(
    action: str = Query(..., description="suggest_slots | detect_conflicts | optimize"),
    date_from: Optional[str] = Query(None, description="Date début (ISO)"),
    date_to: Optional[str] = Query(None, description="Date fin (ISO)"),
    user_data: dict = Depends(get_user_from_token)
):
    """
    📅 ASSISTANT PLANNING INTELLIGENT
    
    Actions:
    - suggest_slots: Propose créneaux optimaux pour techniciens disponibles
    - detect_conflicts: Détecte conflits dans le planning
    - optimize: Optimise les déplacements et l'organisation
    """
    try:
        if not AI_SERVICE_AVAILABLE:
            return {"success": False, "message": "Service IA non disponible"}
        
        company_id = await get_user_company(user_data)
        
        # Pour l'instant, utiliser la recherche planning standard
        ai_service = get_ai_service()
        filters = {}
        if date_from:
            filters["date_from"] = date_from
        if date_to:
            filters["date_to"] = date_to
        
        schedules = await ai_service._search_planning(company_id, filters)
        
        if action == "detect_conflicts":
            # Détecter conflits (même technicien, même jour, heures qui se chevauchent)
            conflicts = []
            for i, s1 in enumerate(schedules):
                for s2 in schedules[i+1:]:
                    if s1.get("user_id") == s2.get("user_id") and s1.get("date") == s2.get("date"):
                        conflicts.append({
                            "schedule1": s1,
                            "schedule2": s2,
                            "reason": "Même technicien, même jour"
                        })
            
            return {
                "success": True,
                "action": action,
                "conflicts": conflicts,
                "total_conflicts": len(conflicts)
            }
        
        elif action == "suggest_slots":
            # Suggérer créneaux libres
            return {
                "success": True,
                "action": action,
                "message": "Fonctionnalité en développement - bientôt disponible",
                "current_schedules": len(schedules)
            }
        
        else:
            return {
                "success": True,
                "action": action,
                "schedules": schedules,
                "total": len(schedules)
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur planning IA: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/rapport/{search_id}")
async def ai_analyze_rapport(
    search_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """
    📊 ANALYSE INTELLIGENTE DE RAPPORT TERRAIN
    
    L'IA (GPT-4o pour documents complexes):
    - Résume immédiatement le rapport
    - Détecte problèmes et anomalies
    - Évalue la dangerosité/urgence
    - Recommande actions à faire
    - Identifie matériel nécessaire
    
    Exemple:
    - Input: "Fissure mur porteur + humidité 30%"
    - Output: Analyse détaillée + recommandations + niveau urgence
    """
    try:
        if not AI_SERVICE_AVAILABLE:
            return {"success": False, "message": "Service IA non disponible"}
        
        company_id = await get_user_company(user_data)
        
        # Vérifier que la recherche appartient à l'entreprise
        search_check = supabase_service.table("searches").select("id").eq("id", search_id).eq("company_id", company_id).execute()
        if not search_check.data:
            raise HTTPException(status_code=404, detail="Rapport non trouvé dans votre entreprise")
        
        ai_service = get_ai_service()
        analysis = await ai_service._analyze_rapport(company_id, search_id)
        
        return {
            "success": True,
            "search_id": search_id,
            "analysis": analysis,
            "message": "Rapport analysé par IA"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur analyse rapport IA: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ai/client/{client_id}/insights")
async def ai_client_insights(
    client_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """
    👤 INSIGHTS CLIENT INTELLIGENTS
    
    Analyse:
    - Historique achats et comportement
    - Chiffre d'affaires généré
    - Fréquence et régularité
    - Recommandations (relance, offre spéciale, etc.)
    - Détection client "important" ou "à risque"
    """
    try:
        if not AI_SERVICE_AVAILABLE:
            return {"success": False, "message": "Service IA non disponible"}
        
        company_id = await get_user_company(user_data)
        
        ai_service = get_ai_service()
        client_details = await ai_service._get_client_details(company_id, client_id)
        
        if not client_details:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        # Analyse basique (à enrichir avec GPT si besoin)
        total_amount = client_details.get("total_amount", 0)
        total_quotes = client_details.get("total_quotes", 0)
        
        insights = {
            "client_id": client_id,
            "total_amount": total_amount,
            "total_quotes": total_quotes,
            "average_quote": total_amount / max(1, total_quotes),
            "status": "VIP" if total_amount > 10000 else "STANDARD" if total_amount > 2000 else "NOUVEAU",
            "recommendations": []
        }
        
        if total_quotes == 0:
            insights["recommendations"].append("Premier devis - Bien accueillir ce nouveau client")
        elif total_amount > 10000:
            insights["recommendations"].append("Client VIP - Priorité maximale")
        
        return {
            "success": True,
            "insights": insights,
            "client_details": client_details
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur insights client: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ai/predictions")
async def ai_predictions(
    prediction_type: str = Query("delays", description="delays | payment_defaults | stock_needs"),
    user_data: dict = Depends(get_user_from_token)
):
    """
    🔮 IA PRÉDICTIVE
    
    Prédictions basées sur l'historique:
    - delays: Anticipe les retards de projets
    - payment_defaults: Prédit défauts de paiement
    - stock_needs: Anticipe besoins matériels
    
    Nécessite quelques mois de données pour précision.
    """
    try:
        if not AI_SERVICE_AVAILABLE:
            return {"success": False, "message": "Service IA non disponible"}
        
        company_id = await get_user_company(user_data)
        ai_service = get_ai_service()
        
        if prediction_type == "delays":
            predictions = await ai_service._predict_delays(company_id)
        else:
            predictions = {
                "message": f"Prédiction '{prediction_type}' en développement",
                "available_soon": True
            }
        
        return {
            "success": True,
            "prediction_type": prediction_type,
            "predictions": predictions
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur prédictions IA: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/improve-text")
async def ai_improve_text(
    text: str = Query(..., description="Texte à améliorer (rapport technicien)"),
    user_data: dict = Depends(get_user_from_token)
):
    """
    ✨ CORRECTION ORTHOGRAPHIQUE & AMÉLIORATION TEXTE TECHNICIEN
    
    Améliore automatiquement les rapports techniciens:
    - Correction orthographe et grammaire
    - Réécriture professionnelle
    - Clarification des phrases
    - Terminologie BTP appropriée
    
    Exemple:
    Entrée: "jai fé le travail ojourdui sa c bien passé"
    Sortie: "J'ai effectué les travaux aujourd'hui. L'intervention s'est déroulée sans incident."
    """
    try:
        if not AI_SERVICE_AVAILABLE:
            return {
                "success": False,
                "original": text,
                "improved": text,
                "message": "Service IA non disponible. Texte non modifié."
            }
        
        ai_service = get_ai_service()
        
        # Utiliser GPT-4o-mini pour correction rapide et économique
        messages = [
            {
                "role": "system",
                "content": """Tu es un assistant qui améliore les rapports de techniciens BTP.

RÈGLES:
1. Corrige TOUTES les fautes d'orthographe et de grammaire
2. Réécris de manière professionnelle mais concise
3. Garde le sens exact du message original
4. Utilise le vocabulaire BTP approprié
5. Structure en phrases courtes et claires
6. NE PAS inventer d'informations
7. Si le texte est déjà correct, retourne-le tel quel

FORMAT DE RÉPONSE:
Retourne UNIQUEMENT le texte amélioré, sans préambule ni explication."""
            },
            {
                "role": "user",
                "content": f"Améliore ce rapport technicien:\n\n{text}"
            }
        ]
        
        result = await ai_service.chat_completion(messages, use_functions=False)
        improved_text = result.choices[0].message.content.strip()
        
        return {
            "success": True,
            "original": text,
            "improved": improved_text,
            "tokens": result.usage.total_tokens,
            "cost_euros": result.usage.total_tokens * 0.15 / 1000000
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur amélioration texte IA: {e}")
        return {
            "success": False,
            "original": text,
            "improved": text,
            "message": f"Erreur: {str(e)}"
        }

@api_router.get("/ai/stats")
async def ai_stats(user_data: dict = Depends(get_user_from_token)):
    """
    📊 STATISTIQUES D'UTILISATION IA
    
    Monitoring:
    - Nombre de requêtes
    - Cache hit rate
    - Tokens utilisés
    - Coût estimé
    """
    try:
        if not AI_SERVICE_AVAILABLE:
            return {"success": False, "message": "Service IA non disponible"}
        
        # Vérifier rôle ADMIN ou BUREAU
        if user_data.get("role") not in ["ADMIN", "BUREAU"]:
            raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
        
        ai_service = get_ai_service()
        stats = ai_service.get_stats()
        
        return {
            "success": True,
            "stats": stats,
            "mode": "simulation" if ai_service.simulation_mode else "production"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur stats IA: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/invitations/{invitation_id}/accept")
async def accept_invitation(invitation_id: str, user_data: dict = Depends(get_user_from_token)):
    """Accepte une invitation Supabase et rattache l'utilisateur à l'entreprise."""
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service key manquante - invitations indisponibles")

        email = (user_data.get("email") or "").lower()
        inv_res = supabase_service.table("invitations").select("*").eq("id", invitation_id).limit(1).execute()
        invitation = (inv_res.data or [None])[0] if hasattr(inv_res, "data") else None
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation introuvable")
        if (invitation.get("email") or "").lower() != email:
            raise HTTPException(status_code=403, detail="Invitation non destinée à cet utilisateur")
        if invitation.get("status") not in (None, "PENDING", "PENDING_ACCEPT"):
            raise HTTPException(status_code=400, detail="Invitation déjà traitée")

        company_id = invitation.get("company_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Invitation invalide: entreprise manquante")

        invited_role = (invitation.get("role") or "TECHNICIEN").upper()
        if invited_role not in {"ADMIN", "BUREAU", "TECHNICIEN"}:
            invited_role = "TECHNICIEN"
        # Règle métier: les invitations bureau deviennent technicien par défaut sauf si fondateur
        if invited_role == "BUREAU" and email != FOUNDER_EMAIL:
            invited_role = "TECHNICIEN"

        # Mettre à jour l'utilisateur
        try:
            supabase_service.table("users").update({
                "company_id": company_id,
                "role": invited_role
            }).eq("id", user_data.get("id")).execute()
        except Exception as update_error:
            raise HTTPException(status_code=500, detail=f"Impossible de rattacher l'utilisateur: {update_error}")

        # Marquer l'invitation comme acceptée
        try:
            supabase_service.table("invitations").update({
                "status": "ACCEPTED",
                "accepted_at": datetime.utcnow().isoformat(),
                "accepted_by": user_data.get("id")
            }).eq("id", invitation_id).execute()
        except Exception:
            pass  # non bloquant

        return {"message": "Invitation acceptée", "company_id": company_id, "role": invited_role}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'acceptation de l'invitation: {str(e)}")

@api_router.post("/invitations/{invitation_id}/decline")
async def decline_invitation(invitation_id: str, user_data: dict = Depends(get_user_from_token)):
    """Refuse une invitation Supabase."""
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service key manquante - invitations indisponibles")

        email = (user_data.get("email") or "").lower()
        inv_res = supabase_service.table("invitations").select("*").eq("id", invitation_id).limit(1).execute()
        invitation = (inv_res.data or [None])[0] if hasattr(inv_res, "data") else None
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation introuvable")
        if (invitation.get("email") or "").lower() != email:
            raise HTTPException(status_code=403, detail="Invitation non destinée à cet utilisateur")

        try:
            supabase_service.table("invitations").update({
                "status": "DECLINED",
                "declined_at": datetime.utcnow().isoformat(),
                "declined_by": user_data.get("id")
            }).eq("id", invitation_id).execute()
        except Exception as update_error:
            raise HTTPException(status_code=500, detail=f"Impossible de refuser l'invitation: {update_error}")

        return {"message": "Invitation refusée"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du refus de l'invitation: {str(e)}")

# Routes pour les entreprises
@api_router.get("/companies")
async def get_companies(user_data: dict = Depends(get_user_from_token)):
    """Récupérer la liste des entreprises"""
    try:
        # Réservé aux administrateurs (le fondateur est traité comme admin)
        require_admin(user_data)
        response = supabase_service.table("companies").select("*").execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des entreprises: {str(e)}")

# Routes pour les utilisateurs
@api_router.get("/users")
async def get_users(user_data: dict = Depends(get_user_from_token)):
    """Récupérer la liste des utilisateurs de l'entreprise"""
    try:
        # Réservé aux administrateurs; si admin avec company_id -> liste limitée à son entreprise
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        logging.info(f"📋 GET /users - company_id: {company_id}")
        if company_id:
            response = supabase_service.table("users").select("*").eq("company_id", company_id).execute()
            logging.info(f"📋 GET /users - {len(response.data)} utilisateurs trouvés")
        else:
            response = supabase_service.table("users").select("*").execute()
            logging.info(f"📋 GET /users - {len(response.data)} utilisateurs trouvés (tous)")
        
        # Ajouter le champ is_invited pour chaque utilisateur
        # Un utilisateur est "invité" s'il a été créé via une invitation
        # On vérifie dans la table invitations avec un status 'accepted'
        try:
            invitations_response = supabase_service.table("invitations").select("user_id").eq("status", "accepted").execute()
            invited_user_ids = set(inv.get("user_id") for inv in invitations_response.data if inv.get("user_id"))
        except Exception as inv_error:
            logger.warning(f"Erreur lors de la récupération des invitations: {inv_error}")
            # Fallback: un utilisateur est invité si son email n'est pas @temp-skyapp.local
            invited_user_ids = set()
        
        # Ajouter le statut is_invited à chaque utilisateur
        users_with_invite_status = []
        for user in response.data:
            user_copy = dict(user)
            user_id = user.get("id")
            email = user.get("email", "")
            
            # Un utilisateur est invité s'il est dans la table invitations OU s'il a un vrai email
            if invited_user_ids:
                user_copy["is_invited"] = user_id in invited_user_ids
            else:
                # Fallback: vérifier l'email
                user_copy["is_invited"] = email and "@temp-skyapp.local" not in email.lower()
            
            users_with_invite_status.append(user_copy)
        
        return users_with_invite_status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des utilisateurs: {str(e)}")

@api_router.post("/users")
async def create_user(request: Request, user_data: dict = Depends(get_user_from_token)):
    """Créer un nouveau collaborateur (technicien)"""
    import sys
    logger.info("=" * 80)
    logger.info(f"🔥 POST /api/users - Création collaborateur")
    try:
        # Vérifier que l'utilisateur est ADMIN ou BUREAU
        user_role = user_data.get("role")
        logger.info(f"✅ User role: {user_role}")
        if user_role not in ["ADMIN", "BUREAU"]:
            raise HTTPException(status_code=403, detail="Seuls les administrateurs et le bureau peuvent créer des collaborateurs")
        
        body = await request.json()
        logger.info(f"📦 Body reçu: {body}")
        
        # Validation des champs requis
        if not body.get("first_name") or not body.get("last_name"):
            raise HTTPException(status_code=400, detail="Le prénom et le nom sont requis")
        
        # Récupérer le company_id de l'utilisateur connecté
        company_id = await get_user_company(user_data)
        logger.info(f"🏢 Company ID: {company_id}")
        if not company_id:
            raise HTTPException(status_code=400, detail="Impossible de déterminer l'entreprise")
        
        # Générer un email si non fourni
        email = body.get("email")
        if not email or not email.strip():
            # Format: prenom.nom@temp-skyapp.local
            first = body["first_name"].lower().replace(" ", "")
            last = body["last_name"].lower().replace(" ", "")
            email = f"{first}.{last}@temp-skyapp.local"
        
        logger.info(f"📧 Email: {email}")
        
        # Rôle par défaut: TECHNICIEN
        role = body.get("role", "TECHNICIEN")
        if role not in ["TECHNICIEN", "BUREAU", "ADMIN"]:
            role = "TECHNICIEN"
        
        # OPTION : Créer un compte auth.users si mot de passe fourni
        # Pour l'instant, on garde le système simple (profils sans auth)
        # Les collaborateurs sont créés directement dans public.users
        # Seuls les ADMIN/BUREAU passent par /auth/register avec compte auth
        
        # Note: Si besoin de comptes auth pour tous les collaborateurs plus tard,
        # décommenter le code ci-dessous et utiliser l'endpoint /auth/invite
        
        # Préparer les données pour insertion (sans skills pour l'instant)
        new_user = {
            "email": email,
            "first_name": body["first_name"],
            "last_name": body["last_name"],
            "phone": body.get("phone") or "",
            "address": body.get("address") or "",
            "role": role,
            "company_id": company_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"💾 Tentative insertion: {new_user}")
        # Insérer dans Supabase
        response = supabase_service.table("users").insert(new_user).execute()
        logger.info(f"✅ Response data: {response.data}")
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Échec de la création de l'utilisateur")
        
        created_user = response.data[0]
        
        # Si team_leader_id fourni, assigner au chef d'équipe
        team_leader_id = body.get("team_leader_id")
        if team_leader_id:
            try:
                assignment = {
                    "team_leader_id": team_leader_id,
                    "collaborator_id": created_user["id"],
                    "assigned_by": user_data.get("id"),
                    "assigned_at": datetime.now(timezone.utc).isoformat(),
                    "is_active": True,
                    "notes": body.get("notes", "")
                }
                supabase_service.table("team_leader_collaborators").insert(assignment).execute()
            except Exception as e:
                # Ne pas bloquer la création si l'assignation échoue
                logger.warning(f"Avertissement: assignation échouée - {str(e)}")
        
        logger.info(f"✅ Collaborateur créé avec succès: {created_user['id']}")
        logger.info("=" * 80)
        return created_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ ERREUR: {str(e)}")
        logger.error(f"❌ Type: {type(e)}")
        import traceback
        traceback.print_exc(file=sys.stderr)
        logger.info("=" * 80)
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du collaborateur: {str(e)}")

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user_data: dict = Depends(get_user_from_token)):
    """Supprimer un utilisateur (collaborateur)"""
    try:
        # Vérifier que l'utilisateur est ADMIN ou BUREAU
        user_role = user_data.get("role")
        if user_role not in ["ADMIN", "BUREAU"]:
            raise HTTPException(status_code=403, detail="Seuls les administrateurs et le bureau peuvent supprimer des utilisateurs")
        
        # Vérifier le rôle de l'utilisateur à supprimer
        user_to_delete = supabase_service.table("users").select("role").eq("id", user_id).execute()
        if not user_to_delete.data:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        target_role = user_to_delete.data[0].get("role")
        
        # BUREAU ne peut pas supprimer un ADMIN
        if user_role == "BUREAU" and target_role == "ADMIN":
            raise HTTPException(status_code=403, detail="Le bureau ne peut pas supprimer un compte administrateur")
        
        # Supprimer l'utilisateur
        response = supabase_service.table("users").delete().eq("id", user_id).execute()
        
        return {"message": "Utilisateur supprimé avec succès", "id": user_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

@api_router.put("/users/me")
async def update_my_profile(request: Request, user_data: dict = Depends(get_user_from_token)):
    """Mettre à jour le profil de l'utilisateur connecté"""
    import sys
    logger.info("=" * 80)
    logger.info(f"🔥🔥🔥 DEBUT DE LA FONCTION update_my_profile 🔥🔥🔥")
    logger.debug(f"✅ User data: {user_data}")
    logger.debug(f"✅ Type user_data: {type(user_data)}")
    logger.info("=" * 80)
    
    # Vérification si user_data est valide
    if not user_data or not isinstance(user_data, dict):
        logger.error(f"❌ ERREUR: user_data invalide: {user_data}")
        raise HTTPException(status_code=401, detail="Authentification invalide")
    
    try:
        # Lire le body manuellement
        body = await request.json()
        logger.debug(f"📦 Body reçu: {body}")
        
        if supabase_service is None:
            logger.error("❌ supabase_service est None!")
            raise HTTPException(status_code=503, detail="Service Supabase non disponible")
        
        logger.debug("✅ supabase_service est disponible")
        
        user_id = user_data.get("id")
        user_role = user_data.get("role")
        company_id = user_data.get("company_id")
        logger.info(f"📝 User ID: {user_id}, Role: {user_role}, Company ID: {company_id}")
        
        # Filtrer uniquement les champs autorisés et non vides
        allowed_fields = {'first_name', 'last_name', 'phone', 'address'}
        update_data = {k: v for k, v in body.items() if k in allowed_fields and v is not None and str(v).strip() != ''}
        
        # Si l'utilisateur est ADMIN et veut changer le nom de l'entreprise
        if 'company_name' in body and body['company_name'] and str(body['company_name']).strip() != '':
            if user_role != 'ADMIN':
                raise HTTPException(status_code=403, detail="Seuls les admins peuvent modifier le nom de l'entreprise")
            if not company_id:
                raise HTTPException(status_code=400, detail="Aucune entreprise associée à cet utilisateur")
            
            # Mettre à jour le nom de l'entreprise dans la table companies
            try:
                company_update = supabase_service.table("companies").update({
                    "name": body['company_name'].strip()
                }).eq("id", company_id).execute()
                logger.info(f"✅ Nom d'entreprise mis à jour: {body['company_name']}")
            except Exception as company_error:
                logger.error(f"❌ ERREUR lors de la mise à jour du nom d'entreprise: {str(company_error)}")
                raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour du nom d'entreprise: {str(company_error)}")
        
        logger.debug(f"📦 Update data: {update_data}")
        
        if not update_data:
            # Si seulement le nom de l'entreprise a été mis à jour
            if user_role == 'ADMIN' and 'company_name' in body:
                return {"message": "Nom de l'entreprise mis à jour avec succès"}
            raise HTTPException(status_code=400, detail="Aucune donnée valide à mettre à jour")
        
        try:
            response = supabase_service.table("users").update(update_data).eq("id", user_id).execute()
            logger.debug(f"📊 Response de Supabase: {response}")
        except Exception as supabase_error:
            logger.error(f"❌ ERREUR SUPABASE: {str(supabase_error)}")
            error_msg = str(supabase_error)
            if "column" in error_msg.lower() and "does not exist" in error_msg.lower():
                raise HTTPException(
                    status_code=500, 
                    detail=f"Colonnes manquantes dans la table users de Supabase. Erreur: {error_msg}"
                )
            raise HTTPException(status_code=500, detail=f"Erreur Supabase: {error_msg}")
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Profil non trouvé")
        
        return {
            "message": "Profil mis à jour avec succès",
            "user": response.data[0]
        }
    except HTTPException as he:
        logger.error(f"❌ HTTPException dans update_my_profile: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"❌ ERREUR CRITIQUE dans update_my_profile: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        logging.error(f"Erreur update_my_profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour du profil: {str(e)}")

@api_router.put("/users/{user_id}")
async def update_user_role(user_id: str, user_update: dict, user_data: dict = Depends(get_user_from_token)):
    """Mettre à jour le rôle d'un utilisateur (admin only)"""
    try:
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        
        # Vérifier que l'utilisateur à modifier appartient à la même entreprise
        user_check = supabase_service.table("users").select("*").eq("id", user_id).execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        target_user = user_check.data[0]
        if company_id and target_user.get("company_id") != company_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que les utilisateurs de votre entreprise")
        
        # Mettre à jour uniquement les champs autorisés
        allowed_fields = ['role', 'first_name', 'last_name']
        update_data = {k: v for k, v in user_update.items() if k in allowed_fields}
        
        response = supabase_service.table("users").update(update_data).eq("id", user_id).execute()
        return response.data[0] if response.data else {}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour de l'utilisateur: {str(e)}")

@api_router.get("/test-code-loaded")
async def test_code_loaded():
    """Test pour vérifier que le nouveau code est chargé"""
    return {"message": "NOUVEAU CODE CHARGE - VERSION 2"}

@api_router.get("/users/me")
async def get_my_profile(user_data: dict = Depends(get_user_from_token)):
    """Récupérer le profil de l'utilisateur connecté avec le nom de l'entreprise"""
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service Supabase non disponible")
        
        user_id = user_data.get("id")
        # Récupérer l'utilisateur sans jointure pour éviter la récursion RLS
        response = supabase_service.table("users").select("*").eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Profil non trouvé")
        
        user_profile = response.data[0]
        
        # Récupérer le nom de l'entreprise séparément si company_id existe
        if user_profile.get('company_id'):
            try:
                company_response = supabase_service.table("companies").select("name").eq("id", user_profile['company_id']).execute()
                if company_response.data:
                    user_profile['company_name'] = company_response.data[0].get('name')
            except:
                pass  # Si erreur, on continue sans le nom de l'entreprise
        
        return user_profile
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur get_my_profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du profil: {str(e)}")

@api_router.get("/users/{user_id}")
async def get_user_by_id(user_id: str, user_data: dict = Depends(get_user_from_token)):
    """Récupérer un utilisateur par son ID"""
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service Supabase non disponible")
        
        response = supabase_service.table("users").select("id, first_name, last_name, email, role").eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur get_user_by_id: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# Routes pour les chantiers
@api_router.get("/worksites")
async def get_worksites(
    client_id: Optional[str] = None,
    user_data: dict = Depends(get_user_from_token)
):
    """Récupérer la liste des chantiers avec détails complets"""
    try:
        company_id = await get_user_company(user_data)
        user_id = user_data.get("id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Récupérer chantiers avec infos client et devis d'origine
        query = supabase_service.table("worksites").select("""
            *,
            clients:client_id(*),
            quotes:quote_id(*)
        """).eq("company_id", company_id)
        
        # 🔒 FILTRE PAR RÔLE : Admin/Bureau voient tout, techniciens voient leurs chantiers
        user_role = user_data.get("role", "TECHNICIEN")
        if user_role in ["ADMIN", "BUREAU"]:
            logging.info(f"👑 [/worksites] Admin/Bureau: TOUS les chantiers visibles (role={user_role})")
        else:
            logging.info(f"🔒 [/worksites] Technicien: Filtre par user_id={user_id}")
            query = query.eq("user_id", user_id)
        
        # Filtre optionnel par client
        if client_id:
            query = query.eq("client_id", client_id)
        
        response = query.order("created_at", desc=True).execute()
        
        # 🔄 AUTO-UPDATE : Passer en COMPLETED les chantiers dont la date de fin est dépassée
        from datetime import datetime, date
        today = date.today()
        updated_ids = []
        
        for worksite in (response.data or []):
            ws_status = (worksite.get("status") or "").upper()
            ws_end_date = worksite.get("end_date")
            
            if ws_end_date and ws_status in ["PLANNED", "IN_PROGRESS"]:
                try:
                    end_dt = datetime.strptime(ws_end_date[:10], "%Y-%m-%d").date()
                    if end_dt < today:
                        # Date de fin dépassée → mettre à jour en COMPLETED
                        supabase_service.table("worksites").update({
                            "status": "COMPLETED"
                        }).eq("id", worksite["id"]).execute()
                        worksite["status"] = "COMPLETED"
                        updated_ids.append(worksite.get("title", worksite["id"]))
                except Exception as parse_err:
                    logging.warning(f"⚠️ Impossible de parser end_date '{ws_end_date}' pour worksite {worksite['id']}: {parse_err}")
        
        if updated_ids:
            logger.info(f"✅ Auto-COMPLETED: {len(updated_ids)} chantier(s) passé(s) en terminé: {updated_ids}")
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des chantiers: {str(e)}")

@api_router.get("/worksites/{worksite_id}")
async def get_worksite(worksite_id: str, user_data: dict = Depends(get_user_from_token)):
    """Récupérer un chantier spécifique par ID"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Récupérer le chantier avec détails complets
        response = supabase_service.table("worksites").select("""
            *,
            clients:client_id(*),
            quotes:quote_id(*)
        """).eq("id", worksite_id).eq("company_id", company_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Chantier non trouvé")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du chantier: {str(e)}")

@api_router.post("/worksites")
async def create_worksite(worksite_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Créer un nouveau chantier"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Log des données reçues pour debug
        logging.info(f"🏗️ Création worksite - données reçues: {worksite_data}")
        
        worksite_data["company_id"] = company_id
        
        # Valeurs par défaut
        if "status" not in worksite_data:
            worksite_data["status"] = "PLANNED"
        if "source" not in worksite_data:
            worksite_data["source"] = "MANUAL"
        
        # Mapper budget -> amount
        if "budget" in worksite_data and worksite_data["budget"]:
            worksite_data["amount"] = float(worksite_data["budget"])
        
        # Liste des champs valides dans la table worksites
        valid_fields = [
            'title', 'client_id', 'client_name', 'quote_id', 'company_id',
            'source', 'status', 'description', 'address', 'amount',
            'start_date', 'end_date'
        ]
        
        # Garder uniquement les champs valides et non vides
        clean_data = {
            k: v for k, v in worksite_data.items() 
            if k in valid_fields and v not in [None, '', 'null']
        }
        
        # Garder team_id pour utilisation ultérieure si besoin
        team_id = worksite_data.get('team_id')
        
        logging.info(f"🏗️ Création worksite - données nettoyées: {clean_data}")
        if team_id:
            logging.info(f"👥 Équipe à affecter (pour usage futur): {team_id}")
        
        response = supabase_service.table("worksites").insert(clean_data).execute()
        return response.data[0] if response.data else {}
    except Exception as e:
        logging.error(f"❌ Erreur création worksite: {str(e)}")
        logging.error(f"❌ Type erreur: {type(e)}")
        import traceback
        logging.error(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du chantier: {str(e)}")

async def calculate_worksite_progress(worksite_id: str, company_id: str) -> int:
    """Calcule automatiquement le progrès d'un chantier basé sur les jours de planning"""
    try:
        from datetime import datetime, date
        
        # Récupérer le chantier
        worksite = supabase_service.table("worksites").select("*").eq("id", worksite_id).eq("company_id", company_id).execute()
        if not worksite.data:
            return 0
        
        worksite_data = worksite.data[0]
        start_date = worksite_data.get('start_date')
        end_date = worksite_data.get('end_date')
        
        # Si pas de dates définies, retourner 0
        if not start_date or not end_date:
            logging.info(f"📊 Chantier {worksite_id}: pas de dates définies")
            return 0
        
        # Convertir les dates
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')).date()
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')).date()
        
        # Calculer le nombre total de jours
        total_days = (end_date - start_date).days + 1
        if total_days <= 0:
            return 0
        
        # Récupérer les schedules pour ce chantier
        schedules = supabase_service.table("schedules").select("*").eq("worksite_id", worksite_id).eq("company_id", company_id).execute()
        
        if not schedules.data:
            logging.info(f"📊 Chantier {worksite_id}: aucun schedule trouvé")
            return 0
        
        # Compter le nombre de jours uniques passés (date < aujourd'hui)
        today = date.today()
        completed_dates = set()
        
        for schedule in schedules.data:
            schedule_date = schedule.get('date')
            if schedule_date:
                if isinstance(schedule_date, str):
                    schedule_date = datetime.fromisoformat(schedule_date.replace('Z', '+00:00')).date()
                
                # Si la date du schedule est passée, on la compte
                if schedule_date < today:
                    completed_dates.add(schedule_date)
        
        completed_days = len(completed_dates)
        progress = min(100, int((completed_days / total_days) * 100))
        
        logging.info(f"📊 Chantier {worksite_id}: {completed_days}/{total_days} jours = {progress}%")
        return progress
        
    except Exception as e:
        logging.error(f"❌ Erreur calcul progress: {str(e)}")
        return 0

@api_router.post("/worksites/{worksite_id}/recalculate-progress")
async def recalculate_worksite_progress(worksite_id: str, user_data: dict = Depends(get_user_from_token)):
    """Recalculer manuellement le progress d'un chantier"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier que le chantier appartient à la société
        existing = supabase_service.table("worksites").select("*").eq("id", worksite_id).eq("company_id", company_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Chantier non trouvé ou accès refusé")
        
        # Calculer le progress
        progress = await calculate_worksite_progress(worksite_id, company_id)
        
        # Mettre à jour dans la base de données
        response = supabase_service.table("worksites").update({"progress": progress}).eq("id", worksite_id).execute()
        
        logging.info(f"✅ Progress recalculé: {progress}%")
        return {"progress": progress, "message": f"Progress recalculé: {progress}%"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Erreur recalcul progress: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors du recalcul du progress: {str(e)}")

@api_router.put("/worksites/{worksite_id}")
async def update_worksite(worksite_id: str, worksite_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Modifier un chantier existant"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        logging.info(f"🔧 Modification chantier {worksite_id}")
        logging.info(f"📦 Données reçues: {worksite_data}")
        
        # Vérifier que le chantier appartient à la société
        existing = supabase_service.table("worksites").select("*").eq("id", worksite_id).eq("company_id", company_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Chantier non trouvé ou accès refusé")
        
        # Nettoyer les données pour ne garder que les champs modifiables
        allowed_fields = ['title', 'description', 'address', 'client_id', 'status', 'progress', 
                         'start_date', 'end_date', 'budget', 'team_size', 'notes', 'quote_id']
        clean_data = {k: v for k, v in worksite_data.items() if k in allowed_fields and v is not None}
        
        # Convertir les valeurs vides en None pour les champs optionnels
        for field in ['client_id', 'quote_id', 'start_date', 'end_date', 'budget', 'team_size', 'notes']:
            if field in clean_data and clean_data[field] == '':
                clean_data[field] = None
        
        # Calculer automatiquement le progress si des dates sont définies
        if 'start_date' in clean_data or 'end_date' in clean_data:
            # Recalculer avec les nouvelles dates
            calculated_progress = await calculate_worksite_progress(worksite_id, company_id)
            clean_data['progress'] = calculated_progress
            logging.info(f"📊 Progress auto-calculé: {calculated_progress}%")
        
        logging.info(f"✅ Données nettoyées: {clean_data}")
        
        # Si les dates changent, recréer les schedules associés
        old_worksite = existing.data[0]
        if ('start_date' in clean_data or 'end_date' in clean_data):
            try:
                from datetime import datetime, timedelta
                
                new_start = clean_data.get('start_date') or old_worksite.get('start_date')
                new_end = clean_data.get('end_date') or old_worksite.get('end_date')
                old_start = old_worksite.get('start_date')
                old_end = old_worksite.get('end_date')
                
                if new_start and new_end and old_start and old_end:
                    # Convertir en dates
                    if isinstance(new_start, str):
                        new_start_date = datetime.fromisoformat(new_start.replace('Z', '+00:00')).date()
                    else:
                        new_start_date = new_start
                    if isinstance(new_end, str):
                        new_end_date = datetime.fromisoformat(new_end.replace('Z', '+00:00')).date()
                    else:
                        new_end_date = new_end
                    
                    # Vérifier si les dates ont vraiment changé
                    if isinstance(old_start, str):
                        old_start_date = datetime.fromisoformat(old_start.replace('Z', '+00:00')).date()
                    else:
                        old_start_date = old_start
                    if isinstance(old_end, str):
                        old_end_date = datetime.fromisoformat(old_end.replace('Z', '+00:00')).date()
                    else:
                        old_end_date = old_end
                    
                    # Si les dates ont changé, mettre à jour le schedule avec les nouvelles dates
                    if new_start_date != old_start_date or new_end_date != old_end_date:
                        # Récupérer les schedules existants pour ce chantier
                        schedules_resp = supabase_service.table("schedules").select("*").eq("worksite_id", worksite_id).eq("company_id", company_id).execute()
                        
                        if schedules_resp.data:
                            logging.info(f"🔄 Mise à jour des dates du schedule: {new_start_date} à {new_end_date}")
                            
                            # Mettre à jour le(s) schedule(s) existant(s) avec les nouvelles dates
                            for schedule in schedules_resp.data:
                                supabase_service.table("schedules").update({
                                    "start_date": new_start_date.isoformat(),
                                    "end_date": new_end_date.isoformat()
                                }).eq("id", schedule["id"]).execute()
                            
                            logging.info(f"  ✅ {len(schedules_resp.data)} schedule(s) mis à jour")
            
            except Exception as schedule_error:
                logging.error(f"⚠️ Erreur ajustement schedules: {schedule_error}")
                import traceback
                logging.error(traceback.format_exc())
                # Ne pas bloquer la mise à jour du chantier
        
        response = supabase_service.table("worksites").update(clean_data).eq("id", worksite_id).execute()
        
        logging.info(f"✅ Chantier modifié avec succès")
        return response.data[0] if response.data else {}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Erreur modification chantier: {str(e)}")
        import traceback
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erreur lors de la modification du chantier: {str(e)}")

@api_router.delete("/worksites/{worksite_id}")
async def delete_worksite(worksite_id: str, user_data: dict = Depends(get_user_from_token)):
    """Supprimer un chantier"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier que le chantier appartient à la société
        existing = supabase_service.table("worksites").select("*").eq("id", worksite_id).eq("company_id", company_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Chantier non trouvé ou accès refusé")
        
        supabase_service.table("worksites").delete().eq("id", worksite_id).execute()
        return {"message": "Chantier supprimé avec succès"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du chantier: {str(e)}")

# Statistiques - Dashboard (placé AVANT include_router pour être enregistré)
from functools import lru_cache
import time

_STATS_CACHE = {"data": None, "ts": 0, "key": None}
_STATS_TTL = 60  # secondes

@api_router.get("/stats/dashboard")
async def stats_dashboard(company_id: Optional[str] = None, user_data: dict = Depends(get_user_from_token)):
    """Retourne des statistiques globales (fondateur/admin) ou filtrées par entreprise.

    Comportement:
    - Fondateur: peut passer ?company_id= pour voir les stats d'une entreprise spécifique ou globales (par défaut).
    - Admin avec company_id (lié à une entreprise): toujours limité à son entreprise, ignore le paramètre.
    - Admin sans company_id (cas fondateur) : global.
    - Autres rôles: bloqués par require_admin.
    Cache: clé = scope + company_id (ou '*').
    """
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service key manquante - statistiques indisponibles")
        require_full_admin(user_data)  # Statistiques réservées aux ADMIN uniquement
        now = datetime.utcnow()
        since_7d = (now - timedelta(days=7)).isoformat()

        def count_rows(table: str, company: Optional[str] = None, since: Optional[str] = None) -> int:
            try:
                query = supabase_service.table(table).select("id", count="exact")
                # La table companies n'a pas de colonne company_id donc ne jamais filtrer dessus
                if company and table != "companies":
                    query = query.eq("company_id", company)
                if since:
                    query = query.gte("created_at", since)
                res = query.execute()
                return getattr(res, "count", None) or (len(res.data) if res.data is not None else 0)
            except Exception:
                return 0

        email = (user_data.get("email") or "").lower()
        user_company = user_data.get("company_id")
        is_founder = (email == FOUNDER_EMAIL)

        # Déterminer la société à utiliser pour filtrage
        if is_founder:
            # Fondateur: peut filtrer si company_id fourni
            scope_company = None
            if company_id:
                # Vérifier existence pour éviter cache fantôme
                try:
                    exists = supabase_service.table("companies").select("id").eq("id", company_id).limit(1).execute()
                    if not exists.data:
                        raise HTTPException(status_code=404, detail="Entreprise inconnue")
                    scope_company = company_id
                except HTTPException:
                    raise
                except Exception:
                    raise HTTPException(status_code=500, detail="Impossible de vérifier l'entreprise")
            scope = "company" if scope_company else "global"
        else:
            # Admin non-fondateur: s'il a un company_id il est limité à celui-ci.
            scope_company = user_company if user_company else None
            scope = "company" if scope_company else "global"
            # Admin non attaché à une entreprise mais non-fondateur: autoriser global (rare)

        cache_key = f"{scope}:{scope_company or '*'}"
        now_epoch = time.time()
        if _STATS_CACHE["data"] and _STATS_CACHE["key"] == cache_key and (now_epoch - _STATS_CACHE["ts"]) < _STATS_TTL:
            cached = _STATS_CACHE["data"].copy()
            cached.update({"cached": True, "generated_at": now.isoformat(), "scope": scope, "is_founder": is_founder})
            return cached

        # Calcul des montants de devis et projets
        total_quotes_amount = 0
        total_projects = count_rows("projects", scope_company)
        try:
            quotes_query = supabase_service.table("quotes").select("total_ht")
            if scope_company:
                quotes_query = quotes_query.eq("company_id", scope_company)
            quotes_res = quotes_query.execute()
            if quotes_res.data:
                total_quotes_amount = sum(float(q.get("total_ht", 0) or 0) for q in quotes_res.data)
        except:
            pass

        stats = {
            "scope": scope,
            "is_founder": is_founder,
            "filtered_company_id": scope_company,
            "total_users": count_rows("users", scope_company),
            "total_companies": count_rows("companies", None),  # toujours global
            "total_searches": count_rows("searches", scope_company),
            "total_clients": count_rows("clients", scope_company),
            "total_quotes": count_rows("quotes", scope_company),
            "total_worksites": count_rows("worksites", scope_company),
            "total_projects": total_projects,
            # Métriques financières
            "total_quotes_amount": round(total_quotes_amount, 2),
            "previous_quotes_amount": round(total_quotes_amount * 0.85, 2),  # Estimation -15% période précédente
            # Extensions (estimations ou placeholders si tables absentes)
            "total_reports": count_rows("searches", scope_company),  # chaque recherche ~1 rapport
            "total_materials": count_rows("materials", scope_company),  # si table materials existe sinon 0
            "last_7d_users": count_rows("users", scope_company, since_7d),
            "last_7d_searches": count_rows("searches", scope_company, since_7d),
            "last_7d_clients": count_rows("clients", scope_company, since_7d),
            "last_7d_quotes": count_rows("quotes", scope_company, since_7d),
            "last_7d_worksites": count_rows("worksites", scope_company, since_7d),
            # Métriques de performance (valeurs par défaut si pas de calcul complexe)
            "productivity_index": 98,
            "active_users": count_rows("users", scope_company),
            "generated_reports": count_rows("searches", scope_company) * 2,
            "projects_growth": 12,
            "satisfaction_growth": 2,
            "generated_at": now.isoformat(),
            "cached": False
        }
        _STATS_CACHE.update({"data": stats.copy(), "ts": now_epoch, "key": cache_key})
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur statistiques: {str(e)}")

# =============================
# Fondateur - Vue d'ensemble
# =============================
# Fondateur - Vue d'ensemble (SUPPRIMÉ - voir endpoint après ligne 6445)
# =============================

# =============================
# Fondateur - Liste complète des utilisateurs (SUPPRIMÉ - voir ligne 6858)
# =============================
# Ancien endpoint déplacé vers ligne 6858 avec vérification is_fondateur

@api_router.get("/founder/users/raw")
async def founder_users_raw(user_data: dict = Depends(get_user_from_token)):
    """Retourne la réponse brute Supabase pour debug (fondateur uniquement)."""
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service key manquante - debug indisponible")
        email = (user_data.get("email") or "").lower()
        if email != FOUNDER_EMAIL:
            raise HTTPException(status_code=403, detail="Accès réservé au fondateur")

        raw = supabase_service.table("users").select("*").execute()
        data = {
            "count": getattr(raw, "count", None),
            "data": getattr(raw, "data", None),
            "error": getattr(raw, "error", None)
        }

        if not data.get("data") and supabase_anon is not None:
            try:
                anon = supabase_anon.table("users").select("*").execute()
                data["anon_data"] = getattr(anon, "data", None)
                data["anon_error"] = getattr(anon, "error", None)
            except Exception as anon_err:
                data["anon_error"] = str(anon_err)

        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur debug utilisateurs: {str(e)}")

# Doublons /searches et /searches/draft supprimés (originals à la ligne ~546)

@api_router.patch("/searches/{search_id}")
async def update_search(search_id: str, update: SearchUpdate, user_data: dict = Depends(get_user_from_token)):
    """Mettre à jour une recherche (auto-save brouillon ou finalisation)."""
    try:
        # Vérifier ownership: l'utilisateur doit appartenir à la même company ou être admin sans company (fondateur)
        company_id = await get_user_company(user_data)
        # Récupérer la recherche existante
        existing = supabase_service.table("searches").select("id, user_id, company_id").eq("id", search_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Recherche introuvable")
        item = existing.data[0]
        role = (user_data.get("role") or "").upper()
        if company_id and item.get("company_id") != company_id and role != "ADMIN":
            raise HTTPException(status_code=403, detail="Accès refusé")
        # Tous les utilisateurs sauf ADMIN ne peuvent modifier que leurs propres recherches
        if role != UserRole.ADMIN.value and item.get("user_id") != user_data.get("id"):
            raise HTTPException(status_code=403, detail="Accès refusé")

        update_payload = {}
        for field in ["nom", "prenom", "location", "ville", "code_postal", "description", "observations", "latitude", "longitude", "search_type"]:
            value = getattr(update, field)
            if value is not None:
                update_payload[field] = value
        if update.status is not None:
            update_payload["status"] = update.status.value
        if not update_payload:
            return {"message": "Aucune modification"}
        logger.info(f"🔧 Update payload for search {search_id}: {update_payload}")
        response = supabase_service.table("searches").update(update_payload).eq("id", search_id).execute()
        logger.info(f"✅ Supabase response après UPDATE: {response.data}")
        
        # Vérifier que le status a bien été mis à jour
        if update.status is not None and response.data:
            actual_status = response.data[0].get("status")
            logger.info(f"🔍 Status dans la réponse: {actual_status} (attendu: {update.status.value})")
            if actual_status != update.status.value:
                logger.error(f"❌ ERREUR: Le status n'a pas été mis à jour correctement!")
        
        # ✨ AUTO-CRÉATION DE PROJET DÉSACTIVÉE - Utiliser le bouton "Transformer en Projet"
        # if update.status is not None and update.status.value == "SHARED":
        #     try:
        #         # Vérifier si un projet existe déjà pour cette recherche
        #         existing_project = supabase_service.table("projects").select("id").eq("search_id", search_id).execute()
        #         
        #         if not existing_project.data:
        #             # Récupérer les infos de la recherche
        #             search_resp = supabase_service.table("searches").select("*").eq("id", search_id).execute()
        #             
        #             if search_resp.data:
        #                 search_data = search_resp.data[0]
        #                 
        #                 # Récupérer les infos du client séparément
        #                 client = {}
        #                 if search_data.get("client_id"):
        #                     client_resp = supabase_service.table("clients").select("*").eq("id", search_data["client_id"]).execute()
        #                     if client_resp.data:
        #                         client = client_resp.data[0]
        #                 
        #                 # Créer le projet automatiquement
        #                 project_data = {
        #                     "company_id": company_id,
        #                     "name": f"Projet {client.get('nom', '')} - {search_data.get('adresse', '')[:50]}",
        #                     "client_id": search_data.get("client_id"),
        #                     "search_id": search_id,
        #                     "status": "RECHERCHE",
        #                     "category": search_data.get("type_recherche"),
        #                     "priority": "NORMAL",
        #                     "created_by": user_data.get("id")
        #                 }
        #                 
        #                 project_result = supabase_service.table("projects").insert(project_data).execute()
        #                 
        #                 # Ajouter note automatique
        #                 if project_result.data:
        #                     project_id = project_result.data[0]["id"]
        #                     supabase_service.table("project_notes").insert({
        #                         "project_id": project_id,
        #                         "user_id": user_data.get("id"),
        #                         "content": "✨ Projet créé automatiquement depuis la recherche partagée",
        #                         "note_type": "STATUS_CHANGE"
        #                     }).execute()
        #                     
        #                     logger.info(f"✅ Projet auto-créé: {project_id} pour recherche {search_id}")
        #     
        #     except Exception as e:
        #         logger.error(f"❌ Erreur création auto projet: {str(e)}")
        #         # Ne pas bloquer le partage si erreur
        
        return {"message": "Recherche mise à jour", "search": response.data[0] if response.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating search {search_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur mise à jour: {str(e)}")

@api_router.put("/searches/{search_id}")
async def put_search(search_id: str, update: SearchUpdate, user_data: dict = Depends(get_user_from_token)):
    """Mise à jour complète (compatibilité frontend existant utilisant PUT)."""
    return await update_search(search_id, update, user_data)  # Réutilise la logique de patch

@api_router.get("/searches/{search_id}")
async def get_search(search_id: str, user_data: dict = Depends(get_user_from_token)):
    """Récupérer une recherche spécifique pour édition/affichage avec photos."""
    try:
        company_id = await get_user_company(user_data)
        existing = supabase_service.table("searches").select("*").eq("id", search_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Recherche introuvable")
        item = existing.data[0]
        # Vérification d'accès: même company et propriétaire (sauf ADMIN)
        role = (user_data.get("role") or "").upper()
        if company_id and item.get("company_id") != company_id and role != "ADMIN":
            raise HTTPException(status_code=403, detail="Accès refusé")
        # Tous les utilisateurs sauf ADMIN ne peuvent accéder qu'à leurs propres recherches
        if role != UserRole.ADMIN.value and item.get("user_id") != user_data.get("id"):
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        # Les photos sont déjà dans le champ "photos" (JSONB) de la table searches
        # Pas besoin de requête supplémentaire
        photos = item.get("photos") or []
        logging.info(f"✅ Photos récupérées pour recherche {search_id}: {len(photos)} photos")
        
        return item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur récupération recherche: {str(e)}")

async def _delete_or_archive_search(search_id: str, user_data: dict):
    company_id = await get_user_company(user_data)
    existing = supabase_service.table("searches").select("id, user_id, company_id, status").eq("id", search_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Recherche introuvable")
    item = existing.data[0]
    role = (user_data.get("role") or "").upper()
    if company_id and item.get("company_id") != company_id and role != "ADMIN":
        raise HTTPException(status_code=403, detail="Accès refusé")
    # Tous les utilisateurs sauf ADMIN ne peuvent supprimer que leurs propres recherches
    if role != UserRole.ADMIN.value and item.get("user_id") != user_data.get("id"):
        raise HTTPException(status_code=403, detail="Accès refusé")

    status = (item.get("status") or "").upper()
    if status == SearchStatus.DRAFT.value:
        supabase_service.table("searches").delete().eq("id", search_id).execute()
        return {"message": "Brouillon supprimé définitivement"}
    elif status == SearchStatus.ARCHIVED.value:
        # Supprimer définitivement les recherches déjà archivées
        supabase_service.table("searches").delete().eq("id", search_id).execute()
        return {"message": "Recherche archivée supprimée définitivement"}
    else:
        # Archiver les recherches ACTIVE, SHARED, PROCESSED
        response = supabase_service.table("searches").update({"status": SearchStatus.ARCHIVED.value}).eq("id", search_id).execute()
        return {"message": "Recherche archivée", "search": response.data[0] if response.data else None}

@api_router.delete("/searches/{search_id}")
async def delete_search(search_id: str, user_data: dict = Depends(get_user_from_token)):
    """Supprimer ou archiver une recherche via HTTP DELETE."""
    try:
        return await _delete_or_archive_search(search_id, user_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur suppression: {str(e)}")

@api_router.post("/searches/{search_id}/delete")
async def delete_search_post(search_id: str, user_data: dict = Depends(get_user_from_token)):
    """Compatibilité: suppression via POST pour environnements qui n'autorisent pas DELETE."""
    try:
        return await _delete_or_archive_search(search_id, user_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur suppression: {str(e)}")

# Routes pour gérer les photos des recherches
STORAGE_BUCKET = os.environ.get('SUPABASE_STORAGE_BUCKET', 'search-photos')

@api_router.get("/searches/{search_id}/photos")
async def get_search_photos(
    search_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """Récupérer toutes les photos d'une recherche"""
    try:
        # Vérifier que la recherche existe
        company_id = await get_user_company(user_data)
        response = supabase_service.table("searches") \
            .select("id, photos, company_id") \
            .eq("id", search_id) \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Recherche introuvable")
        
        search = response.data[0]
        
        # Vérifier les permissions
        if company_id and search.get("company_id") != company_id:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        # Retourner les photos (tableau stocké dans la colonne photos)
        return search.get("photos") or []
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur récupération photos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur récupération photos: {str(e)}")

@api_router.post("/searches/{search_id}/photos")
async def upload_search_photos(
    search_id: str,
    files: List[UploadFile] = File(...),
    section_id: str = Form(None),
    is_profile: str = Form(None),
    user_data: dict = Depends(get_user_from_token)
):
    """Upload des photos pour une recherche via Supabase Storage avec section_id"""
    try:
        # Vérifier que la recherche existe et appartient à l'utilisateur
        company_id = await get_user_company(user_data)
        existing = supabase_service.table("searches").select("id, user_id, company_id, photos").eq("id", search_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Recherche introuvable")
        
        search = existing.data[0]
        if company_id and search.get("company_id") != company_id:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        # Récupérer les photos existantes
        photos = search.get("photos") or []
        
        # Uploader les nouvelles photos vers Supabase Storage
        uploaded_files = []
        for index, file in enumerate(files):
            # Générer un nom de fichier unique
            file_extension = Path(file.filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            storage_path = f"{search_id}/{unique_filename}"
            
            # Lire le contenu du fichier
            content = await file.read()
            
            # Upload vers Supabase Storage
            supabase_service.storage.from_(STORAGE_BUCKET).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": file.content_type}
            )
            
            # Générer l'URL publique signée (valide 1 an)
            signed_url = supabase_service.storage.from_(STORAGE_BUCKET).create_signed_url(
                path=storage_path,
                expires_in=31536000  # 1 an
            )
            
            # Ajouter à la liste des photos
            photo_info = {
                "filename": unique_filename,
                "original_name": file.filename,
                "storage_path": storage_path,
                "url": signed_url.get('signedURL') if signed_url else None,
                "section_id": section_id,  # Lier la photo à sa section
                "number": len(photos) + len(uploaded_files) + 1,
                "uploaded_at": datetime.utcnow().isoformat()
            }
            
            # Marquer la première photo comme photo de profil si is_profile est 'true'
            if index == 0 and is_profile == 'true':
                photo_info["is_profile"] = True
                # Retirer le flag is_profile des autres photos existantes
                for p in photos:
                    if p.get("is_profile"):
                        p["is_profile"] = False
            
            uploaded_files.append(photo_info)
        
        # Éviter les doublons : retirer les anciennes photos de la même section avant d'ajouter les nouvelles
        if section_id:
            photos = [p for p in photos if p.get("section_id") != section_id]
        
        # Mettre à jour la base de données
        photos.extend(uploaded_files)
        supabase_service.table("searches").update({"photos": photos}).eq("id", search_id).execute()
        
        return {"message": f"{len(uploaded_files)} photo(s) uploadée(s)", "photos": uploaded_files}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error uploading photos: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur upload photos: {str(e)}")

@api_router.get("/searches/{search_id}/photos/{filename}")
async def get_search_photo(search_id: str, filename: str, user_data: dict = Depends(get_user_from_token)):
    """Récupérer une photo d'une recherche depuis Supabase Storage"""
    try:
        # Vérifier l'accès
        company_id = await get_user_company(user_data)
        existing = supabase_service.table("searches").select("id, company_id, photos").eq("id", search_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Recherche introuvable")
        
        search = existing.data[0]
        if company_id and search.get("company_id") != company_id:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        # Trouver la photo dans les métadonnées
        photos = search.get("photos") or []
        photo = next((p for p in photos if p.get("filename") == filename), None)
        
        if not photo:
            raise HTTPException(status_code=404, detail="Photo introuvable")
        
        # Retourner l'URL signée existante ou en générer une nouvelle
        if photo.get("url"):
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=photo["url"])
        else:
            # Générer une nouvelle URL signée
            storage_path = f"{search_id}/{filename}"
            signed_url = supabase_service.storage.from_(STORAGE_BUCKET).create_signed_url(
                path=storage_path,
                expires_in=3600  # 1 heure
            )
            if signed_url and signed_url.get('signedURL'):
                from fastapi.responses import RedirectResponse
                return RedirectResponse(url=signed_url['signedURL'])
            else:
                raise HTTPException(status_code=404, detail="Impossible de générer l'URL de la photo")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting photo: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur récupération photo: {str(e)}")

@api_router.delete("/searches/{search_id}/photos/{filename}")
async def delete_search_photo(search_id: str, filename: str, user_data: dict = Depends(get_user_from_token)):
    """Supprimer une photo d'une recherche depuis Supabase Storage"""
    try:
        # Vérifier l'accès
        company_id = await get_user_company(user_data)
        existing = supabase_service.table("searches").select("id, company_id, photos").eq("id", search_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Recherche introuvable")
        
        search = existing.data[0]
        if company_id and search.get("company_id") != company_id:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        # Supprimer du Storage Supabase
        storage_path = f"{search_id}/{filename}"
        try:
            supabase_service.storage.from_(STORAGE_BUCKET).remove([storage_path])
        except Exception as storage_error:
            logging.warning(f"Storage deletion failed (may not exist): {storage_error}")
        
        # Mettre à jour la liste des photos dans la BDD
        photos = search.get("photos") or []
        photos = [p for p in photos if p.get("filename") != filename]
        
        # Renuméroter les photos restantes
        for idx, photo in enumerate(photos):
            photo["number"] = idx + 1
        
        supabase_service.table("searches").update({"photos": photos}).eq("id", search_id).execute()
        
        return {"message": "Photo supprimée", "remaining_photos": len(photos)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur suppression photo: {str(e)}")

# ============================================================================
# GÉNÉRATION PDF POUR RECHERCHES
# ============================================================================

@api_router.get("/searches/{search_id}/pdf")
async def generate_search_pdf(
    search_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """Générer un PDF professionnel pour une recherche terrain"""
    import requests
    import shutil
    from reportlab.lib.enums import TA_LEFT, TA_RIGHT
    from reportlab.lib.units import mm
    
    try:
        logging.info(f"🔍 [PDF] START génération search_id={search_id}")
        company_id = await get_user_company(user_data)
        logging.info(f"📡 [PDF] Company ID: {company_id}")
        
        # Récupérer la recherche
        logging.info(f"📥 [PDF] Récupération recherche...")
        response = supabase_service.table("searches").select("*").eq("id", search_id).execute()
        
        if not response.data:
            logging.error(f"❌ [PDF] Recherche introuvable")
            raise HTTPException(status_code=404, detail="Recherche introuvable")
        
        search = response.data[0]
        logging.info(f"✅ [PDF] Recherche: {search.get('location', 'N/A')}, photos: {len(search.get('photos', []))}")
        
        # Permissions
        if company_id and search.get("company_id") != company_id:
            raise HTTPException(status_code=403, detail="Accès refusé")
        
        # Récupérer les informations de l'entreprise
        company_info = {}
        if company_id:
            try:
                company_response = supabase_service.table("companies").select("*").eq("id", company_id).execute()
                if company_response.data:
                    company_info = company_response.data[0]
                    logging.info(f"🏢 [PDF] Entreprise: {company_info.get('name', 'N/A')}")
            except Exception as e:
                logging.warning(f"⚠️ [PDF] Impossible de récupérer les infos entreprise: {e}")
        
        logging.info(f"📄 [PDF] Création buffer...")
        
        buffer = io.BytesIO()
        
        # Fonction pour ajouter pied de page avec numéros
        def add_page_number(canvas, doc):
            """Ajoute le numéro de page et les infos dans le pied de page"""
            canvas.saveState()
            # Pied de page
            page_num_text = f"Page {doc.page}"
            canvas.setFont('Helvetica', 8)
            canvas.setFillColor(colors.Color(0.5, 0.5, 0.5))
            canvas.drawString(2*cm, 1.5*cm, f"Référence: {search_id[:8].upper()}")
            canvas.drawCentredString(A4[0]/2, 1.5*cm, page_num_text)
            canvas.drawRightString(A4[0] - 2*cm, 1.5*cm, f"{datetime.now().strftime('%d/%m/%Y')}")
            # Ligne de séparation
            canvas.setStrokeColor(colors.Color(0.85, 0.85, 0.85))
            canvas.setLineWidth(0.5)
            canvas.line(2*cm, 1.8*cm, A4[0] - 2*cm, 1.8*cm)
            canvas.restoreState()
        
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2.5*cm, bottomMargin=2.5*cm, 
                               leftMargin=2*cm, rightMargin=2*cm)
        
        story = []
        styles = getSampleStyleSheet()
        primary_color = colors.HexColor("#6366f1")
        
        logging.info(f"📝 [PDF] Construction contenu professionnel...")
        
        # COULEURS MODERNES ET ÉLÉGANTES
        dark_indigo = colors.Color(0.26, 0.31, 0.71)  # #4350B5
        light_indigo = colors.Color(0.38, 0.40, 0.93)  # #6166ED  
        soft_gray = colors.Color(0.18, 0.20, 0.25)     # #2E3440
        accent_teal = colors.Color(0.13, 0.69, 0.67)   # #22B0AD
        accent_orange = colors.Color(0.95, 0.51, 0.20) # #F28234
        success_green = colors.Color(0.13, 0.77, 0.29) # #22C54A
        warning_red = colors.Color(0.93, 0.26, 0.26)   # #ED4242
        
        search_type = search.get('search_type', 'TERRAIN').upper()
        type_label = "RECHERCHE D'INFILTRATION" if search_type == 'INFILTRATION' else "RECHERCHE DE FUITE"
        
        # ==================== PAGE DE GARDE ====================
        logging.info(f"📄 [PDF] Création page de garde...")
        
        story.append(Spacer(1, 3*cm))
        
        # Logo ou nom entreprise centré
        if company_info.get('name'):
            company_style = ParagraphStyle('Company', parent=styles['Normal'],
                                         fontSize=18, textColor=dark_indigo, alignment=TA_CENTER,
                                         fontName='Helvetica-Bold', spaceAfter=10)
            story.append(Paragraph(company_info['name'].upper(), company_style))
        
        story.append(Spacer(1, 1*cm))
        
        # Ligne de séparation
        line_table = Table([['_' * 80]], colWidths=[15*cm])
        line_table.setStyle(TableStyle([
            ('TEXTCOLOR', (0, 0), (-1, -1), light_indigo),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
        ]))
        story.append(line_table)
        story.append(Spacer(1, 1*cm))
        
        # Titre principal
        title_cover = ParagraphStyle('TitleCover', parent=styles['Normal'],
                                    fontSize=32, textColor=dark_indigo, alignment=TA_CENTER,
                                    fontName='Helvetica-Bold', leading=40, spaceAfter=20)
        story.append(Paragraph(f"RAPPORT DE<br/>{type_label}", title_cover))
        
        story.append(Spacer(1, 2*cm))
        
        # Informations principales
        cover_info_style = ParagraphStyle('CoverInfo', parent=styles['Normal'],
                                         fontSize=14, textColor=soft_gray, alignment=TA_CENTER,
                                         fontName='Helvetica', leading=22)
        
        client_name = f"{search.get('prenom', '')} {search.get('nom', '')}".strip()
        if client_name:
            story.append(Paragraph(f"<b>Client:</b> {client_name}", cover_info_style))
        
        if search.get('location'):
            story.append(Paragraph(f"<b>Localisation:</b> {search['location']}", cover_info_style))
        
        story.append(Spacer(1, 1*cm))
        story.append(Paragraph(f"<b>Référence:</b> {search_id[:8].upper()}", cover_info_style))
        story.append(Paragraph(f"<b>Date:</b> {datetime.now().strftime('%d/%m/%Y')}", cover_info_style))
        
        story.append(Spacer(1, 3*cm))
        
        # Coordonnées entreprise en bas
        if company_info:
            footer_style = ParagraphStyle('FooterCover', parent=styles['Normal'],
                                         fontSize=9, textColor=colors.Color(0.5, 0.5, 0.5),
                                         alignment=TA_CENTER, fontName='Helvetica')
            
            contact_lines = []
            if company_info.get('address'):
                contact_lines.append(company_info['address'])
            if company_info.get('postal_code') and company_info.get('city'):
                contact_lines.append(f"{company_info['postal_code']} {company_info['city']}")
            if company_info.get('siret'):
                contact_lines.append(f"SIRET: {company_info['siret']}")
            
            if contact_lines:
                story.append(Paragraph('<br/>'.join(contact_lines), footer_style))
        
        # Mention confidentielle
        conf_style = ParagraphStyle('Confidential', parent=styles['Normal'],
                                   fontSize=8, textColor=colors.Color(0.6, 0.6, 0.6),
                                   alignment=TA_CENTER, fontName='Helvetica-Oblique')
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph("Document confidentiel - Usage strictement réservé au destinataire", conf_style))
        
        # Saut de page vers contenu
        story.append(PageBreak())
        
        # ==================== ÉLÉMENTS DE DÉCORATION ====================
        # Ligne décorative en haut de chaque section
        def add_decorative_line(color=light_indigo):
            """Ajoute une ligne décorative horizontale"""
            line_data = [['']]
            line = Table(line_data, colWidths=[17*cm], rowHeights=[0.15*cm])
            line.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), color),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            return line
        
        # Ajout d'une ligne décorative au début du document
        story.append(add_decorative_line(dark_indigo))
        story.append(Spacer(1, 0.8*cm))
        
        # ==================== STYLES POUR LES SECTIONS ====================
        heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'],
                                      fontSize=14, textColor=colors.white, spaceAfter=10, spaceBefore=15,
                                      fontName='Helvetica-Bold', leftIndent=15, rightIndent=15,
                                      borderPadding=10, backColor=dark_indigo,
                                      borderWidth=0, borderRadius=6)
        
        # ===== PRÉPARATION: Organiser toutes les photos par section AVANT de construire le PDF =====
        photos = search.get('photos', [])
        photos_by_section_id = {}
        profile_photo = None
        photo_counter_global = 0
        
        if photos and len(photos) > 0:
            logging.info(f"📷 [PDF] Organisation de {len(photos)} photos...")
            for photo in photos:
                # Filtrer photo de profil
                if photo.get('is_profile'):
                    profile_photo = photo
                    logging.info(f"  🖼️ Photo de profil trouvée: {photo.get('filename')}")
                    continue
                    
                section_id = photo.get('section_id', 'autres')
                if section_id not in photos_by_section_id:
                    photos_by_section_id[section_id] = []
                photos_by_section_id[section_id].append(photo)
            logging.info(f"  📁 {len(photos_by_section_id)} section(s) avec photos: {list(photos_by_section_id.keys())}")
        
        # FONCTION HELPER: Ajouter photos 2 PAR LIGNE
        def add_section_photos_grid(section_name, photos_list, counter_start):
            """Ajoute les photos d'une section en grille 2x2"""
            photos_added = 0
            photo_counter = counter_start
            
            if not photos_list or len(photos_list) == 0:
                return photos_added, photo_counter
            
            logging.info(f"  📷 Ajout de {len(photos_list)} photo(s) pour section '{section_name}' (grille 2x2)")
            
            # Organiser en lignes de 2 photos
            for i in range(0, len(photos_list), 2):
                row_photos = photos_list[i:i+2]
                row_elements = []
                
                for photo in row_photos:
                    photo_counter += 1
                    try:
                        filename = photo.get('filename', '')
                        photo_path = f"{search_id}/{filename}"
                        
                        logging.info(f"    📸 [{photo_counter}] {filename}")
                        
                        try:
                            photo_data = supabase_service.storage.from_(STORAGE_BUCKET).download(photo_path)
                            
                            if len(photo_data) > 0:
                                temp_path = ROOT_DIR / "uploads" / f"temp_{search_id}_{photo_counter}.jpg"
                                temp_path.parent.mkdir(parents=True, exist_ok=True)
                                temp_path.write_bytes(photo_data)
                                
                                # Image plus petite pour grille 2x2
                                img = ReportLabImage(str(temp_path), width=7.5*cm, height=5.5*cm, kind='proportional')
                                
                                # Légende sous l'image
                                caption = ""
                                if photo.get('notes'):
                                    caption = photo['notes'][:60] + ('...' if len(photo.get('notes', '')) > 60 else '')
                                
                                caption_style = ParagraphStyle('Caption', parent=styles['Normal'],
                                                             fontSize=7.5, textColor=colors.Color(0.4, 0.4, 0.4),
                                                             alignment=TA_CENTER, fontName='Helvetica-Oblique')
                                
                                caption_para = Paragraph(f"📷 Photo {photo_counter}<br/>{caption}" if caption else f"📷 Photo {photo_counter}", caption_style)
                                
                                # Conteneur photo + légende
                                photo_cell = Table([[img], [caption_para]], colWidths=[8*cm], rowHeights=[5.8*cm, 1*cm])
                                photo_cell.setStyle(TableStyle([
                                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                                    ('BOX', (0, 0), (0, 0), 1.5, light_indigo),
                                    ('BACKGROUND', (0, 0), (0, 0), colors.Color(0.99, 0.99, 1)),
                                    ('PADDING', (0, 0), (0, 0), 4),
                                ]))
                                
                                row_elements.append(photo_cell)
                                photos_added += 1
                                logging.info(f"      ✅ Photo ajoutée")
                            else:
                                logging.warning(f"      ⚠️ Fichier vide")
                        except Exception as e:
                            logging.error(f"      ❌ Erreur: {e}")
                            
                    except Exception as e:
                        logging.error(f"    ❌ Erreur photo: {e}")
                        continue
                
                # Si on a des photos dans la ligne, les ajouter
                if row_elements:
                    # Compléter avec une cellule vide si nécessaire
                    if len(row_elements) == 1:
                        row_elements.append('')
                    
                    row_table = Table([row_elements], colWidths=[8.5*cm, 8.5*cm])
                    row_table.setStyle(TableStyle([
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ]))
                    story.append(row_table)
                    story.append(Spacer(1, 0.4*cm))
            
            return photos_added, photo_counter
        
        # FONCTION HELPER: Ajouter photos d'une section
        def add_section_photos(section_name, photos_list, counter_start):
            """Ajoute les photos d'une section avec mise en forme élégante"""
            photos_added = 0
            photo_counter = counter_start
            
            if not photos_list or len(photos_list) == 0:
                return photos_added, photo_counter
            
            logging.info(f"  📷 Ajout de {len(photos_list)} photo(s) pour section '{section_name}'")
            
            for photo in photos_list:
                photo_counter += 1
                try:
                    filename = photo.get('filename', '')
                    photo_path = f"{search_id}/{filename}"
                    
                    logging.info(f"    📸 [{photo_counter}] {filename}")
                    
                    try:
                        photo_data = supabase_service.storage.from_(STORAGE_BUCKET).download(photo_path)
                        
                        if len(photo_data) > 0:
                            temp_path = ROOT_DIR / "uploads" / f"temp_{search_id}_{photo_counter}.jpg"
                            temp_path.parent.mkdir(parents=True, exist_ok=True)
                            temp_path.write_bytes(photo_data)
                            
                            # Photos plus petites et élégantes
                            img = ReportLabImage(str(temp_path), width=11*cm, height=7.5*cm, kind='proportional')
                            
                            # Conteneur avec design moderne
                            img_container = Table([[img]], colWidths=[12*cm])
                            img_container.setStyle(TableStyle([
                                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                                ('BOX', (0, 0), (-1, -1), 2, light_indigo),
                                ('BACKGROUND', (0, 0), (-1, -1), colors.Color(0.99, 0.99, 1)),
                                ('PADDING', (0, 0), (-1, -1), 6),
                                ('TOPPADDING', (0, 0), (-1, -1), 6),
                                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                            ]))
                            
                            story.append(img_container)
                            story.append(Spacer(1, 0.15*cm))
                            
                            # Légende moderne
                            if photo.get('notes'):
                                notes_style = ParagraphStyle('PhotoNotes', parent=styles['Normal'],
                                                           fontSize=8.5, leading=12, 
                                                           textColor=colors.Color(0.35, 0.37, 0.42),
                                                           alignment=TA_CENTER, fontName='Helvetica-Oblique',
                                                           leftIndent=15, rightIndent=15)
                                story.append(Paragraph(f'💬 {photo["notes"]}', notes_style))
                            
                            story.append(Spacer(1, 0.5*cm))
                            photos_added += 1
                            logging.info(f"      ✅ Photo ajoutée")
                        else:
                            logging.warning(f"      ⚠️ Fichier vide")
                    except Exception as e:
                        logging.error(f"      ❌ Erreur: {e}")
                        
                except Exception as e:
                    logging.error(f"    ❌ Erreur photo: {e}")
                    continue
            
            return photos_added, photo_counter
        
        # ===== SECTION 1: INFORMATIONS GÉNÉRALES (avec photo de profil) =====
        story.append(add_decorative_line(colors.Color(0.90, 0.92, 0.98)))
        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph("📋 INFORMATIONS GÉNÉRALES", heading_style))
        story.append(Spacer(1, 0.3*cm))
        
        # Construire les données du tableau
        info_data = []
        if search.get('nom') or search.get('prenom'):
            nom = f"{search.get('prenom', '')} {search.get('nom', '')}".strip()
            info_data.append(['Client', nom])
        
        info_data.extend([
            ['Type de recherche', search_type],
            ['Date de création', search.get('created_at', 'N/A')[:10] if search.get('created_at') else 'N/A'],
            ['Statut', search.get('status', 'ACTIVE')],
            ['Référence', search_id[:8].upper()],
        ])
        
        # Si photo de profil, créer layout avec photo + tableau
        if profile_photo:
            try:
                filename = profile_photo.get('filename', '')
                photo_path = f"{search_id}/{filename}"
                logging.info(f"🖼️ [PDF] Ajout photo de profil: {filename}")
                
                photo_data_bytes = supabase_service.storage.from_(STORAGE_BUCKET).download(photo_path)
                if len(photo_data_bytes) > 0:
                    temp_path = ROOT_DIR / "uploads" / f"temp_{search_id}_profile.jpg"
                    temp_path.parent.mkdir(parents=True, exist_ok=True)
                    temp_path.write_bytes(photo_data_bytes)
                    
                    # Photo de profil plus petite et élégante
                    profile_img = ReportLabImage(str(temp_path), width=3*cm, height=3*cm, kind='proportional')
                    
                    # Conteneur photo avec bordure arrondie
                    photo_container = Table([[profile_img]], colWidths=[3.2*cm])
                    photo_container.setStyle(TableStyle([
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('BOX', (0, 0), (-1, -1), 2, light_indigo),
                        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
                        ('PADDING', (0, 0), (-1, -1), 4),
                    ]))
                    
                    info_table = Table(info_data, colWidths=[5.2*cm, 11*cm])
                    info_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (0, -1), colors.Color(0.96, 0.97, 0.99)),
                        ('TEXTCOLOR', (0, 0), (0, -1), dark_indigo),
                        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
                        ('PADDING', (0, 0), (-1, -1), 10),
                        ('GRID', (0, 0), (-1, -1), 0.8, colors.Color(0.88, 0.90, 0.94)),
                        ('ROWBACKGROUNDS', (1, 0), (1, -1), [colors.white, colors.Color(0.99, 0.99, 1)]),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ]))
                    
                    # Layout avec photo à gauche, tableau à droite
                    layout_table = Table([[photo_container, info_table]], colWidths=[3.5*cm, 13.5*cm], rowHeights=[None])
                    layout_table.setStyle(TableStyle([
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                        ('LEFTPADDING', (0, 0), (0, 0), 0),
                        ('RIGHTPADDING', (0, 0), (0, 0), 8),
                    ]))
                    story.append(layout_table)
                    logging.info(f"  ✅ Photo de profil ajoutée à côté du tableau")
                else:
                    # Fallback sans photo
                    info_table = Table(info_data, colWidths=[6*cm, 11*cm])
                    info_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (0, -1), colors.Color(0.94, 0.95, 1)),
                        ('TEXTCOLOR', (0, 0), (0, -1), primary_color),
                        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 0), (-1, -1), 10),
                        ('PADDING', (0, 0), (-1, -1), 14),
                        ('LEFTPADDING', (0, 0), (0, -1), 18),
                        ('GRID', (0, 0), (-1, -1), 1, colors.Color(0.85, 0.85, 0.92)),
                        ('ROWBACKGROUNDS', (1, 0), (1, -1), [colors.white, colors.Color(0.99, 0.99, 1)]),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ]))
                    story.append(info_table)
            except Exception as e:
                logging.error(f"  ❌ Erreur photo profil: {e}")
                # Fallback sans photo
                info_table = Table(info_data, colWidths=[6*cm, 11*cm])
                info_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (0, -1), colors.Color(0.94, 0.95, 1)),
                    ('TEXTCOLOR', (0, 0), (0, -1), primary_color),
                    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                    ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('PADDING', (0, 0), (-1, -1), 14),
                    ('LEFTPADDING', (0, 0), (0, -1), 18),
                    ('GRID', (0, 0), (-1, -1), 1, colors.Color(0.85, 0.85, 0.92)),
                    ('ROWBACKGROUNDS', (1, 0), (1, -1), [colors.white, colors.Color(0.99, 0.99, 1)]),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                story.append(info_table)
        else:
            # Pas de photo de profil
            info_table = Table(info_data, colWidths=[6*cm, 11*cm])
            info_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.Color(0.94, 0.95, 1)),
                ('TEXTCOLOR', (0, 0), (0, -1), primary_color),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 14),
                ('LEFTPADDING', (0, 0), (0, -1), 18),
                ('GRID', (0, 0), (-1, -1), 1, colors.Color(0.85, 0.85, 0.92)),
                ('ROWBACKGROUNDS', (1, 0), (1, -1), [colors.white, colors.Color(0.99, 0.99, 1)]),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(info_table)
        
        # Photos de la section general_info
        general_photos = photos_by_section_id.get('general_info', [])
        if general_photos:
            story.append(Spacer(1, 0.6*cm))
            added, photo_counter_global = add_section_photos_grid('Informations générales', general_photos, photo_counter_global)
        
        story.append(Spacer(1, 1*cm))
        
        # ===== SECTION 2: LOCALISATION & CLIENT =====
        story.append(add_decorative_line(colors.Color(0.90, 0.98, 0.97)))
        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph("📍 LOCALISATION & CLIENT", heading_style))
        story.append(Spacer(1, 0.3*cm))
        
        location_data = []
        if search.get('location'):
            location_data.append(['Adresse', search['location']])
        if search.get('nom') or search.get('prenom'):
            client = f"{search.get('prenom', '')} {search.get('nom', '')}".strip()
            location_data.append(['Client', client])
        
        if location_data:
            location_table = Table(location_data, colWidths=[5.5*cm, 11.5*cm])
            location_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.Color(0.95, 0.99, 0.97)),
                ('TEXTCOLOR', (0, 0), (0, -1), accent_teal),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9.5),
                ('PADDING', (0, 0), (-1, -1), 10),
                ('LEFTPADDING', (0, 0), (0, -1), 15),
                ('GRID', (0, 0), (-1, -1), 0.8, colors.Color(0.85, 0.94, 0.90)),
                ('ROWBACKGROUNDS', (1, 0), (1, -1), [colors.white, colors.Color(0.99, 1, 0.99)]),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(location_table)
        else:
            story.append(Paragraph("<i>Aucune information disponible</i>", styles['Normal']))
        story.append(Spacer(1, 1*cm))
        
        # ===== SECTION 3: DESCRIPTION DE LA RECHERCHE + PHOTOS =====
        if search.get('description'):
            # PageBreak si la section a des photos pour tout garder ensemble
            desc_photos = photos_by_section_id.get('description', [])
            if desc_photos:
                story.append(PageBreak())
            
            story.append(add_decorative_line(colors.Color(0.90, 0.92, 0.98)))
            story.append(Spacer(1, 0.4*cm))
            story.append(Paragraph("📝 DESCRIPTION DE LA RECHERCHE", heading_style))
            story.append(Spacer(1, 0.3*cm))
            
            desc_style = ParagraphStyle('Description', parent=styles['Normal'],
                                       fontSize=10, leading=16, spaceBefore=6, spaceAfter=6,
                                       leftIndent=18, rightIndent=18, borderPadding=15,
                                       backColor=colors.Color(0.98, 0.98, 0.99),
                                       borderColor=light_indigo, borderWidth=1.5, borderRadius=6,
                                       textColor=colors.Color(0.22, 0.24, 0.30))
            
            story.append(Paragraph(search['description'].replace('\n', '<br/>'), desc_style))
            
            # Photos de la section description (section_id = 'description')
            desc_photos = photos_by_section_id.get('description', [])
            if desc_photos:
                story.append(Spacer(1, 0.6*cm))
                added, photo_counter_global = add_section_photos_grid('Description', desc_photos, photo_counter_global)
            
            story.append(Spacer(1, 0.8*cm))
        
        # ===== SECTION 4: OBSERVATIONS ET REMARQUES + SECTIONS CUSTOM =====
        # Parser le JSON observations qui contient {text: "...", customSections: [...]}
        observations_text = ""
        custom_sections_data = []
        
        if search.get('observations'):
            try:
                import json
                observations_json = json.loads(search['observations'])
                observations_text = observations_json.get('text', '')
                custom_sections_data = observations_json.get('customSections', [])
                logging.info(f"📦 [PDF] Observations parsées: texte={bool(observations_text)}, custom_sections={len(custom_sections_data)}")
            except (json.JSONDecodeError, TypeError):
                # Ancien format texte simple
                observations_text = search['observations']
                logging.info(f"⚠️ [PDF] Observations en ancien format texte")
        
        # Afficher la section observations (texte uniquement)
        if observations_text:
            # PageBreak si la section a des photos pour tout garder ensemble
            obs_photos = photos_by_section_id.get('observations', [])
            if obs_photos:
                story.append(PageBreak())
            
            story.append(add_decorative_line(colors.Color(1, 0.95, 0.88)))
            story.append(Spacer(1, 0.4*cm))
            story.append(Paragraph("⚠️ OBSERVATIONS ET REMARQUES", heading_style))
            story.append(Spacer(1, 0.3*cm))
            
            obs_style = ParagraphStyle('Observations', parent=styles['Normal'],
                                      fontSize=10, leading=16, spaceBefore=6, spaceAfter=6,
                                      leftIndent=18, rightIndent=18, borderPadding=15,
                                      backColor=colors.Color(1, 0.97, 0.90),
                                      borderColor=accent_orange, borderWidth=1.5, borderRadius=6,
                                      textColor=colors.Color(0.38, 0.20, 0.05))
            
            story.append(Paragraph(observations_text.replace('\n', '<br/>'), obs_style))
            
            # Photos de la section observations (section_id = 'observations')
            if obs_photos:
                story.append(Spacer(1, 0.6*cm))
                added, photo_counter_global = add_section_photos_grid('Observations', obs_photos, photo_counter_global)
            
            story.append(Spacer(1, 0.8*cm))
        
        # Afficher les sections personnalisées (custom)
        if custom_sections_data:
            logging.info(f"🎨 [PDF] Ajout de {len(custom_sections_data)} section(s) personnalisée(s)")
            for custom_section in custom_sections_data:
                section_id = custom_section.get('id', '')
                section_title = custom_section.get('title', 'Section personnalisée')
                section_value = custom_section.get('value', '')
                
                if section_value or section_id in photos_by_section_id:
                    custom_photos = photos_by_section_id.get(section_id, [])
                    
                    # Toujours PageBreak pour garder titre, contenu et photos ensemble
                    story.append(PageBreak())
                    story.append(add_decorative_line(colors.Color(0.95, 0.90, 1)))
                    story.append(Spacer(1, 0.4*cm))
                    
                    story.append(Paragraph(f"✨ {section_title.upper()}", heading_style))
                    story.append(Spacer(1, 0.3*cm))
                    
                    # Contenu texte de la section custom
                    if section_value:
                        custom_style = ParagraphStyle('CustomSection', parent=styles['Normal'],
                                                     fontSize=10, leading=16, spaceBefore=6, spaceAfter=6,
                                                     leftIndent=18, rightIndent=18, borderPadding=15,
                                                     backColor=colors.Color(0.98, 0.98, 1),
                                                     borderColor=light_indigo, borderWidth=1.5, borderRadius=6,
                                                     textColor=soft_gray)
                        story.append(Paragraph(section_value.replace('\n', '<br/>'), custom_style))
                    
                    # Photos de cette section custom
                    if custom_photos:
                        story.append(Spacer(1, 0.6*cm))
                        added, photo_counter_global = add_section_photos_grid(section_title, custom_photos, photo_counter_global)
                    
                    story.append(Spacer(1, 0.8*cm))
        
        # ===== SECTIONS SUPPLÉMENTAIRES: Sections personnalisées avec photos =====
        # Définir les titres des sections standards
        section_titles = {
            'general_info': 'Informations Générales',
            'description': 'Description de la Recherche',
            'observations': 'Observations et Remarques',
            'localisation': 'Localisation',
            'equipements': 'Équipements',
            'conditions_meteo': 'Conditions Météo',
            'acces_difficultes': 'Accès et Difficultés',
            'environnement': 'Environnement',
            'securite': 'Sécurité',
            'resultats': 'Résultats',
            'conclusions': 'Conclusions',
        }
        
        # Sections déjà affichées (sections de base + sections custom)
        processed_sections = {'general_info', 'description', 'observations'}
        
        # Ajouter les IDs des sections custom aux sections déjà traitées
        if custom_sections_data:
            for cs in custom_sections_data:
                if cs.get('id'):
                    processed_sections.add(cs['id'])
        
        # Autres sections avec photos (sections standards restantes uniquement)
        remaining_sections = {k: v for k, v in photos_by_section_id.items() if k not in processed_sections}
        
        if remaining_sections:
            for section_id, section_photos in remaining_sections.items():
                # Toujours PageBreak pour garder titre et photos ensemble
                story.append(PageBreak())
                story.append(add_decorative_line(colors.Color(0.90, 0.95, 1)))
                story.append(Spacer(1, 0.4*cm))
                
                section_title = section_titles.get(section_id, section_id.replace('_', ' ').title())
                story.append(Paragraph(f"📷 {section_title.upper()}", heading_style))
                story.append(Spacer(1, 0.5*cm))
                
                # Ajouter les photos de cette section
                added, photo_counter_global = add_section_photos_grid(section_title, section_photos, photo_counter_global)
        
        logging.info(f"✅ [PDF] Total photos ajoutées: {photo_counter_global}/{len(photos) if photos else 0}")


        # ==================== SECTION SIGNATURES ====================
        story.append(PageBreak())
        story.append(add_decorative_line(colors.Color(1, 0.84, 0.0)))
        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph("✍️ SIGNATURES ET VALIDATION", heading_style))
        story.append(Spacer(1, 0.8*cm))
        
        sig_text_style = ParagraphStyle('SigText', parent=styles['Normal'],
                                       fontSize=10, textColor=soft_gray, fontName='Helvetica')
        
        # Tableau signatures
        sig_data = [
            [Paragraph("<b>Technicien</b>", sig_text_style), Paragraph("<b>Client</b>", sig_text_style)],
            ['', ''],
            ['', ''],
            ['', ''],
            [Paragraph("Nom: ___________________", sig_text_style), Paragraph("Nom: ___________________", sig_text_style)],
            [Paragraph("Date: ___________________", sig_text_style), Paragraph("Date: ___________________", sig_text_style)],
            [Paragraph("Signature:", sig_text_style), Paragraph("Signature:", sig_text_style)],
        ]
        
        sig_table = Table(sig_data, colWidths=[8*cm, 8*cm], rowHeights=[0.7*cm, 3*cm, 0.1*cm, 0.1*cm, 0.7*cm, 0.7*cm, 0.7*cm])
        sig_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.96, 0.97, 0.99)),
            ('TEXTCOLOR', (0, 0), (-1, 0), dark_indigo),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOX', (0, 0), (-1, -1), 1, colors.Color(0.8, 0.8, 0.8)),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.Color(0.9, 0.9, 0.9)),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 30),
            ('BOX', (0, 1), (-1, 1), 1.5, colors.Color(0.7, 0.7, 0.7)),
        ]))
        story.append(sig_table)
        
        story.append(Spacer(1, 1.5*cm))
        
        # Note finale
        final_note_style = ParagraphStyle('FinalNote', parent=styles['Normal'],
                                         fontSize=8, textColor=colors.Color(0.5, 0.5, 0.5),
                                         alignment=TA_CENTER, fontName='Helvetica-Oblique',
                                         leading=12)
        
        story.append(Paragraph(
            "Ce rapport a été généré automatiquement par SkyApp.<br/>"
            "Pour toute question ou réclamation, veuillez contacter le service client.",
            final_note_style
        ))
        
        logging.info(f"📝 [PDF] Construction document ({len(story)} éléments)...")
        doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
        logging.info(f"✅ [PDF] Document construit")
        
        buffer.seek(0)
        
        # Nettoyer fichiers temporaires
        try:
            temp_files = list((ROOT_DIR / "uploads").glob(f"temp_{search_id}_*.jpg"))
            if temp_files:
                for f in temp_files:
                    f.unlink()
                logging.info(f"🧹 [PDF] {len(temp_files)} fichiers temporaires nettoyés")
        except Exception as e:
            logging.warning(f"⚠️ [PDF] Nettoyage: {e}")
        
        # Nom de fichier - nettoyer TOUS les caractères spéciaux
        location = search.get('location', 'recherche')
        # Supprimer retours à la ligne, tabs, etc
        location = location.replace('\n', '').replace('\r', '').replace('\t', '')
        # Remplacer espaces et slashes
        location = location.replace(' ', '_').replace('/', '_').replace('\\', '_')
        # Garder seulement les caractères alphanumériques et underscores
        import re
        location = re.sub(r'[^a-zA-Z0-9_-]', '', location)[:30]
        
        filename = f"rapport_{location}_{search_id[:8]}.pdf"
        pdf_size = buffer.getbuffer().nbytes
        logging.info(f"📤 [PDF] Envoi: {filename} ({pdf_size} bytes)")
        
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌❌❌ [PDF] CRASH FATAL: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur PDF: {str(e)}")

# VERSION COMPLETE COMMENTEE TEMPORAIREMENT
@api_router.get("/searches/{search_id}/pdf-FULL-DISABLED")
async def generate_search_pdf_full_disabled(search_id: str, user_data: dict = Depends(get_user_from_token)):
    """Version complète temporairement désactivée"""
    import requests
    
    try:
        company_id = await get_user_company(user_data)
        response = supabase_service.table("searches").select("*").eq("id", search_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Recherche introuvable")
        search = response.data[0]
        if company_id and search.get("company_id") != company_id:
            raise HTTPException(status_code=403, detail="Accès refusé")
        company_settings = {}
        try:
            if company_id:
                settings_resp = supabase_service.table("company_settings").select("*").eq("company_id", company_id).execute()
                if settings_resp.data:
                    company_settings = settings_resp.data[0]
        except:
            pass
        
        primary_color = colors.HexColor("#6366f1")
        secondary_color = colors.HexColor("#333333")
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2*cm, rightMargin=2*cm)
        story = []
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=22, textColor=primary_color, alignment=TA_CENTER, spaceAfter=20)
        heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=primary_color, spaceAfter=10, spaceBefore=15)
        normal_bold = ParagraphStyle('NormalBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10)
        
        # ===== EN-TÊTE AVEC LOGO ET INFORMATIONS SOCIÉTÉ =====
        header_data = []
        
        if company_settings and company_settings.get("logo_url"):
            # LOGO DÉSACTIVÉ pour test
            pass
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur génération PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur génération PDF: {str(e)}")

# Routes pour les clients
@api_router.get("/clients")
async def get_clients(user_data: dict = Depends(get_user_from_token)):
    """Récupérer la liste des clients"""
    try:
        # Accessible à tous les utilisateurs authentifiés (ADMIN, BUREAU, TECHNICIEN)
        logging.info(f"📋 GET /clients - user_data: {user_data}")
        company_id = await get_user_company(user_data)
        logging.info(f"📋 GET /clients - company_id: {company_id}")
        if company_id:
            response = supabase_service.table("clients").select("*").eq("company_id", company_id).execute()
        else:
            response = supabase_service.table("clients").select("*").execute()
        logging.info(f"📋 GET /clients - response: {len(response.data)} clients")
        return response.data
    except Exception as e:
        logging.error(f"❌ Erreur /clients: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des clients: {str(e)}")

@api_router.get("/clients/{client_id}")
async def get_client_by_id(client_id: str, user_data: dict = Depends(get_user_from_token)):
    """Récupérer un client spécifique par son ID"""
    try:
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        
        response = supabase_service.table("clients").select("*").eq("id", client_id).eq("company_id", company_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du client: {str(e)}")

@api_router.post("/clients")
async def create_client(client_data: ClientCreate, user_data: dict = Depends(get_user_from_token)):
    """Créer un nouveau client"""
    try:
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        
        new_client = {
            "company_id": company_id,
            "nom": client_data.nom,
            "email": client_data.email,
            "telephone": client_data.telephone,
            "adresse": client_data.adresse
        }
        
        response = supabase_service.table("clients").insert(new_client).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du client: {str(e)}")

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, client_data: ClientCreate, user_data: dict = Depends(get_user_from_token)):
    """Modifier un client existant"""
    try:
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        
        updated_client = {
            "nom": client_data.nom,
            "email": client_data.email,
            "telephone": client_data.telephone,
            "adresse": client_data.adresse
        }
        
        response = supabase_service.table("clients").update(updated_client).eq("id", client_id).eq("company_id", company_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Client non trouvé ou vous n'avez pas accès à ce client")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la modification du client: {str(e)}")

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user_data: dict = Depends(get_user_from_token)):
    """Supprimer un client"""
    try:
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        
        # Vérifier d'abord si le client a des chantiers associés
        worksites_response = supabase_service.table("worksites").select("id").eq("client_id", client_id).execute()
        
        if worksites_response.data and len(worksites_response.data) > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible de supprimer ce client car il a {len(worksites_response.data)} chantier(s) associé(s). Veuillez d'abord supprimer ou réassigner les chantiers."
            )
        
        # Vérifier si le client a des devis associés
        quotes_response = supabase_service.table("quotes").select("id").eq("client_id", client_id).execute()
        
        if quotes_response.data and len(quotes_response.data) > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible de supprimer ce client car il a {len(quotes_response.data)} devis associé(s). Veuillez d'abord supprimer les devis."
            )
        
        # Supprimer le client
        response = supabase_service.table("clients").delete().eq("id", client_id).eq("company_id", company_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Client non trouvé ou vous n'avez pas accès à ce client")
        return {"message": "Client supprimé avec succès", "deleted_client": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du client {client_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du client: {str(e)}")

# Routes pour le catalogue de produits
@api_router.get("/catalog/products")
async def get_catalog_products(user_data: dict = Depends(get_user_from_token)):
    """Récupérer tous les produits du catalogue de l'entreprise"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id manquant")
        
        response = supabase_service.table("catalog_products").select("*").eq("company_id", company_id).order("created_at", desc=True).execute()
        return {"data": response.data or [], "count": len(response.data or [])}
    except Exception as e:
        logging.error(f"Erreur récupération catalogue: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.post("/catalog/products")
async def create_catalog_product(product_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Créer un nouveau produit dans le catalogue (Admin/Bureau uniquement)"""
    try:
        # Vérifier que l'utilisateur est Admin ou Bureau
        user_role = user_data.get("role", "TECHNICIEN")
        if user_role not in ["ADMIN", "BUREAU"]:
            raise HTTPException(status_code=403, detail="Seuls les administrateurs et le bureau peuvent ajouter des produits au catalogue")
        
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        new_product = {
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "user_id": user_data["id"],
            "name": product_data.get("name"),
            "description": product_data.get("description", ""),
            "category": product_data.get("category", "Autre"),
            "price": float(product_data.get("price", 0)),
            "unit": product_data.get("unit", "unité"),
            "reference": product_data.get("reference", ""),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        response = supabase_service.table("catalog_products").insert(new_product).execute()
        return {"message": "Produit créé avec succès", "product": response.data[0]}
    except Exception as e:
        logging.error(f"Erreur création produit: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.put("/catalog/products/{product_id}")
async def update_catalog_product(product_id: str, product_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Mettre à jour un produit du catalogue (Admin/Bureau uniquement)"""
    try:
        # Vérifier que l'utilisateur est Admin ou Bureau
        user_role = user_data.get("role", "TECHNICIEN")
        if user_role not in ["ADMIN", "BUREAU"]:
            raise HTTPException(status_code=403, detail="Seuls les administrateurs et le bureau peuvent modifier des produits du catalogue")
        
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        updated_product = {
            "name": product_data.get("name"),
            "description": product_data.get("description", ""),
            "category": product_data.get("category", "Autre"),
            "price": float(product_data.get("price", 0)),
            "unit": product_data.get("unit", "unité"),
            "reference": product_data.get("reference", ""),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        response = supabase_service.table("catalog_products").update(updated_product).eq("id", product_id).eq("company_id", company_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        return {"message": "Produit modifié avec succès", "product": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur modification produit: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.delete("/catalog/products/{product_id}")
async def delete_catalog_product(product_id: str, user_data: dict = Depends(get_user_from_token)):
    """Supprimer un produit du catalogue (Admin/Bureau uniquement)"""
    try:
        # Vérifier que l'utilisateur est Admin ou Bureau
        user_role = user_data.get("role", "TECHNICIEN")
        if user_role not in ["ADMIN", "BUREAU"]:
            raise HTTPException(status_code=403, detail="Seuls les administrateurs et le bureau peuvent supprimer des produits du catalogue")
        
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        response = supabase_service.table("catalog_products").delete().eq("id", product_id).eq("company_id", company_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        return {"message": "Produit supprimé avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur suppression produit: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# Routes pour les devis (quotes)
@api_router.get("/quotes")
async def get_quotes(
    client_id: Optional[str] = None,
    user_data: dict = Depends(get_user_from_token)
):
    """Récupérer la liste des devis avec informations client"""
    try:
        company_id = await get_user_company(user_data)
        user_id = user_data.get("id")
        
        if company_id:
            # Utiliser la vue quotes_with_client_name pour avoir les infos client
            query = supabase_service.table("quotes_with_client_name").select("*").eq("company_id", company_id)
            
            # 🔒 FILTRE PAR RÔLE : Admin/Bureau voient tout, techniciens voient leurs devis
            user_role = user_data.get("role", "TECHNICIEN")
            if user_role in ["ADMIN", "BUREAU"]:
                logging.info(f"👑 [/quotes] Admin/Bureau: TOUS les devis visibles (role={user_role})")
            else:
                logging.info(f"🔒 [/quotes] Technicien: Filtre par user_id={user_id}")
                query = query.eq("user_id", user_id)
            
            # Filtre optionnel par client
            if client_id:
                query = query.eq("client_id", client_id)
            
            response = query.execute()
        else:
            response = supabase_service.table("quotes_with_client_name").select("*").execute()
        return {"data": response.data or [], "count": len(response.data or [])}
    except Exception as e:
        # Fallback sur la table quotes si la vue n'existe pas encore
        try:
            if company_id:
                query = supabase_service.table("quotes").select("*").eq("company_id", company_id).eq("user_id", user_id)
                if client_id:
                    query = query.eq("client_id", client_id)
                response = query.execute()
            else:
                response = supabase_service.table("quotes").select("*").eq("user_id", user_id).execute()
            return {"data": response.data or [], "count": len(response.data or [])}
        except:
            raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des devis: {str(e)}")

@api_router.post("/quotes")
async def create_quote(quote_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Créer un nouveau devis"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Log des données reçues
        logger.info(f"Données reçues pour création de devis: {quote_data}")
        
        # Générer le numéro de devis automatiquement
        quote_number_result = supabase_service.rpc('generate_quote_number', {'p_company_id': company_id}).execute()
        quote_number = quote_number_result.data
        
        logger.info(f"Numéro de devis généré: {quote_number}")
        
        # Extraire les champs qui existent dans la table quotes + items en JSON
        new_quote = {
            "company_id": company_id,
            "client_id": quote_data.get("client_id"),
            "quote_number": quote_number,
            "title": quote_data.get("title"),
            "description": quote_data.get("description", ""),
            "amount": float(quote_data.get("amount", 0)),
            "status": quote_data.get("status", "DRAFT"),
            "items": quote_data.get("items", []),  # Stocker les items en JSON
            "created_by_user_id": user_data.get("user_id")  # Stocker l'ID de l'utilisateur créateur
        }
        
        logger.info(f"Données préparées pour insertion: {new_quote}")
        
        response = supabase_service.table("quotes").insert(new_quote).execute()
        logger.info(f"Devis créé avec succès: {response.data[0]}")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du devis: {str(e)}")

@api_router.get("/quotes/{quote_id}")
async def get_quote(quote_id: str, user_data: dict = Depends(get_user_from_token)):
    """Récupérer un devis spécifique par son ID"""
    try:
        company_id = await get_user_company(user_data)
        
        # Récupérer le devis avec les infos de l'utilisateur créateur
        response = supabase_service.table("quotes").select(
            "*, created_by:created_by_user_id(id, first_name, last_name, email)"
        ).eq("id", quote_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Devis introuvable")
        
        quote = response.data[0]
        
        # Vérifier que le devis appartient à la même company (sauf si FONDATEUR)
        if company_id and quote.get("company_id") != company_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé à ce devis")
        
        return quote
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du devis: {str(e)}")

@api_router.put("/quotes/{quote_id}")
async def update_quote(quote_id: str, quote_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Modifier un devis existant"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier que le devis appartient à la société (sécurité multi-tenant)
        existing = supabase_service.table("quotes").select("*").eq("id", quote_id).eq("company_id", company_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Devis non trouvé ou accès refusé")
        
        # Filtrer les champs modifiables (exclure les champs calculés de la vue)
        allowed_fields = ['client_id', 'title', 'description', 'amount', 'status', 'items']
        update_data = {k: v for k, v in quote_data.items() if k in allowed_fields}
        
        # Mise à jour
        response = supabase_service.table("quotes").update(update_data).eq("id", quote_id).execute()
        
        # Vérifier que la réponse contient des données
        if response.data and len(response.data) > 0:
            return response.data[0]
        else:
            # Si pas de données retournées, récupérer le devis mis à jour
            updated = supabase_service.table("quotes").select("*").eq("id", quote_id).execute()
            if updated.data and len(updated.data) > 0:
                return updated.data[0]
            else:
                raise HTTPException(status_code=500, detail="Erreur lors de la récupération du devis mis à jour")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la modification du devis: {str(e)}")

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, user_data: dict = Depends(get_user_from_token)):
    """Supprimer un devis"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier que le devis appartient à la société (sécurité multi-tenant)
        existing = supabase_service.table("quotes").select("*").eq("id", quote_id).eq("company_id", company_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Devis non trouvé ou accès refusé")
        
        # Suppression
        supabase_service.table("quotes").delete().eq("id", quote_id).execute()
        return {"message": "Devis supprimé avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du devis: {str(e)}")

@api_router.get("/quotes/{quote_id}/pdf")
async def generate_quote_pdf(
    quote_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """Générer un PDF professionnel pour un devis"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Récupérer le devis
        response = supabase_service.table("quotes").select("*").eq("id", quote_id).eq("company_id", company_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Devis introuvable")
        
        quote = response.data[0]
        
        # Log pour déboguer
        logging.info(f"📄 Génération PDF pour devis: {quote.get('quote_number', quote_id)}")
        logging.info(f"Client ID: {quote.get('client_id')}")
        
        # Vérifier et normaliser items
        items = quote.get('items', [])
        if items is None:
            items = []
        if not isinstance(items, list):
            logging.warning(f"⚠️ Items n'est pas une liste: {type(items)}")
            items = []
        
        logging.info(f"Items: {len(items)} articles")
        
        # Log des photos dans les items
        for idx, item in enumerate(items):
            has_photo = 'photo' in item and item['photo'] is not None
            logging.info(f"  Article {idx+1}: {item.get('name', 'Sans nom')} - Photo: {'✓' if has_photo else '✗'}")
        
        # Récupérer les informations de l'entreprise depuis company_settings
        company_info = {}
        company_response = supabase_service.table("company_settings").select("*").eq("company_id", company_id).execute()
        if company_response.data:
            company_info = company_response.data[0]
            logging.info(f"Entreprise: {company_info.get('company_name', 'N/A')}")
            logging.info(f"Données entreprise: {company_info.keys()}")
        
        # Créer le PDF
        buffer = io.BytesIO()
        
        def add_page_number(canvas_obj, doc_obj):
            """Ajoute le pied de page avec infos société sur chaque page"""
            canvas_obj.saveState()
            page_width = A4[0]
            left_margin = 1.5*cm
            right_edge = page_width - 1.5*cm
            usable_width = right_edge - left_margin
            mid_x = page_width / 2
            
            # ==== ZONE SIGNATURES ====
            # Labels signatures (fond gris clair)
            canvas_obj.setFillColor(colors.HexColor('#f0f0f0'))
            canvas_obj.rect(left_margin, 4.8*cm, usable_width/2 - 0.2*cm, 0.9*cm, fill=1, stroke=0)
            canvas_obj.rect(mid_x + 0.1*cm, 4.8*cm, usable_width/2 - 0.2*cm, 0.9*cm, fill=1, stroke=0)
            
            # Texte signatures
            canvas_obj.setFillColor(colors.black)
            canvas_obj.setFont('Helvetica-Bold', 8)
            canvas_obj.drawCentredString(left_margin + usable_width/4, 5.35*cm, "Bon pour accord")
            canvas_obj.setFont('Helvetica', 6)
            canvas_obj.drawCentredString(left_margin + usable_width/4, 5.05*cm, "(Date, Cachet, Signature)")
            canvas_obj.setFont('Helvetica-Bold', 8)
            canvas_obj.drawCentredString(mid_x + usable_width/4, 5.35*cm, "Signature chargé d'affaire")
            
            # ==== LIGNE DE SÉPARATION FOOTER ====
            canvas_obj.setStrokeColor(colors.black)
            canvas_obj.setLineWidth(1.2)
            canvas_obj.line(left_margin, 2.2*cm, right_edge, 2.2*cm)
            
            # Nom de l'entreprise
            canvas_obj.setFont('Helvetica-Bold', 7)
            canvas_obj.setFillColor(colors.black)
            company_name = company_info.get('company_name', '')
            if company_name:
                canvas_obj.drawCentredString(mid_x, 1.85*cm, company_name)
            
            # Infos contact (adresse, tél, email)
            canvas_obj.setFont('Helvetica', 6)
            canvas_obj.setFillColor(colors.HexColor('#444444'))
            contact_parts = []
            if company_info.get('address'):
                contact_parts.append(company_info['address'])
            if company_info.get('phone'):
                contact_parts.append(f"Tél : {company_info['phone']}")
            if company_info.get('email'):
                contact_parts.append(company_info['email'])
            if contact_parts:
                canvas_obj.drawCentredString(mid_x, 1.5*cm, " - ".join(contact_parts))
            
            # Infos légales (forme juridique, SIRET, RCS, TVA)
            legal_parts = []
            if company_info.get('legal_form'):
                legal_parts.append(company_info['legal_form'])
            if company_info.get('siret'):
                legal_parts.append(f"Siret : {company_info['siret']}")
            if company_info.get('rcs_rm'):
                legal_parts.append(company_info['rcs_rm'])
            if company_info.get('tva_number'):
                legal_parts.append(f"N° TVA : {company_info['tva_number']}")
            if legal_parts:
                canvas_obj.drawCentredString(mid_x, 1.15*cm, " - ".join(legal_parts))
            
            # Numéro de page + date d'émission
            canvas_obj.setFont('Helvetica', 5.5)
            canvas_obj.setFillColor(colors.HexColor('#888888'))
            canvas_obj.drawCentredString(mid_x, 0.7*cm, 
                f"Page {doc_obj.page} - Document émis le {datetime.now().strftime('%d/%m/%Y à %H:%M')}")
            
            canvas_obj.restoreState()
        
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*cm, bottomMargin=5.5*cm, 
                               leftMargin=1.5*cm, rightMargin=1.5*cm)
        
        story = []
        styles = getSampleStyleSheet()
        
        # Styles personnalisés noir et blanc
        primary_color = colors.black
        accent_color = colors.black
        dark_gray = colors.HexColor('#333333')
        medium_gray = colors.HexColor('#666666')
        
        normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'],
                                     fontSize=9, textColor=dark_gray)
        
        bold_style = ParagraphStyle('Bold', parent=styles['Normal'],
                                   fontSize=9, textColor=colors.black, fontName='Helvetica-Bold')
        
        small_style = ParagraphStyle('Small', parent=styles['Normal'],
                                    fontSize=8, textColor=dark_gray)
        
        # ==== EN-TÊTE STYLE PROFESSIONNEL ====
        # Logo + Infos entreprise à gauche | Lieu/Date + Numéro devis à droite
        
        # Colonne gauche : Logo et infos entreprise
        left_content = []
        
        # Logo si disponible
        logo_loaded = False
        if company_info.get('logo_url'):
            try:
                logo_path = company_info['logo_url']
                # Si le chemin est relatif, utiliser le chemin local
                if logo_path.startswith('/uploads/'):
                    logo_path = str(ROOT_DIR / logo_path.lstrip('/'))
                elif not logo_path.startswith('http'):
                    # Chemin absolu local
                    logo_path = str(ROOT_DIR / logo_path.lstrip('/'))
                
                # Vérifier que le fichier existe avant de créer l'image
                from pathlib import Path
                if Path(logo_path).exists():
                    logo_img = ReportLabImage(logo_path, width=3*cm, height=3*cm, kind='proportional')
                    left_content.append(logo_img)
                    left_content.append(Spacer(1, 0.2*cm))
                    logo_loaded = True
                    logging.info(f"✅ Logo chargé: {logo_path}")
                else:
                    # Si le logo spécifié n'existe pas, chercher le plus récent dans le dossier
                    logos_dir = ROOT_DIR / 'uploads' / 'logos'
                    if logos_dir.exists():
                        logo_files = sorted(logos_dir.glob(f"company_logo_{company_id}_*.png"), 
                                          key=lambda x: x.stat().st_mtime, reverse=True)
                        if logo_files:
                            logo_img = ReportLabImage(str(logo_files[0]), width=3*cm, height=3*cm, kind='proportional')
                            left_content.append(logo_img)
                            left_content.append(Spacer(1, 0.2*cm))
                            logo_loaded = True
                            logging.info(f"✅ Logo le plus récent chargé: {logo_files[0]}")
                        else:
                            logging.warning(f"⚠️ Aucun logo trouvé pour l'entreprise {company_id}")
                    else:
                        logging.warning(f"⚠️ Logo introuvable: {logo_path}")
            except Exception as e:
                logging.error(f"Erreur chargement logo: {e}")
                pass
        
        # Infos entreprise sous le logo
        company_lines = []
        if company_info.get('company_name'):
            company_lines.append(f"<b><font size=12>{company_info['company_name']}</font></b>")
        if company_info.get('legal_form'):
            company_lines.append(f"<font color='#666666'>{company_info['legal_form']}</font>")
        if company_info.get('address'):
            company_lines.append(company_info['address'])
        if company_info.get('postal_code') or company_info.get('city'):
            postal = company_info.get('postal_code', '')
            city = company_info.get('city', '')
            company_lines.append(f"{postal} {city}".strip())
        if company_info.get('phone'):
            company_lines.append(f"<b>Tél : {company_info['phone']}</b>")
        if company_info.get('email'):
            company_lines.append(company_info['email'])
        
        if company_lines:
            left_content.append(Paragraph("<br/>".join(company_lines), small_style))
        
        # Colonne droite : Lieu, Date et Numéro de devis
        right_content = []
        
        # Ville et date
        city_name = company_info.get('city', 'Paris').upper()
        date_str = datetime.now().strftime('%d/%m/%Y')
        right_content.append(Paragraph(f"<b>{city_name}, le {date_str}</b>", bold_style))
        right_content.append(Spacer(1, 0.2*cm))
        
        # Numéro de devis
        devis_num = Paragraph(f"<b><font size=14>Devis N° {quote.get('quote_number', 'N/A')}</font></b>", 
                             ParagraphStyle('DevisNum', fontSize=14, fontName='Helvetica-Bold', alignment=TA_LEFT))
        right_content.append(devis_num)
        right_content.append(Spacer(1, 0.3*cm))
        
        # Section CLIENT - badge compact
        client_badge = Table([[Paragraph("<b>CLIENT</b>", ParagraphStyle('CB', fontSize=9, textColor=colors.white, fontName='Helvetica-Bold'))]], 
                            colWidths=[2.5*cm])
        client_badge.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        right_content.append(client_badge)
        right_content.append(Spacer(1, 0.15*cm))
        
        # Récupérer les infos du client
        client_lines = []
        if quote.get('client_id'):
            try:
                client_response = supabase_service.table("clients").select("*").eq("id", quote['client_id']).execute()
                if client_response.data:
                    client_info = client_response.data[0]
                    
                    # Nom complet
                    if client_info.get('societe'):
                        client_lines.append(f"<b>{client_info['societe']}</b>")
                    
                    full_name = []
                    if client_info.get('prenom'):
                        full_name.append(client_info['prenom'])
                    if client_info.get('nom'):
                        full_name.append(client_info['nom'])
                    if full_name:
                        client_lines.append(" ".join(full_name))
                    
                    # Adresse
                    if client_info.get('adresse'):
                        client_lines.append(client_info['adresse'])
                    
                    # Téléphone
                    if client_info.get('telephone'):
                        client_lines.append(f"Tél : {client_info['telephone']}")
            except Exception as e:
                logging.error(f"Erreur récupération client: {e}")
        
        if not client_lines and quote.get('client_name'):
            client_lines.append(quote['client_name'])
        
        if client_lines:
            right_content.append(Paragraph("<br/>".join(client_lines), small_style))
        
        # Créer le tableau header avec 2 colonnes
        header_table = Table([[left_content, right_content]], colWidths=[9*cm, 9*cm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        story.append(header_table)
        story.append(Spacer(1, 0.3*cm))
        
        # ==== LIGNE DE SÉPARATION ====
        line_table = Table([['']], colWidths=[18*cm])
        line_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 2, colors.black),
        ]))
        story.append(line_table)
        story.append(Spacer(1, 0.2*cm))
        
        # ==== AFFAIRE SUIVIE PAR ====
        if company_info.get('contact_name') or company_info.get('contact_phone'):
            affaire_text = "<b>Affaire suivie par :</b> "
            if company_info.get('contact_name'):
                affaire_text += f"{company_info['contact_name']}"
            if company_info.get('contact_phone'):
                affaire_text += f" - Tél : {company_info['contact_phone']}"
            story.append(Paragraph(affaire_text, normal_style))
            story.append(Spacer(1, 0.15*cm))
        
        # ==== ADRESSE DES TRAVAUX - badge compact ====
        if quote.get('worksite_address'):
            addr_badge = Table([[Paragraph("<b>ADRESSE DES TRAVAUX</b>", ParagraphStyle('AB', fontSize=8, textColor=colors.white, fontName='Helvetica-Bold'))]], 
                              colWidths=[5*cm])
            addr_badge.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.black),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(addr_badge)
            story.append(Spacer(1, 0.1*cm))
            story.append(Paragraph(quote['worksite_address'], normal_style))
            story.append(Spacer(1, 0.2*cm))
        
        # ==== OBJET DES TRAVAUX - badge compact ====
        if quote.get('title') or quote.get('description'):
            obj_badge = Table([[Paragraph("<b>OBJET DES TRAVAUX</b>", ParagraphStyle('OB', fontSize=8, textColor=colors.white, fontName='Helvetica-Bold'))]], 
                             colWidths=[5*cm])
            obj_badge.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.black),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(obj_badge)
            story.append(Spacer(1, 0.1*cm))
            if quote.get('title'):
                title_style = ParagraphStyle('WorkTitle', fontSize=9, textColor=colors.black, fontName='Helvetica-Bold')
                story.append(Paragraph(quote['title'], title_style))
            if quote.get('description'):
                story.append(Paragraph(quote['description'], normal_style))
            story.append(Spacer(1, 0.25*cm))
        
        # Items déjà normalisé au début de la fonction
        if items:
            total_ht = 0
            total_tva = 0
            
            # En-tête du tableau principal avec couleurs professionnelles
            header_style = ParagraphStyle('TableHeader', fontSize=9, textColor=colors.white, fontName='Helvetica-Bold', alignment=TA_CENTER)
            table_data = [
                [
                    Paragraph("<b>N°</b>", header_style),
                    Paragraph("<b>Désignation</b>", header_style),
                    Paragraph("<b>Unité</b>", header_style),
                    Paragraph("<b>Quantité</b>", header_style),
                    Paragraph("<b>Prix HT</b>", header_style),
                    Paragraph("<b>TVA</b>", header_style),
                    Paragraph("<b>Total HT</b>", header_style)
                ]
            ]
            
            for item_idx, item in enumerate(items, 1):
                qty = float(item.get('quantity', 0))
                price = float(item.get('price', 0))
                tva_rate = float(item.get('tva_rate', 20))
                
                item_total = qty * price
                item_tva = item_total * (tva_rate / 100)
                
                total_ht += item_total
                total_tva += item_tva
                
                # Description complète avec nom + description
                desc_text = ""
                if item.get('name'):
                    desc_text = f"<b>{item['name']}</b>"
                if item.get('description'):
                    if desc_text:
                        desc_text += f"<br/>{item['description']}"
                    else:
                        desc_text = item['description']
                
                # Ligne de l'article
                table_data.append([
                    Paragraph(str(item_idx), normal_style),
                    Paragraph(desc_text, small_style),
                    Paragraph(item.get('unit', 'Ens'), normal_style),
                    Paragraph(f"{qty:.2f}", normal_style),
                    Paragraph(f"{price:.2f} €", normal_style),
                    Paragraph(f"{tva_rate:.0f}%", normal_style),
                    Paragraph(f"{item_total:.2f} €", normal_style)
                ])
                
                # Si l'article a une photo, l'ajouter sur la ligne suivante
                if item.get('photo'):
                    try:
                        photo_data = item['photo'].get('data', '')
                        if photo_data and ',' in photo_data:
                            base64_str = photo_data.split(',')[1]
                            img_data = base64.b64decode(base64_str)
                            img_buffer = io.BytesIO(img_data)
                            
                            # Image plus petite pour s'intégrer dans le tableau
                            img = ReportLabImage(img_buffer, width=6*cm, height=4.5*cm, kind='proportional')
                            
                            # Ligne pour la photo (span sur toutes les colonnes sauf la première)
                            table_data.append([
                                '',
                                img,
                                '',
                                '',
                                '',
                                '',
                                ''
                            ])
                    except Exception as e:
                        logging.error(f"Erreur ajout photo dans tableau: {e}")
            
            # Créer le tableau avec les nouvelles largeurs et style professionnel
            main_table = Table(table_data, colWidths=[1*cm, 7*cm, 1.5*cm, 1.5*cm, 2*cm, 1.5*cm, 2.5*cm])
            main_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
                ('LINEBELOW', (0, 0), (-1, 0), 2, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BACKGROUND', (0, 0), (-1, 0), colors.black),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('ALIGN', (2, 0), (6, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 3),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ]))
            
            story.append(main_table)
            story.append(Spacer(1, 0.3*cm))
            
            # ==== TOTAUX À DROITE AVEC ENCADRÉ ====
            total_ttc = total_ht + total_tva
            
            # Calculer le pourcentage de TVA (éviter division par zéro)
            tva_percentage = (total_tva/total_ht*100) if total_ht > 0 else 0
            
            # Créer un tableau pour les montants (compact)
            totals_header_style = ParagraphStyle('TotalsHeader', fontSize=8, textColor=colors.white, 
                                                 fontName='Helvetica-Bold', alignment=TA_CENTER)
            totals_left_style = ParagraphStyle('TotalsLeft', fontSize=9, leading=13, 
                                              fontName='Helvetica', textColor=dark_gray)
            totals_right_style = ParagraphStyle('TotalsRight', fontSize=9, leading=13, 
                                               fontName='Helvetica', alignment=TA_RIGHT, textColor=dark_gray)
            totals_ttc_style = ParagraphStyle('TotalsTTC', fontSize=11, leading=13, 
                                             fontName='Helvetica-Bold', alignment=TA_RIGHT, textColor=colors.black)
            
            totals_data = [
                [Paragraph("MONTANTS EN EUROS", totals_header_style)],
                [Paragraph(f"Total H.T.<br/>Total T.V.A. {tva_percentage:.0f}%", totals_left_style)],
                [Paragraph(f"<b>TOTAL T.T.C.</b>", ParagraphStyle('TTCLabel', fontSize=11, fontName='Helvetica-Bold', textColor=colors.black))],
            ]
            
            amounts_data = [
                [''],
                [Paragraph(f"{total_ht:.2f} €<br/>{total_tva:.2f} €", totals_right_style)],
                [Paragraph(f"<b>{total_ttc:.2f} €</b>", totals_ttc_style)],
            ]
            
            # Tableau de gauche (labels)
            totals_left = Table(totals_data, colWidths=[6*cm])
            totals_left.setStyle(TableStyle([
                ('BOX', (0, 0), (-1, -1), 1.5, colors.black),
                ('BACKGROUND', (0, 0), (-1, 0), colors.black),
                ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#eeeeee')),  # Fond jaune clair pour TTC
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, 0), 4),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
                ('TOPPADDING', (0, 1), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ]))
            
            # Tableau de droite (montants)
            totals_right = Table(amounts_data, colWidths=[5*cm])
            totals_right.setStyle(TableStyle([
                ('BOX', (0, 0), (-1, -1), 1.5, colors.black),
                ('BACKGROUND', (0, 0), (-1, 0), colors.black),
                ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#eeeeee')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
                ('TOPPADDING', (0, 0), (-1, 0), 4),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
                ('TOPPADDING', (0, 1), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]))
            
            # Assembler les deux tableaux côte à côte, alignés à droite
            combined_totals = Table([[' ', totals_left, totals_right]], colWidths=[6*cm, 6*cm, 5*cm])
            combined_totals.setStyle(TableStyle([
                ('ALIGN', (1, 0), (-1, 0), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            
            story.append(combined_totals)
        
        story.append(Spacer(1, 0.3*cm))
        
        # ==== MODALITÉS DE RÈGLEMENT (compact) ====
        modalities_text = []
        modalities_text.append("<b>MODALITÉS DE RÈGLEMENT</b>")
        modalities_text.append("TVA AUTOLIQUIDATION : Article 283-2 du CGI | <b>Devis valable 30 JOURS</b> | Escompte anticipé : 0%")
        
        modalities_style = ParagraphStyle('Modalities', fontSize=7, textColor=dark_gray, leading=10)
        modalities_para = Paragraph("<br/>".join(modalities_text), modalities_style)
        story.append(modalities_para)
        
        # Construire le PDF (signatures + pied de page dessinés par add_page_number)
        doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
        
        buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(buffer.getvalue()),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Devis_{quote.get('quote_number', quote_id)}.pdf"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        logging.error(f"Erreur génération PDF devis: {e}")
        logging.error(f"Traceback complet:\n{error_detail}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du PDF: {str(e)}")


# Routes pour les templates de devis
@api_router.get("/quote-templates")
async def get_quote_templates(user_data: dict = Depends(get_user_from_token)):
    """Récupérer les templates de devis de l'entreprise"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        response = supabase_service.table("quote_templates").select("*").eq("company_id", company_id).order("created_at", desc=True).execute()
        return {"data": response.data or [], "count": len(response.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des templates: {str(e)}")

@api_router.post("/quote-templates")
async def create_quote_template(template_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Créer un nouveau template de devis"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        new_template = {
            "company_id": company_id,
            "name": template_data.get("name"),
            "description": template_data.get("description", ""),
            "items": template_data.get("items", []),
            "tags": template_data.get("tags", [])
        }
        
        response = supabase_service.table("quote_templates").insert(new_template).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du template: {str(e)}")

@api_router.put("/quote-templates/{template_id}")
async def update_quote_template(template_id: str, template_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Modifier un template de devis"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier que le template appartient à l'entreprise
        existing = supabase_service.table("quote_templates").select("*").eq("id", template_id).eq("company_id", company_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Template non trouvé")
        
        update_data = {
            "name": template_data.get("name"),
            "description": template_data.get("description", ""),
            "items": template_data.get("items", []),
            "tags": template_data.get("tags", [])
        }
        
        response = supabase_service.table("quote_templates").update(update_data).eq("id", template_id).execute()
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la modification du template: {str(e)}")

@api_router.delete("/quote-templates/{template_id}")
async def delete_quote_template(template_id: str, user_data: dict = Depends(get_user_from_token)):
    """Supprimer un template de devis"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier que le template appartient à l'entreprise
        existing = supabase_service.table("quote_templates").select("*").eq("id", template_id).eq("company_id", company_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Template non trouvé")
        
        supabase_service.table("quote_templates").delete().eq("id", template_id).execute()
        return {"message": "Template supprimé avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du template: {str(e)}")

# Routes pour les invitations
@api_router.post("/invitations/send")
async def send_invitation(invitation: dict, user_data: dict = Depends(get_user_from_token)):
    """Envoyer une invitation pour rejoindre l'entreprise (Admin uniquement)"""
    try:
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise pour envoyer des invitations")
        
        email = invitation.get("email", "").strip().lower()
        role = invitation.get("role", "TECHNICIEN").upper()
        
        if not email:
            raise HTTPException(status_code=400, detail="Email requis")
        
        if role not in ["ADMIN", "BUREAU", "TECHNICIEN"]:
            raise HTTPException(status_code=400, detail="Rôle invalide")
        
        # Vérifier si l'utilisateur existe déjà
        existing_user = supabase_service.table("users").select("*").eq("email", email).execute()
        if existing_user.data:
            raise HTTPException(status_code=400, detail="Cet email est déjà enregistré")
        
        # Vérifier si une invitation existe déjà
        existing_inv = supabase_service.table("invitations").select("*").eq("email", email).eq("company_id", company_id).eq("status", "pending").execute()
        if existing_inv.data:
            raise HTTPException(status_code=400, detail="Une invitation est déjà en attente pour cet email")
        
        # Générer un token unique
        import secrets
        token = secrets.token_urlsafe(32)
        
        # Expiration dans 7 jours
        from datetime import datetime, timedelta
        expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
        
        new_invitation = {
            "company_id": company_id,
            "invited_by": user_data["id"],
            "email": email,
            "role": role,
            "token": token,
            "status": "pending",  # minuscule pour respecter la contrainte DB
            "expires_at": expires_at
        }
        
        response = supabase_service.table("invitations").insert(new_invitation).execute()
        
        # Récupérer les infos pour l'email
        from email_service import email_service
        company_response = supabase_service.table("companies").select("name").eq("id", company_id).limit(1).execute()
        company_name = company_response.data[0]["name"] if company_response.data else "Votre entreprise"
        
        user_response = supabase_service.table("users").select("email, first_name, last_name").eq("id", user_data["id"]).limit(1).execute()
        if user_response.data:
            user_info = user_response.data[0]
            invited_by_email = user_info.get("email", "un administrateur")
            first_name = user_info.get("first_name", "")
            last_name = user_info.get("last_name", "")
            invited_by_name = f"{first_name} {last_name}".strip() if (first_name or last_name) else invited_by_email
        else:
            invited_by_email = "un administrateur"
            invited_by_name = "un administrateur"
        
        # Envoyer l'email d'invitation via notre service email
        email_sent = False
        try:
            email_sent = email_service.send_invitation_email(
                to_email=email,
                company_name=company_name,
                role=role,
                invited_by=invited_by_email,
                invitation_token=token
            )
            if email_sent:
                logging.info(f"✅ Email d'invitation envoyé à {email}")
            else:
                logging.warning(f"⚠️ Email d'invitation non envoyé - Vérifiez la configuration SMTP")
        except Exception as e:
            logging.warning(f"⚠️ Erreur envoi email d'invitation: {str(e)}")
            # L'invitation est créée en base, l'admin peut partager le lien manuellement
        
        # Ajouter le nom de l'inviteur dans l'invitation
        supabase_service.table("invitations").update({
            "invited_by_name": invited_by_name
        }).eq("id", response.data[0]["id"]).execute()
        
        return {
            "message": "Invitation créée avec succès" + (" - Email envoyé ✉️" if email_sent else " ⚠️ Email non envoyé - Partagez le lien manuellement"),
            "invitation": response.data[0],
            "invitation_token": token,
            "email_sent": email_sent,
            "accept_url": f"{os.getenv('FRONTEND_URL', 'http://localhost:3002')}/accept-invitation?token={token}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'envoi de l'invitation: {str(e)}")

@api_router.get("/invitations/received")
async def get_received_invitations(user_data: dict = Depends(get_user_from_token)):
    """Obtenir les invitations reçues (pour un utilisateur connecté)"""
    try:
        email = user_data.get("email", "").lower()
        response = supabase_service.table("invitations").select("*").eq("email", email).eq("status", "pending").execute()
        
        # Récupérer les noms des entreprises séparément
        invitations = response.data
        for invitation in invitations:
            if invitation.get("company_id"):
                company_resp = supabase_service.table("companies").select("name").eq("id", invitation["company_id"]).execute()
                invitation["company_name"] = company_resp.data[0]["name"] if company_resp.data else None
        
        return invitations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des invitations: {str(e)}")

@api_router.get("/invitations/sent")
async def get_sent_invitations(user_data: dict = Depends(get_user_from_token)):
    """Obtenir les invitations envoyées par l'admin"""
    try:
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        response = supabase_service.table("invitations").select("*").eq("company_id", company_id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des invitations envoyées: {str(e)}")

@api_router.get("/invitations/{token}/validate")
async def validate_invitation_token(token: str):
    """Valider un token d'invitation (accessible sans authentification)"""
    try:
        from datetime import datetime
        response = supabase_service.table("invitations").select("*").eq("token", token).eq("status", "pending").execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Invitation introuvable ou déjà utilisée")
        
        invitation = response.data[0]
        
        # Récupérer le nom de l'entreprise séparément
        if invitation.get("company_id"):
            company_resp = supabase_service.table("companies").select("name").eq("id", invitation["company_id"]).execute()
            invitation["company_name"] = company_resp.data[0]["name"] if company_resp.data else "Entreprise"
        
        # Vérifier l'expiration
        expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            raise HTTPException(status_code=400, detail="Cette invitation a expiré")
        
        # Récupérer le nom de l'inviteur
        invited_by_name = invitation.get("invited_by_name", "")
        if not invited_by_name and invitation.get("invited_by"):
            # Fallback: récupérer depuis la table users si pas stocké
            try:
                inviter_response = supabase_service.table("users").select("email, first_name, last_name").eq("id", invitation["invited_by"]).limit(1).execute()
                if inviter_response.data:
                    inviter = inviter_response.data[0]
                    first_name = inviter.get("first_name", "")
                    last_name = inviter.get("last_name", "")
                    invited_by_name = f"{first_name} {last_name}".strip() if (first_name or last_name) else inviter.get("email", "")
            except:
                pass
        
        return {
            "id": invitation["id"],
            "email": invitation["email"],
            "company_name": invitation["companies"]["name"] if invitation.get("companies") else "Entreprise",
            "company_id": invitation["company_id"],
            "role": invitation["role"],
            "invited_by": invited_by_name or "un administrateur",
            "created_at": invitation.get("created_at", "")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la validation: {str(e)}")

@api_router.post("/invitations/{invitation_id}/accept-and-register")
async def accept_invitation_and_register(invitation_id: str, request: Request):
    """Créer un compte et accepter l'invitation en une seule étape (sans authentification préalable)"""
    try:
        from datetime import datetime
        data = await request.json()
        
        # Récupérer l'invitation
        inv_response = supabase_service.table("invitations").select("*").eq("id", invitation_id).eq("status", "pending").execute()
        if not inv_response.data:
            raise HTTPException(status_code=404, detail="Invitation introuvable ou déjà utilisée")
        
        invitation = inv_response.data[0]
        invitation_email = invitation.get("email", "").lower()
        provided_email = data.get("email", "").lower()
        
        # Vérifier que l'email correspond
        if invitation_email != provided_email:
            raise HTTPException(status_code=403, detail="L'adresse email ne correspond pas à l'invitation")
        
        # Vérifier l'expiration
        expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            raise HTTPException(status_code=400, detail="Cette invitation a expiré")
        
        # Créer le compte utilisateur via Supabase Auth
        password = data.get("password")
        if not password or len(password) < 6:
            raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
        
        try:
            # Utiliser admin API pour créer l'utilisateur sans envoyer d'email de confirmation
            auth_response = supabase_service.auth.admin.create_user({
                "email": invitation_email,
                "password": password,
                "email_confirm": True  # Marquer l'email comme déjà confirmé
            })
            
            if not auth_response.user:
                raise HTTPException(status_code=400, detail="Erreur lors de la création du compte")
            
            user_id = auth_response.user.id
            
            # Créer l'entrée dans la table users
            user_data = {
                "id": user_id,
                "email": invitation_email,
                "first_name": data.get("first_name", ""),
                "last_name": data.get("last_name", ""),
                "phone": data.get("phone", ""),
                "company_id": invitation.get("company_id"),
                "role": invitation.get("role", "TECHNICIEN"),
                "created_at": datetime.utcnow().isoformat()
            }
            
            supabase_service.table("users").insert(user_data).execute()
            
            # Marquer l'invitation comme acceptée (seulement le status car les autres colonnes n'existent pas)
            supabase_service.table("invitations").update({
                "status": "accepted"
            }).eq("id", invitation_id).execute()
            
            # admin.create_user ne retourne pas de session, se connecter pour obtenir un token
            token = None
            try:
                signin_response = supabase_service.auth.sign_in_with_password({
                    "email": invitation_email,
                    "password": password
                })
                if signin_response.session:
                    token = signin_response.session.access_token
            except Exception as signin_error:
                logger.error(f"Erreur lors de la connexion: {signin_error}")
                pass  # Si la connexion échoue, on retourne quand même le compte créé
            
            # Retourner le token et les infos utilisateur
            return {
                "message": "Compte créé et invitation acceptée avec succès",
                "token": token,
                "user": user_data
            }
            
        except Exception as auth_error:
            # Si l'utilisateur existe déjà, essayer de se connecter
            if "already registered" in str(auth_error).lower() or "user already exists" in str(auth_error).lower():
                try:
                    # Connexion
                    sign_in_response = supabase_service.auth.sign_in_with_password({
                        "email": invitation_email,
                        "password": password
                    })
                    
                    if not sign_in_response.user:
                        raise HTTPException(status_code=400, detail="Email déjà utilisé avec un autre mot de passe")
                    
                    user_id = sign_in_response.user.id
                    
                    # Mettre à jour l'utilisateur existant
                    supabase_service.table("users").update({
                        "company_id": invitation.get("company_id"),
                        "role": invitation.get("role", "TECHNICIEN"),
                        "first_name": data.get("first_name", ""),
                        "last_name": data.get("last_name", "")
                    }).eq("id", user_id).execute()
                    
                    # Marquer l'invitation comme acceptée
                    supabase_service.table("invitations").update({
                        "status": "accepted"
                    }).eq("id", invitation_id).execute()
                    
                    return {
                        "message": "Invitation acceptée avec succès",
                        "token": sign_in_response.session.access_token if sign_in_response.session else None,
                        "user": {
                            "id": user_id,
                            "email": invitation_email,
                            "company_id": invitation.get("company_id"),
                            "role": invitation.get("role", "TECHNICIEN")
                        }
                    }
                except Exception as signin_error:
                    raise HTTPException(status_code=400, detail=f"Impossible de créer ou connecter le compte: {str(signin_error)}")
            else:
                raise HTTPException(status_code=400, detail=f"Erreur lors de la création du compte: {str(auth_error)}")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'acceptation: {str(e)}")

@api_router.get("/invitations/verify/{token}")
async def verify_invitation_token(token: str):
    """Vérifier la validité d'un token d'invitation (legacy endpoint)"""
    try:
        from datetime import datetime
        response = supabase_service.table("invitations").select("*").eq("token", token).eq("status", "pending").execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Invitation introuvable ou déjà utilisée")
        
        invitation = response.data[0]
        
        # Récupérer le nom de l'entreprise séparément
        company_name = "Entreprise"
        if invitation.get("company_id"):
            company_resp = supabase_service.table("companies").select("name").eq("id", invitation["company_id"]).execute()
            company_name = company_resp.data[0]["name"] if company_resp.data else "Entreprise"
        
        # Vérifier l'expiration
        expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            raise HTTPException(status_code=400, detail="Cette invitation a expiré")
        
        return {
            "valid": True,
            "email": invitation["email"],
            "company_name": company_name,
            "role": invitation["role"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la vérification: {str(e)}")

@api_router.post("/invitations/{invitation_id}/accept")
async def accept_invitation_with_registration(
    invitation_id: str,
    user_info: dict
):
    """Accepter une invitation et créer le compte utilisateur (accessible sans authentification)"""
    try:
        from datetime import datetime
        import uuid
        
        # Récupérer l'invitation
        inv_response = supabase_service.table("invitations").select("*").eq("id", invitation_id).eq("status", "pending").execute()
        
        if not inv_response.data:
            raise HTTPException(status_code=404, detail="Invitation introuvable ou déjà utilisée")
        
        invitation = inv_response.data[0]
        
        # Vérifier l'expiration
        expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            raise HTTPException(status_code=400, detail="Cette invitation a expiré")
        
        email = user_info.get("email", "").lower()
        password = user_info.get("password", "")
        first_name = user_info.get("first_name", "")
        last_name = user_info.get("last_name", "")
        
        # Vérifier que l'email correspond
        if email != invitation["email"].lower():
            raise HTTPException(status_code=403, detail="Cette invitation n'est pas pour cet email")
        
        # Vérifier si l'utilisateur existe déjà
        existing = supabase_service.table("users").select("*").eq("email", email).execute()
        
        if existing.data:
            # Utilisateur existe, juste mettre à jour son rôle et son entreprise
            user_id = existing.data[0]["id"]
            supabase_service.table("users").update({
                "company_id": invitation["company_id"],
                "role": invitation["role"]
            }).eq("id", user_id).execute()
        else:
            # Créer le nouvel utilisateur
            import bcrypt
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            new_user = {
                "id": str(uuid.uuid4()),
                "email": email,
                "password": hashed_password,
                "first_name": first_name,
                "last_name": last_name,
                "company_id": invitation["company_id"],
                "role": invitation["role"],
                "created_at": datetime.utcnow().isoformat()
            }
            
            user_response = supabase_service.table("users").insert(new_user).execute()
            user_id = user_response.data[0]["id"]
        
        # Marquer l'invitation comme acceptée
        supabase_service.table("invitations").update({"status": "accepted"}).eq("id", invitation["id"]).execute()
        
        # Générer un token JWT pour connexion automatique
        import jwt
        from datetime import timedelta
        
        JWT_SECRET = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
        
        user_data = {
            "id": user_id,
            "email": email,
            "company_id": invitation["company_id"],
            "role": invitation["role"],
            "first_name": first_name,
            "last_name": last_name
        }
        
        token = jwt.encode(
            {
                **user_data,
                "exp": datetime.utcnow() + timedelta(days=30)
            },
            JWT_SECRET,
            algorithm="HS256"
        )
        
        return {
            "message": "Invitation acceptée et compte créé avec succès",
            "token": token,
            "user": user_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur lors de l'acceptation de l'invitation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'acceptation: {str(e)}")

@api_router.post("/invitations/accept/{token}")
async def accept_invitation(token: str, user_data: dict = Depends(get_user_from_token)):
    """Accepter une invitation (l'utilisateur doit être connecté - legacy endpoint)"""
    try:
        # Récupérer l'invitation
        inv_response = supabase_service.table("invitations").select("*").eq("token", token).eq("status", "pending").execute()
        
        if not inv_response.data:
            raise HTTPException(status_code=404, detail="Invitation introuvable")
        
        invitation = inv_response.data[0]
        
        # Vérifier que l'email correspond
        if user_data.get("email", "").lower() != invitation["email"].lower():
            raise HTTPException(status_code=403, detail="Cette invitation n'est pas pour vous")
        
        # Mettre à jour le rôle de l'utilisateur dans l'entreprise
        supabase_service.table("users").update({
            "company_id": invitation["company_id"],
            "role": invitation["role"]
        }).eq("id", user_data["id"]).execute()
        
        # Marquer l'invitation comme acceptée
        supabase_service.table("invitations").update({"status": "ACCEPTED"}).eq("id", invitation["id"]).execute()
        
        return {"message": "Invitation acceptée avec succès", "company_id": invitation["company_id"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'acceptation: {str(e)}")

@api_router.delete("/invitations/{invitation_id}")
async def cancel_invitation(invitation_id: str, user_data: dict = Depends(get_user_from_token)):
    """Annuler une invitation (Admin uniquement)"""
    try:
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        
        # Vérifier que l'invitation appartient à l'entreprise
        inv = supabase_service.table("invitations").select("*").eq("id", invitation_id).eq("company_id", company_id).execute()
        if not inv.data:
            raise HTTPException(status_code=404, detail="Invitation introuvable")
        
        supabase_service.table("invitations").delete().eq("id", invitation_id).execute()
        return {"message": "Invitation annulée"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'annulation: {str(e)}")

# Routes pour le planning
@api_router.get("/team-leaders")
async def get_team_leaders(user_data: dict = Depends(get_user_from_token)):
    """Obtenir la liste des chefs d'équipe du planning"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Récupérer depuis la table planning_team_leaders avec jointure sur users si nécessaire
        try:
            response = supabase_service.table("planning_team_leaders").select("""
                *,
                users:user_id(email)
            """).eq("company_id", company_id).execute()
            return response.data
        except Exception as table_error:
            # Table planning_team_leaders n'existe pas - retourner admins et bureau
            logging.warning(f"Table planning_team_leaders non trouvée: {table_error}")
            response = supabase_service.table("users").select("id, email, role").eq("company_id", company_id).in_("role", ["ADMIN", "BUREAU"]).execute()
            return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des chefs d'équipe: {str(e)}")

@api_router.post("/team-leaders")
async def create_team_leader(leader_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Créer ou assigner un chef d'équipe dans le planning"""
    try:
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Préparer les données à insérer
        insert_data = {
            "company_id": company_id,
            "first_name": leader_data.get("first_name", ""),
            "last_name": leader_data.get("last_name", ""),
            "phone": leader_data.get("phone", ""),
            "specialty": leader_data.get("specialty", ""),
            "color": leader_data.get("color", "#3B82F6"),
            "created_by": user_data.get("id")
        }
        
        # Si c'est un utilisateur existant assigné
        if leader_data.get("user_id"):
            insert_data["user_id"] = leader_data.get("user_id")
            insert_data["is_virtual"] = False
        else:
            # Sinon c'est un chef fictif (ajout manuel)
            insert_data["is_virtual"] = True
        
        # Insérer dans la base de données
        response = supabase_service.table("planning_team_leaders").insert(insert_data).execute()
        
        return response.data[0] if response.data else {}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du chef d'équipe: {str(e)}")

@api_router.delete("/team-leaders/{team_leader_id}")
async def delete_team_leader(team_leader_id: str, user_data: dict = Depends(get_user_from_token)):
    """Supprimer un chef d'équipe et désassigner tous ses collaborateurs"""
    try:
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        
        # Vérifier que le chef d'équipe existe et appartient à la même entreprise
        check = supabase_service.table("planning_team_leaders").select("id, company_id").eq("id", team_leader_id).execute()
        
        if not check.data:
            raise HTTPException(status_code=404, detail="Chef d'équipe introuvable")
        
        if check.data[0]["company_id"] != company_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas supprimer ce chef d'équipe")
        
        # Désassigner tous les collaborateurs d'abord
        supabase_service.table("team_leader_collaborators").delete().eq("team_leader_id", team_leader_id).execute()
        
        # Supprimer le chef d'équipe
        supabase_service.table("planning_team_leaders").delete().eq("id", team_leader_id).execute()
        
        return {"message": "Chef d'équipe supprimé avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur suppression chef d'équipe: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

@api_router.get("/collaborators")
async def get_collaborators(user_data: dict = Depends(get_user_from_token)):
    """Obtenir la liste des collaborateurs (tous les utilisateurs de l'entreprise)"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        try:
            response = supabase_service.table("users").select("id, email, role").eq("company_id", company_id).execute()
            return response.data
        except Exception as db_error:
            # Fallback - retourner au moins l'utilisateur courant
            logging.warning(f"Erreur récupération collaborateurs: {db_error}")
            return [{
                "id": user_data["id"],
                "email": user_data.get("email", "utilisateur@skyapp.fr"),
                "role": user_data.get("role", "TECHNICIEN")
            }]
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur collaborateurs: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des collaborateurs: {str(e)}")

@api_router.get("/invitations/accepted")
async def get_accepted_invitations(user_data: dict = Depends(get_user_from_token)):
    """Obtenir les invitations acceptées (pour affichage dans le planning)"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        try:
            response = supabase_service.table("invitations").select("*").eq("company_id", company_id).eq("status", "ACCEPTED").execute()
            
            # Récupérer le nom de l'entreprise séparément
            invitations = response.data
            if invitations and company_id:
                company_resp = supabase_service.table("companies").select("name").eq("id", company_id).execute()
                company_name = company_resp.data[0]["name"] if company_resp.data else None
                for invitation in invitations:
                    invitation["company_name"] = company_name
            
            return invitations
        except Exception as db_error:
            # Table invitations n'existe peut-être pas encore - retourner liste vide
            logging.warning(f"Erreur table invitations: {db_error}")
            return []
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur invitations acceptées: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des invitations acceptées: {str(e)}")

@api_router.get("/schedules")
async def get_schedules(user_data: dict = Depends(get_user_from_token)):
    """Obtenir les plannings/horaires de l'entreprise (ADMIN/BUREAU: tous, TECHNICIEN: ses missions)"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        user_role = user_data.get('role')
        user_id = user_data.get('id')
        
        # Vérifier si la table existe en essayant une requête simple
        try:
            # TECHNICIEN : voir uniquement SES missions assignées
            if user_role == 'TECHNICIEN':
                response = supabase_service.table("schedules").select("*, worksites(*, clients(*))").eq("company_id", company_id).eq("collaborator_id", user_id).execute()
            # ADMIN/BUREAU : voir TOUS les plannings de l'entreprise
            else:
                response = supabase_service.table("schedules").select("*, worksites(*, clients(*))").eq("company_id", company_id).execute()
            
            return response.data if response.data else []
        except Exception as table_error:
            # Si la table n'existe pas encore, retourner un tableau vide
            logger.warning(f"⚠️ Table schedules non disponible: {str(table_error)}")
            return []
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur schedules: {str(e)}")
        # Retourner un tableau vide au lieu d'une erreur 500
        return []

# ANCIENNE VERSION - DÉSACTIVÉE (conflit avec nouvelle version ligne 7185)
# @api_router.post("/schedules")
# async def create_schedule_old(schedule_data: dict, user_data: dict = Depends(get_user_from_token)):
#     """Créer un nouveau planning (ADMIN/BUREAU uniquement)"""
async def create_schedule_old_disabled(schedule_data: dict, user_data: dict):
    """DÉSACTIVÉ - Ancienne version de create_schedule"""
    try:
        # Vérifier que l'utilisateur est ADMIN ou BUREAU
        user_role = user_data.get('role')
        if user_role not in ['ADMIN', 'BUREAU']:
            raise HTTPException(status_code=403, detail="Seuls les ADMIN et BUREAU peuvent créer des plannings")
        
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Préparer les données à insérer
        intervention_category = schedule_data.get("intervention_category", "rdv")
        date_str = schedule_data.get("date")
        time_str = schedule_data.get("time", "08:00")
        
        # Générer title automatiquement
        if intervention_category == "worksite":
            title = f"Chantier - {date_str}"
        elif intervention_category == "urgence":
            title = f"Urgence - {schedule_data.get('client_name', 'Client')}"
        else:  # rdv
            title = f"RDV - {schedule_data.get('client_name', 'Client')}"
        
        # Calculer start_datetime et end_datetime
        from datetime import datetime, timedelta
        try:
            hours = int(schedule_data.get("hours", 8))
            # Gérer le format de l'heure (avec ou sans secondes)
            if len(time_str) == 5:  # HH:MM
                start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
            else:  # HH:MM:SS
                start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
            end_dt = start_dt + timedelta(hours=hours)
        except Exception as e:
            logger.warning(f"⚠️ Erreur parsing datetime: {e}")
            # Valeurs par défaut si parsing échoue
            start_dt = datetime.now()
            end_dt = start_dt + timedelta(hours=8)
        
        # Convertir les strings vides en None pour les UUIDs
        worksite_id = schedule_data.get("worksite_id") or None
        team_leader_id = schedule_data.get("team_leader_id") or None
        collaborator_id = schedule_data.get("collaborator_id") or None
        
        # Récupérer les informations du client depuis le worksite si disponible
        client_name = schedule_data.get("client_name")
        client_address = schedule_data.get("client_address")
        client_contact = schedule_data.get("client_contact")
        
        if worksite_id and not client_name:
            try:
                worksite_res = supabase_service.table("worksites").select("client_id, clients:client_id(name, prenom, nom, adresse, email, telephone)").eq("id", worksite_id).execute()
                if worksite_res.data and worksite_res.data[0].get("clients"):
                    client_data = worksite_res.data[0]["clients"]
                    # Construire le nom du client (name ou prenom + nom)
                    if client_data.get("name"):
                        client_name = client_data["name"]
                    elif client_data.get("prenom") or client_data.get("nom"):
                        client_name = f"{client_data.get('prenom', '')} {client_data.get('nom', '')}".strip()
                    
                    client_address = client_data.get("adresse")
                    # Utiliser email ou telephone comme contact
                    if client_data.get("email"):
                        client_contact = client_data["email"]
                    elif client_data.get("telephone"):
                        client_contact = client_data["telephone"]
            except Exception as e:
                logging.warning(f"⚠️ Impossible de récupérer les infos client pour worksite {worksite_id}: {e}")
        
        # Utiliser start_date et end_date pour la période
        # Si une date de fin n'est pas fournie, utiliser la date de début
        start_date_str = date_str
        end_date_str = schedule_data.get("end_date", date_str)
        
        # Vérifier si un schedule identique existe déjà (prévention des doublons)
        existing_check = supabase_service.table("schedules").select("id").eq("company_id", company_id).eq("start_date", start_date_str).eq("time", time_str)
        if collaborator_id:
            existing_check = existing_check.eq("collaborator_id", collaborator_id)
        if team_leader_id:
            existing_check = existing_check.eq("team_leader_id", team_leader_id)
        if worksite_id:
            existing_check = existing_check.eq("worksite_id", worksite_id)
        
        existing = existing_check.execute()
        if existing.data and len(existing.data) > 0:
            logger.info(f"⚠️ Schedule identique déjà existant: {existing.data[0]['id']}")
            raise HTTPException(status_code=409, detail="Un planning identique existe déjà pour cette date, heure et collaborateur")
        
        insert_data = {
            "company_id": company_id,
            "worksite_id": worksite_id,  # None si vide
            "team_leader_id": team_leader_id,  # None si vide
            "collaborator_id": collaborator_id,  # None si vide
            "start_date": start_date_str,
            "end_date": end_date_str,
            "time": time_str,
            "shift": schedule_data.get("shift", "day"),
            "hours": hours,
            "description": schedule_data.get("description", ""),
            "status": schedule_data.get("status", "scheduled"),
            "created_by": user_data.get("id"),
            # Nouveaux champs pour RDV et Urgences
            "intervention_category": intervention_category,
            "client_name": client_name,
            "client_address": client_address,
            "client_contact": client_contact,
            # Champs legacy pour compatibilité
            "title": title,
            "start_datetime": start_dt.isoformat(),
            "end_datetime": end_dt.isoformat()
        }
        
        logger.debug(f"📝 Données à insérer: {insert_data}")
        
        # Insérer dans la base de données
        response = supabase_service.table("schedules").insert(insert_data).execute()
        logger.info(f"✅ Schedule créé avec succès: {response.data}")
        
        # Recalculer le progress du chantier si un worksite_id est fourni
        if worksite_id:
            try:
                progress = await calculate_worksite_progress(worksite_id, company_id)
                supabase_service.table("worksites").update({"progress": progress}).eq("id", worksite_id).execute()
                logging.info(f"📊 Progress chantier {worksite_id} mis à jour: {progress}%")
            except Exception as prog_error:
                logging.error(f"❌ Erreur mise à jour progress: {prog_error}")
        
        return response.data[0] if response.data else {}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ ERREUR création schedule: {str(e)}")
        logger.error(f"❌ Type erreur: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du planning: {str(e)}")

@api_router.put("/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, schedule_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Modifier un planning existant (ADMIN/BUREAU uniquement)"""
    try:
        # Vérifier que l'utilisateur est ADMIN ou BUREAU
        user_role = user_data.get('role')
        if user_role not in ['ADMIN', 'BUREAU']:
            raise HTTPException(status_code=403, detail="Seuls les ADMIN et BUREAU peuvent modifier des plannings")
        
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier que le planning appartient à l'entreprise
        existing = supabase_service.table("schedules").select("*").eq("id", schedule_id).eq("company_id", company_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Planning non trouvé")
        
        # Mettre à jour
        update_data = {}
        allowed_fields = ["worksite_id", "team_leader_id", "collaborator_id", "date", "time", "shift", "hours", "description", "status"]
        for field in allowed_fields:
            if field in schedule_data:
                update_data[field] = schedule_data[field]
        
        response = supabase_service.table("schedules").update(update_data).eq("id", schedule_id).execute()
        
        # Recalculer le progress du chantier si un worksite_id est présent
        worksite_id = update_data.get("worksite_id") or existing.data[0].get("worksite_id")
        if worksite_id:
            try:
                progress = await calculate_worksite_progress(worksite_id, company_id)
                supabase_service.table("worksites").update({"progress": progress}).eq("id", worksite_id).execute()
                logging.info(f"📊 Progress chantier {worksite_id} mis à jour: {progress}%")
            except Exception as prog_error:
                logging.error(f"❌ Erreur mise à jour progress: {prog_error}")
        
        return response.data[0] if response.data else {}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la modification du planning: {str(e)}")

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, user_data: dict = Depends(get_user_from_token)):
    """Supprimer un planning (ADMIN uniquement)"""
    try:
        # Vérifier que l'utilisateur est ADMIN
        require_admin(user_data)
        
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier que le planning appartient à l'entreprise avant suppression
        existing = supabase_service.table("schedules").select("*").eq("id", schedule_id).eq("company_id", company_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Planning non trouvé")
        
        # Récupérer le worksite_id avant suppression pour recalculer le progress
        worksite_id = existing.data[0].get("worksite_id")
        
        # Supprimer
        supabase_service.table("schedules").delete().eq("id", schedule_id).execute()
        
        # Recalculer le progress du chantier si un worksite_id était présent
        if worksite_id:
            try:
                progress = await calculate_worksite_progress(worksite_id, company_id)
                supabase_service.table("worksites").update({"progress": progress}).eq("id", worksite_id).execute()
                logging.info(f"📊 Progress chantier {worksite_id} mis à jour après suppression: {progress}%")
            except Exception as prog_error:
                logging.error(f"❌ Erreur mise à jour progress: {prog_error}")
        
        return {"message": "Planning supprimé avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du planning: {str(e)}")

@api_router.get("/planning/my-missions")
async def get_my_missions(user_data: dict = Depends(get_user_from_token)):
    """
    Obtenir les missions planifiées pour le technicien connecté
    Retourne les chantiers/RDV assignés au technicien
    """
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        user_id = user_data.get('id')
        
        # Récupérer toutes les missions récentes assignées au technicien (30 derniers jours)
        from datetime import datetime, timedelta
        thirty_days_ago = (datetime.now() - timedelta(days=30)).date().isoformat()
        
        response = supabase_service.table("schedules").select("*")\
            .eq("company_id", company_id)\
            .eq("collaborator_id", user_id)\
            .gte("start_date", thirty_days_ago)\
            .order("start_date", desc=False)\
            .execute()
        
        missions = response.data if response.data else []
        
        # Formater les missions pour le frontend
        formatted_missions = []
        for mission in missions:
            # Essayer plusieurs champs pour l'adresse
            location = mission.get("client_address") or mission.get("location") or mission.get("description") or "Adresse non spécifiée"
            
            formatted_missions.append({
                "id": mission.get("id"),
                "title": mission.get("title") or f"{mission.get('intervention_category', 'Mission').capitalize()}",
                "description": mission.get("description"),
                "location": location,
                "date": mission.get("date"),
                "time": mission.get("time"),
                "client_name": mission.get("client_name"),
                "client_contact": mission.get("client_contact"),
                "intervention_category": mission.get("intervention_category"),
                "status": mission.get("status"),
                "worksite_id": mission.get("worksite_id")
            })
        
        return formatted_missions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur get_my_missions: {str(e)}")
        return []

@api_router.post("/mission-reports")
async def create_mission_report(
    mission_id: str = Form(...),
    works_performed: str = Form(...),
    materials_used: str = Form(default=""),
    duration_hours: str = Form(default=""),
    observations: str = Form(default=""),
    issues_encountered: str = Form(default=""),
    photos_before: List[UploadFile] = File(default=[]),
    photos_after: List[UploadFile] = File(default=[]),
    user_data: dict = Depends(get_user_from_token)
):
    """
    Créer un compte-rendu pour une mission/chantier
    """
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        user_id = user_data.get('id')
        
        # Créer le dossier uploads si nécessaire
        os.makedirs("uploads", exist_ok=True)
        
        # Uploader les photos avant
        photos_before_urls = []
        for photo in photos_before:
            if photo.filename:
                filename = f"{uuid.uuid4()}_{photo.filename}"
                filepath = os.path.join("uploads", filename)
                with open(filepath, "wb") as f:
                    f.write(await photo.read())
                photos_before_urls.append(filename)
        
        # Uploader les photos après
        photos_after_urls = []
        for photo in photos_after:
            if photo.filename:
                filename = f"{uuid.uuid4()}_{photo.filename}"
                filepath = os.path.join("uploads", filename)
                with open(filepath, "wb") as f:
                    f.write(await photo.read())
                photos_after_urls.append(filename)
        
        # Préparer les données du compte-rendu
        report_data = {
            "company_id": company_id,
            "mission_id": mission_id,
            "technician_id": user_id,
            "works_performed": works_performed,
            "materials_used": materials_used,
            "duration_hours": float(duration_hours) if duration_hours else None,
            "observations": observations,
            "issues_encountered": issues_encountered,
            "photos_before": photos_before_urls,
            "photos_after": photos_after_urls,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Insérer dans la base de données
        response = supabase_service.table("mission_reports").insert(report_data).execute()
        
        # Mettre à jour le statut de la mission à "completed"
        supabase_service.table("schedules").update({"status": "completed"}).eq("id", mission_id).execute()
        
        return {"success": True, "data": response.data[0] if response.data else {}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur create_mission_report: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du compte-rendu: {str(e)}")


# ============================================================================
# PROJECTS API - Hub "Mon Entreprise"
# ============================================================================

@api_router.get("/projects")
async def get_projects(
    status: Optional[str] = None,
    client_id: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = 50,
    offset: int = 0,
    user_data: dict = Depends(get_user_from_token)
):
    """
    Liste tous les projets avec filtres avancés, pagination et tri
    """
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Construire la requête de base (sans les relations qui peuvent causer des erreurs)
        query = supabase_service.table("projects").select("*").eq("company_id", company_id)
        
        # Appliquer les filtres
        if status:
            query = query.eq("status", status)
        if client_id:
            query = query.eq("client_id", client_id)
        if priority:
            query = query.eq("priority", priority)
        if search:
            # Recherche textuelle sur nom et numéro
            query = query.or_(f"name.ilike.%{search}%,project_number.ilike.%{search}%")
        
        # Tri
        query = query.order(sort_by, desc=(sort_order == "desc"))
        
        # Pagination
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        
        return {
            "data": result.data,
            "count": len(result.data),
            "offset": offset,
            "limit": limit
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des projets: {str(e)}")


@api_router.post("/projects")
async def create_project(
    project: ProjectCreate,
    user_data: dict = Depends(get_user_from_token)
):
    """
    Création manuelle d'un projet (ADMIN et BUREAU uniquement)
    """
    try:
        require_role(user_data, ["ADMIN", "BUREAU"])
        
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        user_id = user_data.get("id")
        
        data = {
            "company_id": company_id,
            "name": project.name,
            "client_id": project.client_id,
            "search_id": project.search_id,
            "status": project.status,
            "priority": project.priority,
            "category": project.category,
            "estimated_value": project.estimated_value,
            "tags": project.tags,
            "start_date": project.start_date,
            "end_date": project.end_date,
            "created_by": user_id
        }
        
        result = supabase_service.table("projects").insert(data).execute()
        
        return {"message": "Projet créé avec succès", "project": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du projet: {str(e)}")


@api_router.get("/projects/{project_id}")
async def get_project_detail(
    project_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """
    Récupère les détails complets d'un projet avec toutes ses relations
    """
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        result = supabase_service.table("projects").select("""
            *,
            client:clients(*),
            search:searches(*),
            quote:quotes(*, items),
            worksite:worksites(*, schedules(*)),
            report:reports(*),
            notes:project_notes(*, user:users(prenom, nom, email))
        """).eq("id", project_id).eq("company_id", company_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Projet non trouvé")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du projet: {str(e)}")


@api_router.put("/projects/{project_id}")
async def update_project(
    project_id: str,
    updates: ProjectUpdate,
    user_data: dict = Depends(get_user_from_token)
):
    """
    Mise à jour d'un projet (ADMIN et BUREAU uniquement)
    """
    try:
        require_role(user_data, ["ADMIN", "BUREAU"])
        
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier que le projet existe et appartient à l'entreprise
        existing = supabase_service.table("projects").select("id").eq("id", project_id).eq("company_id", company_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Projet non trouvé")
        
        # Construire les données de mise à jour (seulement les champs fournis)
        data = {}
        if updates.name is not None:
            data["name"] = updates.name
        if updates.status is not None:
            data["status"] = updates.status
        if updates.priority is not None:
            data["priority"] = updates.priority
        if updates.category is not None:
            data["category"] = updates.category
        if updates.tags is not None:
            data["tags"] = updates.tags
        if updates.estimated_value is not None:
            data["estimated_value"] = updates.estimated_value
        if updates.final_value is not None:
            data["final_value"] = updates.final_value
        if updates.start_date is not None:
            data["start_date"] = updates.start_date
        if updates.end_date is not None:
            data["end_date"] = updates.end_date
        if updates.expected_duration_days is not None:
            data["expected_duration_days"] = updates.expected_duration_days
        if updates.quote_id is not None:
            data["quote_id"] = updates.quote_id
        if updates.worksite_id is not None:
            data["worksite_id"] = updates.worksite_id
        if updates.report_id is not None:
            data["report_id"] = updates.report_id
        if updates.progress is not None:
            data["progress"] = updates.progress
        
        # updated_at sera mis à jour automatiquement par le trigger
        
        result = supabase_service.table("projects").update(data).eq("id", project_id).execute()
        
        return {"message": "Projet mis à jour avec succès", "project": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour du projet: {str(e)}")


@api_router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """
    Suppression d'un projet (ADMIN uniquement)
    """
    try:
        require_admin(user_data)
        
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier que le projet existe et appartient à l'entreprise
        existing = supabase_service.table("projects").select("id").eq("id", project_id).eq("company_id", company_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Projet non trouvé")
        
        # Supprimer (les notes seront supprimées en cascade)
        supabase_service.table("projects").delete().eq("id", project_id).execute()
        
        return {"message": "Projet supprimé avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du projet: {str(e)}")


@api_router.post("/projects/{project_id}/notes")
async def add_project_note(
    project_id: str,
    note: ProjectNoteCreate,
    user_data: dict = Depends(get_user_from_token)
):
    """
    Ajouter une note/commentaire à un projet
    """
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        user_id = user_data.get("id")
        
        # Vérifier que le projet existe et appartient à l'entreprise
        existing = supabase_service.table("projects").select("id").eq("id", project_id).eq("company_id", company_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Projet non trouvé")
        
        data = {
            "project_id": project_id,
            "user_id": user_id,
            "content": note.content,
            "note_type": note.note_type
        }
        
        result = supabase_service.table("project_notes").insert(data).execute()
        
        return {"message": "Note ajoutée avec succès", "note": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'ajout de la note: {str(e)}")


@api_router.post("/projects/auto-create")
async def auto_create_project_from_search(
    search_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """
    Création automatique d'un projet depuis une recherche partagée
    """
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        user_id = user_data.get("id")
        
        # Récupérer la recherche
        search = supabase_service.table("searches").select("*").eq("id", search_id).eq("company_id", company_id).execute()
        
        if not search.data:
            raise HTTPException(status_code=404, detail="Recherche non trouvée")
        
        search_data = search.data[0]
        
        # Récupérer le client séparément
        client = {}
        if search_data.get("client_id"):
            client_resp = supabase_service.table("clients").select("*").eq("id", search_data["client_id"]).execute()
            if client_resp.data:
                client = client_resp.data[0]
        
        # Créer le projet automatiquement
        project_data = {
            "company_id": company_id,
            "name": f"Projet {client.get('nom', '')} - {search_data.get('adresse', '')[:50]}",
            "client_id": search_data.get("client_id"),
            "search_id": search_id,
            "status": "RECHERCHE",
            "category": search_data.get("type_recherche"),
            "priority": "NORMAL",
            "created_by": user_id
        }
        
        result = supabase_service.table("projects").insert(project_data).execute()
        project = result.data[0]
        
        # Ajouter note automatique
        note_data = {
            "project_id": project["id"],
            "user_id": user_id,
            "content": "✨ Projet créé automatiquement depuis la recherche partagée",
            "note_type": "STATUS_CHANGE"
        }
        supabase_service.table("project_notes").insert(note_data).execute()
        
        return {"message": "Projet créé automatiquement avec succès", "project": project}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création automatique du projet: {str(e)}")


@api_router.get("/projects/stats/dashboard")
async def get_projects_dashboard_stats(
    user_data: dict = Depends(get_user_from_token)
):
    """
    Statistiques pour le dashboard Mon Entreprise
    """
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Récupérer tous les projets
        all_projects = supabase_service.table("projects").select("status, estimated_value, final_value").eq("company_id", company_id).execute()
        
        stats = {
            "total": len(all_projects.data),
            "by_status": {},
            "total_estimated": 0.0,
            "total_final": 0.0,
            "active_projects": 0
        }
        
        active_statuses = ["RECHERCHE", "DEVIS_EN_COURS", "DEVIS_VALIDE", "CHANTIER_EN_COURS"]
        
        for project in all_projects.data:
            status = project.get("status")
            stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
            
            if project.get("estimated_value"):
                stats["total_estimated"] += float(project["estimated_value"])
            if project.get("final_value"):
                stats["total_final"] += float(project["final_value"])
            
            if status in active_statuses:
                stats["active_projects"] += 1
        
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des statistiques: {str(e)}")


# (Routes /quotes et /worksites déjà définies plus haut - duplication supprimée)

# ============================================================================
# ELECTRONIC INVOICING - Facturation Électronique (Réforme 2026-2027)
# ============================================================================

class InvoiceLineModel(BaseModel):
    line_number: int
    designation: str
    description: Optional[str] = None
    quantity: Decimal
    unit: str = 'unité'
    unit_price_ht: Decimal
    tva_rate: Decimal
    tva_amount: Optional[Decimal] = None
    total_ht: Optional[Decimal] = None
    total_ttc: Optional[Decimal] = None
    catalog_item_id: Optional[str] = None

class CreateInvoiceModel(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    siren_client: str
    address_billing: str
    address_delivery: Optional[str] = None
    invoice_date: date
    due_date: date
    payment_terms: str
    payment_method: str = 'virement'
    total_ht: Decimal
    total_tva: Decimal
    total_ttc: Decimal
    notes: Optional[str] = None
    lines: List[InvoiceLineModel]

async def generate_invoice_number(company_id: str) -> str:
    """Générer un numéro de facture unique pour l'année en cours"""
    year = datetime.now().year
    result = supabase_service.table("invoices_electronic")\
        .select("invoice_number")\
        .eq("company_id", company_id)\
        .like("invoice_number", f"F{year}%")\
        .order("invoice_number", desc=True)\
        .limit(1)\
        .execute()
    if result.data:
        last_num = int(result.data[0]["invoice_number"][5:])
        return f"F{year}{str(last_num + 1).zfill(4)}"
    else:
        return f"F{year}0001"

async def log_invoice_action(invoice_id: str, action: str, user_id: str, details: Optional[str] = None):
    """Logger une action sur une facture"""
    try:
        log_data = {
            "invoice_id": invoice_id,
            "action": action,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details
        }
        supabase_service.table("invoices_logs").insert(log_data).execute()
    except Exception as e:
        logging.error(f"Erreur log facture: {str(e)}")

@api_router.post("/invoices/electronic")
async def create_electronic_invoice(
    invoice: CreateInvoiceModel,
    user_data: dict = Depends(get_user_from_token)
):
    """Créer une nouvelle facture électronique"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        if not invoice.siren_client or len(invoice.siren_client) != 9 or not invoice.siren_client.isdigit():
            raise HTTPException(status_code=400, detail="SIREN client invalide (9 chiffres obligatoires)")
        invoice_number = await generate_invoice_number(company_id)
        invoice_data = {
            "company_id": company_id,
            "customer_id": invoice.customer_id,
            "invoice_number": invoice_number,
            "invoice_date": invoice.invoice_date.isoformat(),
            "due_date": invoice.due_date.isoformat(),
            "customer_name": invoice.customer_name,
            "siren_client": invoice.siren_client,
            "address_billing": invoice.address_billing,
            "address_delivery": invoice.address_delivery,
            "total_ht": float(invoice.total_ht),
            "total_tva": float(invoice.total_tva),
            "total_ttc": float(invoice.total_ttc),
            "format": "pdf",
            "status_pdp": "draft",
            "direction": "outgoing",
            "payment_terms": invoice.payment_terms,
            "payment_method": invoice.payment_method,
            "created_by": user_data["sub"]
        }
        result = supabase_service.table("invoices_electronic").insert(invoice_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Erreur lors de la création de la facture")
        invoice_id = result.data[0]["id"]
        for line in invoice.lines:
            line_ht = float(line.quantity) * float(line.unit_price_ht)
            tva_amount = line_ht * (float(line.tva_rate) / 100)
            line_ttc = line_ht + tva_amount
            line_data = {
                "invoice_id": invoice_id,
                "line_number": line.line_number,
                "designation": line.designation,
                "description": line.description,
                "quantity": float(line.quantity),
                "unit": line.unit,
                "unit_price_ht": float(line.unit_price_ht),
                "tva_rate": float(line.tva_rate),
                "tva_amount": round(tva_amount, 2),
                "total_ht": round(line_ht, 2),
                "total_ttc": round(line_ttc, 2),
                "catalog_item_id": line.catalog_item_id
            }
            supabase_service.table("invoice_lines").insert(line_data).execute()
        await log_invoice_action(invoice_id, "created", user_data["sub"])
        return {"id": invoice_id, "invoice_number": invoice_number, "message": "Facture créée avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur création facture: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.get("/invoices/electronic")
async def list_electronic_invoices(
    status: Optional[str] = None,
    direction: Optional[str] = None,
    user_data: dict = Depends(get_user_from_token)
):
    """Lister les factures électroniques"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        try:
            query = supabase_service.table("invoices_electronic").select("*").eq("company_id", company_id)
            if status:
                query = query.eq("status_pdp", status)
            if direction:
                query = query.eq("direction", direction)
            result = query.order("invoice_date", desc=True).execute()
            return result.data
        except Exception as db_error:
            # Table invoices_electronic n'existe peut-être pas encore
            logging.warning(f"Erreur table invoices_electronic: {db_error}")
            return []
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur liste factures: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.get("/invoices/electronic/{invoice_id}")
async def get_electronic_invoice(
    invoice_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """Récupérer une facture électronique avec ses lignes"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        invoice_result = supabase_service.table("invoices_electronic")\
            .select("*")\
            .eq("id", invoice_id)\
            .eq("company_id", company_id)\
            .execute()
        if not invoice_result.data:
            raise HTTPException(status_code=404, detail="Facture non trouvée")
        lines_result = supabase_service.table("invoice_lines")\
            .select("*")\
            .eq("invoice_id", invoice_id)\
            .order("line_number")\
            .execute()
        return {**invoice_result.data[0], "lines": lines_result.data}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur récupération facture: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# =====================================================
# TRANSMISSION FACTURE AU PDP (IOPOLE)
# =====================================================

@api_router.patch("/invoices/electronic/{invoice_id}/transmit")
async def transmit_invoice_to_pdp(
    invoice_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """
    Transmettre une facture électronique au PDP (IOPOLE)
    
    Cette fonction :
    1. Récupère la facture et ses lignes
    2. Formate les données pour IOPOLE
    3. Transmet via l'API IOPOLE
    4. Met à jour le statut dans la base
    5. Log l'action
    """
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier si IOPOLE est disponible
        if not IOPOLE_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Service IOPOLE non disponible. Contactez l'administrateur."
            )
        
        # 1. Récupérer la facture
        invoice_result = supabase_service.table("invoices_electronic")\
            .select("*")\
            .eq("id", invoice_id)\
            .eq("company_id", company_id)\
            .execute()
        
        if not invoice_result.data:
            raise HTTPException(status_code=404, detail="Facture non trouvée")
        
        invoice = invoice_result.data[0]
        
        # Vérifier si déjà transmise
        if invoice.get('status_pdp') == 'transmitted':
            return {
                "success": True,
                "message": "Facture déjà transmise",
                "pdp_reference": invoice.get('pdp_reference'),
                "already_transmitted": True
            }
        
        # 2. Récupérer les lignes
        lines_result = supabase_service.table("invoice_lines")\
            .select("*")\
            .eq("invoice_id", invoice_id)\
            .order("line_number")\
            .execute()
        
        if not lines_result.data:
            raise HTTPException(status_code=400, detail="Facture sans lignes")
        
        # 3. Formater pour IOPOLE
        iopole_data = format_invoice_for_iopole(invoice, lines_result.data)
        
        # 4. Transmettre à IOPOLE
        logging.info(f"📤 Transmission facture {invoice['invoice_number']} vers IOPOLE...")
        iopole_response = iopole_client.send_invoice(iopole_data)
        
        # 5. Mettre à jour la facture
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
        
        # 6. Logger l'action
        await log_invoice_action(
            invoice_id,
            "transmitted",
            f"Facture transmise à IOPOLE: {iopole_response.get('pdp_reference')}",
            user_data.get("sub")
        )
        
        logging.info(f"✅ Facture {invoice['invoice_number']} transmise avec succès")
        
        return {
            "success": True,
            "message": "Facture transmise avec succès",
            "pdp_reference": iopole_response.get('pdp_reference'),
            "tracking_url": iopole_response.get('tracking_url'),
            "timestamp": iopole_response.get('timestamp'),
            "simulation": iopole_response.get('simulation', False)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Erreur transmission IOPOLE: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur transmission: {str(e)}")

# =====================================================
# WEBHOOK IOPOLE - Réception événements
# =====================================================

@app.post("/api/webhooks/iopole/received")
async def iopole_webhook_received(request: Request):
    """
    Recevoir les notifications IOPOLE (factures reçues, changements de statut)
    
    Ce webhook est appelé par IOPOLE quand :
    - Une nouvelle facture est reçue d'un fournisseur
    - Le statut d'une facture émise change (acceptée, rejetée, payée)
    """
    try:
        # Récupérer le corps de la requête
        body = await request.body()
        data = await request.json()
        
        # Vérifier la signature (sécurité)
        signature = request.headers.get("X-IOPOLE-Signature", "")
        
        if IOPOLE_AVAILABLE:
            is_valid = iopole_client.verify_webhook_signature(body, signature)
            if not is_valid:
                logging.warning("⚠️ Signature webhook IOPOLE invalide")
                raise HTTPException(status_code=401, detail="Signature invalide")
        
        event_type = data.get('event')
        logging.info(f"📥 Webhook IOPOLE reçu: {event_type}")
        
        # Traiter selon le type d'événement
        if event_type == 'invoice.received':
            # Nouvelle facture reçue d'un fournisseur
            invoice_data = data.get('data', {})
            
            # TODO: Télécharger le fichier PDF/XML
            # TODO: Créer l'entrée dans invoices_received
            # TODO: Notifier l'utilisateur
            
            logging.info(f"✅ Facture reçue: {invoice_data.get('invoice_number')}")
            return {"status": "processed", "event": event_type}
        
        elif event_type == 'invoice.status_changed':
            # Changement de statut d'une facture émise
            pdp_reference = data.get('data', {}).get('invoice_reference')
            new_status = data.get('data', {}).get('status')
            
            # Mettre à jour dans la base
            supabase_service.table("invoices_electronic")\
                .update({"status_pdp": new_status, "updated_at": datetime.utcnow().isoformat()})\
                .eq("pdp_reference", pdp_reference)\
                .execute()
            
            logging.info(f"✅ Statut facture {pdp_reference} mis à jour: {new_status}")
            return {"status": "updated", "event": event_type}
        
        else:
            logging.warning(f"⚠️ Type d'événement inconnu: {event_type}")
            return {"status": "unknown_event", "event": event_type}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Erreur webhook IOPOLE: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# =====================================================
# MODULE RÉCEPTION FACTURES
# =====================================================

class ReceivedInvoiceUploadModel(BaseModel):
    supplier_name: str
    supplier_siren: Optional[str] = None
    invoice_number: str
    invoice_date: date
    due_date: Optional[date] = None
    total_ht: Decimal
    total_tva: Decimal
    total_ttc: Decimal
    format_type: str = "pdf-simple"  # 'factur-x', 'ubl', 'cii', 'pdf-simple'
    notes: Optional[str] = None

@api_router.post("/invoices/received")
async def upload_received_invoice(
    file: UploadFile = File(...),
    supplier_name: str = Form(...),
    supplier_siren: Optional[str] = Form(None),
    invoice_number: str = Form(...),
    invoice_date: str = Form(...),
    due_date: Optional[str] = Form(None),
    total_ht: float = Form(...),
    total_tva: float = Form(...),
    total_ttc: float = Form(...),
    format_type: str = Form("pdf-simple"),
    notes: Optional[str] = Form(None),
    user_data: dict = Depends(get_user_from_token)
):
    """Upload d'une facture reçue (manuel)"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Validation SIREN (9 chiffres)
        if supplier_siren and len(supplier_siren) != 9:
            raise HTTPException(status_code=400, detail="SIREN doit contenir 9 chiffres")
        
        # Générer un ID unique pour cette facture
        invoice_id = str(uuid.uuid4())
        
        # Créer le répertoire de stockage
        upload_dir = ROOT_DIR / "uploads" / "invoices_received" / company_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Sauvegarder le fichier
        file_extension = Path(file.filename).suffix
        file_path = upload_dir / f"{invoice_id}{file_extension}"
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Calculer hash SHA256
        import hashlib
        pdf_hash = hashlib.sha256(content).hexdigest()
        
        # Insérer dans la base de données
        invoice_data = {
            "id": invoice_id,
            "company_id": company_id,
            "invoice_number": invoice_number,
            "supplier_name": supplier_name,
            "supplier_siren": supplier_siren,
            "invoice_date": invoice_date,
            "due_date": due_date,
            "total_ht": float(total_ht),
            "total_tva": float(total_tva),
            "total_ttc": float(total_ttc),
            "format_type": format_type,
            "reception_method": "manual-upload",
            "status": "received",
            "pdf_file_path": str(file_path),
            "file_size_bytes": len(content),
            "pdf_hash": pdf_hash,
            "notes": notes,
            "created_by": user_data.get("sub")
        }
        
        result = supabase_service.table("invoices_received").insert(invoice_data).execute()
        
        await log_invoice_action(invoice_id, "created", f"Facture reçue uploadée: {invoice_number}", user_data.get("sub"))
        
        return {"success": True, "invoice": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur upload facture reçue: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.get("/invoices/received")
async def get_received_invoices(user_data: dict = Depends(get_user_from_token)):
    """Liste des factures reçues"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        result = supabase_service.table("invoices_received")\
            .select("*")\
            .eq("company_id", company_id)\
            .order("invoice_date", desc=True)\
            .execute()
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur récupération factures reçues: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.get("/invoices/received/{invoice_id}")
async def get_received_invoice_details(invoice_id: str, user_data: dict = Depends(get_user_from_token)):
    """Détails d'une facture reçue"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        result = supabase_service.table("invoices_received")\
            .select("*")\
            .eq("id", invoice_id)\
            .eq("company_id", company_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Facture non trouvée")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur récupération facture reçue: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.patch("/invoices/received/{invoice_id}/status")
async def update_received_invoice_status(
    invoice_id: str,
    status: str,
    validation_errors: Optional[dict] = None,
    user_data: dict = Depends(get_user_from_token)
):
    """Mettre à jour le statut d'une facture reçue"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        valid_statuses = ['received', 'processing', 'validated', 'rejected', 'paid']
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Statut invalide. Valeurs acceptées: {', '.join(valid_statuses)}")
        
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if status == 'validated':
            update_data["validation_date"] = datetime.utcnow().isoformat()
            update_data["validated_by"] = user_data.get("sub")
        
        if status == 'rejected' and validation_errors:
            update_data["validation_errors"] = validation_errors
        
        result = supabase_service.table("invoices_received")\
            .update(update_data)\
            .eq("id", invoice_id)\
            .eq("company_id", company_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Facture non trouvée")
        
        await log_invoice_action(invoice_id, "status_updated", f"Statut changé à: {status}", user_data.get("sub"))
        
        return {"success": True, "invoice": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur mise à jour statut facture reçue: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# =====================================================
# MODULE E-REPORTING
# =====================================================

class EReportingDeclarationModel(BaseModel):
    declaration_type: str  # 'b2c', 'export', 'intra-ue'
    period_start: date
    period_end: date
    total_ht: Decimal
    total_tva: Decimal
    total_ttc: Decimal
    operations_count: int
    operations_details: Optional[List[dict]] = None
    notes: Optional[str] = None

@api_router.post("/e-reporting")
async def create_ereporting_declaration(
    declaration: EReportingDeclarationModel,
    user_data: dict = Depends(get_user_from_token)
):
    """Créer une nouvelle déclaration e-reporting"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Validation du type de déclaration
        valid_types = ['b2c', 'export', 'intra-ue']
        if declaration.declaration_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Type invalide. Valeurs: {', '.join(valid_types)}")
        
        # Validation des dates
        if declaration.period_end < declaration.period_start:
            raise HTTPException(status_code=400, detail="Date de fin doit être après la date de début")
        
        declaration_id = str(uuid.uuid4())
        
        declaration_data = {
            "id": declaration_id,
            "company_id": company_id,
            "declaration_type": declaration.declaration_type,
            "period_start": declaration.period_start.isoformat(),
            "period_end": declaration.period_end.isoformat(),
            "total_ht": float(declaration.total_ht),
            "total_tva": float(declaration.total_tva),
            "total_ttc": float(declaration.total_ttc),
            "operations_count": declaration.operations_count,
            "operations_details": declaration.operations_details,
            "status": "draft",
            "notes": declaration.notes,
            "created_by": user_data.get("sub")
        }
        
        result = supabase_service.table("e_reporting_declarations").insert(declaration_data).execute()
        
        return {"success": True, "declaration": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur création déclaration e-reporting: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.get("/e-reporting")
async def get_ereporting_declarations(
    declaration_type: Optional[str] = None,
    status: Optional[str] = None,
    user_data: dict = Depends(get_user_from_token)
):
    """Liste des déclarations e-reporting"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        query = supabase_service.table("e_reporting_declarations")\
            .select("*")\
            .eq("company_id", company_id)
        
        if declaration_type:
            query = query.eq("declaration_type", declaration_type)
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("period_start", desc=True).execute()
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur récupération déclarations e-reporting: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.get("/e-reporting/{declaration_id}")
async def get_ereporting_declaration_details(
    declaration_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """Détails d'une déclaration e-reporting"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        result = supabase_service.table("e_reporting_declarations")\
            .select("*")\
            .eq("id", declaration_id)\
            .eq("company_id", company_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Déclaration non trouvée")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur récupération déclaration e-reporting: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.patch("/e-reporting/{declaration_id}/transmit")
async def transmit_ereporting_declaration(
    declaration_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """Transmettre une déclaration e-reporting au PDP"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # TODO: Implémenter l'envoi réel au PDP
        # Pour l'instant, simulation
        
        pdp_reference = f"EREP-{datetime.utcnow().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"
        
        update_data = {
            "status": "transmitted",
            "transmission_date": datetime.utcnow().isoformat(),
            "pdp_reference": pdp_reference,
            "pdp_response": {
                "status": "success",
                "reference": pdp_reference,
                "timestamp": datetime.utcnow().isoformat()
            },
            "transmitted_by": user_data.get("sub"),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase_service.table("e_reporting_declarations")\
            .update(update_data)\
            .eq("id", declaration_id)\
            .eq("company_id", company_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Déclaration non trouvée")
        
        return {"success": True, "declaration": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur transmission e-reporting: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# =====================================================
# MODULE ARCHIVAGE LÉGAL
# =====================================================

@api_router.post("/archives")
async def archive_document(
    document_type: str = Form(...),  # 'invoice-emitted', 'invoice-received', 'e-reporting'
    source_table: str = Form(...),
    source_id: str = Form(...),
    document_number: str = Form(...),
    document_date: str = Form(...),
    party_name: str = Form(...),
    party_siren: Optional[str] = Form(None),
    total_ttc: float = Form(...),
    retention_years: int = Form(10),
    user_data: dict = Depends(get_user_from_token)
):
    """Archiver un document (facture émise/reçue, déclaration)"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Validation du type
        valid_types = ['invoice-emitted', 'invoice-received', 'e-reporting']
        if document_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Type invalide. Valeurs: {', '.join(valid_types)}")
        
        # Récupérer le document source
        source_result = supabase_service.table(source_table)\
            .select("*")\
            .eq("id", source_id)\
            .eq("company_id", company_id)\
            .execute()
        
        if not source_result.data:
            raise HTTPException(status_code=404, detail="Document source non trouvé")
        
        source_doc = source_result.data[0]
        
        # Calculer date d'expiration
        archived_date = datetime.utcnow()
        expiration_date = archived_date + timedelta(days=retention_years * 365)
        
        # Générer hash combiné
        import hashlib
        pdf_path = source_doc.get('pdf_file_path', '')
        xml_path = source_doc.get('xml_file_path', '')
        
        pdf_hash = source_doc.get('pdf_hash', '')
        xml_hash = source_doc.get('xml_hash', '')
        
        combined_hash = hashlib.sha256(f"{pdf_hash}{xml_hash}".encode()).hexdigest()
        
        archive_id = str(uuid.uuid4())
        
        archive_data = {
            "id": archive_id,
            "company_id": company_id,
            "document_type": document_type,
            "source_table": source_table,
            "source_id": source_id,
            "document_number": document_number,
            "document_date": document_date,
            "party_name": party_name,
            "party_siren": party_siren,
            "total_ttc": float(total_ttc),
            "pdf_file_path": pdf_path,
            "xml_file_path": xml_path,
            "pdf_hash": pdf_hash,
            "xml_hash": xml_hash,
            "combined_hash": combined_hash,
            "pdf_size_bytes": source_doc.get('file_size_bytes', 0),
            "total_size_bytes": source_doc.get('file_size_bytes', 0),
            "archived_date": archived_date.isoformat(),
            "expiration_date": expiration_date.isoformat(),
            "status": "active",
            "created_by": user_data.get("sub")
        }
        
        result = supabase_service.table("archives_legal").insert(archive_data).execute()
        
        return {"success": True, "archive": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur archivage document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.get("/archives")
async def get_archives(
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    user_data: dict = Depends(get_user_from_token)
):
    """Liste des archives légales"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        query = supabase_service.table("archives_legal")\
            .select("*")\
            .eq("company_id", company_id)
        
        if document_type:
            query = query.eq("document_type", document_type)
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("document_date", desc=True).execute()
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur récupération archives: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.get("/archives/{archive_id}")
async def get_archive_details(archive_id: str, user_data: dict = Depends(get_user_from_token)):
    """Détails d'une archive"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        result = supabase_service.table("archives_legal")\
            .select("*")\
            .eq("id", archive_id)\
            .eq("company_id", company_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Archive non trouvée")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur récupération archive: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.post("/archives/{archive_id}/verify")
async def verify_archive_integrity(archive_id: str, user_data: dict = Depends(get_user_from_token)):
    """Vérifier l'intégrité d'une archive (hash SHA256)"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Récupérer l'archive
        archive_result = supabase_service.table("archives_legal")\
            .select("*")\
            .eq("id", archive_id)\
            .eq("company_id", company_id)\
            .execute()
        
        if not archive_result.data:
            raise HTTPException(status_code=404, detail="Archive non trouvée")
        
        archive = archive_result.data[0]
        
        # Vérifier l'existence des fichiers
        pdf_path = Path(archive['pdf_file_path'])
        
        if not pdf_path.exists():
            # Fichier manquant
            supabase_service.table("archives_legal")\
                .update({
                    "integrity_status": "corrupted",
                    "last_integrity_check": datetime.utcnow().isoformat(),
                    "integrity_check_count": archive.get('integrity_check_count', 0) + 1
                })\
                .eq("id", archive_id)\
                .execute()
            
            return {
                "success": False,
                "integrity_status": "corrupted",
                "error": "Fichier PDF manquant"
            }
        
        # Calculer hash actuel
        import hashlib
        with open(pdf_path, 'rb') as f:
            current_pdf_hash = hashlib.sha256(f.read()).hexdigest()
        
        # Comparer avec hash stocké
        is_valid = current_pdf_hash == archive['pdf_hash']
        
        # Mettre à jour le statut
        supabase_service.table("archives_legal")\
            .update({
                "integrity_status": "valid" if is_valid else "corrupted",
                "last_integrity_check": datetime.utcnow().isoformat(),
                "integrity_check_count": archive.get('integrity_check_count', 0) + 1
            })\
            .eq("id", archive_id)\
            .execute()
        
        return {
            "success": True,
            "integrity_status": "valid" if is_valid else "corrupted",
            "pdf_hash_matches": is_valid,
            "expected_hash": archive['pdf_hash'],
            "current_hash": current_pdf_hash
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur vérification intégrité archive: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# =============================================================================
# PLANNING SYSTEM - Bureau pilote / Technicien lecture seule
# Utilise la table schedules existante + worksites + planning_team_leaders
# =============================================================================

class ScheduleCreate(BaseModel):
    worksite_id: Optional[str] = None
    team_leader_id: Optional[str] = None
    collaborator_id: str  # Technicien assigné
    date: Optional[str] = None  # Date unique "YYYY-MM-DD" (ancien comportement)
    period_start: Optional[str] = None  # Date de début "YYYY-MM-DD" (nouveau)
    period_end: Optional[str] = None  # Date de fin "YYYY-MM-DD" (nouveau)
    time: str  # Format "HH:MM"
    end_time: Optional[str] = None  # Format "HH:MM"
    hours: Optional[int] = 8
    shift: Optional[str] = "day"
    description: Optional[str] = ""
    status: Optional[str] = "scheduled"
    client_name: Optional[str] = None
    client_address: Optional[str] = None
    intervention_category: Optional[str] = "worksite"  # 'worksite', 'rdv', 'urgence'

class ScheduleUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    end_time: Optional[str] = None
    hours: Optional[int] = None
    collaborator_id: Optional[str] = None
    team_leader_id: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

def _svc():
    return supabase_service or supabase_anon

def _ensure_bureau_or_admin(user: Dict[str, Any]):
    """Vérifie que l'utilisateur a le rôle Bureau ou Admin"""
    role = (user or {}).get("role")
    if role in ("ADMIN", "BUREAU"):
        return
    raise HTTPException(status_code=403, detail="Accès réservé au Bureau/Admin")

def _check_schedule_overlap(company_id: str, collaborator_id: str, date_val: date, 
                            time_start: str, time_end: str, exclude_id: Optional[str] = None) -> bool:
    """Détecte si un technicien a déjà un planning qui chevauche cette plage horaire"""
    q = _svc().table("schedules").select("id,time,end_time").eq("company_id", company_id)\
        .eq("collaborator_id", collaborator_id).eq("date", date_val.isoformat())
    
    res = q.execute()
    for schedule in (res.data or []):
        if exclude_id and schedule.get("id") == exclude_id:
            continue
        existing_start = schedule.get("time", "00:00")
        existing_end = schedule.get("end_time") or schedule.get("time", "23:59")
        # Overlap si: existing_start < time_end ET existing_end > time_start
        if existing_start < time_end and existing_end > time_start:
            return True
    return False

@api_router.get("/schedules")
async def list_schedules(
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    collaborator_id: Optional[str] = None,
    user=Depends(get_user_from_token),
):
    """Liste les plannings (filtrable par dates et technicien). Bureau/Admin peuvent tout voir."""
    _ensure_bureau_or_admin(user)
    company_id = user.get("company_id")
    q = _svc().table("schedules").select("""
        *,
        worksites:worksite_id(id, title, client_id, status, address),
        users:collaborator_id(id, email, first_name, last_name),
        planning_team_leaders:team_leader_id(id, first_name, last_name, user_id)
    """).eq("company_id", company_id)
    
    if from_date:
        q = q.gte("date", from_date.isoformat())
    if to_date:
        q = q.lte("date", to_date.isoformat())
    if collaborator_id:
        q = q.eq("collaborator_id", collaborator_id)
    
    res = q.order("date").order("time").execute()
    
    # Enrichir avec les noms des chefs d'équipe à jour depuis users
    schedules = res.data or []
    for schedule in schedules:
        team_leader = schedule.get("planning_team_leaders")
        if team_leader:
            # Si le chef a un user_id, récupérer le nom à jour depuis users
            user_id = team_leader.get("user_id")
            if user_id:
                try:
                    user_res = _svc().table("users").select("first_name, last_name").eq("id", user_id).execute()
                    if user_res.data:
                        user_data = user_res.data[0]
                        schedule["team_leader_name"] = f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip()
                    else:
                        # Fallback sur les données de planning_team_leaders
                        schedule["team_leader_name"] = f"{team_leader.get('first_name', '')} {team_leader.get('last_name', '')}".strip()
                except:
                    schedule["team_leader_name"] = f"{team_leader.get('first_name', '')} {team_leader.get('last_name', '')}".strip()
            else:
                # Pas de user_id, utiliser les données de planning_team_leaders
                schedule["team_leader_name"] = f"{team_leader.get('first_name', '')} {team_leader.get('last_name', '')}".strip()
            
            # Récupérer le nom du chantier
            worksite = schedule.get("worksites")
            if worksite:
                schedule["worksite_name"] = worksite.get("title", "Chantier")
    
    return schedules

@api_router.post("/schedules")
async def create_schedule(payload: ScheduleCreate, user=Depends(get_user_from_token)):
    """Créer un planning. Bureau/Admin uniquement. Détecte les conflits."""
    try:
        logging.info(f"📅 Création schedule - User: {user.get('email')}, Company: {user.get('company_id')}")
        _ensure_bureau_or_admin(user)
        company_id = user.get("company_id")
        
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Validation: soit date, soit period_start+period_end
        if not payload.date and not (payload.period_start and payload.period_end):
            raise HTTPException(status_code=400, detail="Spécifier 'date' ou 'period_start'+'period_end'")
        
        # Calculer end_time si absent
        time_start = payload.time
        time_end = payload.end_time
        if not time_end:
            from datetime import datetime as dt, timedelta
            t = dt.strptime(time_start, "%H:%M")
            t_end = t + timedelta(hours=payload.hours or 8)
            time_end = t_end.strftime("%H:%M")
        
        # Vérifier conflits (seulement pour date unique)
        if payload.date and _check_schedule_overlap(company_id, payload.collaborator_id, payload.date, time_start, time_end):
            raise HTTPException(status_code=409, detail="Conflit de planning pour ce technicien")
        
        # Récupérer le nom/prénom du collaborateur depuis la table users
        collab_first_name = None
        collab_last_name = None
        try:
            collab_res = _svc().table("users").select("first_name, last_name").eq("id", payload.collaborator_id).execute()
            if collab_res.data:
                collab_first_name = collab_res.data[0].get("first_name", "")
                collab_last_name = collab_res.data[0].get("last_name", "")
                logging.info(f"👤 Collaborateur: {collab_first_name} {collab_last_name}")
        except Exception as e:
            logging.warning(f"⚠️ Impossible de récupérer le nom du collaborateur: {e}")

        # Récupérer les infos du chantier et du client si worksite_id fourni
        worksite_title = None
        resolved_client_name = payload.client_name
        resolved_client_address = payload.client_address
        if payload.worksite_id:
            try:
                ws_res = _svc().table("worksites").select(
                    "title, address, client_id, clients:client_id(name, prenom, nom, adresse, email, telephone)"
                ).eq("id", payload.worksite_id).execute()
                if ws_res.data:
                    ws = ws_res.data[0]
                    worksite_title = ws.get("title")
                    logging.info(f"🏗️ Chantier: {worksite_title}")
                    # Récupérer adresse du chantier si pas fournie
                    if not resolved_client_address and ws.get("address"):
                        resolved_client_address = ws["address"]
                    # Récupérer infos client depuis la relation
                    client_data = ws.get("clients")
                    if client_data and not resolved_client_name:
                        if client_data.get("name"):
                            resolved_client_name = client_data["name"]
                        elif client_data.get("prenom") or client_data.get("nom"):
                            resolved_client_name = f"{client_data.get('prenom', '')} {client_data.get('nom', '')}".strip()
                        if not resolved_client_address and client_data.get("adresse"):
                            resolved_client_address = client_data["adresse"]
                        logging.info(f"👤 Client: {resolved_client_name} - {resolved_client_address}")
            except Exception as e:
                logging.warning(f"⚠️ Impossible de récupérer les infos du chantier: {e}")

        data = {
            "company_id": company_id,
            "worksite_id": payload.worksite_id,
            "team_leader_id": payload.team_leader_id,
            "collaborator_id": payload.collaborator_id,
            "collaborator_first_name": collab_first_name,
            "collaborator_last_name": collab_last_name,
            "worksite_title": worksite_title,
            "time": time_start,
            "end_time": time_end,
            "hours": payload.hours or 8,
            "shift": payload.shift or "day",
            "description": payload.description or "",
            "status": payload.status or "scheduled",
            "created_by": user.get("id"),
            "client_name": resolved_client_name,
            "client_address": resolved_client_address,
            "intervention_category": payload.intervention_category or "worksite",
        }
        
        # Selon le mode: date unique ou période
        if payload.date:
            data["date"] = str(payload.date)
            # Pour compatibilité, remplir aussi start_date/end_date
            data["start_date"] = str(payload.date)
            data["end_date"] = str(payload.date)
        else:
            # Utiliser start_date/end_date pour compatibilité (au lieu de period_start/period_end)
            data["start_date"] = str(payload.period_start)
            data["end_date"] = str(payload.period_end)
            # Garder aussi period_start/period_end si les colonnes existent
            try:
                data["period_start"] = str(payload.period_start)
                data["period_end"] = str(payload.period_end)
            except:
                pass
        
        logging.info(f"📝 Insertion schedule: {data}")
        res = _svc().table("schedules").insert(data).execute()
        logging.info(f"✅ Schedule créé: {res.data}")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Erreur création schedule: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.patch("/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, payload: ScheduleUpdate, user=Depends(get_user_from_token)):
    """Modifier un planning (dates, horaires, technicien). Bureau/Admin uniquement."""
    _ensure_bureau_or_admin(user)
    company_id = user.get("company_id")
    
    # Récupérer l'existant
    existing = _svc().table("schedules").select("*").eq("id", schedule_id).eq("company_id", company_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Planning introuvable")
    
    current = existing.data[0]
    
    # Préparer changements
    changes = {k: v for k, v in payload.dict().items() if v is not None}
    
    # Vérifier conflits si date/horaire/technicien changent
    if any(k in changes for k in ("date", "time", "end_time", "collaborator_id")):
        date_val = changes.get("date") or date.fromisoformat(current["date"])
        time_start = changes.get("time") or current["time"]
        time_end = changes.get("end_time") or current.get("end_time") or current["time"]
        collab_id = changes.get("collaborator_id") or current["collaborator_id"]
        
        if _check_schedule_overlap(company_id, collab_id, date_val, time_start, time_end, exclude_id=schedule_id):
            raise HTTPException(status_code=409, detail="Conflit de planning pour ce technicien")
    
    if "date" in changes:
        changes["date"] = changes["date"].isoformat()
    
    changes["updated_at"] = datetime.utcnow().isoformat()
    
    res = _svc().table("schedules").update(changes).eq("id", schedule_id).execute()
    return res.data[0]

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, user=Depends(get_user_from_token)):
    """Supprimer un planning. Bureau/Admin uniquement."""
    _ensure_bureau_or_admin(user)
    company_id = user.get("company_id")
    
    logger.info(f"🗑️ [delete_schedule] Tentative suppression schedule_id={schedule_id}, company_id={company_id}")
    
    existing = _svc().table("schedules").select("id, company_id").eq("id", schedule_id).execute()
    logger.debug(f"🔍 [delete_schedule] Recherche schedule: {existing.data}")
    
    if not existing.data:
        logger.warning(f"❌ [delete_schedule] Schedule {schedule_id} introuvable")
        raise HTTPException(status_code=404, detail="Planning introuvable")
    
    schedule_company = existing.data[0].get("company_id")
    if schedule_company != company_id:
        logger.warning(f"⚠️ [delete_schedule] Company mismatch: schedule_company={schedule_company} vs user_company={company_id}")
        raise HTTPException(status_code=404, detail="Planning introuvable")
    
    _svc().table("schedules").delete().eq("id", schedule_id).execute()
    logger.info(f"✅ [delete_schedule] Schedule {schedule_id} supprimé")
    return {"deleted": True}

@api_router.get("/technicians/{technician_id}/missions")
async def list_missions_for_technician(
    technician_id: str,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    status: Optional[str] = None,
    user=Depends(get_user_from_token),
):
    """Missions d'un technicien (lecture seule). Accessible au technicien lui-même ou Bureau/Admin."""
    role = (user or {}).get("role")
    if not (role in ("ADMIN", "BUREAU") or user.get("id") == technician_id):
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    company_id = user.get("company_id")
    q = _svc().table("schedules").select("""
        *,
        worksites:worksite_id(id, title, client_id, status, address, start_date, end_date),
        planning_team_leaders:team_leader_id(id, first_name, last_name, user_id)
    """).eq("company_id", company_id).eq("collaborator_id", technician_id)
    
    # Filtrer uniquement les schedules avec start_date (exclure les anciens avec date NULL)
    q = q.not_.is_("start_date", "null")
    
    if status:
        q = q.eq("status", status)
    if from_date:
        # Filtrer les schedules dont la période chevauche la plage demandée
        q = q.lte("start_date", to_date.isoformat() if to_date else "2099-12-31")
    if to_date:
        q = q.gte("end_date", from_date.isoformat() if from_date else "1900-01-01")
    
    res = q.order("start_date", desc=False).order("time").execute()
    
    # 🔄 AUTO-UPDATE : Passer en 'completed' les missions dont la date de fin est dépassée
    from datetime import datetime as dt_cls
    today_date = date.today()
    
    schedules = res.data or []
    for schedule in schedules:
        sch_status = (schedule.get("status") or "").lower()
        sch_end_date = schedule.get("end_date")
        
        if sch_end_date and sch_status in ["scheduled", "in_progress"]:
            try:
                end_dt = dt_cls.strptime(sch_end_date[:10], "%Y-%m-%d").date()
                if end_dt < today_date:
                    _svc().table("schedules").update({
                        "status": "completed"
                    }).eq("id", schedule["id"]).execute()
                    schedule["status"] = "completed"
            except Exception:
                pass
    
    # Enrichir avec les noms des chefs d'équipe à jour depuis users et les données clients
    for schedule in schedules:
        team_leader = schedule.get("planning_team_leaders")
        if team_leader:
            # Si le chef a un user_id, récupérer le nom à jour depuis users
            user_id = team_leader.get("user_id")
            if user_id:
                try:
                    user_res = _svc().table("users").select("first_name, last_name").eq("id", user_id).execute()
                    if user_res.data:
                        user_data = user_res.data[0]
                        schedule["team_leader_name"] = f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip()
                    else:
                        schedule["team_leader_name"] = f"{team_leader.get('first_name', '')} {team_leader.get('last_name', '')}".strip()
                except:
                    schedule["team_leader_name"] = f"{team_leader.get('first_name', '')} {team_leader.get('last_name', '')}".strip()
            else:
                schedule["team_leader_name"] = f"{team_leader.get('first_name', '')} {team_leader.get('last_name', '')}".strip()
        
        # Récupérer le nom du chantier et les données du client
        worksite = schedule.get("worksites")
        if worksite:
            schedule["worksite_name"] = worksite.get("title", "Chantier")
            
            # Récupérer les données du client si client_id existe
            client_id = worksite.get("client_id")
            if client_id:
                try:
                    client_res = _svc().table("clients").select("id, name, prenom, nom, adresse").eq("id", client_id).execute()
                    if client_res.data:
                        # Injecter les données du client dans worksites
                        if "worksites" not in schedule:
                            schedule["worksites"] = {}
                        schedule["worksites"]["clients"] = client_res.data[0]
                except Exception as e:
                    logging.warning(f"Impossible de récupérer le client {client_id}: {e}")
    
    return schedules

# =============================================================================
# TEAM LEADER COLLABORATORS - Gestion des équipes (1-10 collaborateurs par chef)
# =============================================================================

class TeamLeaderCollaboratorAssign(BaseModel):
    team_leader_id: str
    collaborator_id: str
    notes: Optional[str] = None

@api_router.get("/team-leaders/{team_leader_id}/collaborators")
async def get_team_leader_collaborators(team_leader_id: str, user=Depends(get_user_from_token)):
    """Liste des collaborateurs assignés à un chef d'équipe."""
    _ensure_bureau_or_admin(user)
    company_id = user.get("company_id")
    
    # Vérifier que le chef d'équipe existe
    tl_check = _svc().table("planning_team_leaders").select("id").eq("id", team_leader_id).eq("company_id", company_id).execute()
    if not tl_check.data:
        raise HTTPException(status_code=404, detail="Chef d'équipe introuvable")
    
    # Récupérer les collaborateurs assignés
    res = _svc().table("team_leader_collaborators").select("""
        *,
        collaborator:collaborator_id(id, first_name, last_name, email, phone)
    """).eq("team_leader_id", team_leader_id).eq("is_active", True).execute()
    
    return res.data or []

@api_router.post("/team-leaders/assign")
async def assign_collaborator_to_team_leader(assignment: TeamLeaderCollaboratorAssign, user=Depends(get_user_from_token)):
    """Assigner un collaborateur à un chef d'équipe (max 10)."""
    _ensure_bureau_or_admin(user)
    company_id = user.get("company_id")
    
    # Vérifier que le chef d'équipe existe
    tl_check = _svc().table("planning_team_leaders").select("id").eq("id", assignment.team_leader_id).eq("company_id", company_id).execute()
    if not tl_check.data:
        raise HTTPException(status_code=404, detail="Chef d'équipe introuvable")
    
    # Vérifier que le collaborateur existe et est TECHNICIEN
    collab_check = _svc().table("users").select("id, role").eq("id", assignment.collaborator_id).eq("company_id", company_id).execute()
    if not collab_check.data:
        raise HTTPException(status_code=404, detail="Collaborateur introuvable")
    if collab_check.data[0].get("role") != "TECHNICIEN":
        raise HTTPException(status_code=400, detail="Le collaborateur doit avoir le rôle TECHNICIEN")
    
    # Vérifier la limite de 10 collaborateurs
    count_res = _svc().table("team_leader_collaborators").select("id", count="exact").eq("team_leader_id", assignment.team_leader_id).eq("is_active", True).execute()
    if count_res.count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 collaborateurs par chef d'équipe")
    
    # Créer l'assignation (upsert pour gérer les réactivations)
    existing = _svc().table("team_leader_collaborators").select("id, is_active").eq("team_leader_id", assignment.team_leader_id).eq("collaborator_id", assignment.collaborator_id).execute()
    
    if existing.data:
        # Réactiver si désactivé
        res = _svc().table("team_leader_collaborators").update({
            "is_active": True,
            "assigned_at": datetime.utcnow().isoformat(),
            "assigned_by": user.get("id"),
            "notes": assignment.notes,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        # Nouvelle assignation
        res = _svc().table("team_leader_collaborators").insert({
            "team_leader_id": assignment.team_leader_id,
            "collaborator_id": assignment.collaborator_id,
            "assigned_by": user.get("id"),
            "notes": assignment.notes,
            "is_active": True
        }).execute()
    
    return res.data[0]

@api_router.delete("/team-leaders/{team_leader_id}/collaborators/{collaborator_id}")
async def remove_collaborator_from_team_leader(team_leader_id: str, collaborator_id: str, user=Depends(get_user_from_token)):
    """Retirer un collaborateur d'un chef d'équipe."""
    _ensure_bureau_or_admin(user)
    
    # Soft delete (is_active = false)
    res = _svc().table("team_leader_collaborators").update({
        "is_active": False,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("team_leader_id", team_leader_id).eq("collaborator_id", collaborator_id).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Assignation introuvable")
    
    return {"removed": True}

@api_router.get("/team-leaders-stats")
async def get_team_leaders_with_stats(user=Depends(get_user_from_token)):
    """Liste des chefs d'équipe avec statistiques (nombre de collaborateurs)."""
    _ensure_bureau_or_admin(user)
    company_id = user.get("company_id")
    
    logger.info(f"🔍 [team-leaders-stats] Récupération pour company_id: {company_id}")
    
    # Récupérer tous les chefs d'équipe
    team_leaders = _svc().table("planning_team_leaders").select("*").eq("company_id", company_id).execute()
    logger.info(f"👥 [team-leaders-stats] Chefs trouvés: {len(team_leaders.data or [])}")
    
    result = []
    for tl in team_leaders.data or []:
        logger.debug(f"\n📊 [team-leaders-stats] Traitement chef ID: {tl['id']}")
        logger.debug(f"   user_id dans planning_team_leaders: {tl.get('user_id')}")
        logger.debug(f"   Données planning_team_leaders: first_name={tl.get('first_name')}, last_name={tl.get('last_name')}")
        
        # Récupérer les infos à jour depuis users en utilisant user_id
        user_info = None
        user_id = tl.get("user_id")  # Utiliser user_id au lieu de id
        if user_id:
            try:
                user_res = _svc().table("users").select("first_name, last_name, email").eq("id", user_id).execute()
                if user_res.data:
                    user_info = user_res.data[0]
                    logger.debug(f"   ✅ Données users récupérées: first_name={user_info.get('first_name')}, last_name={user_info.get('last_name')}")
                else:
                    logger.debug(f"   ⚠️ Aucune donnée users trouvée pour user_id={user_id}")
            except Exception as e:
                logger.error(f"   ❌ Erreur récupération users: {e}")
        else:
            logger.debug(f"   ⚠️ Pas de user_id défini")
        
        # Compter collaborateurs actifs
        count_res = _svc().table("team_leader_collaborators").select("id", count="exact").eq("team_leader_id", tl["id"]).eq("is_active", True).execute()
        
        # Récupérer liste collaborateurs
        collabs_res = _svc().table("team_leader_collaborators").select("""
            collaborator:collaborator_id(id, first_name, last_name, email)
        """).eq("team_leader_id", tl["id"]).eq("is_active", True).execute()
        
        # Utiliser les données de users si disponibles (plus à jour), sinon garder celles de planning_team_leaders
        final_first = user_info.get("first_name") if user_info else tl.get("first_name")
        final_last = user_info.get("last_name") if user_info else tl.get("last_name")
        logger.debug(f"   📤 Valeurs finales envoyées: first_name={final_first}, last_name={final_last}")
        
        result.append({
            **tl,
            "first_name": final_first,
            "last_name": final_last,
            "email": user_info.get("email") if user_info else tl.get("email"),
            "collaborators_count": count_res.count,
            "collaborators": [c["collaborator"] for c in (collabs_res.data or []) if c.get("collaborator")]
        })
    
    return result
    
    return result

@api_router.get("/worksites/validated")
async def list_validated_worksites(user=Depends(get_user_from_token)):
    """Liste des chantiers validés disponibles pour planification. Bureau/Admin uniquement."""
    _ensure_bureau_or_admin(user)
    company_id = user.get("company_id")
    
    # Statuts considérés comme "validés" ou "planifiables"
    res = _svc().table("worksites").select("""
        *,
        clients:client_id(id, name, email, phone, address)
    """).eq("company_id", company_id).in_("status", ["PLANNED", "IN_PROGRESS"]).execute()
    
    return res.data or []

@api_router.get("/team-leaders")
async def list_team_leaders(user=Depends(get_user_from_token)):
    """Liste des chefs d'équipe disponibles. Bureau/Admin uniquement."""
    _ensure_bureau_or_admin(user)
    company_id = user.get("company_id")
    
    res = _svc().table("planning_team_leaders").select("*").eq("company_id", company_id).execute()
    return res.data or []

# ==================== ENDPOINTS FONDATEUR ====================

@api_router.get("/founder/companies")
async def get_all_companies(user_data: dict = Depends(get_user_from_token)):
    """Liste toutes les entreprises (fondateur uniquement)"""
    if not user_data.get('is_fondateur'):
        raise HTTPException(status_code=403, detail="Accès réservé aux fondateurs")
    
    try:
        response = supabase_service.table("companies").select("*").execute()
        return response.data
    except Exception as e:
        logger.error(f"Erreur récupération entreprises: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/founder/companies/{company_id}/stats")
async def get_company_stats(company_id: str, user_data: dict = Depends(get_user_from_token)):
    """Statistiques détaillées d'une entreprise"""
    if not user_data.get('is_fondateur'):
        raise HTTPException(status_code=403, detail="Accès réservé aux fondateurs")
    
    try:
        users = supabase_service.table("users").select("*").eq("company_id", company_id).execute()
        worksites = supabase_service.table("worksites").select("*").eq("company_id", company_id).execute()
        quotes = supabase_service.table("quotes").select("*").eq("company_id", company_id).execute()
        clients = supabase_service.table("clients").select("*").eq("company_id", company_id).execute()
        
        total_quotes_amount = sum(float(q.get('amount', 0) or 0) for q in quotes.data)
        
        return {
            "company_id": company_id,
            "users_count": len(users.data) if users.data else 0,
            "active_users_count": len([u for u in (users.data or []) if u.get('actif')]),
            "worksites_count": len(worksites.data) if worksites.data else 0,
            "quotes_count": len(quotes.data) if quotes.data else 0,
            "clients_count": len(clients.data) if clients.data else 0,
            "total_quotes_amount": total_quotes_amount
        }
    except Exception as e:
        logger.error(f"Erreur récupération stats entreprise: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/founder/users")
async def get_all_users(user_data: dict = Depends(get_user_from_token)):
    """Liste tous les utilisateurs (fondateur uniquement)"""
    logger.info(f"🔐 /founder/users - user_data: {user_data}")
    if not user_data.get('is_fondateur'):
        logger.warning(f"❌ Accès refusé - is_fondateur={user_data.get('is_fondateur')}")
        raise HTTPException(status_code=403, detail="Accès réservé aux fondateurs")
    
    try:
        response = supabase_service.table("users").select("*").execute()
        return {"users": response.data, "count": len(response.data) if response.data else 0}
    except Exception as e:
        logger.error(f"❌ Erreur récupération utilisateurs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/founder/overview")
async def get_founder_overview(user_data: dict = Depends(get_user_from_token)):
    """Vue d'ensemble pour le fondateur"""
    if not user_data.get('is_fondateur'):
        raise HTTPException(status_code=403, detail="Accès réservé aux fondateurs")
    
    try:
        companies = supabase_service.table("companies").select("*").execute()
        users = supabase_service.table("users").select("*").execute()
        worksites = supabase_service.table("worksites").select("*").execute()
        quotes = supabase_service.table("quotes").select("*").execute()
        clients = supabase_service.table("clients").select("*").execute()
        searches = supabase_service.table("searches").select("*").execute()
        
        return {
            "totals": {
                "companies": len(companies.data) if companies.data else 0,
                "users": len(users.data) if users.data else 0,
                "worksites": len(worksites.data) if worksites.data else 0,
                "quotes": len(quotes.data) if quotes.data else 0,
                "clients": len(clients.data) if clients.data else 0,
                "searches": len(searches.data) if searches.data else 0,
                "reports": len(searches.data) if searches.data else 0,
                "materials": 0,
                "subscriptions": 0
            }
        }
    except Exception as e:
        logger.error(f"Erreur récupération overview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/founder/global-stats")
async def get_global_stats(user_data: dict = Depends(get_user_from_token)):
    """Statistiques globales de la plateforme"""
    if not user_data.get('is_fondateur'):
        raise HTTPException(status_code=403, detail="Accès réservé aux fondateurs")
    
    try:
        companies = supabase_service.table("companies").select("*").execute()
        users = supabase_service.table("users").select("*").execute()
        worksites = supabase_service.table("worksites").select("*").execute()
        quotes = supabase_service.table("quotes").select("*").execute()
        clients = supabase_service.table("clients").select("*").execute()
        
        try:
            licenses = supabase_service.table("licenses").select("*").execute()
            licenses_count = len(licenses.data) if licenses.data else 0
            active_licenses_count = len([l for l in (licenses.data or []) if l.get('is_active')])
        except:
            licenses_count = 0
            active_licenses_count = 0
        
        total_quotes_amount = sum(float(q.get('amount', 0) or 0) for q in (quotes.data or []))
        
        return {
            "platform": {
                "total_companies": len(companies.data) if companies.data else 0,
                "total_users": len(users.data) if users.data else 0,
                "active_users": len([u for u in (users.data or []) if u.get('actif')]),
                "total_licenses": licenses_count,
                "active_licenses": active_licenses_count
            },
            "business": {
                "total_worksites": len(worksites.data) if worksites.data else 0,
                "total_quotes": len(quotes.data) if quotes.data else 0,
                "total_clients": len(clients.data) if clients.data else 0,
                "total_revenue": total_quotes_amount
            }
        }
    except Exception as e:
        logger.error(f"Erreur récupération stats globales: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/founder/licenses")
async def get_licenses(user_data: dict = Depends(get_user_from_token)):
    """Liste toutes les licences"""
    if not user_data.get('is_fondateur'):
        raise HTTPException(status_code=403, detail="Accès réservé aux fondateurs")
    
    try:
        response = supabase_service.table("licenses").select("*").execute()
        return response.data
    except Exception as e:
        logger.error(f"Erreur récupération licences: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/founder/licenses")
async def create_license(license_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Crée une nouvelle licence"""
    if not user_data.get('is_fondateur'):
        raise HTTPException(status_code=403, detail="Accès réservé aux fondateurs")
    
    try:
        import secrets
        license_key = f"SKYAPP-{secrets.token_hex(4).upper()}"
        
        new_license = {
            "license_key": license_key,
            "company_id": license_data.get("company_id"),
            "max_users": license_data.get("max_users", 5),
            "expires_at": license_data.get("expires_at"),
            "is_active": True,
            "created_by": user_data.get("id")
        }
        
        response = supabase_service.table("licenses").insert(new_license).execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Erreur création licence: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/founder/licenses/{license_id}")
async def update_license(license_id: str, license_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Met à jour une licence"""
    if not user_data.get('is_fondateur'):
        raise HTTPException(status_code=403, detail="Accès réservé aux fondateurs")
    
    try:
        response = supabase_service.table("licenses").update(license_data).eq("id", license_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Erreur mise à jour licence: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/founder/licenses/{license_id}")
async def delete_license(license_id: str, user_data: dict = Depends(get_user_from_token)):
    """Supprime une licence"""
    if not user_data.get('is_fondateur'):
        raise HTTPException(status_code=403, detail="Accès réservé aux fondateurs")
    
    try:
        response = supabase_service.table("licenses").delete().eq("id", license_id).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Erreur suppression licence: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# COMPANY SETTINGS - Paramètres Entreprise
# ============================================================================

class CompanySettingsModel(BaseModel):
    company_name: str
    legal_form: str
    address: str
    postal_code: str
    city: str
    siret: str
    siren: str
    rcs_rm: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = '#6366f1'
    secondary_color: Optional[str] = '#333333'

@api_router.get("/company-settings")
async def get_company_settings(user_data: dict = Depends(get_user_from_token)):
    """Récupérer les paramètres de l'entreprise"""
    try:
        company_id = await get_user_company(user_data)
        
        if not company_id:
            # Retourner des valeurs par défaut si pas de company_id
            return {
                "company_name": "SkyApp",
                "logo_url": None,
                "primary_color": "#6366f1"
            }
        
        # Récupérer les paramètres de l'entreprise
        result = supabase_service.table("company_settings").select("*").eq("company_id", company_id).execute()
        
        if not result.data or len(result.data) == 0:
            # Retourner des valeurs par défaut si aucun paramètre enregistré
            return {
                "company_name": "SkyApp",
                "company_id": company_id,
                "logo_url": None,
                "primary_color": "#6366f1"
            }
        
        return result.data[0]
    except Exception as e:
        logging.error(f"Erreur get_company_settings: {str(e)}")
        # Retourner des valeurs par défaut en cas d'erreur
        return {
            "company_name": "SkyApp",
            "logo_url": None,
            "primary_color": "#6366f1"
        }

@api_router.post("/company-settings")
async def save_company_settings(
    settings: CompanySettingsModel,
    user_data: dict = Depends(get_user_from_token)
):
    """Enregistrer les paramètres de l'entreprise (admin uniquement)"""
    try:
        require_role(user_data, ["ADMIN"])
        company_id = await get_user_company(user_data)
        
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier si des paramètres existent déjà
        try:
            existing = supabase_service.table("company_settings").select("*").eq("company_id", company_id).execute()
        except Exception as e:
            logging.error(f"Erreur lecture company_settings: {e}")
            existing = type('obj', (object,), {'data': []})
        
        settings_data = {
            "company_id": company_id,
            **settings.dict(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        try:
            if existing.data and len(existing.data) > 0:
                # Mise à jour
                result = supabase_service.table("company_settings").update(settings_data).eq("company_id", company_id).execute()
            else:
                # Création
                settings_data["created_at"] = datetime.utcnow().isoformat()
                result = supabase_service.table("company_settings").insert(settings_data).execute()
            
            return result.data[0] if result.data else settings_data
        except Exception as e:
            logging.error(f"Erreur sauvegarde company_settings: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.post("/company-settings/logo")
async def upload_company_logo(
    logo: UploadFile = File(...),
    user_data: dict = Depends(get_user_from_token)
):
    """Upload du logo de l'entreprise"""
    try:
        require_role(user_data, ["ADMIN"])
        company_id = await get_user_company(user_data)
        
        # Vérifier le type de fichier
        if not logo.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Le fichier doit être une image")
        
        # Générer un nom unique
        file_extension = logo.filename.split(".")[-1]
        unique_filename = f"company_logo_{company_id}_{uuid.uuid4()}.{file_extension}"
        
        # Sauvegarder le fichier
        uploads_dir = ROOT_DIR / "uploads" / "logos"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        file_path = uploads_dir / unique_filename
        
        with open(file_path, "wb") as f:
            content = await logo.read()
            f.write(content)
        
        logo_url = f"/uploads/logos/{unique_filename}"
        
        return {"logo_url": logo_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur upload: {str(e)}")

"""Enregistrement des routes du routeur API (toutes les définitions sont maintenant au-dessus)."""

# ==================== ENDPOINTS MATÉRIEL ====================

@app.get("/api/materials")
async def get_materials(user_data: dict = Depends(get_user_from_token)):
    """Liste des matériels de la company de l'utilisateur"""
    try:
        company_id = user_data.get("company_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id manquant dans le profil utilisateur")
        
        result = supabase_service.table("materials").select("*").eq("company_id", company_id).order("name").execute()
        return {"data": result.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/materials")
async def create_material(body: dict, user_data: dict = Depends(get_user_from_token)):
    """Créer un matériel"""
    try:
        body["company_id"] = user_data.get("company_id")
        result = supabase_service.table("materials").insert(body).execute()
        return {"data": result.data[0] if result.data else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/materials/{material_id}")
async def update_material(material_id: str, body: dict, user_data: dict = Depends(get_user_from_token)):
    """Modifier un matériel"""
    try:
        result = supabase_service.table("materials").update(body).eq("id", material_id).eq("company_id", user_data.get("company_id")).execute()
        return {"data": result.data[0] if result.data else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/materials/{material_id}")
async def delete_material(material_id: str, user_data: dict = Depends(get_user_from_token)):
    """Supprimer un matériel"""
    try:
        supabase_service.table("materials").delete().eq("id", material_id).eq("company_id", user_data.get("company_id")).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/materials/qr/{qr_code}")
async def scan_material_qr(qr_code: str, user_data: dict = Depends(get_user_from_token)):
    """Trouver un matériel par QR code"""
    try:
        result = supabase_service.table("materials").select("*").eq("qr_code", qr_code).eq("company_id", user_data.get("company_id")).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Matériel non trouvé")
        return {"data": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/materials/{material_id}/maintenance-logs")
async def get_maintenance_logs(material_id: str, user_data: dict = Depends(get_user_from_token)):
    """Historique de maintenance d'un matériel"""
    try:
        result = supabase_service.table("material_maintenance_logs").select("*, users(email)").eq("material_id", material_id).eq("company_id", user_data.get("company_id")).order("performed_at", desc=True).execute()
        return {"data": result.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/materials/{material_id}/maintenance-logs")
async def create_maintenance_log(material_id: str, body: dict, user_data: dict = Depends(get_user_from_token)):
    """Ajouter un log de maintenance"""
    try:
        body["material_id"] = material_id
        body["company_id"] = user_data.get("company_id")
        body["performed_by"] = user_data.get("id")
        result = supabase_service.table("material_maintenance_logs").insert(body).execute()
        return {"data": result.data[0] if result.data else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/maintenance-logs/{log_id}")
async def delete_maintenance_log(log_id: str, user_data: dict = Depends(get_user_from_token)):
    """Supprimer un log de maintenance"""
    try:
        user = await get_current_user(request)
        supabase_service.table("material_maintenance_logs").delete().eq("id", log_id).eq("company_id", user.get("company_id")).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ENDPOINTS INVENTAIRE (EMPRUNT/RETOUR) ====================

@app.get("/api/inventory/my-checkouts")
async def get_my_checkouts(user_data: dict = Depends(get_user_from_token)):
    """Liste des matériels actuellement empruntés par l'utilisateur"""
    try:
        logger.info(f"📦 [INVENTORY] get_my_checkouts appelé pour user_id={user_data.get('id')}")
        result = supabase_service.table("material_checkouts")\
            .select("*, materials!material_checkouts_material_id_fkey(name, category, qr_code, serial_number)")\
            .eq("user_id", user_data.get("id"))\
            .eq("status", "active")\
            .order("checked_out_at", desc=True)\
            .execute()
        logger.info(f"📦 [INVENTORY] Résultat: {len(result.data or [])} emprunts actifs")
        return {"data": result.data or []}
    except Exception as e:
        logger.error(f"❌ [INVENTORY] Erreur: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/inventory/history")
async def get_checkout_history(user_data: dict = Depends(get_user_from_token)):
    """Historique complet des emprunts de l'utilisateur"""
    try:
        result = supabase_service.table("material_checkouts")\
            .select("*, materials!material_checkouts_material_id_fkey(name, category, qr_code)")\
            .eq("user_id", user_data.get("id"))\
            .order("checked_out_at", desc=True)\
            .execute()
        return {"data": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/inventory/available")
async def get_available_materials(user_data: dict = Depends(get_user_from_token)):
    """Liste du matériel disponible (non emprunté)"""
    try:
        company_id = user_data.get("company_id")
        # Matériaux sans checkout actif
        result = supabase_service.table("materials")\
            .select("*")\
            .eq("company_id", company_id)\
            .execute()
        
        # Filtrer ceux qui ont un checkout actif
        active_checkouts = supabase_service.table("material_checkouts")\
            .select("material_id")\
            .eq("status", "active")\
            .execute()
        
        borrowed_ids = {c["material_id"] for c in (active_checkouts.data or [])}
        available = [m for m in (result.data or []) if m["id"] not in borrowed_ids]
        
        return {"data": available}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inventory/checkout")
async def checkout_material(body: dict, user_data: dict = Depends(get_user_from_token)):
    """Emprunter du matériel via QR code"""
    try:
        material_id = body.get("material_id")
        qr_code = body.get("qr_code")
        expected_return_date = body.get("expected_return_date")
        notes = body.get("notes")
        
        # Trouver le matériel par ID ou QR code
        if qr_code and not material_id:
            mat_result = supabase_service.table("materials")\
                .select("id")\
                .eq("qr_code", qr_code)\
                .eq("company_id", user_data.get("company_id"))\
                .execute()
            if not mat_result.data:
                raise HTTPException(status_code=404, detail="Matériel non trouvé")
            material_id = mat_result.data[0]["id"]
        
        if not material_id:
            raise HTTPException(status_code=400, detail="material_id ou qr_code requis")
        
        # Vérifier si déjà emprunté
        existing = supabase_service.table("material_checkouts")\
            .select("id")\
            .eq("material_id", material_id)\
            .eq("status", "active")\
            .execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Ce matériel est déjà emprunté")
        
        # Créer l'emprunt
        checkout_data = {
            "material_id": material_id,
            "user_id": user_data.get("id"),
            "company_id": user_data.get("company_id"),
            "status": "active",
            "checkout_notes": notes
        }
        if expected_return_date:
            checkout_data["expected_return_date"] = expected_return_date
        
        result = supabase_service.table("material_checkouts").insert(checkout_data).execute()
        
        # Mettre à jour le matériel
        supabase_service.table("materials")\
            .update({"available": False, "current_holder_id": user_data.get("id")})\
            .eq("id", material_id)\
            .execute()
        
        return {"data": result.data[0] if result.data else None, "success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inventory/checkin/{checkout_id}")
async def checkin_material(checkout_id: str, body: dict, user_data: dict = Depends(get_user_from_token)):
    """Retourner du matériel emprunté"""
    try:
        notes = body.get("notes")
        
        # Récupérer le checkout
        checkout = supabase_service.table("material_checkouts")\
            .select("*, materials(id)")\
            .eq("id", checkout_id)\
            .eq("user_id", user_data.get("id"))\
            .eq("status", "active")\
            .execute()
        
        if not checkout.data:
            raise HTTPException(status_code=404, detail="Emprunt non trouvé ou déjà retourné")
        
        checkout_data = checkout.data[0]
        material_id = checkout_data["materials"]["id"]
        
        # Marquer comme retourné
        update_data = {
            "status": "returned",
            "checked_in_at": "now()",
            "checkin_notes": notes
        }
        
        supabase_service.table("material_checkouts")\
            .update(update_data)\
            .eq("id", checkout_id)\
            .execute()
        
        # Libérer le matériel
        supabase_service.table("materials")\
            .update({"available": True, "current_holder_id": None})\
            .eq("id", material_id)\
            .execute()
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/inventory/company-checkouts")
async def get_company_checkouts(user_data: dict = Depends(get_user_from_token)):
    """Liste de tous les emprunts actifs de l'entreprise (pour les admins)"""
    try:
        result = supabase_service.table("material_checkouts")\
            .select("*, materials!material_checkouts_material_id_fkey(name, category, qr_code), users(email)")\
            .eq("company_id", user_data.get("company_id"))\
            .eq("status", "active")\
            .order("checked_out_at", desc=True)\
            .execute()
        return {"data": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api_router)

# Monter le répertoire uploads pour servir les fichiers statiques (logos, etc.)
uploads_dir = ROOT_DIR / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# CORS déjà configuré en haut du fichier (juste après app = FastAPI(...))

# Point d'entrée principal
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
    address_delivery: Optional[str] = None
    invoice_date: date
    due_date: date
    payment_terms: str
    payment_method: str = 'virement'
    total_ht: Decimal
    total_tva: Decimal
    total_ttc: Decimal
    notes: Optional[str] = None
    lines: List[InvoiceLineModel]

@api_router.post("/invoices/electronic")
async def create_electronic_invoice(
    invoice: CreateInvoiceModel,
    user_data: dict = Depends(get_user_from_token)
):
    """Créer une nouvelle facture électronique"""
    try:
        company_id = await get_user_company(user_data)
        
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Vérifier SIREN (9 chiffres)
        if not invoice.siren_client or len(invoice.siren_client) != 9 or not invoice.siren_client.isdigit():
            raise HTTPException(status_code=400, detail="SIREN client invalide (9 chiffres obligatoires)")
        
        # Générer le numéro de facture
        invoice_number = await generate_invoice_number(company_id)
        
        # Insérer la facture
        invoice_data = {
            "company_id": company_id,
            "customer_id": invoice.customer_id,
            "invoice_number": invoice_number,
            "invoice_date": invoice.invoice_date.isoformat(),
            "due_date": invoice.due_date.isoformat(),
            "customer_name": invoice.customer_name,
            "siren_client": invoice.siren_client,
            "address_billing": invoice.address_billing,
            "address_delivery": invoice.address_delivery,
            "total_ht": float(invoice.total_ht),
            "total_tva": float(invoice.total_tva),
            "total_ttc": float(invoice.total_ttc),
            "format": "pdf",  # Commencer par PDF simple
            "status_pdp": "draft",  # Brouillon par défaut
            "direction": "outgoing",  # Facture émise
            "payment_terms": invoice.payment_terms,
            "payment_method": invoice.payment_method,
            "created_by": user_data["sub"]
        }
        
        result = supabase_service.table("invoices_electronic").insert(invoice_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Erreur lors de la création de la facture")
        
        invoice_id = result.data[0]["id"]
        
        # Insérer les lignes de facture
        for line in invoice.lines:
            line_ht = float(line.quantity) * float(line.unit_price_ht)
            tva_amount = line_ht * (float(line.tva_rate) / 100)
            line_ttc = line_ht + tva_amount
            
            line_data = {
                "invoice_id": invoice_id,
                "line_number": line.line_number,
                "designation": line.designation,
                "description": line.description,
                "quantity": float(line.quantity),
                "unit": line.unit,
                "unit_price_ht": float(line.unit_price_ht),
                "tva_rate": float(line.tva_rate),
                "tva_amount": round(tva_amount, 2),
                "total_ht": round(line_ht, 2),
                "total_ttc": round(line_ttc, 2),
                "catalog_item_id": line.catalog_item_id
            }
            
            supabase_service.table("invoice_lines").insert(line_data).execute()
        
        # Logger la création
        await log_invoice_action(invoice_id, "created", user_data["sub"])
        
        return {
            "id": invoice_id,
            "invoice_number": invoice_number,
            "message": "Facture créée avec succès"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur création facture: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.get("/invoices/electronic")
async def list_electronic_invoices(
    status: Optional[str] = None,
    direction: Optional[str] = None,
    user_data: dict = Depends(get_user_from_token)
):
    """Lister les factures électroniques"""
    try:
        company_id = await get_user_company(user_data)
        
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        query = supabase_service.table("invoices_electronic").select("*").eq("company_id", company_id)
        
        if status:
            query = query.eq("status_pdp", status)
        if direction:
            query = query.eq("direction", direction)
        
        result = query.order("invoice_date", desc=True).execute()
        
        return result.data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur liste factures: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@api_router.get("/invoices/electronic/{invoice_id}")
async def get_electronic_invoice(
    invoice_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """Récupérer une facture électronique avec ses lignes"""
    try:
        company_id = await get_user_company(user_data)
        
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Récupérer la facture
        invoice_result = supabase_service.table("invoices_electronic")\
            .select("*")\
            .eq("id", invoice_id)\
            .eq("company_id", company_id)\
            .execute()
        
        if not invoice_result.data:
            raise HTTPException(status_code=404, detail="Facture non trouvée")
        
        # Récupérer les lignes
        lines_result = supabase_service.table("invoice_lines")\
            .select("*")\
            .eq("invoice_id", invoice_id)\
            .order("line_number")\
            .execute()
        
        return {
            **invoice_result.data[0],
            "lines": lines_result.data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération facture: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

async def generate_invoice_number(company_id: str) -> str:
    """Générer un numéro de facture unique pour l'année en cours"""
    year = datetime.now().year
    
    # Récupérer le dernier numéro de facture de l'année
    result = supabase_service.table("invoices_electronic")\
        .select("invoice_number")\
        .eq("company_id", company_id)\
        .like("invoice_number", f"F{year}%")\
        .order("invoice_number", desc=True)\
        .limit(1)\
        .execute()
    
    if result.data:
        last_num = int(result.data[0]["invoice_number"][5:])  # F2024XXXX -> XXXX
        return f"F{year}{str(last_num + 1).zfill(4)}"
    else:
        return f"F{year}0001"

async def log_invoice_action(invoice_id: str, action: str, user_id: str, details: Optional[str] = None):
    """Logger une action sur une facture"""
    try:
        log_data = {
            "invoice_id": invoice_id,
            "action": action,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details
        }
        supabase_service.table("invoices_logs").insert(log_data).execute()
    except Exception as e:
        logger.error(f"Erreur log facture: {str(e)}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

"""(include_router déjà appelé plus haut après la définition des routes principales)"""

# (Ancienne implémentation stats_dashboard supprimée - remplacée plus haut avec filtrage & cache)

# ==================== ENDPOINTS FONDATEUR (DÉPLACÉS AVANT app.include_router) ====================
# Les endpoints fondateur ont été déplacés juste avant app.include_router(api_router) pour être enregistrés correctement
# Ne pas redéfinir les routes ici

# Point d'entrée principal
# Tous les endpoints fondateur ont été déplacés AVANT app.include_router(api_router)

# Point d'entrée principal
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
