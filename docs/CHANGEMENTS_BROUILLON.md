# Changements: Gestion des Brouillons

## Date: 12 novembre 2025

## Objectif
Empêcher la création automatique de brouillons et donner le contrôle total à l'utilisateur.

## Modifications apportées

### ✅ Comportement AVANT
- **Auto-save activé** : Sauvegarde automatique après 1,5 secondes d'inactivité
- **Création de brouillon** : Déclenchée dès qu'un champ était modifié
- **Pas de contrôle utilisateur** : Brouillons créés automatiquement

### ✅ Comportement APRÈS

#### 1. Création de brouillon
- ❌ **Pas de création automatique** au chargement de "Nouvelle recherche"
- ✅ **Création uniquement** si la 1ère section (Nom + Prénom + Adresse) est **complète**
- ✅ **Création déclenchée** par :
  - Clic sur le bouton "Sauvegarder le brouillon"
  - Fermeture de la page (si 1ère section complète)
  - Clic sur "Finaliser la recherche"

#### 2. Sauvegarde
- ❌ **Auto-save désactivé** : Plus de sauvegarde automatique toutes les 1,5 secondes
- ✅ **Sauvegarde manuelle** via le nouveau bouton "Sauvegarder le brouillon"
- ✅ **Sauvegarde avant fermeture** : Si la 1ère section est complète et qu'il y a des modifications non sauvegardées

#### 3. Interface utilisateur
- ✅ **Nouveau bouton** : "Sauvegarder le brouillon" (bleu)
  - Désactivé si la 1ère section n'est pas complète
  - Affiche "Sauvegarde en cours..." pendant l'enregistrement
- ✅ **Bouton existant renommé** : "Finaliser la recherche" (au lieu de "Enregistrer la recherche")
  - Toujours fonctionnel pour marquer la recherche comme ACTIVE

## Fichiers modifiés

### `frontend/src/App.js`

#### Ligne ~3639 : Auto-save désactivé
```javascript
// AVANT : Auto-save toutes les 1,5 secondes
useEffect(() => {
  autoSaveTimer.current = setTimeout(() => {
    autoSaveDraft().catch(...);
  }, 1500);
}, [sections]);

// APRÈS : Sauvegarde uniquement avant fermeture de page
useEffect(() => {
  const handleBeforeUnload = (e) => {
    if (isFirstSectionComplete && hasPendingChanges) {
      autoSaveDraft({ forceSave: true });
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
}, [sections]);
```

#### Ligne ~4364 : Ajout bouton "Sauvegarder le brouillon"
```javascript
<Button 
  type="button"
  onClick={() => autoSaveDraft({ forceSave: true })}
  disabled={!isFirstSectionComplete}
  className="w-full bg-blue-600..."
>
  <Save className="h-5 w-5" />
  <span>Sauvegarder le brouillon</span>
</Button>
```

## Avantages

✅ **Contrôle total** : L'utilisateur décide quand sauvegarder  
✅ **Pas de pollution** : Pas de brouillons vides ou incomplets dans la base  
✅ **Performance** : Moins de requêtes HTTP inutiles  
✅ **Sécurité** : Sauvegarde automatique avant fermeture (si section complète)  
✅ **UX claire** : Deux boutons distincts avec des rôles bien définis  

## Tests à effectuer

1. ✅ Ouvrir "Nouvelle recherche" → Vérifier qu'aucun brouillon n'est créé
2. ✅ Remplir seulement Nom → Bouton "Sauvegarder" désactivé
3. ✅ Remplir Nom + Prénom + Adresse → Bouton "Sauvegarder" activé
4. ✅ Cliquer sur "Sauvegarder le brouillon" → Brouillon créé en base
5. ✅ Fermer la page sans sauvegarder → Popup de confirmation
6. ✅ Recharger la page → Brouillon chargé correctement
7. ✅ Ajouter des photos → Photos sauvegardées avec le brouillon
8. ✅ Cliquer sur "Finaliser la recherche" → Recherche marquée ACTIVE

## Notes importantes

- La validation de la 1ère section (Nom + Prénom + Adresse) reste **obligatoire** pour créer un brouillon
- L'auto-save avant fermeture de page ne fonctionne que si la 1ère section est complète
- Les photos sont uploadées lors de la sauvegarde du brouillon (manuelle ou avant fermeture)
