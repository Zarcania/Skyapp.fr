# 🚀 Guide Rapide - IA SkyApp

## Démarrage en 5 Minutes

### ✅ Ce qui est déjà fait

- ✅ Service IA créé (`ai_service.py`) - 800+ lignes
- ✅ 7 endpoints IA intégrés dans `server_supabase.py`
- ✅ OpenAI library installée
- ✅ Architecture 2 étapes (filtrage local + IA)
- ✅ Function calling sécurisé
- ✅ Mode simulation fonctionnel (sans API key)
- ✅ Cache intégré
- ✅ Monitoring tokens/coûts
- ✅ Documentation complète

### 🔑 Activation (2 étapes)

#### 1. Obtenir Clé API OpenAI

```bash
# Aller sur: https://platform.openai.com/api-keys
# Créer compte gratuit (5$ offerts)
# Créer nouvelle clé: "SkyApp Production"
# Copier la clé (commence par sk-proj-...)
```

#### 2. Configurer Backend

**Fichier** : `backend/.env`

```bash
# Remplacer cette ligne:
OPENAI_API_KEY=your-openai-api-key-here

# Par votre vraie clé:
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**C'est tout!** 🎉

---

## 🧪 Tester l'IA

### 1. Démarrer Backend

```powershell
cd backend
python server_supabase.py
```

**Vérification** : Chercher dans logs :
```
✅ Service IA chargé avec succès
✅ Service IA initialisé
```

### 2. Health Check

```powershell
curl http://localhost:8001/api/health
```

**Attendu** :
```json
{
  "status": "OK",
  "database": "Connected",
  "ai_service": true,  # ✅ IA activée
  "iopole": true
}
```

### 3. Première Requête IA

**Sans API key (mode simulation)** :
```powershell
# Obtenir un token JWT d'abord (connexion)
$token = "votre-jwt-token"

# Requête test
curl -X POST http://localhost:8001/api/ai/query `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"query": "Statistiques du mois"}'
```

**Réponse simulation** :
```json
{
  "success": true,
  "message": "✅ [MODE SIMULATION] Statistiques du mois:\n- 45 devis créés (125k€)\n- 12 acceptés (58k€)\n- 156 recherches terrain\n- 23 clients actifs",
  "simulation": true
}
```

**Avec API key (production)** :
- Même requête
- Réponse intelligente réelle
- `"simulation": false`

---

## 📍 Endpoints IA Disponibles

### 1. Recherche Universelle
```http
POST /api/ai/query
{
  "query": "Montre-moi les devis de Dupont à Mennecy",
  "conversation_history": []  # Optionnel
}
```

**Utilisations** :
- "Trouve les devis > 5000€ ce mois"
- "Recherches terrain à St-Fargeau la semaine dernière"
- "Statistiques de l'entreprise"
- "Quels sont mes clients VIP?"

---

### 2. Génération Devis
```http
POST /api/ai/devis
?client_id=abc123
&description=Réparation fissure + traitement humidité 30m²
```

**Retour** : Devis pré-rempli avec lignes, quantités, prix, TVA

---

### 3. Assistant Planning
```http
POST /api/ai/planning
?action=detect_conflicts
&date_from=2025-01-20
&date_to=2025-01-27
```

**Actions** :
- `suggest_slots` : Propose créneaux libres
- `detect_conflicts` : Détecte chevauchements
- `optimize` : Optimise déplacements

---

### 4. Analyse Rapport Terrain
```http
POST /api/ai/rapport/{search_id}
```

**Retour** :
- Résumé automatique
- Problèmes détectés
- Niveau gravité (LOW/MEDIUM/HIGH/CRITICAL)
- Recommandations actions
- Matériaux nécessaires

---

### 5. Insights Client
```http
GET /api/ai/client/{client_id}/insights
```

**Retour** :
- CA total généré
- Classification (VIP/STANDARD/NOUVEAU)
- Recommandations (relance, offre, etc.)

---

### 6. Prédictions
```http
GET /api/ai/predictions
?prediction_type=delays
```

**Types** :
- `delays` : Anticipe retards projets
- `payment_defaults` : Prédit défauts paiement
- `stock_needs` : Anticipe besoins matériaux

---

### 7. Statistiques IA
```http
GET /api/ai/stats
```

**Retour** :
```json
{
  "total_requests": 1247,
  "cache_hits": 342,
  "cache_hit_rate": "27.4%",
  "tokens_used": 847520,
  "cost_estimate": "4.2300€"
}
```

**Usage** : Monitoring coûts en temps réel

---

## 💰 Coûts Estimés

### Scénario Type

**1 entreprise active (5 utilisateurs)** :
- 50 requêtes IA/jour
- 30 jours/mois
- **Coût : ~4-5€/mois**

**30 entreprises (100 utilisateurs)** :
- **Coût total : ~150€/mois**

### Optimisations Incluses

✅ **Cache 1h** : Économie 25-30%
✅ **Filtrage local** : Économie 70% tokens
✅ **GPT-4o-mini (95%)** : 16x moins cher que GPT-4
✅ **Limite 10 résultats max** : Contexte réduit

**ROI** : 1h économisée/jour/utilisateur = **1200€/mois** vs **10€/mois** coût IA

---

## 🎨 Intégration Frontend (Exemple React)

### Hook Custom

```jsx
// hooks/useAI.js
import { useState } from 'react';
import { getToken } from './auth';

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const query = async (userQuery, history = []) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: userQuery,
          conversation_history: history
        })
      });
      
      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  };

  const generateDevis = async (clientId, description) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/ai/devis?client_id=${clientId}&description=${encodeURIComponent(description)}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${getToken()}` }
        }
      );
      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  };

  const analyzeRapport = async (searchId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai/rapport/${searchId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  };

  return { query, generateDevis, analyzeRapport, loading, error };
}
```

### Composant SkyBar

```jsx
// components/SkyBar.jsx
import React, { useState } from 'react';
import { useAI } from '../hooks/useAI';

export function SkyBar() {
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const { query, loading } = useAI();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Ajouter message utilisateur
    const newConversation = [
      ...conversation,
      { role: 'user', content: input }
    ];
    setConversation(newConversation);

    // Appel IA
    const result = await query(input, newConversation);
    
    if (result && result.success) {
      // Ajouter réponse IA
      setConversation([
        ...newConversation,
        { role: 'assistant', content: result.message }
      ]);
      setShowResults(true);
    }

    setInput('');
  };

  return (
    <div className="skybar">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="🤖 Demandez n'importe quoi à SkyBot..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? '⏳' : '🚀'}
        </button>
      </form>

      {showResults && (
        <div className="ai-results">
          {conversation.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              {msg.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Bouton Génération Devis

```jsx
// Dans formulaire devis
import { useAI } from '../hooks/useAI';

function DevisForm() {
  const { generateDevis, loading } = useAI();
  const [formData, setFormData] = useState({});

  const handleGenerateAI = async () => {
    const result = await generateDevis(
      formData.client_id,
      formData.description
    );

    if (result && result.success) {
      // Pré-remplir formulaire
      setFormData({
        ...formData,
        title: result.devis_draft.title,
        items: result.devis_draft.items,
        total_ht: result.devis_draft.total_ht,
        tva: result.devis_draft.tva,
        total_ttc: result.devis_draft.total_ttc
      });
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Description travaux..."
        value={formData.description || ''}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
      />

      <button onClick={handleGenerateAI} disabled={loading}>
        {loading ? '⏳ Génération...' : '🤖 Générer avec IA'}
      </button>

      {/* Reste du formulaire pré-rempli */}
    </div>
  );
}
```

---

## 🔍 Debug Mode

### Activer Logs Détaillés

**Fichier** : `backend/ai_service.py`

```python
# Ligne 11
logging.basicConfig(level=logging.DEBUG)  # Au lieu de INFO
```

**Voir logs** :
```powershell
# Logs temps réel
python server_supabase.py

# Filtrer logs IA
python server_supabase.py 2>&1 | Select-String "AI Service|Function call|Cache"
```

### Exemple Logs

```
INFO:ai_service:🔍 Filtrage local: 3 devis trouvés
INFO:ai_service:🔧 Function call: search_devis avec args {'client_name': 'Dupont'}
INFO:ai_service:💾 Réponse du cache
INFO:ai_service:✅ Service IA initialisé
```

---

## ⚠️ Résolution Problèmes Courants

### Problème : "Service IA non disponible"

**Solution** :
```powershell
# 1. Vérifier module
cd backend
python -c "from ai_service import AIService; print('✅ OK')"

# 2. Si erreur, réinstaller
pip install -r requirements.txt

# 3. Redémarrer backend
python server_supabase.py
```

---

### Problème : Réponses en mode simulation

**Cause** : API key non configurée ou invalide

**Solution** :
```powershell
# Vérifier .env
cat backend\.env | Select-String "OPENAI"

# Si = "your-openai-api-key-here" → pas configurée
# Obtenir vraie clé: https://platform.openai.com/api-keys
```

---

### Problème : "Entreprise non trouvée"

**Cause** : Token JWT invalide ou utilisateur sans company_id

**Solution** :
```powershell
# Tester endpoint basique d'abord
curl http://localhost:8001/api/searches -H "Authorization: Bearer $token"

# Si erreur 401 → Token expiré, reconnexion
# Si erreur 400 → Utilisateur doit accepter invitation entreprise
```

---

## 📊 Dashboard Monitoring (Futur)

### Métriques à Suivre

**Quotidiennes** :
- Nombre requêtes IA
- Cache hit rate
- Temps réponse moyen
- Erreurs

**Hebdomadaires** :
- Coût total
- Top requêtes utilisées
- Économies cache

**Mensuelles** :
- Évolution coûts
- ROI (temps gagné vs coût)
- Adoption par module

### Exemple Composant Stats

```jsx
// components/AIStats.jsx
import { useState, useEffect } from 'react';

export function AIStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/ai/stats', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
      .then(res => res.json())
      .then(data => setStats(data.stats));
  }, []);

  if (!stats) return <div>Chargement...</div>;

  return (
    <div className="ai-stats-dashboard">
      <StatCard
        label="Requêtes totales"
        value={stats.total_requests}
        icon="📊"
      />
      <StatCard
        label="Cache hit rate"
        value={stats.cache_hit_rate}
        icon="💾"
        color={parseFloat(stats.cache_hit_rate) > 25 ? 'green' : 'orange'}
      />
      <StatCard
        label="Coût estimé"
        value={stats.cost_estimate_formatted}
        icon="💰"
      />
      <StatCard
        label="Mode"
        value={stats.mode}
        icon={stats.mode === 'production' ? '🚀' : '🧪'}
      />
    </div>
  );
}
```

---

## 📚 Ressources

**Documentation complète** : `SKYAPP_AI_DOCUMENTATION_COMPLETE.md`

**Code source** :
- Service IA : `backend/ai_service.py`
- Endpoints : `backend/server_supabase.py` (lignes ~640-1000)

**API Docs** : http://localhost:8001/docs (FastAPI auto-docs)

**OpenAI** :
- Dashboard : https://platform.openai.com/usage
- Pricing : https://openai.com/api/pricing/
- Docs : https://platform.openai.com/docs/

---

## ✅ Checklist Mise en Production

- [ ] API key OpenAI configurée dans `.env`
- [ ] Health check retourne `"ai_service": true`
- [ ] Test requête IA réussie (mode production)
- [ ] Monitoring coûts configuré (alertes)
- [ ] Frontend intégré (SkyBar + boutons)
- [ ] Formation équipe (guide utilisation)
- [ ] Budget mensuel défini (~150-300€)
- [ ] Cache Redis configuré (optionnel, recommandé)
- [ ] Logs analysés (pas d'erreurs)
- [ ] Tests utilisateurs réalisés

---

## 🎉 Prêt à Lancer!

**Commandes finales** :

```powershell
# 1. Configurer API key dans backend/.env
# 2. Démarrer backend
cd backend
python server_supabase.py

# 3. Démarrer frontend
cd frontend
npm start

# 4. Tester dans navigateur
# Ouvrir: http://localhost:3000
# Taper dans SkyBar: "Statistiques du mois"
```

**Résultat attendu** : Réponse intelligente instantanée 🚀

---

*Guide créé le 20 janvier 2025*
*SkyApp - Premier logiciel BTP intelligent en France 🇫🇷*
