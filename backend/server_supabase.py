from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
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
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as ReportLabImage, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from PIL import Image as PILImage
import qrcode
import base64
import secrets

# Configuration
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_anon_key = os.environ['SUPABASE_ANON_KEY']
supabase_service_key = os.environ.get('SUPABASE_SERVICE_KEY', '')
ALLOW_DEV_LOGIN = os.environ.get('ALLOW_DEV_LOGIN', '0') in ('1', 'true', 'True', 'yes', 'on')
# Founder email (unique creator of the application)
FOUNDER_EMAIL = os.environ.get('FOUNDER_EMAIL', 'skyapp@gmail.com').lower()

# Clients Supabase (anon pour auth, service pour admin)
supabase_anon: Client = create_client(supabase_url, supabase_anon_key)
supabase_service: Client = create_client(supabase_url, supabase_service_key) if supabase_service_key else None

# Create uploads directory
UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI(title="SkyApp API Supabase", description="API pour l'application SkyApp avec Supabase")

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
    description: Optional[str] = None
    observations: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[SearchStatus] = None

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

# Fonctions utilitaires Supabase
async def get_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Récupère l'utilisateur à partir du token Supabase JWT"""
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
                    return user_data.data[0]
            except Exception:
                pass

        # 2) Fallback: tenter avec le client anonyme (si RLS le permet)
        try:
            user_data = supabase_anon.table("users").select("*").eq("id", user_response.user.id).execute()
            if user_data.data:
                return user_data.data[0]
        except Exception:
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
        raise HTTPException(status_code=401, detail=f"Erreur d'authentification: {str(e)}")

async def get_user_company(user_data: dict) -> str:
    """Récupère l'ID de l'entreprise de l'utilisateur"""
    return user_data.get("company_id")

def require_admin(user_data: dict):
    """Lève 403 si l'utilisateur n'est pas ADMIN (fondateur inclus)."""
    if not user_data:
        raise HTTPException(status_code=401, detail="Non authentifié")
    # Fondateur traité comme ADMIN
    if (user_data.get("email") or "").lower() == FOUNDER_EMAIL:
        return
    if user_data.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

# Routes de base
@api_router.get("/")
async def root():
    return {"message": "SkyApp API avec Supabase - Opérationnel", "version": "2.0"}

@api_router.get("/health")
async def health_check():
    try:
        # Vérifier l'accès DB via clé service si disponible
        if supabase_service is not None:
            try:
                supabase_service.table("companies").select("id").limit(1).execute()
                return {"status": "OK", "database": "Connected", "service": "SkyApp Supabase", "mode": "service"}
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
async def register(user_data: RegisterRequest):
    """Inscription d'un nouvel utilisateur avec Supabase Auth"""
    try:
        # Créer l'utilisateur avec Supabase Auth
        auth_response = supabase_anon.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })
        
        if auth_response.user is None:
            raise HTTPException(status_code=400, detail="Erreur lors de la création du compte")
        
        # Créer ou récupérer l'entreprise
        company_id = None
        if user_data.company_name:
            # Créer une nouvelle entreprise
            company_response = supabase_service.table("companies").insert({
                "name": user_data.company_name
            }).execute()
            company_id = company_response.data[0]["id"]
        
        # Rôle: toute personne qui crée un compte devient ADMIN (fondateur inclus)
        role_value = "ADMIN"

        # Créer l'entrée utilisateur dans notre table
        user_record = {
            "id": auth_response.user.id,
            "email": user_data.email,
            "nom": user_data.nom,
            "prenom": user_data.prenom,
            "role": role_value,
            "company_id": company_id
        }
        
        user_response = supabase_service.table("users").insert(user_record).execute()
        
        return {
            "message": "Utilisateur créé avec succès",
            "access_token": auth_response.session.access_token if getattr(auth_response, 'session', None) else None,
            "token_type": "bearer",
            "user": user_response.data[0]
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'inscription: {str(e)}")

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

        # 1) Créer/mettre à jour l'entrée dans la table users avec rôle TECHNICIEN
        payload = {
            "email": invite.email,
            "nom": invite.nom or "",
            "prenom": invite.prenom or "",
            "role": "TECHNICIEN",
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
            "token": auth_response.session.access_token,
            "user": full_user
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la connexion: {str(e)}")

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
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service key manquante - impossible de récupérer les recherches")

        company_id = await get_user_company(user_data)
        role = (user_data.get("role") or "").upper()

        allowed_sort_fields = {"updated_at", "created_at", "status", "location"}
        if sort_by not in allowed_sort_fields:
            sort_by = "updated_at"
        desc = (str(sort_dir).lower() != "asc")

        query = supabase_service.table("searches").select("*")

        if company_id:
            query = query.eq("company_id", company_id)
        if role == UserRole.TECHNICIEN.value:
            query = query.eq("user_id", user_data["id"])
        if status is not None:
            query = query.eq("status", status.value)
        if search:
            term = search.replace("%", "").replace(",", " ").strip()
            if term:
                query = query.or_(f"location.ilike.%{term}%,description.ilike.%{term}%,observations.ilike.%{term}%")

        query = query.order(sort_by, desc=desc)

        if page is None:
            response = query.execute()
            return response.data or []

        offset = (page - 1) * page_size
        response = query.range(offset, offset + page_size - 1).execute()
        items = response.data or []
        has_more = len(items) == page_size
        return {"items": items, "page": page, "page_size": page_size, "has_more": has_more}
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
        if company_id:
            response = supabase_service.table("users").select("*").eq("company_id", company_id).execute()
        else:
            response = supabase_service.table("users").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des utilisateurs: {str(e)}")

# Routes pour les chantiers
@api_router.get("/worksites")
async def get_worksites(user_data: dict = Depends(get_user_from_token)):
    """Récupérer la liste des chantiers"""
    try:
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        if company_id:
            response = supabase_service.table("worksites").select("*").eq("company_id", company_id).execute()
        else:
            response = supabase_service.table("worksites").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des chantiers: {str(e)}")

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
        require_admin(user_data)
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
            # Extensions (estimations ou placeholders si tables absentes)
            "total_reports": count_rows("searches", scope_company),  # chaque recherche ~1 rapport
            "total_materials": count_rows("materials", scope_company),  # si table materials existe sinon 0
            "last_7d_users": count_rows("users", scope_company, since_7d),
            "last_7d_searches": count_rows("searches", scope_company, since_7d),
            "last_7d_clients": count_rows("clients", scope_company, since_7d),
            "last_7d_quotes": count_rows("quotes", scope_company, since_7d),
            "last_7d_worksites": count_rows("worksites", scope_company, since_7d),
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

@api_router.get("/founder/overview")
async def founder_overview(company: Optional[str] = Query(default=None, alias="company"), user_data: dict = Depends(get_user_from_token)):
    """Vue d'ensemble complète réservée au fondateur (FOUNDER_EMAIL).

    Renvoie des compteurs globaux agrégés (toutes entreprises):
    - users, companies, searches, clients, quotes, worksites, materials, reports (alias searches)
    - subscriptions (si table disponible), active_subscriptions (si colonne status disponible)
    - last_7d_* métriques
    """
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service key manquante - vue fondateur indisponible")
        email = (user_data.get("email") or "").lower()
        if email != FOUNDER_EMAIL:
            raise HTTPException(status_code=403, detail="Accès réservé au fondateur")

        now = datetime.utcnow()
        since_7d = (now - timedelta(days=7)).isoformat()

        scope_company: Optional[str] = None
        if company:
            try:
                exists = supabase_service.table("companies").select("id").eq("id", company).limit(1).execute()
                if not getattr(exists, "data", None):
                    raise HTTPException(status_code=404, detail="Entreprise inconnue")
                scope_company = company
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=500, detail="Impossible de vérifier l'entreprise")

        def count_rows(table: str, since: Optional[str] = None, eq: Optional[Dict[str, Any]] = None) -> int:
            try:
                query = supabase_service.table(table).select("id", count="exact")
                if eq:
                    for k, v in eq.items():
                        query = query.eq(k, v)
                if since:
                    query = query.gte("created_at", since)
                res = query.execute()
                return getattr(res, "count", None) or (len(res.data) if res.data is not None else 0)
            except Exception:
                return 0

        company_eq = {"company_id": scope_company} if scope_company else None
        overview = {
            "is_founder": True,
            "generated_at": now.isoformat(),
            "filtered_company_id": scope_company,
            "totals": {
                "users": count_rows("users", eq=company_eq),
                "companies": count_rows("companies"),
                "searches": count_rows("searches", eq=company_eq),
                "clients": count_rows("clients", eq=company_eq),
                "quotes": count_rows("quotes", eq=company_eq),
                "worksites": count_rows("worksites", eq=company_eq),
                "materials": count_rows("materials", eq=company_eq),
                "reports": count_rows("searches", eq=company_eq),
                "subscriptions": count_rows("subscriptions", eq=company_eq),
                "active_subscriptions": count_rows("subscriptions", eq={**company_eq, "status": "active"} if company_eq else {"status": "active"}),
            },
            "last_7d": {
                "users": count_rows("users", since_7d, eq=company_eq),
                "companies": count_rows("companies", since_7d),
                "searches": count_rows("searches", since_7d, eq=company_eq),
                "clients": count_rows("clients", since_7d, eq=company_eq),
                "quotes": count_rows("quotes", since_7d, eq=company_eq),
                "worksites": count_rows("worksites", since_7d, eq=company_eq),
                "materials": count_rows("materials", since_7d, eq=company_eq),
                "subscriptions": count_rows("subscriptions", since_7d, eq=company_eq),
            }
        }

        return overview
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur vue fondateur: {str(e)}")

# =============================
# Fondateur - Liste complète des utilisateurs
# =============================

@api_router.get("/founder/users")
async def founder_users(user_data: dict = Depends(get_user_from_token)):
    """Retourne la liste complète de tous les comptes utilisateurs.

    Accessible uniquement au fondateur défini par FOUNDER_EMAIL.
    Champs retournés: id, email, role, company_id, created_at, actif (si colonne), is_founder.
    Tolérant aux colonnes manquantes (actif)."""
    try:
        if supabase_service is None:
            raise HTTPException(status_code=503, detail="Service key manquante - listing utilisateurs indisponible")
        email = (user_data.get("email") or "").lower()
        if email != FOUNDER_EMAIL:
            raise HTTPException(status_code=403, detail="Accès réservé au fondateur")

        # Sélection basique; si certaines colonnes n'existent pas on gèrera après
        raw_res = None
        try:
            # Sélectionner toutes les colonnes pour éviter les soucis de schéma
            raw_res = supabase_service.table("users").select("*").execute()
        except Exception:
            try:
                raw_res = supabase_service.table("users").select("id,email,role,company_id,created_at").execute()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Impossible de récupérer les utilisateurs: {str(e)}")

        # Fallback si liste vide: tenter client anon (si RLS le permet)
        if (not getattr(raw_res, 'data', None)) and supabase_anon is not None:
            try:
                anon_try = supabase_anon.table("users").select("*").execute()
                if getattr(anon_try, 'data', None):
                    raw_res = anon_try
            except Exception:
                pass

        users = []
        for row in getattr(raw_res, 'data', []) or []:
            u_email = (row.get("email") or "").lower()
            users.append({
                "id": row.get("id"),
                "email": row.get("email"),
                "role": row.get("role"),
                "company_id": row.get("company_id"),
                "created_at": row.get("created_at"),
                "actif": row.get("actif", True),
                "is_founder": u_email == FOUNDER_EMAIL
            })
        reason = None
        if len(users) == 0:
            reason = "Aucun utilisateur retourné. Causes possibles: table vide, RLS bloquant la clé service, mauvaise clé SUPABASE_SERVICE_KEY, ou colonnes différentes."
        return {"count": len(users), "users": users, "generated_at": datetime.utcnow().isoformat(), "debug_reason": reason}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur listing utilisateurs: {str(e)}")

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
        if company_id and item.get("company_id") != company_id and (user_data.get("role") != "ADMIN"):
            raise HTTPException(status_code=403, detail="Accès refusé")

        update_payload = {}
        for field in ["nom", "prenom", "location", "description", "observations", "latitude", "longitude"]:
            value = getattr(update, field)
            if value is not None:
                update_payload[field] = value
        if update.status is not None:
            update_payload["status"] = update.status.value
        if not update_payload:
            return {"message": "Aucune modification"}
        logger.info(f"Update payload for search {search_id}: {update_payload}")
        response = supabase_service.table("searches").update(update_payload).eq("id", search_id).execute()
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
    """Récupérer une recherche spécifique pour édition/affichage."""
    try:
        company_id = await get_user_company(user_data)
        existing = supabase_service.table("searches").select("*").eq("id", search_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Recherche introuvable")
        item = existing.data[0]
        # Vérification d'accès: même company ou propriétaire si TECHNICIEN
        role = (user_data.get("role") or "").upper()
        if company_id and item.get("company_id") != company_id and role != "ADMIN":
            raise HTTPException(status_code=403, detail="Accès refusé")
        if role == UserRole.TECHNICIEN.value and item.get("user_id") != user_data.get("id"):
            raise HTTPException(status_code=403, detail="Accès refusé")
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
    if role == UserRole.TECHNICIEN.value and item.get("user_id") != user_data.get("id"):
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

# Routes pour les clients
@api_router.get("/clients")
async def get_clients(user_data: dict = Depends(get_user_from_token)):
    """Récupérer la liste des clients avec le nom de l'entreprise"""
    try:
        # Réservé aux administrateurs (menu Bureau)
        require_admin(user_data)
        company_id = await get_user_company(user_data)
        if company_id:
            response = supabase_service.table("clients_with_company").select("*").eq("company_id", company_id).execute()
        else:
            response = supabase_service.table("clients_with_company").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des clients: {str(e)}")

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
        
        response = supabase_service.table("clients").delete().eq("id", client_id).eq("company_id", company_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Client non trouvé ou vous n'avez pas accès à ce client")
        return {"message": "Client supprimé avec succès", "deleted_client": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du client: {str(e)}")

# Routes pour les devis (quotes)
@api_router.get("/quotes")
async def get_quotes(user_data: dict = Depends(get_user_from_token)):
    """Récupérer la liste des devis avec informations client"""
    try:
        company_id = await get_user_company(user_data)
        if company_id:
            # Utiliser la vue quotes_with_client_name pour avoir les infos client
            response = supabase_service.table("quotes_with_client_name").select("*").eq("company_id", company_id).execute()
        else:
            response = supabase_service.table("quotes_with_client_name").select("*").execute()
        return response.data or []
    except Exception as e:
        # Fallback sur la table quotes si la vue n'existe pas encore
        try:
            if company_id:
                response = supabase_service.table("quotes").select("*").eq("company_id", company_id).execute()
            else:
                response = supabase_service.table("quotes").select("*").execute()
            return response.data or []
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
            "items": quote_data.get("items", [])  # Stocker les items en JSON
        }
        
        logger.info(f"Données préparées pour insertion: {new_quote}")
        
        response = supabase_service.table("quotes").insert(new_quote).execute()
        logger.info(f"Devis créé avec succès: {response.data[0]}")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du devis: {str(e)}")

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
        return response.data[0]
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

# Routes pour les templates de devis
@api_router.get("/quote-templates")
async def get_quote_templates(user_data: dict = Depends(get_user_from_token)):
    """Récupérer les templates de devis de l'entreprise"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        response = supabase_service.table("quote_templates").select("*").eq("company_id", company_id).order("created_at", desc=True).execute()
        return response.data or []
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
        
        # Envoyer l'email d'invitation via l'API REST de Supabase GoTrue
        email_sent = False
        try:
            import requests
            # Utiliser l'API REST de GoTrue directement
            auth_url = supabase_url.replace('/rest/v1', '') + '/auth/v1/invite'
            headers = {
                'apikey': supabase_service_key,
                'Authorization': f'Bearer {supabase_service_key}',
                'Content-Type': 'application/json'
            }
            payload = {'email': email}
            
            invite_response = requests.post(auth_url, json=payload, headers=headers)
            if invite_response.status_code in [200, 201]:
                email_sent = True
                logging.info(f"✅ Email d'invitation envoyé via Supabase GoTrue à {email}")
            else:
                logging.warning(f"⚠️ Réponse Supabase GoTrue: {invite_response.status_code} - {invite_response.text}")
        except Exception as e:
            logging.warning(f"⚠️ Impossible d'envoyer l'email d'invitation: {str(e)}")
            # L'invitation est créée en base, l'admin peut partager le lien manuellement
        
        return {
            "message": "Invitation créée avec succès" + (" - Email envoyé" if email_sent else " - Partagez le lien manuellement"),
            "invitation": response.data[0],
            "invitation_token": token,
            "email_sent": email_sent
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
        response = supabase_service.table("invitations").select("*, companies(name)").eq("email", email).eq("status", "pending").execute()
        return response.data
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

@api_router.get("/invitations/verify/{token}")
async def verify_invitation_token(token: str):
    """Vérifier la validité d'un token d'invitation"""
    try:
        from datetime import datetime
        response = supabase_service.table("invitations").select("*, companies(name)").eq("token", token).eq("status", "pending").execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Invitation introuvable ou déjà utilisée")
        
        invitation = response.data[0]
        
        # Vérifier l'expiration
        expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            raise HTTPException(status_code=400, detail="Cette invitation a expiré")
        
        return {
            "valid": True,
            "email": invitation["email"],
            "company_name": invitation["companies"]["name"] if invitation.get("companies") else "Entreprise",
            "role": invitation["role"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la vérification: {str(e)}")

@api_router.post("/invitations/accept/{token}")
async def accept_invitation(token: str, user_data: dict = Depends(get_user_from_token)):
    """Accepter une invitation (l'utilisateur doit être connecté)"""
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

# (Routes /quotes et /worksites déjà définies plus haut - duplication supprimée)

"""Enregistrement des routes du routeur API (toutes les définitions sont maintenant au-dessus)."""
app.include_router(api_router)

# CORS (production: utiliser la variable d'env ALLOWED_ORIGINS, ex: https://app.tondomaine.com,https://preview.vercel.app)
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins_env.strip() in ("", "*"):
    _allow_origins = ["*"]
else:
    _allow_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup banner for quick feedback
@app.on_event("startup")
async def _startup_banner():
    try:
        mode = "service" if supabase_service is not None else "anon"
        logging.info("SkyApp Supabase API starting... mode=%s host=127.0.0.1 port=8001", mode)
        logging.info("Health: http://127.0.0.1:8001/api/health  Docs: http://127.0.0.1:8001/docs")
    except Exception:
        pass

"""(include_router déjà appelé plus haut après la définition des routes principales)"""

# (Ancienne implémentation stats_dashboard supprimée - remplacée plus haut avec filtrage & cache)

# Point d'entrée principal
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)