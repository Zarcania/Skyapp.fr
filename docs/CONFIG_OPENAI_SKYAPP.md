# 🔑 Configuration OpenAI - SkyApp IA

## Étapes pour Activer l'IA

### 1️⃣ Créer Compte OpenAI

**URL** : https://platform.openai.com/signup

**Informations requises** :
- Email professionnel
- Carte bancaire (pour facturation usage)

**Crédit gratuit** : 5$ offerts pour tester

---

### 2️⃣ Obtenir Clé API

1. **Se connecter** : https://platform.openai.com/
2. **Aller dans** : API Keys (menu gauche)
3. **Créer nouvelle clé** :
   - Nom : `SkyApp Production`
   - Permissions : All (par défaut)
   - Projets : Default project
4. **Copier la clé immédiatement** (format : `sk-proj-...`)
   ⚠️ Elle ne sera plus affichée

---

### 3️⃣ Configurer Backend

**Fichier** : `backend/.env`

**Ligne à modifier** :
```bash
# AVANT (mode simulation)
OPENAI_API_KEY=your-openai-api-key-here

# APRÈS (mode production)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **Remplacer** `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` par votre vraie clé

---

### 4️⃣ Redémarrer Backend

```powershell
# Arrêter backend existant (Ctrl+C)

# Redémarrer
cd backend
python server_supabase.py
```

**Vérification dans logs** :
```
✅ Service IA chargé avec succès
✅ Service IA initialisé
INFO:ai_service:✅ Service IA initialisé avec OpenAI
```

Si vous voyez :
```
⚠️ Mode simulation - OpenAI API key non configurée
```
→ La clé n'est pas correctement configurée

---

### 5️⃣ Tester IA

**Health Check** :
```powershell
curl http://localhost:8001/api/health
```

**Attendu** :
```json
{
  "status": "OK",
  "ai_service": true,
  "mode": "service"
}
```

**Test requête IA** :
```powershell
# 1. Se connecter pour obtenir token
$loginResponse = curl -X POST http://localhost:8001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"your@email.com","password":"yourpassword"}' | ConvertFrom-Json

$token = $loginResponse.token

# 2. Tester IA
curl -X POST http://localhost:8001/api/ai/query `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"query":"Statistiques du mois"}' | ConvertFrom-Json
```

**Si succès** :
```json
{
  "success": true,
  "message": "Voici les statistiques du mois: ...",
  "simulation": false  // ✅ Mode production actif
}
```

---

## 💰 Configuration Budget et Alertes

### Définir Limite Mensuelle (OpenAI Dashboard)

1. **Aller sur** : https://platform.openai.com/settings/organization/billing
2. **Usage limits** → Set monthly budget
3. **Définir** : 300$ (sécurité)
4. **Email alerts** :
   - 100$ atteints → Alerte
   - 250$ atteints → Alerte urgente
   - 300$ atteints → Blocage automatique

### Monitoring Coûts (SkyApp)

**Dashboard Admin** :
```http
GET /api/ai/stats
Authorization: Bearer {admin_token}
```

**Retour** :
```json
{
  "total_requests": 1247,
  "tokens_used": 847520,
  "cost_estimate": "4.23€",
  "cache_hit_rate": "27.4%"
}
```

**Recommandations** :
- Vérifier tous les lundis matin
- Si coût >50€/semaine → Analyser requêtes inhabituelles
- Si cache_hit_rate <20% → Augmenter TTL cache

---

## 🔐 Sécurité de la Clé API

### ⚠️ NE JAMAIS :

- ❌ Committer `.env` sur Git
- ❌ Partager la clé publiquement
- ❌ L'inclure dans code frontend
- ❌ La logger dans fichiers

### ✅ TOUJOURS :

- ✅ Garder clé dans `backend/.env` uniquement
- ✅ Ajouter `.env` au `.gitignore`
- ✅ Utiliser variables d'environnement en production
- ✅ Régénérer si compromise

### Rotation Clé (si compromise)

1. **Aller sur** : https://platform.openai.com/api-keys
2. **Révoquer** ancienne clé
3. **Créer** nouvelle clé
4. **Mettre à jour** `backend/.env`
5. **Redémarrer** backend

---

## 🎯 Optimisations Coûts

### 1. Augmenter Cache TTL

**Fichier** : `backend/ai_service.py`

**Ligne 28** :
```python
# Défaut : 1 heure
self.cache_ttl = 3600

# Recommandé production : 2 heures
self.cache_ttl = 7200
```

**Gain** : +10-15% économie

---

### 2. Réduire Tokens Max

**Ligne ~655** (dans `universal_query`) :
```python
# Défaut
max_tokens=1000

# Optimisé
max_tokens=500
```

**Gain** : -50% coût output

---

### 3. Forcer GPT-4o-mini

Pour tester coût minimal :

**Ligne ~28** :
```python
self.models = {
    "fast": "gpt-4o-mini",
    "advanced": "gpt-4o-mini",  # Au lieu de gpt-4o
}
```

**Gain** : -80% coût mais perte capacités avancées

---

### 4. Migrer Cache vers Redis

**Installation** :
```powershell
pip install redis
```

**Configuration** :
```python
# Ligne ~27
import redis
self.cache = redis.Redis(
    host='localhost',
    port=6379,
    decode_responses=True,
    db=0
)
```

**Gain** :
- Cache persistant (survit redémarrages)
- Partagé entre instances backend
- +5-10% cache hit rate

---

## 📊 Coûts Estimés Réalistes

### Scénarios d'Usage

#### 🟢 Léger (10 utilisateurs, 20 req/jour)
```
20 req/jour × 30 jours × 10 users = 6,000 requêtes/mois
Coût : ~25-40€/mois
```

#### 🟡 Moyen (50 utilisateurs, 30 req/jour)
```
30 req/jour × 30 jours × 50 users = 45,000 requêtes/mois
Coût : ~120-180€/mois
```

#### 🔴 Intensif (100 utilisateurs, 50 req/jour)
```
50 req/jour × 30 jours × 100 users = 150,000 requêtes/mois
Coût : ~350-450€/mois
```

### Facteurs Impact

**Augmente coût** :
- ❌ Longues conversations (historique >10 messages)
- ❌ Documents PDF lourds (>10 pages)
- ❌ Analyses photos multiples
- ❌ Cache désactivé/court

**Réduit coût** :
- ✅ Cache longue durée
- ✅ Requêtes concises
- ✅ Filtrage local fort
- ✅ GPT-4o-mini privilégié

---

## 🆘 Problèmes Courants

### "Invalid API key provided"

**Cause** : Clé incorrecte ou révoquée

**Solutions** :
1. Vérifier clé dans `.env` (pas d'espaces)
2. Vérifier format : `sk-proj-...`
3. Tester clé sur https://platform.openai.com/api-keys
4. Régénérer si nécessaire

---

### "Quota exceeded"

**Cause** : Limite mensuelle atteinte

**Solutions** :
1. Vérifier usage : https://platform.openai.com/usage
2. Augmenter limite si légitime
3. Vérifier pas d'abus (logs backend)
4. Optimiser cache/requêtes

---

### "Rate limit exceeded"

**Cause** : Trop de requêtes simultanées

**Solutions** :
1. Implémenter throttling backend
2. Passer à tier payant OpenAI (limites + élevées)
3. Distribuer requêtes dans le temps

**Limites par défaut** :
- Tier Free : 3 req/min
- Tier 1 ($5+) : 60 req/min
- Tier 2 ($50+) : 500 req/min

---

### Coûts Explosent

**Diagnostic** :
```http
GET /api/ai/stats
```

Regarder `tokens_used` et `cost_estimate`

**Actions** :
1. Analyser logs requêtes inhabituelles
2. Vérifier pas de boucle infinie
3. Réduire `max_tokens`
4. Augmenter cache TTL
5. Limiter résultats (5 au lieu de 10)

---

## 📧 Support OpenAI

**Documentation** : https://platform.openai.com/docs
**Status API** : https://status.openai.com/
**Contact** : https://platform.openai.com/support

**Avant de contacter** :
1. Vérifier status API
2. Consulter docs
3. Tester avec clé test
4. Vérifier logs backend

---

## ✅ Checklist Configuration

- [ ] Compte OpenAI créé
- [ ] Carte bancaire ajoutée (facturation)
- [ ] Clé API générée et copiée
- [ ] Clé ajoutée dans `backend/.env`
- [ ] `.env` dans `.gitignore`
- [ ] Backend redémarré
- [ ] Health check OK (`ai_service: true`)
- [ ] Test requête IA réussi (`simulation: false`)
- [ ] Budget mensuel défini (OpenAI dashboard)
- [ ] Alertes email configurées
- [ ] Monitoring SkyApp actif (`/api/ai/stats`)

---

## 🎓 Ressources

**OpenAI** :
- Dashboard : https://platform.openai.com/
- Usage : https://platform.openai.com/usage
- Pricing : https://openai.com/api/pricing/
- Docs : https://platform.openai.com/docs/

**SkyApp** :
- Doc complète : `SKYAPP_AI_DOCUMENTATION_COMPLETE.md`
- Guide rapide : `GUIDE_RAPIDE_IA_SKYAPP.md`
- Récap technique : `RECAP_IA_SKYAPP.md`

**API Docs** : http://localhost:8001/docs

---

*Configuration créée le 20 janvier 2025*
*SkyApp - Configuration IA 🇫🇷*
