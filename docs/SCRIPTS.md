# Scripts de Gestion SkyApp

## Scripts Disponibles

### ✅ `start_skyapp.ps1` - Demarrer SkyApp
Lance le backend (port 8001) et le frontend (port 3002)

```powershell
.\start_skyapp.ps1
```

---

### 🛑 `stop_skyapp.ps1` - Arreter SkyApp
Arrete tous les serveurs SkyApp

```powershell
.\stop_skyapp.ps1
```

---

### 🔄 `restart_skyapp.ps1` - Redemarrer SkyApp
Arrete puis redemarre SkyApp

```powershell
.\restart_skyapp.ps1
```

---

## URLs

Apres le demarrage (attends 30-60 secondes) :

- **Frontend**: http://localhost:3002
- **Backend API**: http://127.0.0.1:8001/api/health
- **Documentation**: http://127.0.0.1:8001/docs

---

## Notes

- Les serveurs tournent dans des fenetres PowerShell separees
- Laisse ces fenetres ouvertes pendant l'utilisation
- Utilise `stop.ps1` pour arreter proprement les serveurs
