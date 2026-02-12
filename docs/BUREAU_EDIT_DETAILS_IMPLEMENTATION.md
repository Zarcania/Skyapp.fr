# 🎯 Implémentation des fonctionnalités "Voir Détails" et "Modifier" dans Bureau

## 📋 Vue d'ensemble

Cette implémentation ajoute des boutons d'action sur chaque carte de recherche dans la vue Bureau, permettant :
- **Voir les détails complets** d'une recherche (modal détaillé avec toutes les informations)
- **Modifier une recherche** (formulaire complet d'édition)

## ✅ Fonctionnalités ajoutées

### 1. **Boutons d'action sur les cartes**

Chaque carte de recherche (Terrain et Infiltration) dispose maintenant de deux boutons :

#### 🔍 Bouton "Détails"
- **Couleur** : Bleu pour Terrain, Orange pour Infiltration
- **Icône** : 👁️ Eye
- **Action** : Ouvre le modal `SearchDetailsModal`

#### ✏️ Bouton "Modifier"
- **Couleur** : Gris foncé
- **Icône** : ✏️ Edit2
- **Action** : Ouvre le modal `EditSearchModal`

### 2. **Modal de Détails (SearchDetailsModal)**

Un nouveau composant complet qui affiche :

#### Informations générales
- **Statut** : Badge coloré (SHARED, ACTIVE, DRAFT, CONVERTED)
- **Type** : Badge Terrain ou Infiltration
- **Date** : Date de création/partage formatée
- **Conversion** : Badge spécial si convertie en projet

#### Informations du client
- Nom et prénom du client (si disponible)
- Carte avec style adapté

#### Localisation
- Adresse complète
- Coordonnées GPS (latitude, longitude) avec précision à 6 décimales

#### Descriptions
- **Description principale** : Texte complet avec retours à la ligne préservés
- **Observations** : Section spéciale avec fond ambré

#### Sections personnalisées
- Affichage de toutes les sections additionnelles
- Format structuré : titre de section + champs avec labels et valeurs

#### Photos
- **Galerie** : Grid 3 colonnes avec toutes les photos
- **Lightbox** : Visualisation en plein écran
  - Navigation avec flèches gauche/droite
  - Compteur de photos (X / Total)
  - Fermeture avec bouton X ou ESC
  - Fond noir semi-transparent

#### Technicien
- Nom complet du technicien ayant créé la recherche
- Icône utilisateur

### 3. **Modal d'Édition (EditSearchModal)**

Utilise le composant existant `EditSearchModal` avec :
- Formulaire complet avec toutes les sections
- Upload/suppression de photos
- Gestion du client (récurrent/occasionnel)
- Sauvegarde automatique des modifications

### 4. **Gestion d'état**

Nouveaux états dans `BureauSearchesView` :
```javascript
const [selectedSearch, setSelectedSearch] = useState(null);
const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
```

### 5. **Handlers**

#### `handleViewDetails(search)`
- Stocke la recherche sélectionnée
- Ouvre le modal de détails

#### `handleEdit(search)`
- Stocke la recherche sélectionnée
- Ouvre le modal d'édition

#### `handleCloseDetailsModal()`
- Ferme le modal de détails
- Réinitialise la recherche sélectionnée

#### `handleCloseEditModal()`
- Ferme le modal d'édition
- Réinitialise la recherche sélectionnée
- **Recharge les recherches** pour afficher les modifications

#### `handleSaveEdit(searchId, payload)`
- Effectue la requête PUT vers `/api/searches/{searchId}`
- Appelée par `EditSearchModal` lors de la soumission
- Gestion d'erreurs avec try/catch

## 🎨 Styles et Design

### Boutons d'action
```css
/* Bouton Détails - Terrain */
bg-blue-600 hover:bg-blue-700

/* Bouton Détails - Infiltration */
bg-orange-600 hover:bg-orange-700

/* Bouton Modifier */
bg-gray-700 hover:bg-gray-800
```

### Modal Détails
- **Width** : max-w-4xl (large)
- **Height** : max-h-[90vh] (90% de la hauteur de l'écran)
- **Scroll** : overflow-y-auto
- **Header** : Gradient bleu-violet, sticky top
- **Footer** : Fond gris, sticky bottom, bouton fermer

### Lightbox
- **Z-index** : 60 (au-dessus du modal principal qui est à 50)
- **Background** : Noir à 90% d'opacité
- **Controls** : Boutons semi-transparents blancs au survol
- **Image** : max-w-full, max-h-[85vh], object-contain

## 🔧 Modifications techniques

### Fichier : `frontend/src/App.js`

#### 1. **Imports ajoutés**
```javascript
import {
  // ... existants
  ChevronLeft,    // Navigation lightbox
  ChevronRight,   // Navigation lightbox
  Edit2,          // Icône modifier
  // ... existants
} from 'lucide-react';
```

#### 2. **Nouveau composant SearchDetailsModal**
- **Ligne** : ~16770-17070 (avant BureauSearchesView)
- **Props** : `{ search, onClose }`
- **États** : photos, lightboxOpen, currentPhotoIndex
- **Effet** : Charge les photos au montage avec `/api/searches/{id}/photos`

#### 3. **BureauSearchesView modifié**
- **États ajoutés** : selectedSearch, isDetailsModalOpen, isEditModalOpen
- **Handlers ajoutés** : handleViewDetails, handleEdit, handleCloseDetailsModal, handleCloseEditModal, handleSaveEdit
- **Cartes Terrain** : Boutons d'action ajoutés après la section "Technicien"
- **Cartes Infiltration** : Boutons d'action ajoutés après la section "Technicien"
- **Rendu conditionnel** : Modals en fin de composant

#### 4. **Structure des boutons (sur chaque carte)**
```jsx
<div className="flex gap-2">
  <button onClick={() => handleViewDetails(search)} ...>
    <Eye size={16} />
    Détails
  </button>
  <button onClick={() => handleEdit(search)} ...>
    <Edit2 size={16} />
    Modifier
  </button>
</div>
```

#### 5. **Rendu des modals**
```jsx
{/* Modal Détails */}
{isDetailsModalOpen && selectedSearch && (
  <SearchDetailsModal 
    search={selectedSearch} 
    onClose={handleCloseDetailsModal}
  />
)}

{/* Modal Édition */}
{isEditModalOpen && selectedSearch && (
  <EditSearchModal 
    search={selectedSearch} 
    onSave={handleSaveEdit}
    onClose={handleCloseEditModal}
  />
)}
```

## 🚀 API Endpoints utilisés

### 1. GET `/api/searches/{id}/photos`
- **Usage** : Chargement des photos dans SearchDetailsModal
- **Headers** : Authorization Bearer token
- **Response** : Array de photos avec `{ id, photo_path, ... }`

### 2. PUT `/api/searches/{id}`
- **Usage** : Mise à jour d'une recherche via handleSaveEdit
- **Headers** : Authorization Bearer token
- **Body** : Payload avec location, description, observations, client_id, etc.
- **Response** : Recherche mise à jour

### 3. POST `/api/searches/{id}/photos`
- **Usage** : Upload de nouvelles photos (géré par EditSearchModal)
- **Headers** : Authorization Bearer token, Content-Type multipart/form-data
- **Body** : FormData avec files, section_id, is_profile

### 4. DELETE `/api/searches/{id}/photos/{filename}`
- **Usage** : Suppression de photos (géré par EditSearchModal)
- **Headers** : Authorization Bearer token

## 📱 Expérience utilisateur

### Flux "Voir Détails"
1. Utilisateur clique sur "Détails" sur une carte
2. Modal s'ouvre avec toutes les informations
3. Photos chargées automatiquement
4. Utilisateur peut :
   - Faire défiler pour voir toutes les sections
   - Cliquer sur une photo → Lightbox en plein écran
   - Naviguer entre photos avec flèches
   - Fermer avec bouton X ou clic extérieur

### Flux "Modifier"
1. Utilisateur clique sur "Modifier" sur une carte
2. Modal d'édition s'ouvre avec formulaire pré-rempli
3. Photos existantes chargées dans leurs sections
4. Utilisateur peut :
   - Modifier textes, champs personnalisés
   - Ajouter/supprimer photos
   - Changer le client (récurrent/occasionnel)
   - Sauvegarder → Requête PUT → Modal se ferme
5. Liste des recherches se recharge automatiquement

## ✨ Avantages

### Pour le Bureau
- **Visibilité complète** : Toutes les informations d'une recherche en un coup d'œil
- **Édition rapide** : Correction d'erreurs sans quitter la vue Bureau
- **Gestion photos** : Visualisation en grand format avec lightbox professionnel

### Pour les Techniciens
- Les recherches peuvent être corrigées/complétées après envoi
- Pas besoin de recréer une recherche en cas d'oubli

### Technique
- **Composants réutilisables** : SearchDetailsModal peut être utilisé ailleurs
- **EditSearchModal** déjà existant : Pas de code dupliqué
- **État centralisé** : Gestion propre avec useState
- **Rechargement automatique** : Liste à jour après chaque modification

## 🔒 Sécurité

- **Authentication** : Tous les endpoints nécessitent un token Bearer
- **Autorisation** : Seuls les utilisateurs autorisés peuvent voir/modifier
- **Validation** : Backend valide les données avant sauvegarde

## 🧪 Tests recommandés

### Test 1 : Voir détails recherche Terrain
1. Aller dans Bureau → Recherches
2. Cliquer "Détails" sur une recherche Terrain
3. Vérifier : statut, client, localisation, description, photos
4. Cliquer sur une photo → Lightbox s'ouvre
5. Naviguer avec flèches gauche/droite
6. Fermer lightbox avec X

### Test 2 : Voir détails recherche Infiltration
1. Cliquer "Détails" sur une recherche Infiltration
2. Vérifier sections personnalisées avec champs
3. Vérifier photos galerie
4. Fermer modal

### Test 3 : Modifier recherche
1. Cliquer "Modifier" sur une recherche
2. Formulaire s'ouvre avec données pré-remplies
3. Modifier description
4. Ajouter une photo
5. Cliquer "Sauvegarder"
6. Vérifier : modal se ferme, liste se recharge, modifications visibles

### Test 4 : Filtres + actions
1. Filtrer par SHARED
2. Ouvrir détails d'une recherche SHARED
3. Fermer, filtrer par CONVERTED
4. Modifier une recherche CONVERTED
5. Vérifier que les filtres restent actifs après fermeture modal

### Test 5 : Photos lightbox
1. Ouvrir détails d'une recherche avec 5+ photos
2. Cliquer sur photo 3 → Compteur affiche "3 / 5"
3. Flèche droite → Photo 4
4. Flèche gauche → Photo 3
5. Depuis photo 5, flèche droite → Retour photo 1 (cycle)
6. ESC ou X pour fermer

## 📝 Notes importantes

### Performance
- Photos chargées uniquement à l'ouverture du modal détails
- Pas de préchargement pour économiser bande passante
- Lightbox utilise les URLs Supabase directes (pas de blob local)

### Accessibilité
- Tous les boutons ont labels explicites
- Navigation clavier dans lightbox (flèches, ESC)
- Contraste couleurs respecté (WCAG AA)

### Responsive
- Modal détails : max-w-4xl adapté mobile
- Grid photos : 3 colonnes desktop, peut être ajusté avec media queries
- Lightbox : max-h-[90vh] pour laisser de l'espace sur mobile

## 🎉 Résultat final

L'interface Bureau dispose maintenant d'une gestion complète des recherches :
- ✅ Visualisation par statut (filtres)
- ✅ Visualisation par type (Terrain/Infiltration)
- ✅ Détails complets avec lightbox photos
- ✅ Édition complète avec formulaire dynamique
- ✅ Rechargement automatique après modifications

**Le bureau peut désormais gérer les recherches de A à Z sans quitter la vue !** 🚀
