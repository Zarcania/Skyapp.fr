# Documentation API Planning - Skyapp MVP

## Architecture & Modèle de données

**Tables utilisées (existantes dans Supabase)**
- `schedules`: plannings/missions (date, time, end_time, worksite_id, collaborator_id, status)
- `worksites`: chantiers avec détails complets
- `planning_team_leaders`: chefs d'équipe
- `users`: techniciens et leurs rôles

**Règles métier**
- Bureau/Admin: contrôle total (CRUD schedules)
- Technicien: lecture seule via `/technicians/{id}/missions`
- Détection automatique de conflits horaires par technicien
- Statuts: `scheduled`, `in_progress`, `completed`, `cancelled`

## Endpoints Planning

### 1. Liste des chantiers validés (planifiables)
```http
GET /api/worksites/validated
Authorization: Bearer <JWT>
```
**Retour**: Liste des `worksites` avec status IN (`PLANNED`, `IN_PROGRESS`) + infos client.

### 2. Liste des chefs d'équipe
```http
GET /api/team-leaders
Authorization: Bearer <JWT>
```
**Retour**: Liste des chefs depuis `planning_team_leaders`.

### 3. Liste des plannings (Bureau)
```http
GET /api/schedules?from=2025-11-28&to=2025-12-05&collaborator_id=<UUID>
Authorization: Bearer <JWT>
```
**Paramètres**:
- `from` (date): date début (optionnel)
- `to` (date): date fin (optionnel)
- `collaborator_id` (UUID): filtrer par technicien (optionnel)

**Retour**: Liste des schedules avec détails `worksites` et `users`.

### 4. Créer un planning (Bureau)
```http
POST /api/schedules
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "worksite_id": "uuid-du-chantier",
  "collaborator_id": "uuid-du-technicien",
  "team_leader_id": "uuid-du-chef",  // optionnel
  "date": "2025-11-29",
  "time": "08:00",
  "end_time": "17:00",  // optionnel, calculé si absent
  "hours": 8,
  "shift": "day",
  "description": "Installation complète",
  "status": "scheduled"
}
```
**Retour**: Planning créé avec `id`.
**Erreurs**:
- 409 Conflict: chevauchement horaire pour ce technicien

### 5. Modifier un planning (Bureau)
```http
PATCH /api/schedules/{schedule_id}
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "date": "2025-11-30",
  "time": "09:00",
  "collaborator_id": "autre-uuid-technicien"
}
```
**Retour**: Planning mis à jour.
**Erreurs**:
- 404: planning introuvable
- 409: conflit horaire

### 6. Supprimer un planning (Bureau)
```http
DELETE /api/schedules/{schedule_id}
Authorization: Bearer <JWT>
```
**Retour**: `{"deleted": true}`

### 7. Mes Missions (Technicien lecture seule)
```http
GET /api/technicians/{technician_id}/missions?from=2025-11-28&to=2025-12-05&status=scheduled
Authorization: Bearer <JWT>
```
**Paramètres**:
- `from`, `to` (dates): fenêtre temporelle
- `status`: filtrer par statut (optionnel)

**Retour**: Liste des missions du technicien avec infos `worksites`.
**Sécurité**: Le technicien ne peut voir que ses propres missions (sauf Bureau/Admin).

## Tests PowerShell

```powershell
# 1. Obtenir JWT depuis le navigateur
# Ouvrir DevTools > Console:
# JSON.parse(localStorage.getItem('sb-wursductnatclwrqvgua-auth-token'))?.access_token
$token = "<VOTRE_JWT>"

# 2. Lister chantiers validés
Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/worksites/validated" `
  -Headers @{ Authorization = "Bearer $token" } -Method GET

# 3. Créer un planning
$body = @{
  worksite_id = "<UUID_CHANTIER>"
  collaborator_id = "<UUID_TECHNICIEN>"
  date = "2025-11-30"
  time = "08:00"
  end_time = "16:00"
  hours = 8
  description = "Installation"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/schedules" `
  -Method POST -ContentType "application/json" -Body $body `
  -Headers @{ Authorization = "Bearer $token" }

# 4. Lister plannings d'un technicien
Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/schedules?collaborator_id=<UUID>&from=2025-11-28&to=2025-12-05" `
  -Headers @{ Authorization = "Bearer $token" } -Method GET

# 5. Mes missions (vue technicien)
Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/technicians/<UUID_TECH>/missions?from=2025-11-28" `
  -Headers @{ Authorization = "Bearer $token" } -Method GET
```

## Règles de conflits

Le système détecte automatiquement les chevauchements:
- Même technicien (`collaborator_id`)
- Même date
- Intervalles qui se chevauchent: `existing_start < new_end ET existing_end > new_start`

Réponse 409 Conflict avec message explicite.

## 8. Gestion des Équipes (Assignation collaborateurs → chefs d'équipe)

### Liste chefs d'équipe avec statistiques
```http
GET /api/team-leaders-stats
Authorization: Bearer <JWT>
```
**Retour**: Liste des chefs d'équipe avec `collaborators_count` et tableau `collaborators[]`.

### Collaborateurs d'un chef d'équipe
```http
GET /api/team-leaders/{team_leader_id}/collaborators
Authorization: Bearer <JWT>
```
**Retour**: Liste des collaborateurs actifs assignés à ce chef.

### Assigner un collaborateur
```http
POST /api/team-leaders/assign
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "team_leader_id": "uuid-du-chef",
  "collaborator_id": "uuid-du-technicien",
  "notes": "Spécialiste électricité"  // optionnel
}
```
**Retour**: Assignation créée.
**Erreurs**:
- 400: Maximum 10 collaborateurs atteint
- 404: Chef ou collaborateur introuvable
- 400: Le collaborateur doit être TECHNICIEN

### Retirer un collaborateur
```http
DELETE /api/team-leaders/{team_leader_id}/collaborators/{collaborator_id}
Authorization: Bearer <JWT>
```
**Retour**: `{"removed": true}`
**Note**: Soft delete (is_active = false), pas de suppression définitive.

## Tests PowerShell - Équipes

```powershell
$token = "<VOTRE_JWT>"

# 1. Lister chefs avec stats
Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/team-leaders-stats" `
  -Headers @{ Authorization = "Bearer $token" } -Method GET

# 2. Assigner un collaborateur
$body = @{
  team_leader_id = "<UUID_CHEF>"
  collaborator_id = "<UUID_TECHNICIEN>"
  notes = "Expert plomberie"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/team-leaders/assign" `
  -Method POST -ContentType "application/json" -Body $body `
  -Headers @{ Authorization = "Bearer $token" }

# 3. Retirer un collaborateur
Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/team-leaders/<UUID_CHEF>/collaborators/<UUID_COLLAB>" `
  -Headers @{ Authorization = "Bearer $token" } -Method DELETE
```

## Prochaines étapes

**Interfaces Frontend créées**:
1. ✅ **Bureau**: Vue calendrier hebdomadaire/journalière avec drag-and-drop (BureauPlanningComponent.js)
2. ✅ **Technicien**: Liste "Mes Missions" lecture seule avec filtres date/statut (MesMissionsComponent.js)
3. ✅ **Équipes**: Gestion assignation collaborateurs aux chefs (TeamManagementComponent.js)

**Améliorations V2**:
- Notifications: Email/in-app lors assignation/modification
- Disponibilités/congés techniciens
- Ordres de chantier détaillés (PDF)
- Photos "avant/après" par mission
- Temps réel (WebSocket) pour synchro instantanée
