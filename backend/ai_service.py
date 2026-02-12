"""
SkyApp AI Service - Premier logiciel BTP intelligent en France
Architecture optimisée : GPT-4o-mini (95%) + GPT-4o (5%)
Coût estimé : ~150-300€/mois pour 100 utilisateurs actifs
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from decimal import Decimal
import hashlib
from openai import AsyncOpenAI
from supabase import Client

# Configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIService:
    """Service IA central pour SkyApp avec architecture économique"""
    
    def __init__(self, supabase_client: Client, api_key: Optional[str] = None):
        self.supabase = supabase_client
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        
        # Mode simulation si pas de clé API
        if not self.api_key or self.api_key == "your-openai-api-key-here":
            self.client = None
            self.simulation_mode = True
            logger.warning("⚠️ Mode simulation - OpenAI API key non configurée")
        else:
            self.client = AsyncOpenAI(api_key=self.api_key)
            self.simulation_mode = False
            logger.info("✅ Service IA initialisé avec OpenAI")
        
        # Cache simple en mémoire (utiliser Redis en production)
        self.cache = {}
        self.cache_ttl = 3600  # 1 heure
        
        # Statistiques d'utilisation
        self.stats = {
            "total_requests": 0,
            "cache_hits": 0,
            "tokens_used": 0,
            "cost_estimate": 0.0
        }
        
        # Configuration des modèles
        self.models = {
            "fast": "gpt-4o-mini",  # 95% des requêtes - 0.15$/1M tokens input
            "advanced": "gpt-4o",   # 5% documents complexes - 2.50$/1M tokens input
        }
        
        # Enregistrement des functions disponibles
        self.functions: Dict[str, Callable] = {}
        self._register_functions()
    
    def _register_functions(self):
        """Enregistre toutes les functions callable pour le function calling"""
        self.functions = {
            "search_devis": self._search_devis,
            "search_clients": self._search_clients,
            "search_searches": self._search_searches,
            "search_planning": self._search_planning,
            "get_devis_details": self._get_devis_details,
            "get_client_details": self._get_client_details,
            "get_statistics": self._get_statistics,
            "analyze_rapport": self._analyze_rapport,
            "generate_devis_draft": self._generate_devis_draft,
            "predict_delays": self._predict_delays,
            "find_similar_devis": self._find_similar_devis,
        }
    
    # ============================================================================
    # ÉTAPE 1 : FILTRAGE LOCAL (Supabase) - Pas de coût IA
    # ============================================================================
    
    async def _search_devis(self, company_id: str, filters: Dict[str, Any]) -> List[Dict]:
        """Recherche de devis avec filtrage local Supabase"""
        try:
            query = self.supabase.table("quotes").select("*").eq("company_id", company_id)
            
            # Filtres optionnels
            if filters.get("client_name"):
                # Recherche client par nom
                clients = self.supabase.table("clients").select("id").eq("company_id", company_id).ilike("nom", f"%{filters['client_name']}%").execute()
                client_ids = [c["id"] for c in clients.data]
                if client_ids:
                    query = query.in_("client_id", client_ids)
            
            if filters.get("status"):
                query = query.eq("status", filters["status"])
            
            if filters.get("min_amount"):
                query = query.gte("amount", filters["min_amount"])
            
            if filters.get("max_amount"):
                query = query.lte("amount", filters["max_amount"])
            
            if filters.get("date_from"):
                query = query.gte("created_at", filters["date_from"])
            
            if filters.get("date_to"):
                query = query.lte("created_at", filters["date_to"])
            
            # Limite à 10 résultats (envoyer seulement ça à GPT)
            result = query.order("created_at", desc=True).limit(10).execute()
            
            logger.info(f"🔍 Filtrage local: {len(result.data)} devis trouvés")
            return result.data
        
        except Exception as e:
            logger.error(f"❌ Erreur filtrage devis: {e}")
            return []
    
    async def _search_clients(self, company_id: str, filters: Dict[str, Any]) -> List[Dict]:
        """Recherche de clients avec filtrage local"""
        try:
            query = self.supabase.table("clients").select("*").eq("company_id", company_id)
            
            if filters.get("name"):
                query = query.ilike("nom", f"%{filters['name']}%")
            
            if filters.get("email"):
                query = query.ilike("email", f"%{filters['email']}%")
            
            if filters.get("city"):
                query = query.ilike("adresse", f"%{filters['city']}%")
            
            result = query.order("nom").limit(10).execute()
            logger.info(f"🔍 Filtrage local: {len(result.data)} clients trouvés")
            return result.data
        
        except Exception as e:
            logger.error(f"❌ Erreur filtrage clients: {e}")
            return []
    
    async def _search_searches(self, company_id: str, filters: Dict[str, Any]) -> List[Dict]:
        """Recherche de recherches terrain avec filtrage local"""
        try:
            query = self.supabase.table("searches").select("*").eq("company_id", company_id)
            
            if filters.get("status"):
                query = query.eq("status", filters["status"])
            
            if filters.get("location"):
                query = query.ilike("location", f"%{filters['location']}%")
            
            if filters.get("user_id"):
                query = query.eq("user_id", filters["user_id"])
            
            if filters.get("date_from"):
                query = query.gte("created_at", filters["date_from"])
            
            if filters.get("date_to"):
                query = query.lte("created_at", filters["date_to"])
            
            result = query.order("created_at", desc=True).limit(10).execute()
            logger.info(f"🔍 Filtrage local: {len(result.data)} recherches trouvées")
            return result.data
        
        except Exception as e:
            logger.error(f"❌ Erreur filtrage recherches: {e}")
            return []
    
    async def _search_planning(self, company_id: str, filters: Dict[str, Any]) -> List[Dict]:
        """Recherche dans le planning avec filtrage local"""
        try:
            query = self.supabase.table("schedules").select("*, user:users(nom, prenom, role)").eq("company_id", company_id)
            
            if filters.get("date"):
                query = query.eq("date", filters["date"])
            
            if filters.get("date_from"):
                query = query.gte("date", filters["date_from"])
            
            if filters.get("date_to"):
                query = query.lte("date", filters["date_to"])
            
            if filters.get("user_id"):
                query = query.eq("user_id", filters["user_id"])
            
            if filters.get("location"):
                query = query.ilike("location", f"%{filters['location']}%")
            
            result = query.order("date").limit(20).execute()
            logger.info(f"🔍 Filtrage local: {len(result.data)} événements trouvés")
            return result.data
        
        except Exception as e:
            logger.error(f"❌ Erreur filtrage planning: {e}")
            return []
    
    async def _get_devis_details(self, company_id: str, quote_id: str) -> Optional[Dict]:
        """Récupère les détails complets d'un devis"""
        try:
            result = self.supabase.table("quotes").select("*, client:clients(*)").eq("id", quote_id).eq("company_id", company_id).single().execute()
            return result.data
        except Exception as e:
            logger.error(f"❌ Erreur détails devis: {e}")
            return None
    
    async def _get_client_details(self, company_id: str, client_id: str) -> Optional[Dict]:
        """Récupère les détails complets d'un client avec son historique"""
        try:
            client = self.supabase.table("clients").select("*").eq("id", client_id).eq("company_id", company_id).single().execute()
            quotes = self.supabase.table("quotes").select("*").eq("client_id", client_id).execute()
            
            return {
                **client.data,
                "quotes": quotes.data,
                "total_quotes": len(quotes.data),
                "total_amount": sum(q.get("amount", 0) for q in quotes.data)
            }
        except Exception as e:
            logger.error(f"❌ Erreur détails client: {e}")
            return None
    
    async def _get_statistics(self, company_id: str, period: str = "month") -> Dict:
        """Calcule des statistiques pour l'entreprise"""
        try:
            # Période
            now = datetime.utcnow()
            if period == "week":
                date_from = now - timedelta(days=7)
            elif period == "month":
                date_from = now - timedelta(days=30)
            else:  # year
                date_from = now - timedelta(days=365)
            
            # Devis
            quotes = self.supabase.table("quotes").select("*").eq("company_id", company_id).gte("created_at", date_from.isoformat()).execute()
            
            # Clients
            clients = self.supabase.table("clients").select("id").eq("company_id", company_id).execute()
            
            # Recherches terrain
            searches = self.supabase.table("searches").select("*").eq("company_id", company_id).gte("created_at", date_from.isoformat()).execute()
            
            return {
                "period": period,
                "quotes": {
                    "total": len(quotes.data),
                    "amount": sum(q.get("amount", 0) for q in quotes.data),
                    "accepted": len([q for q in quotes.data if q.get("status") == "ACCEPTED"]),
                    "pending": len([q for q in quotes.data if q.get("status") == "SENT"]),
                },
                "clients": {
                    "total": len(clients.data)
                },
                "searches": {
                    "total": len(searches.data),
                    "processed": len([s for s in searches.data if s.get("status") == "PROCESSED"]),
                }
            }
        except Exception as e:
            logger.error(f"❌ Erreur statistiques: {e}")
            return {}
    
    # ============================================================================
    # FONCTIONS INTELLIGENTES
    # ============================================================================
    
    async def _analyze_rapport(self, company_id: str, search_id: str) -> Dict:
        """Analyse un rapport de recherche terrain (GPT-4o pour PDF complexes)"""
        try:
            search = self.supabase.table("searches").select("*").eq("id", search_id).eq("company_id", company_id).single().execute()
            
            if self.simulation_mode:
                return {
                    "summary": "Simulation: Rapport analysé avec succès",
                    "problems": ["Fissure détectée", "Humidité 30%"],
                    "severity": "MOYEN",
                    "recommendations": ["Traitement anti-humidité", "Réparation fissure"],
                }
            
            # Utiliser GPT-4o pour analyse complexe
            prompt = f"""Analyse ce rapport de recherche terrain BTP:

Location: {search.data.get('location')}
Description: {search.data.get('description')}
Observations: {search.data.get('observations', 'Aucune')}

Réponds en JSON avec:
- summary (résumé en 2 phrases)
- problems (liste des problèmes détectés)
- severity (LOW/MEDIUM/HIGH/CRITICAL)
- recommendations (liste d'actions recommandées)
- materials_needed (matériaux potentiellement nécessaires)
"""
            
            response = await self.client.chat.completions.create(
                model=self.models["advanced"],  # GPT-4o pour analyse complexe
                messages=[
                    {"role": "system", "content": "Tu es un expert BTP français. Analyse technique et précise."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            self._track_usage(response.usage)
            return result
        
        except Exception as e:
            logger.error(f"❌ Erreur analyse rapport: {e}")
            return {"error": str(e)}
    
    async def _generate_devis_draft(self, company_id: str, client_id: str, description: str) -> Dict:
        """Génère un brouillon de devis basé sur des devis similaires"""
        try:
            # Chercher devis similaires
            similar = await self._find_similar_devis(company_id, description)
            
            if self.simulation_mode:
                return {
                    "title": f"Devis pour travaux - {description[:50]}",
                    "description": description,
                    "items": [
                        {"description": "Main d'œuvre", "quantity": 1, "unit_price": 500, "total": 500},
                        {"description": "Matériaux", "quantity": 1, "unit_price": 300, "total": 300},
                    ],
                    "total_ht": 800,
                    "tva": 160,
                    "total_ttc": 960,
                    "based_on": "Devis similaires analysés"
                }
            
            # GPT-4o-mini pour génération rapide
            context = f"Devis similaires trouvés:\n" + "\n".join([f"- {s.get('title')}: {s.get('amount')}€" for s in similar[:3]])
            
            prompt = f"""Génère un brouillon de devis pour:
{description}

{context if similar else "Pas de devis similaire trouvé"}

Réponds en JSON avec:
- title (titre du devis)
- items (liste: description, quantity, unit_price, total)
- total_ht, tva (20%), total_ttc
- notes (conseils pour l'utilisateur)
"""
            
            response = await self.client.chat.completions.create(
                model=self.models["fast"],  # GPT-4o-mini suffisant
                messages=[
                    {"role": "system", "content": "Tu es un assistant BTP expert en devis. Sois précis et réaliste sur les prix."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            self._track_usage(response.usage)
            return result
        
        except Exception as e:
            logger.error(f"❌ Erreur génération devis: {e}")
            return {"error": str(e)}
    
    async def _find_similar_devis(self, company_id: str, description: str) -> List[Dict]:
        """Trouve des devis similaires pour pré-remplissage"""
        try:
            # Recherche simple par mots-clés
            quotes = self.supabase.table("quotes").select("*").eq("company_id", company_id).limit(50).execute()
            
            # Filtrage basique par mots-clés
            keywords = description.lower().split()
            similar = []
            for quote in quotes.data:
                title = quote.get("title", "").lower()
                desc = quote.get("description", "").lower()
                score = sum(1 for kw in keywords if kw in title or kw in desc)
                if score > 0:
                    similar.append({**quote, "similarity_score": score})
            
            # Trier par score
            similar.sort(key=lambda x: x["similarity_score"], reverse=True)
            return similar[:5]
        
        except Exception as e:
            logger.error(f"❌ Erreur recherche devis similaires: {e}")
            return []
    
    async def _predict_delays(self, company_id: str) -> Dict:
        """Prédit les retards potentiels dans les projets (IA prédictive)"""
        try:
            # Récupérer projets en cours
            projects = self.supabase.table("projects").select("*").eq("company_id", company_id).in_("status", ["ACTIVE", "IN_PROGRESS"]).execute()
            
            if self.simulation_mode:
                return {
                    "at_risk": 2,
                    "predictions": [
                        {"project_id": "xxx", "risk_level": "HIGH", "reasons": ["Retard planning", "Météo défavorable"]},
                    ]
                }
            
            # Analyser avec GPT-4o-mini
            projects_summary = "\n".join([
                f"- {p.get('title')}: statut {p.get('status')}, deadline {p.get('deadline_date', 'N/A')}"
                for p in projects.data[:10]
            ])
            
            prompt = f"""Analyse ces projets BTP et prédit les risques de retard:

{projects_summary}

Réponds en JSON avec:
- at_risk (nombre de projets à risque)
- predictions (liste: project_id, risk_level (LOW/MEDIUM/HIGH), reasons)
"""
            
            response = await self.client.chat.completions.create(
                model=self.models["fast"],
                messages=[
                    {"role": "system", "content": "Tu es un expert en gestion de projets BTP."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            self._track_usage(response.usage)
            return result
        
        except Exception as e:
            logger.error(f"❌ Erreur prédiction retards: {e}")
            return {"error": str(e)}
    
    # ============================================================================
    # ÉTAPE 2 : IA DÉCIDE (sur résultats filtrés uniquement)
    # ============================================================================
    
    async def universal_query(
        self,
        company_id: str,
        user_query: str,
        user_role: str,
        conversation_history: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Requête universelle IA - Interprète la demande et route vers les bonnes functions
        Architecture: Filtrage local → IA décide
        """
        self.stats["total_requests"] += 1
        
        # Vérifier cache
        cache_key = self._get_cache_key(company_id, user_query)
        if cache_key in self.cache:
            cache_entry = self.cache[cache_key]
            if datetime.utcnow().timestamp() - cache_entry["timestamp"] < self.cache_ttl:
                self.stats["cache_hits"] += 1
                logger.info("💾 Réponse du cache")
                return cache_entry["response"]
        
        if self.simulation_mode:
            return self._simulate_response(user_query)
        
        try:
            # Définir les functions disponibles pour GPT
            functions_schema = [
                {
                    "name": "search_devis",
                    "description": "Recherche des devis avec filtres optionnels (client, montant, statut, dates)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "client_name": {"type": "string", "description": "Nom du client"},
                            "status": {"type": "string", "enum": ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]},
                            "min_amount": {"type": "number", "description": "Montant minimum"},
                            "max_amount": {"type": "number", "description": "Montant maximum"},
                            "date_from": {"type": "string", "description": "Date début ISO"},
                            "date_to": {"type": "string", "description": "Date fin ISO"},
                        },
                        "required": []
                    }
                },
                {
                    "name": "search_clients",
                    "description": "Recherche des clients par nom, email ou ville",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Nom du client"},
                            "email": {"type": "string", "description": "Email"},
                            "city": {"type": "string", "description": "Ville"},
                        },
                        "required": []
                    }
                },
                {
                    "name": "search_searches",
                    "description": "Recherche des rapports terrain avec filtres (lieu, statut, dates, technicien)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "status": {"type": "string", "enum": ["DRAFT", "ACTIVE", "PROCESSED", "ARCHIVED"]},
                            "location": {"type": "string", "description": "Lieu de la recherche"},
                            "user_id": {"type": "string", "description": "ID du technicien"},
                            "date_from": {"type": "string", "description": "Date début"},
                            "date_to": {"type": "string", "description": "Date fin"},
                        },
                        "required": []
                    }
                },
                {
                    "name": "search_planning",
                    "description": "Recherche dans le planning avec filtres (dates, technicien, lieu)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "date": {"type": "string", "description": "Date spécifique"},
                            "date_from": {"type": "string", "description": "Date début"},
                            "date_to": {"type": "string", "description": "Date fin"},
                            "user_id": {"type": "string", "description": "ID du technicien"},
                            "location": {"type": "string", "description": "Lieu"},
                        },
                        "required": []
                    }
                },
                {
                    "name": "get_statistics",
                    "description": "Récupère les statistiques de l'entreprise",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "period": {"type": "string", "enum": ["week", "month", "year"], "description": "Période"},
                        },
                        "required": []
                    }
                },
                {
                    "name": "generate_devis_draft",
                    "description": "Génère un brouillon de devis basé sur une description",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "client_id": {"type": "string", "description": "ID du client"},
                            "description": {"type": "string", "description": "Description des travaux"},
                        },
                        "required": ["client_id", "description"]
                    }
                },
                {
                    "name": "analyze_rapport",
                    "description": "Analyse un rapport de recherche terrain",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "search_id": {"type": "string", "description": "ID de la recherche"},
                        },
                        "required": ["search_id"]
                    }
                },
                {
                    "name": "predict_delays",
                    "description": "Prédit les retards potentiels dans les projets",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                },
            ]
            
            # Contexte système
            system_context = f"""Tu es SkyBot, l'assistant IA intelligent de SkyApp, le premier logiciel BTP intelligent en France.

Rôle utilisateur: {user_role}
Entreprise ID: {company_id}

RÈGLES IMPORTANTES:
1. Tu DOIS utiliser les functions pour chercher des données
2. Tu NE PEUX PAS inventer de données
3. Réponds toujours en français professionnel
4. Sois concis et précis
5. Pour les recherches, utilise les filtres appropriés

RESTRICTIONS:
- Tu NE PEUX PAS créer/modifier/supprimer des factures
- Tu NE PEUX PAS effectuer de paiements
- Facturation = manuel uniquement

CAPACITÉS:
- Rechercher devis, clients, rapports terrain, planning
- Analyser rapports et photos
- Générer brouillons de devis
- Prédire retards et problèmes
- Calculer statistiques
"""
            
            # Messages avec historique
            messages = [
                {"role": "system", "content": system_context}
            ]
            
            if conversation_history:
                messages.extend(conversation_history[-10:])  # 10 derniers messages
            
            messages.append({"role": "user", "content": user_query})
            
            # Appel GPT avec function calling (GPT-4o-mini pour 95% des cas)
            response = await self.client.chat.completions.create(
                model=self.models["fast"],  # GPT-4o-mini - économique
                messages=messages,
                functions=functions_schema,
                function_call="auto",
                temperature=0.5,
                max_tokens=1000
            )
            
            message = response.choices[0].message
            self._track_usage(response.usage)
            
            # Si function call
            if message.function_call:
                function_name = message.function_call.name
                function_args = json.loads(message.function_call.arguments)
                
                logger.info(f"🔧 Function call: {function_name} avec args {function_args}")
                
                # Exécuter la function
                if function_name in self.functions:
                    function_result = await self.functions[function_name](company_id, **function_args)
                    
                    # Envoyer résultat à GPT pour formulation finale
                    messages.append({
                        "role": "function",
                        "name": function_name,
                        "content": json.dumps(function_result, ensure_ascii=False, default=str)
                    })
                    
                    final_response = await self.client.chat.completions.create(
                        model=self.models["fast"],
                        messages=messages,
                        temperature=0.5,
                        max_tokens=800
                    )
                    
                    self._track_usage(final_response.usage)
                    final_message = final_response.choices[0].message.content
                    
                    result = {
                        "success": True,
                        "message": final_message,
                        "function_called": function_name,
                        "data": function_result,
                        "tokens_used": response.usage.total_tokens + final_response.usage.total_tokens
                    }
                else:
                    result = {
                        "success": False,
                        "message": f"Function {function_name} non disponible"
                    }
            else:
                # Réponse directe sans function
                result = {
                    "success": True,
                    "message": message.content,
                    "tokens_used": response.usage.total_tokens
                }
            
            # Mettre en cache
            self.cache[cache_key] = {
                "response": result,
                "timestamp": datetime.utcnow().timestamp()
            }
            
            return result
        
        except Exception as e:
            logger.error(f"❌ Erreur requête universelle: {e}")
            return {
                "success": False,
                "message": f"Erreur: {str(e)}"
            }
    
    # ============================================================================
    # UTILITAIRES
    # ============================================================================
    
    def _get_cache_key(self, company_id: str, query: str) -> str:
        """Génère une clé de cache unique"""
        return hashlib.md5(f"{company_id}:{query}".encode()).hexdigest()
    
    def _track_usage(self, usage):
        """Suit l'utilisation des tokens et estime le coût"""
        self.stats["tokens_used"] += usage.total_tokens
        
        # Estimation coût (GPT-4o-mini: 0.15$ input + 0.60$ output / 1M tokens)
        input_cost = (usage.prompt_tokens / 1_000_000) * 0.15
        output_cost = (usage.completion_tokens / 1_000_000) * 0.60
        self.stats["cost_estimate"] += input_cost + output_cost
    
    def _simulate_response(self, query: str) -> Dict:
        """Mode simulation sans API key"""
        query_lower = query.lower()
        
        if "devis" in query_lower or "quote" in query_lower:
            return {
                "success": True,
                "message": "✅ [MODE SIMULATION] J'ai trouvé 3 devis correspondant à vos critères:\n- Devis #1234 pour Dupont (2500€)\n- Devis #1235 pour Martin (4800€)\n- Devis #1236 pour Dubois (1200€)",
                "simulation": True,
                "data": [
                    {"id": "1234", "client": "Dupont", "amount": 2500},
                    {"id": "1235", "client": "Martin", "amount": 4800},
                    {"id": "1236", "client": "Dubois", "amount": 1200},
                ]
            }
        elif "client" in query_lower:
            return {
                "success": True,
                "message": "✅ [MODE SIMULATION] Voici les clients trouvés:\n- Jean Dupont (Paris)\n- Marie Martin (Lyon)\n- Pierre Dubois (Marseille)",
                "simulation": True,
                "data": [
                    {"id": "c1", "nom": "Jean Dupont", "ville": "Paris"},
                    {"id": "c2", "nom": "Marie Martin", "ville": "Lyon"},
                ]
            }
        elif "statistique" in query_lower or "stat" in query_lower:
            return {
                "success": True,
                "message": "✅ [MODE SIMULATION] Statistiques du mois:\n- 45 devis créés (125k€)\n- 12 acceptés (58k€)\n- 156 recherches terrain\n- 23 clients actifs",
                "simulation": True,
                "data": {
                    "quotes": 45,
                    "accepted": 12,
                    "searches": 156,
                    "clients": 23
                }
            }
        else:
            return {
                "success": True,
                "message": "✅ [MODE SIMULATION] Requête reçue. Activez l'API OpenAI pour des réponses intelligentes réelles.",
                "simulation": True
            }
    
    def get_stats(self) -> Dict:
        """Retourne les statistiques d'utilisation"""
        return {
            **self.stats,
            "cache_hit_rate": f"{(self.stats['cache_hits'] / max(1, self.stats['total_requests'])) * 100:.1f}%",
            "cost_estimate_formatted": f"{self.stats['cost_estimate']:.4f}€"
        }
    
    def clear_cache(self):
        """Vide le cache"""
        self.cache = {}
        logger.info("🗑️ Cache vidé")


# ============================================================================
# INSTANCE GLOBALE
# ============================================================================

_ai_service_instance: Optional[AIService] = None

def init_ai_service(supabase_client: Client, api_key: Optional[str] = None):
    """Initialise le service IA global"""
    global _ai_service_instance
    _ai_service_instance = AIService(supabase_client, api_key)
    logger.info("✅ Service IA initialisé")
    return _ai_service_instance

def get_ai_service() -> AIService:
    """Retourne l'instance du service IA"""
    if _ai_service_instance is None:
        raise RuntimeError("Service IA non initialisé. Appelez init_ai_service() d'abord.")
    return _ai_service_instance
