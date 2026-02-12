# Ajustement Automatique des Schedules lors du Changement de Dates

## 🔄 Vue d'ensemble

Lorsque vous modifiez les dates (`start_date` ou `end_date`) d'un chantier, **tous les schedules associés sont automatiquement ajustés** pour correspondre aux nouvelles dates.

## ✨ Fonctionnement

### Calcul du Décalage

Quand les dates du chantier changent :

1. **Calcul du décalage** : `décalage = nouvelle_date_début - ancienne_date_début`
2. **Application aux schedules** : Chaque schedule est déplacé du même nombre de jours
3. **Vérification des limites** : Les schedules restent dans la plage du chantier

### Exemple Concret

**Situation initiale :**
- Chantier : du 28/01/2026 au 30/01/2026 (3 jours)
- Schedules existants : 28/01, 29/01, 30/01

**Modification des dates :**
- Nouvelles dates : du 31/01/2026 au 03/02/2026
- Décalage : +3 jours

**Résultat automatique :**
- Les schedules sont déplacés : 31/01, 01/02, 02/02

## 🛠️ Implémentation Technique

### Backend (`server_supabase.py`)

#### Fonction d'Ajustement

Dans `PUT /worksites/{worksite_id}`, la logique suivante s'exécute automatiquement :

```python
# 1. Calculer le décalage de dates
date_shift = (new_start_date - old_start_date).days

# 2. Pour chaque schedule associé
for schedule in schedules:
    # Calculer la nouvelle date
    new_schedule_date = schedule_date + timedelta(days=date_shift)
    
    # S'assurer que la date reste dans la plage
    if new_schedule_date < new_start_date:
        new_schedule_date = new_start_date
    elif new_schedule_date > new_end_date:
        new_schedule_date = new_end_date
    
    # Mettre à jour le schedule
    update_schedule(schedule_id, new_schedule_date)
```

#### Champs Mis à Jour

Pour chaque schedule ajusté :
- `date` : Nouvelle date calculée
- `start_datetime` : Ajusté avec le même décalage
- `end_datetime` : Ajusté avec le même décalage

### Logs de Débogage

Le système enregistre tous les ajustements dans les logs :

```
🔄 Ajustement de 3 schedule(s) pour les nouvelles dates
  ✅ Schedule abc-123 ajusté: 2026-01-28 → 2026-01-31
  ✅ Schedule def-456 ajusté: 2026-01-29 → 2026-02-01
  ✅ Schedule ghi-789 ajusté: 2026-01-30 → 2026-02-02
```

## 📊 Impact sur le Progress

Après l'ajustement des schedules, le **progress est automatiquement recalculé** :

1. Les schedules sont ajustés aux nouvelles dates
2. Le système compte combien de jours sont passés
3. Le pourcentage d'avancement est mis à jour

### Exemple

**Avant modification** (dates 28-30/01) :
- Aujourd'hui : 01/02
- Jours complétés : 3/3 (tous passés)
- Progress : 100%

**Après modification** (dates 31/01-03/02) :
- Aujourd'hui : 01/02
- Jours complétés : 1/4 (31/01 passé, 01-03/02 futurs)
- Progress : 25%

## 🔍 Cas Particuliers

### Réduction de la Durée

Si le chantier devient plus court, les schedules en dehors de la plage sont **déplacés au dernier jour** :

**Avant :** Chantier du 01/02 au 05/02 (5 jours)
**Après :** Chantier du 01/02 au 02/02 (2 jours)
**Résultat :** Schedules du 03, 04, 05 → Tous le 02/02

### Augmentation de la Durée

Si le chantier devient plus long, les schedules existants sont **répartis sur la même position relative** :

**Avant :** Chantier du 01/02 au 02/02 (2 jours)
**Après :** Chantier du 01/02 au 05/02 (5 jours)
**Résultat :** Schedules restent au 01 et 02, les jours 03-05 n'ont pas de schedules

## 🚀 Utilisation

### Pour l'utilisateur

1. Allez dans **Chantiers** → Sélectionnez un chantier
2. Cliquez sur **Modifier**
3. Changez les dates de début ou de fin
4. Cliquez sur **Enregistrer**
5. ✅ Les schedules sont automatiquement ajustés !

### Vérification

Pour vérifier que les schedules ont été ajustés :

1. Allez dans **Mes Missions** (pour les techniciens)
2. Ou **Planning** (pour les admins/bureau)
3. Vérifiez que les dates des missions correspondent aux nouvelles dates du chantier

## ⚠️ Notes Importantes

1. **Tous les schedules sont ajustés** : Impossible d'ajuster seulement certains schedules
2. **Les heures sont préservées** : Seule la date change, l'heure de début/fin reste identique
3. **Les collaborateurs restent assignés** : L'ajustement ne change pas les assignations
4. **Pas de perte de données** : Aucun schedule n'est supprimé, ils sont seulement déplacés

## 🔧 Dépannage

### Les schedules ne se mettent pas à jour

1. Vérifiez les logs backend pour voir les messages 🔄
2. Vérifiez que les schedules ont bien `worksite_id` correspondant
3. Actualisez la page "Mes Missions" ou "Planning" pour voir les changements

### Les dates semblent incorrectes

1. Vérifiez les fuseaux horaires dans les logs
2. Vérifiez que les dates du chantier sont correctes
3. Utilisez les logs pour voir le calcul du décalage :
   ```
   🔄 Ajustement de X schedule(s) pour les nouvelles dates
   ```

## 💡 Bonnes Pratiques

1. **Planifiez à l'avance** : Essayez de définir les dates correctes dès le début
2. **Vérifiez après modification** : Consultez le planning pour confirmer les changements
3. **Informez l'équipe** : Prévenez les techniciens si les dates changent significativement

## 🔮 Améliorations Futures

- Notification automatique aux techniciens quand les dates changent
- Option pour choisir de ne pas ajuster certains schedules
- Historique des modifications de dates
- Prévisualisation des ajustements avant validation
