# Guide Gestion des Équipes - Skyapp Planning

## 📋 Vue d'ensemble

Le système de gestion d'équipes permet au Bureau d'assigner **de 1 à 10 collaborateurs** à chaque chef d'équipe. Cette fonctionnalité facilite l'organisation des missions et la répartition des ressources.

## 🎯 Fonctionnalités

### 1. Vue des Équipes
- **Cartes visuelles** pour chaque chef d'équipe
- **Compteur** de collaborateurs (X / 10)
- **Liste détaillée** des collaborateurs assignés
- **Alerte visuelle** quand la limite de 10 est atteinte

### 2. Assignation de Collaborateurs
- **Sélection facile** depuis une liste déroulante
- **Filtrage automatique** (seuls les techniciens disponibles apparaissent)
- **Validation** de la limite maximale (10 collaborateurs)
- **Notes optionnelles** (ex: compétences spécifiques)

### 3. Retrait de Collaborateurs
- **Retrait simple** via bouton de suppression
- **Soft delete** (données conservées en historique)
- **Confirmation** avant suppression

## 🚀 Utilisation

### Accéder à la Gestion des Équipes
1. Menu **Planning** > Onglet **Équipes (2)**
2. Vous verrez toutes vos équipes avec leurs statistiques

### Assigner un Collaborateur
1. Sur la carte du chef d'équipe souhaité, cliquez sur **"Ajouter un collaborateur"**
2. Sélectionnez le collaborateur dans la liste déroulante
3. Ajoutez des notes si nécessaire (ex: "Expert électricité")
4. Cliquez sur **"Assigner"**

### Retirer un Collaborateur
1. Dans la liste des collaborateurs d'une équipe
2. Cliquez sur l'icône **UserMinus** (rouge)
3. Confirmez la suppression

## 🔒 Règles et Contraintes

### Limites
- **Maximum 10 collaborateurs** par chef d'équipe
- Seuls les utilisateurs avec rôle **TECHNICIEN** peuvent être assignés
- Un collaborateur peut être assigné à **un seul chef d'équipe** à la fois

### Permissions
- **Bureau et Admin** : accès complet (lecture, assignation, retrait)
- **Techniciens** : pas d'accès direct à cette interface

### Gestion des Conflits
- Si vous tentez d'assigner un 11ème collaborateur → **erreur bloquante**
- Si le collaborateur sélectionné n'est pas TECHNICIEN → **erreur**
- Si le collaborateur est déjà assigné → **réactivation automatique** de l'assignation

## 📊 Statistiques en Temps Réel

Chaque carte affiche:
- **Nom et email** du chef d'équipe
- **Compteur** de collaborateurs assignés / 10
- **Badge rouge** si maximum atteint
- **Liste détaillée** avec noms, emails et avatars

## 🔗 Intégration avec le Planning

Les équipes créées ici sont utilisées dans:
1. **Création de plannings** : sélection du chef d'équipe lors de l'assignation d'une mission
2. **Vue missions** : affichage du chef d'équipe responsable
3. **Statistiques** : rapports par équipe (future fonctionnalité)

## 📡 API Endpoints Utilisés

### Backend
```
GET  /api/team-leaders-stats          → Liste chefs + stats
GET  /api/team-leaders/{id}/collaborators  → Collaborateurs d'un chef
POST /api/team-leaders/assign         → Assigner un collaborateur
DELETE /api/team-leaders/{id}/collaborators/{collab_id} → Retirer
```

### Frontend
- **Composant** : `TeamManagementComponent.js`
- **Localisation** : Menu Planning > Onglet Équipes

## 🗄️ Structure Base de Données

### Table `team_leader_collaborators`
```sql
- id (uuid)
- team_leader_id (uuid, FK → planning_team_leaders)
- collaborator_id (uuid, FK → users)
- assigned_at (timestamp)
- assigned_by (uuid, FK → users)
- is_active (boolean) → true = actif, false = retiré
- notes (text)
```

### Vue `team_leader_stats`
Consolide automatiquement :
- Nom du chef d'équipe
- Nombre de collaborateurs actifs
- Liste détaillée des collaborateurs

## ✅ Validation et Tests

### Scénarios testés
1. ✅ Assignation d'un collaborateur valide
2. ✅ Blocage à 10 collaborateurs (limite max)
3. ✅ Erreur si collaborateur non-TECHNICIEN
4. ✅ Retrait et réactivation d'un collaborateur
5. ✅ Affichage temps réel des statistiques

### Tests PowerShell
```powershell
# Obtenir le JWT depuis le navigateur (DevTools > Console)
# localStorage.getItem('token')
$token = "<VOTRE_JWT>"

# 1. Lister toutes les équipes avec stats
Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/team-leaders-stats" `
  -Headers @{ Authorization = "Bearer $token" }

# 2. Assigner un collaborateur
$body = @{
  team_leader_id = "uuid-du-chef"
  collaborator_id = "uuid-du-technicien"
  notes = "Expert plomberie"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/team-leaders/assign" `
  -Method POST -ContentType "application/json" -Body $body `
  -Headers @{ Authorization = "Bearer $token" }

# 3. Retirer un collaborateur
Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/team-leaders/<chef_id>/collaborators/<collab_id>" `
  -Method DELETE -Headers @{ Authorization = "Bearer $token" }
```

## 🎨 Interface Utilisateur

### Carte Chef d'Équipe
```
┌────────────────────────────────────┐
│ [👥] Mathieu Bonnamy              │ ← Header bleu avec icône
│      mathieu@example.com          │
├────────────────────────────────────┤
│ Collaborateurs: 7 / 10            │ ← Stats (vert si < 10, rouge si = 10)
├────────────────────────────────────┤
│ [HP] Hervé Pollu                  │ ← Liste avec avatars
│      herve@example.com      [−]   │
│ [JD] Jean Dupont                  │
│      jean@example.com       [−]   │
│ ...                               │
├────────────────────────────────────┤
│ [+ Ajouter un collaborateur]      │ ← Bouton d'action
└────────────────────────────────────┘
```

### Modal d'Assignation
- Dropdown avec liste des collaborateurs disponibles
- Champ notes (optionnel)
- Validation en temps réel
- Boutons Annuler / Assigner

## 🚨 Messages d'Erreur

| Code | Message | Cause |
|------|---------|-------|
| 400 | Maximum 10 collaborateurs par chef d'équipe atteint | Tentative d'ajout > 10 |
| 404 | Chef d'équipe introuvable | ID chef invalide |
| 404 | Collaborateur introuvable | ID collaborateur invalide |
| 400 | Le collaborateur doit avoir le rôle TECHNICIEN | Utilisateur non-technicien |
| 403 | Accès refusé | Utilisateur non Bureau/Admin |

## 📈 Prochaines Évolutions

- [ ] **Historique des assignations** : voir qui a été assigné quand
- [ ] **Notifications** : alerter chef et collaborateur lors d'une assignation
- [ ] **Capacité personnalisée** : permettre > 10 pour certains chefs
- [ ] **Compétences** : filtrer collaborateurs par compétence
- [ ] **Disponibilités** : vérifier disponibilité avant assignation
- [ ] **Statistiques** : missions complétées par équipe

## 💡 Bonnes Pratiques

1. **Organisez par compétences** : regroupez techniciens avec compétences similaires
2. **Utilisez les notes** : indiquez spécialités (électricité, plomberie, etc.)
3. **Équilibrez les équipes** : répartissez équitablement les collaborateurs
4. **Mettez à jour régulièrement** : retirez collaborateurs partis/en congé
5. **Communiquez** : informez les chefs et collaborateurs des changements

## 🔧 Maintenance

### Migration Base de Données
```bash
# Appliquer la migration (si pas déjà fait)
python apply_team_collaborators_migration.py
```

### Vérification Intégrité
```sql
-- Compter collaborateurs par chef
SELECT 
  tl.name,
  COUNT(tlc.id) FILTER (WHERE tlc.is_active = true) as active_count
FROM planning_team_leaders tl
LEFT JOIN team_leader_collaborators tlc ON tlc.team_leader_id = tl.id
GROUP BY tl.id, tl.name;

-- Trouver équipes > 10 (erreur de données)
SELECT 
  team_leader_id,
  COUNT(*) as count
FROM team_leader_collaborators
WHERE is_active = true
GROUP BY team_leader_id
HAVING COUNT(*) > 10;
```

## 📞 Support

Pour toute question ou problème :
1. Vérifiez que la migration est appliquée (`2025-11-28_team_leader_collaborators.sql`)
2. Consultez les logs backend pour les erreurs API
3. Testez via PowerShell pour isoler frontend/backend
4. Vérifiez les permissions (Bureau/Admin requis)

---

**Version** : 1.0  
**Date** : 28 novembre 2025  
**Composant** : TeamManagementComponent.js  
**Backend** : server_supabase.py (endpoints team-leaders)
