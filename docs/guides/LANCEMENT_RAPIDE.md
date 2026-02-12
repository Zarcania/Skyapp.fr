# 🚀 Guide de Lancement Rapide - SkyApp

## ✅ Méthode Recommandée (Windows PowerShell)

### Démarrage Complet (Backend + Frontend)
```powershell
.\start_skyapp.ps1
```

**Options disponibles :**
```powershell
# Redémarrer en tuant les processus existants
.\start_skyapp.ps1 -KillExisting

# Ouvrir automatiquement le navigateur
.\start_skyapp.ps1 -OpenBrowser

# Personnaliser les ports
.\start_skyapp.ps1 -BackendPort 8001 -FrontendPort 3002
```

### Arrêt Propre
```powershell
.\stop_skyapp.ps1
```

### Redémarrage
```powershell
.\restart_skyapp.ps1
```

---

## 🔧 Démarrage Manuel (si nécessaire)

### Backend (Python + Supabase)
```powershell
cd backend
python server_supabase.py
```
**URL Backend :** http://127.0.0.1:8001  
**Documentation API :** http://127.0.0.1:8001/docs

### Frontend (React)
```powershell
cd frontend
npm start
```
**URL Frontend :** http://localhost:3002

---

## ⚠️ Notes Importantes

### 1. **Utiliser `server_supabase.py` (PAS `server.py`)**
   - ✅ `server_supabase.py` = Version Supabase (actuelle)
   - ❌ `server.py` = Ancienne version MongoDB (obsolète)

### 2. **Configuration Supabase**
   - Fichier : `backend/.env`
   - Variables requises :
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_KEY`

### 3. **Ports par Défaut**
   - Backend : 8001
   - Frontend : 3002

### 4. **Problèmes Courants**

#### ❌ Erreur "ERR_CONNECTION_REFUSED"
**Cause :** Backend non démarré  
**Solution :**
```powershell
.\restart_skyapp.ps1 -KillExisting
```

#### ❌ Erreur "Port déjà utilisé"
**Cause :** Processus existant sur le port  
**Solution :**
```powershell
# Arrêter tous les processus
.\stop_skyapp.ps1

# Ou tuer manuellement
Get-Process | Where-Object { $_.ProcessName -like '*python*' -or $_.ProcessName -like '*node*' } | Stop-Process -Force
```

#### ❌ Erreur "MONGO_URL not found"
**Cause :** Utilisation de `server.py` au lieu de `server_supabase.py`  
**Solution :** Toujours utiliser `start_skyapp.ps1` qui utilise automatiquement le bon fichier

---

## 📋 Vérification Rapide

### Vérifier si les serveurs sont actifs
```powershell
# Backend
Invoke-WebRequest -Uri "http://127.0.0.1:8001/api/health" -UseBasicParsing

# Ports actifs
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in @(8001, 3002) }
```

### Processus Python/Node actifs
```powershell
Get-Process | Where-Object { $_.ProcessName -like '*python*' -or $_.ProcessName -like '*node*' }
```

---

## 🎯 URLs Importantes

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3002 | Interface utilisateur |
| **Backend API** | http://127.0.0.1:8001/api | Endpoints API |
| **API Docs** | http://127.0.0.1:8001/docs | Documentation Swagger |
| **Health Check** | http://127.0.0.1:8001/api/health | Statut du backend |

---

## 🔑 Comptes de Test

### Admin
- **Email :** skyapp@gmail.com  
- **Mot de passe :** Sky123!  

### Bureau (Gestionnaire)
- **Email :** corradijordan@gmail.com  
- **Mot de passe :** Sky123!  

---

## 📚 Documentation Complète

Pour plus de détails, consultez :
- `README_COMPLET.md` - Documentation détaillée
- `DEPLOYMENT_GUIDE.md` - Guide de déploiement
- `SCRIPTS_GUIDE.md` - Guide des scripts
