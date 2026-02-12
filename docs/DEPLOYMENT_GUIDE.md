# Guide Déploiement Option A (Vercel + Render)

Ce guide décrit les étapes minimales pour déployer SkyApp en production avec Frontend sur Vercel et Backend sur Render.

## 1. Pré-requis
- Compte GitHub avec le repository.
- Compte Supabase (base existante). Conserver les clés: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY.
- Compte Vercel.
- Compte Render.

## 2. Backend (Render)
1. Dans Render, créer un nouveau service Web depuis le repo.
2. Chemin racine: `backend`
3. Build Command: `pip install -r backend/requirements.txt`
4. Start Command: `uvicorn server_supabase:app --host 0.0.0.0 --port $PORT`
5. Python version: sélectionner 3.11.
6. Ajouter variables d'environnement:
   - SUPABASE_URL = (ton URL Supabase)
   - SUPABASE_SERVICE_KEY = (service key Supabase)
   - SUPABASE_ANON_KEY = (anon key Supabase)
   - FOUNDER_EMAIL = skyapp@gmail.com
   - ALLOWED_ORIGINS = https://app.example.com,https://skyapp.vercel.app
7. Déployer. Noter l'URL publique (ex: `https://skyapp-backend.onrender.com`).
8. (Optionnel) Ajouter un domaine custom `api.tondomaine.com` avec CNAME.

## 3. Frontend (Vercel)
1. Importer le repo dans Vercel.
2. Configuration:
   - Framework: Create React App (auto détecté via `react-scripts` ou `craco`).
   - Build Command: `npm install && npm run build`
   - Output Directory: `build`
   - Root Directory: `frontend`
3. Variables d'environnement (Production):
   - REACT_APP_SUPABASE_URL = (URL Supabase)
   - REACT_APP_SUPABASE_ANON_KEY = (anon key Supabase)
   - REACT_APP_BACKEND_URL = (URL Render ou domaine custom ex: https://api.tondomaine.com)
4. Déployer. Noter l'URL (ex: `https://skyapp.vercel.app`).
5. (Optionnel) Ajouter domaine custom `app.tondomaine.com` (CNAME vers Vercel).

## 4. CORS & Sécurité
- Dans `server_supabase.py`, CORS lit `ALLOWED_ORIGINS`. Assurer que la liste contient:
  - Domaine Vercel de production.
  - Domaine custom frontend si configuré.
  - Domaine preview Vercel (ex: `https://skyapp-git-main-user.vercel.app`) peut être ajouté temporairement.
- Ne jamais exposer `SUPABASE_SERVICE_KEY` côté frontend.

## 5. Vérification post-déploiement
1. Tester `GET /api/health` sur l'URL backend: doit répondre `{"status":"OK" ...}`.
2. Ouvrir le frontend: vérifier que les appels API utilisent `REACT_APP_BACKEND_URL`.
3. Créer un compte ou se connecter (email fondateur: skyapp@gmail.com) pour valider le rôle ADMIN.
4. Vérifier console Render logs pour absence d'erreurs Supabase.

## 6. Monitoring minimal
- Créer un check UptimeRobot sur `https://api.tondomaine.com/api/health` toutes les 5 min.
- Activer notifications de build sur Vercel.

## 7. Rollback rapide
- Frontend: Vercel permet de promouvoir une build précédente en quelques clics.
- Backend: Appuyer sur "Rollback" depuis l'interface Render (ou redeployer un commit antérieur).

## 8. Préproduction / Environnements
- Utiliser une branche `staging` déployée vers un service Render et un projet Vercel séparés.
- Clés Supabase: soit même instance (risque de collisions), soit projet Supabase secondaire.

## 9. Prochaines améliorations (optionnel)
- Ajouter `render.yaml` dans le repo (déjà présent) pour infra-as-code.
- Mettre en place un script d'intégration continue (GitHub Actions) pour exécuter tests avant déploiement.
- Activer Point-In-Time Recovery (PITR) dans Supabase pour résilience.

## 10. FAQ rapide
- Erreur CORS: vérifier que `ALLOWED_ORIGINS` inclut exactement l'origine (schéma + domaine + port si différent).
- 404 API depuis frontend: confirmer `REACT_APP_BACKEND_URL` sans slash final et que les routes commencent par `/api/`.
- Clés Supabase incorrectes: `health` retourne status `DEGRADED`.

Bon déploiement !
