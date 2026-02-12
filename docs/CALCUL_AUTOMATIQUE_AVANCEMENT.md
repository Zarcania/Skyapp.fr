# Calcul Automatique de l'Avancement des Chantiers

## 📊 Vue d'ensemble

Le système calcule désormais **automatiquement** l'avancement (progress) des chantiers en fonction des jours de planning réellement effectués.

## ✨ Fonctionnement

### Calcul du Pourcentage

Le pourcentage d'avancement est calculé selon la formule :

```
Progress (%) = (Jours complétés / Total de jours) × 100
```

Où :
- **Total de jours** = Différence entre `end_date` et `start_date` du chantier (+1)
- **Jours complétés** = Nombre de jours uniques dans `schedules` avec une date antérieure à aujourd'hui

### Exemple

Un chantier prévu sur **5 jours** (du lundi au vendredi) :
- **Lundi terminé** → Progress = 20%
- **Mardi terminé** → Progress = 40%
- **Mercredi terminé** → Progress = 60%
- **Jeudi terminé** → Progress = 80%
- **Vendredi terminé** → Progress = 100%

## 🔄 Mise à Jour Automatique

Le progress est recalculé automatiquement dans les cas suivants :

1. **Création d'un schedule** pour un chantier
2. **Modification d'un schedule** existant
3. **Suppression d'un schedule**
4. **Modification des dates** du chantier (`start_date` ou `end_date`)

## 🛠️ Implémentation Technique

### Backend (`server_supabase.py`)

#### Fonction de Calcul

```python
async def calculate_worksite_progress(worksite_id: str, company_id: str) -> int
```

Cette fonction :
- Récupère les dates du chantier
- Compte les jours de planning passés
- Retourne un pourcentage entre 0 et 100

#### Endpoints Modifiés

- `POST /schedules` - Recalcule après création
- `PUT /schedules/{schedule_id}` - Recalcule après modification
- `DELETE /schedules/{schedule_id}` - Recalcule après suppression
- `PUT /worksites/{worksite_id}` - Recalcule si dates modifiées

#### Nouvel Endpoint

```
POST /worksites/{worksite_id}/recalculate-progress
```

Permet de forcer un recalcul manuel du progress.

### Frontend (`App.js`)

Le champ "Avancement (%)" est maintenant **en lecture seule** :
- Fond gris (`bg-gray-100`)
- Curseur `not-allowed`
- Attribut `readOnly`
- Message explicatif : "📊 Calculé automatiquement à partir des jours de planning"

## 📝 Notes Importantes

1. **Dates requises** : Le chantier doit avoir `start_date` et `end_date` définis
2. **Plannings requis** : Des schedules doivent être créés avec `worksite_id` correspondant
3. **Date passée** : Seules les dates de schedules **antérieures à aujourd'hui** sont comptées
4. **Jours uniques** : Si plusieurs schedules existent pour la même date, ils comptent comme un seul jour

## 🚀 Utilisation

### Pour l'utilisateur

1. Créez un chantier avec des dates de début et fin
2. Ajoutez des plannings (schedules) pour ce chantier
3. Le progress s'incrémente automatiquement au fil des jours

### Vérification

Pour vérifier que le calcul fonctionne :

```bash
# Dans les logs backend, cherchez :
📊 Chantier {id}: X/Y jours = Z%
```

## 🔍 Dépannage

Si le progress reste à 0% :

1. Vérifiez que le chantier a des dates (`start_date`, `end_date`)
2. Vérifiez que des schedules existent avec `worksite_id` correct
3. Vérifiez que les dates des schedules sont dans le passé
4. Utilisez l'endpoint de recalcul manuel :
   ```
   POST /worksites/{worksite_id}/recalculate-progress
   ```

## 📊 Logs de Débogage

Le système log toutes les opérations avec des emojis :
- 📊 = Calcul de progress
- ✅ = Succès
- ❌ = Erreur

Exemple de logs :
```
📊 Chantier abc-123: 2/5 jours = 40%
✅ Progress chantier abc-123 mis à jour: 40%
```
