# 🚀 Scripts de gestion SkyApp

Scripts PowerShell pour démarrer, arrêter et redémarrer facilement l'application SkyApp.

## 📋 Scripts disponibles

### `start_skyapp.ps1` - Démarrer l'application

Lance le backend (FastAPI + Supabase) et le frontend (React).

```powershell
# Démarrage simple
.\start_skyapp.ps1

# Avec options
.\start_skyapp.ps1 -OpenBrowser          # Ouvre automatiquement le navigateur
.\start_skyapp.ps1 -KillExisting         # Tue les processus existants avant de démarrer
.\start_skyapp.ps1 -BackendPort 8080     # Change le port backend (défaut: 8001)
.\start_skyapp.ps1 -FrontendPort 3000    # Change le port frontend (défaut: 3002)
```

**Améliorations :**
- ✅ Vérifie la santé du backend (timeout 21s au lieu de 14s)
- ✅ Vérifie que le frontend est prêt (timeout 30s)
- ✅ Lance le frontend dans une fenêtre PowerShell séparée (plus stable que CMD)
- ✅ Affichage amélioré avec émojis et codes couleur
- ✅ Attend une touche avant de se fermer (serveurs restent actifs)

### `stop_skyapp.ps1` - Arrêter l'application

Arrête proprement tous les serveurs SkyApp.

```powershell
# Arrêt simple
.\stop_skyapp.ps1

# Avec ports personnalisés
.\stop_skyapp.ps1 -BackendPort 8080 -FrontendPort 3000
```

**Fonctionnalités :**
- ✅ Arrête le backend sur le port spécifié
- ✅ Arrête le frontend sur le port spécifié
- ✅ Nettoie tous les processus Python et Node.js restants
- ✅ Affiche un rapport détaillé des processus arrêtés

### `restart_skyapp.ps1` - Redémarrer l'application

Redémarre complètement l'application (arrêt puis démarrage).

```powershell
# Redémarrage simple
.\restart_skyapp.ps1

# Avec options
.\restart_skyapp.ps1 -OpenBrowser
```

**Fonctionnalités :**
- ✅ Arrête proprement les serveurs existants
- ✅ Attend 2 secondes pour libérer les ports
- ✅ Relance avec les paramètres spécifiés

## 🎯 Workflow typique

### Premier lancement
```powershell
.\start_skyapp.ps1 -OpenBrowser
```

### Développement quotidien
```powershell
# Après avoir fait des modifications au code backend
.\restart_skyapp.ps1

# Le frontend React se recharge automatiquement (hot reload)
# Pas besoin de restart pour les modifications frontend !
```

### Fin de journée
```powershell
.\stop_skyapp.ps1
```

## 📊 Vérification manuelle

### Vérifier les serveurs actifs
```powershell
# Vérifier les ports
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in @(8001, 3002) }

# Vérifier les processus
Get-Process | Where-Object { $_.ProcessName -like '*python*' -or $_.ProcessName -like '*node*' }
```

### Accès manuel
- **Backend API** : http://127.0.0.1:8001/api/health
- **Documentation API** : http://127.0.0.1:8001/docs
- **Frontend** : http://localhost:3002

## 🐛 Dépannage

### Le backend ne démarre pas
```powershell
# Vérifier les logs dans la fenêtre PowerShell du backend
# Ou lancer manuellement :
cd backend
python -m uvicorn server_supabase:app --host 127.0.0.1 --port 8001
```

### Le frontend ne compile pas
```powershell
# Vérifier les dépendances
cd frontend
npm install

# Lancer manuellement
npm start
```

### Ports déjà utilisés
```powershell
# Libérer les ports
.\stop_skyapp.ps1

# Ou manuellement
Get-Process | Where-Object { $_.ProcessName -like '*python*' -or $_.ProcessName -like '*node*' } | Stop-Process -Force
```

### Erreur "script désactivé"
```powershell
# Autoriser l'exécution des scripts PowerShell (une seule fois)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## ⚙️ Configuration

Les scripts utilisent les fichiers de configuration suivants :
- `backend/.env` - Variables d'environnement backend (Supabase, JWT, etc.)
- `frontend/.env.local` - Variables d'environnement frontend (auto-généré)

Les scripts lisent automatiquement les variables Supabase depuis `backend/.env` et les propagent au frontend.

## 🎨 Émojis de statut

- 🚀 Démarrage
- ✅ Succès
- ⚠️ Avertissement
- ❌ Erreur
- 🛑 Arrêt
- 🔄 Redémarrage
- 🧹 Nettoyage
- 💡 Information

## 📝 Notes

1. **Les fenêtres PowerShell doivent rester ouvertes** pour que les serveurs restent actifs
2. **Le frontend React** utilise le hot-reload - pas besoin de redémarrer pour les modifications
3. **Le backend** nécessite un restart après modification du code Python
4. **Supabase Storage** : Les photos sont stockées dans le cloud (bucket `search-photos`)
5. **MongoDB** : Plus utilisé, supprimé pour simplifier l'architecture
