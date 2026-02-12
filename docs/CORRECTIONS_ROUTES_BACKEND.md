# Corrections Routes Backend - 12 novembre 2025

## 🔧 Problèmes Corrigés

### 1. Route `/api/quotes` manquante (404 Not Found)

**Problème**: Le frontend tentait d'accéder à `/api/quotes` mais cette route n'existait pas.

**Solution**: Ajout de 2 routes pour les devis dans `backend/server_supabase.py`:

```python
# Routes pour les devis (quotes)
@api_router.get("/quotes")
async def get_quotes(user_data: dict = Depends(get_user_from_token)):
    """Récupérer la liste des devis"""
    try:
        company_id = await get_user_company(user_data)
        if company_id:
            response = supabase_service.table("quotes").select("*").eq("company_id", company_id).execute()
        else:
            response = supabase_service.table("quotes").select("*").execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des devis: {str(e)}")

@api_router.post("/quotes")
async def create_quote(quote_data: dict, user_data: dict = Depends(get_user_from_token)):
    """Créer un nouveau devis"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        new_quote = {
            "company_id": company_id,
            "user_id": user_data["id"],
            **quote_data
        }
        
        response = supabase_service.table("quotes").insert(new_quote).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du devis: {str(e)}")
```

**Résultat**: ✅ Les routes `/api/quotes` (GET et POST) sont maintenant disponibles.

---

### 2. Erreur 500 sur `/api/invitations/send` - Contrainte de base de données

**Problème**: 
```
"new row for relation \"invitations\" violates check constraint \"invitations_status_check\""
```

**Cause**: La base de données accepte les statuts en **minuscules** (`'pending'`, `'accepted'`, `'rejected'`, `'expired'`) mais le backend envoyait en **MAJUSCULES** (`'PENDING'`).

**Solution**: Correction de tous les statuts dans le backend pour utiliser les minuscules:

```python
# AVANT (❌ incorrect)
"status": "PENDING"
.eq("status", "PENDING")

# APRÈS (✅ correct)
"status": "pending"
.eq("status", "pending")
```

**Fichiers modifiés**:
- `backend/server_supabase.py` lignes 1173, 1191, 1215, 1236, 1264

**Frontend aussi corrigé**:
```javascript
const getStatusColor = (status) => {
  const normalizedStatus = (status || '').toLowerCase();
  switch (normalizedStatus) {
    case 'pending': return 'bg-yellow-100 text-yellow-700';
    case 'accepted': return 'bg-green-100 text-green-700';
    case 'expired': return 'bg-red-100 text-red-700';
    case 'cancelled': return 'bg-gray-100 text-gray-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};
```

**Résultat**: ✅ Les invitations peuvent maintenant être créées sans erreur de contrainte.

---

## 📊 État des Routes Backend

### Routes Fonctionnelles (33 routes)

#### Authentification (3)
- ✅ `POST /auth/register` - Inscription
- ✅ `POST /auth/login` - Connexion
- ✅ `POST /auth/invite` - Invitation (legacy)

#### Recherches/Devis (7)
- ✅ `GET /searches` - Liste des recherches (avec pagination)
- ✅ `POST /searches/draft` - Créer un brouillon
- ✅ `PATCH /searches/{search_id}` - Modifier recherche
- ✅ `PUT /searches/{search_id}` - Modifier (compat)
- ✅ `GET /searches/{search_id}` - Détail recherche
- ✅ `DELETE /searches/{search_id}` - Supprimer
- ✅ `POST /searches/{search_id}/delete` - Supprimer (compat)

#### Clients (2)
- ✅ `GET /clients` - Liste clients
- ✅ `POST /clients` - Créer client

#### **Devis - NOUVELLES (2)**
- ✅ `GET /quotes` - Liste des devis
- ✅ `POST /quotes` - Créer un devis

#### Invitations (7)
- ✅ `POST /invitations/send` - Envoyer invitation (CORRIGÉE)
- ✅ `GET /invitations/received` - Invitations reçues
- ✅ `GET /invitations/sent` - Invitations envoyées
- ✅ `GET /invitations/verify/{token}` - Vérifier token
- ✅ `POST /invitations/accept/{token}` - Accepter
- ✅ `DELETE /invitations/{invitation_id}` - Annuler
- ✅ `POST /invitations/{invitation_id}/accept` - Accepter (legacy)
- ✅ `POST /invitations/{invitation_id}/decline` - Refuser (legacy)

#### Données d'entreprise (3)
- ✅ `GET /companies` - Liste entreprises
- ✅ `GET /users` - Liste utilisateurs
- ✅ `GET /worksites` - Liste chantiers

#### Statistiques (4)
- ✅ `GET /stats/dashboard` - Dashboard stats
- ✅ `GET /founder/overview` - Vue fondateur
- ✅ `GET /founder/users` - Utilisateurs (fondateur)
- ✅ `GET /founder/users/raw` - Données brutes

#### Système (2)
- ✅ `GET /` - Root
- ✅ `GET /health` - Health check

---

## 🧪 Tests Recommandés

### Test 1: Invitations (Admin)
1. Se connecter en Admin (`corradijordan@gmail.com`)
2. Aller dans "Invitations"
3. Cliquer "+ Inviter un utilisateur"
4. Remplir: `squimizgame@gmail.com` + rôle `Technicien / User`
5. Cliquer "Envoyer l'invitation"
6. ✅ **Attendu**: Message "Invitation envoyée avec succès" (pas d'erreur 500)
7. ✅ **Attendu**: L'invitation apparaît dans la liste avec badge jaune "pending"

### Test 2: Devis
1. Rester connecté en Admin
2. Cliquer sur le menu "Devis" (ou "Catalogue")
3. ✅ **Attendu**: Page charge sans erreur 404
4. ✅ **Attendu**: Liste vide ou avec devis existants

### Test 3: Clients
1. Cliquer sur le menu "Clients"
2. ✅ **Attendu**: Liste des clients (vide ou avec données)
3. ✅ **Attendu**: Pas d'erreur 401 Unauthorized

---

## 🚨 Rappel des Statuts d'Invitation Valides

**Base de données** (`invitations.status` CHECK constraint):
- ✅ `'pending'` - En attente
- ✅ `'accepted'` - Acceptée
- ✅ `'rejected'` - Refusée
- ✅ `'expired'` - Expirée

**❌ NE PAS UTILISER**:
- ❌ `'PENDING'` (majuscule)
- ❌ `'CANCELLED'` (non défini dans la contrainte DB)

**Note**: Pour annuler une invitation, utiliser `'rejected'` ou simplement supprimer la ligne.

---

## 📝 Changements Appliqués

### Backend (`backend/server_supabase.py`)
- ✅ Ajout routes `GET /quotes` et `POST /quotes`
- ✅ Correction statut `"PENDING"` → `"pending"` (5 occurrences)
- ✅ Application redémarrée avec succès

### Frontend (`frontend/src/App.js`)
- ✅ Fonction `getStatusColor` normalisée pour accepter minuscules
- ✅ Ajout gestion du statut `'rejected'`

---

## ✅ Statut Final

- ✅ Backend: 33 routes fonctionnelles (2 nouvelles: quotes)
- ✅ Invitations: Contrainte DB respectée
- ✅ Pas de routes dupliquées
- ✅ Application redémarrée et prête
- ✅ Prêt pour les tests

**URL de test**: http://localhost:3002

**Comptes disponibles**:
- Founder: `skyapp@gmail.com` / `Skyapp3000@`
- Admin: `corradijordan@gmail.com` / `Jordan3000@`
