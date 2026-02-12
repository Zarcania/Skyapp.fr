# 🚀 Scripts PowerShell Skyapp

## Démarrage, Arrêt et Redémarrage

### ▶️ Démarrer Skyapp
```powershell
.\start_skyapp.ps1
```
Lance le backend (port 8001) et le frontend (port 3002) dans des consoles séparées.

### ⏹️ Arrêter Skyapp
```powershell
.\stop_skyapp.ps1
```
Arrête tous les processus Python et Node.js liés à Skyapp.

### 🔄 Redémarrer Skyapp
```powershell
.\restart_skyapp.ps1
```
Arrête puis redémarre automatiquement Skyapp.

---

## 🌐 URLs

- **Backend API**: http://127.0.0.1:8001/api/health
- **Documentation API**: http://127.0.0.1:8001/docs
- **Frontend**: http://localhost:3002

---

## ⚙️ Configuration (optionnelle)

Pour créer des alias PowerShell permanents :
```powershell
.\setup_aliases.ps1
```

Puis utilisez simplement :
- `skystart` → Démarrer
- `skystop` → Arrêter
- `skyrestart` → Redémarrer
