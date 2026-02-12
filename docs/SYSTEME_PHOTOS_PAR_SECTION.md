# 📸 Système de Photos par Section

## 🎯 Vue d'ensemble

Le système de photos par section permet d'associer des photos **spécifiquement** à chaque section du formulaire de recherche (Description, Observations, sections personnalisées).

## ✅ Fonctionnalités

### 1. **Photo de Profil**
- Une photo spéciale en haut du formulaire
- Design moderne avec gradient et effet de flou
- Section_id = `"profile"`
- Marquée avec `is_profile: true`

### 2. **Photos par Section**
- Chaque section (Description, Observations, sections personnalisées) peut avoir ses propres photos
- Les photos sont **liées** à leur section via `section_id`
- Affichage en grille avec aperçu et possibilité de supprimer

### 3. **Synchronisation Complète**
- Les photos ajoutées sont visibles :
  - ✅ Dans "Brouillon en attente" (bouton en bas de page)
  - ✅ Dans "Mes Recherches" > "Modifier"
  - ✅ Dans les sections où elles ont été ajoutées

## 🔧 Architecture Technique

### Backend (`server_supabase.py`)

**Endpoint d'upload modifié :**
```python
@router.post("/searches/{search_id}/photos")
async def upload_search_photos(
    search_id: str,
    files: List[UploadFile] = File(...),
    section_id: str = Form(None),  # ✨ NOUVEAU
    is_profile: str = Form(None),
):
    # ...
    photo_info = {
        "filename": unique_filename,
        "section_id": section_id,  # ✨ Lier la photo à sa section
        "url": signed_url.get('signedURL'),
        "is_profile": is_profile == "true",
        "uploaded_at": datetime.utcnow().isoformat(),
        "storage_path": storage_path,
        "original_name": original_name
    }
```

**Structure de données :**
```json
{
  "searches": {
    "photos": [
      {
        "url": "https://wursductnatclwrqvgua.supabase.co/storage/v1/...",
        "filename": "8bcd39c2-7699-4754-8606-8a35b21e02da.png",
        "section_id": "description",  // ✨ Clé de liaison
        "is_profile": false,
        "uploaded_at": "2025-01-14T10:30:00.000Z",
        "storage_path": "db319156-.../file.png",
        "original_name": "photo_facade.jpg"
      }
    ]
  }
}
```

### Frontend (`App.js`)

#### **1. Upload avec section_id**

Dans `autoSaveDraft` :
```javascript
// A. Photo de profil
if (profilePhoto && !savedPhotos.some(p => p.is_profile)) {
  const formData = new FormData();
  formData.append('files', profilePhoto);
  formData.append('is_profile', 'true');
  formData.append('section_id', 'profile'); // ✨
  // ... upload
}

// B. Photos de chaque section
for (const section of sections) {
  if (section.photos && section.photos.length > 0) {
    const unsavedPhotos = section.photos.filter(photo => photo.file);
    
    if (unsavedPhotos.length > 0) {
      const formData = new FormData();
      unsavedPhotos.forEach(photo => {
        formData.append('files', photo.file);
      });
      formData.append('section_id', section.id); // ✨
      // ... upload
    }
  }
}
```

#### **2. Chargement et distribution**

Dans `useEffect` (chargement du draft) :
```javascript
// Distribuer les photos dans leurs sections respectives
const sectionsWithPhotos = baseSections.map(section => {
  // Filtrer les photos qui appartiennent à cette section
  const sectionPhotos = existingDraft.photos
    .filter(p => p.section_id === section.id && !p.is_profile)
    .map(p => ({
      url: p.url || `${API}/searches/${existingDraft.id}/photos/${p.filename}`,
      filename: p.filename,
      name: p.original_name || p.filename
    }));

  if (sectionPhotos.length > 0) {
    return { ...section, photos: sectionPhotos };
  }
  return section;
});

setSections(sectionsWithPhotos);
```

Dans `EditSearchModal` (même logique) :
```javascript
if (search.photos && Array.isArray(search.photos)) {
  // A. Charger la photo de profil
  const profilePhotoData = search.photos.find(p => p.is_profile);
  if (profilePhotoData) {
    setProfilePhotoPreview(profilePhotoData.url);
  }

  // B. Distribuer les photos dans leurs sections
  setSections(prevSections => prevSections.map(section => {
    const sectionPhotos = search.photos
      .filter(p => p.section_id === section.id && !p.is_profile)
      .map(p => ({
        url: p.url,
        filename: p.filename,
        name: p.original_name || p.filename
      }));

    if (sectionPhotos.length > 0) {
      return { ...section, photos: sectionPhotos };
    }
    return section;
  }));
}
```

## 🧪 Test Complet

### Scénario de test

1. **Créer une nouvelle recherche**
   ```
   - Nom: "Test Photos"
   - Prénom: "Sections"
   - Adresse: "123 Rue Test"
   ```

2. **Ajouter des photos**
   ```
   - Photo de profil: 1 photo en haut
   - Section "Description": 3 photos
   - Section "Observations": 2 photos
   ```

3. **Auto-save**
   - Changer d'onglet (clic sur "Mes Recherches")
   - Vérifier que les photos sont uploadées

4. **Vérifier "Brouillon en attente"**
   - Cliquer sur le bouton en bas de page
   - ✅ Vérifier que les photos sont dans les bonnes sections

5. **Vérifier "Modifier"**
   - Aller dans "Mes Recherches"
   - Cliquer "Modifier" sur la recherche
   - ✅ Vérifier que les photos sont chargées dans les bonnes sections

6. **Ajouter plus de photos**
   - Dans le modal "Modifier", ajouter 1 photo à Description
   - Sauvegarder
   - Réouvrir le modal
   - ✅ Vérifier que la nouvelle photo est présente

## 🗂️ Structure de Données

### Photos sans section_id (anciennes)
```json
{
  "url": "...",
  "filename": "...",
  "is_profile": false
}
```
Ces photos ne sont pas distribuées aux sections.

### Photos avec section_id (nouvelles)
```json
{
  "url": "...",
  "filename": "...",
  "section_id": "description",  // ✨ Permet la distribution
  "is_profile": false
}
```

## 🎨 Interface Utilisateur

### Photo de Profil
```
┌────────────────────────────────────┐
│  📸 Photo de Profil                 │
│  ┌──────────────────────────┐      │
│  │                          │      │
│  │     [APERÇU PHOTO]       │      │
│  │   gradient + blur effect │      │
│  │                          │      │
│  └──────────────────────────┘      │
│  [Modifier la photo]               │
└────────────────────────────────────┘
```

### Section avec Photos
```
┌────────────────────────────────────┐
│  📝 Description                     │
│  ─────────────────────────────────│
│  [Zone de texte...]               │
│                                    │
│  📸 Photos de cette section        │
│  ┌─────┐ ┌─────┐ ┌─────┐          │
│  │ IMG │ │ IMG │ │ IMG │          │
│  └─────┘ └─────┘ └─────┘          │
│  [Ajouter des photos...]           │
└────────────────────────────────────┘
```

## 📊 Workflow Complet

```
1. Utilisateur ajoute photos → handleSectionPhotos
   ↓
2. Photos stockées localement avec section.id
   ↓
3. Auto-save déclenché (changement tab) → autoSaveDraft
   ↓
4. Upload section par section avec section_id
   ↓
5. Backend stocke dans Supabase Storage
   ↓
6. Backend enregistre metadata avec section_id
   ↓
7. Chargement ultérieur → Filtrage par section_id
   ↓
8. Photos affichées dans leurs sections respectives
```

## 🔍 Débogage

### Vérifier section_id dans la base
```sql
SELECT id, nom, prenom, photos 
FROM searches 
WHERE id = 'votre-draft-id';
```

### Vérifier les photos uploadées
```javascript
console.log('Photos uploadées:', uploadResponse.data.photos);
// Doit afficher section_id pour chaque photo
```

### Vérifier la distribution au chargement
```javascript
console.log('Sections avec photos:', sections);
// Chaque section doit avoir son array photos
```

## ✅ Avantages

1. **Organisation** : Photos groupées par section logique
2. **Flexibilité** : Supporte sections personnalisées
3. **Synchronisation** : Cohérence entre Draft/Modifier/Brouillon
4. **Performance** : Upload optimisé section par section
5. **UX** : Interface claire et intuitive

## 📝 Notes Importantes

- ⚠️ Les photos **sans** `section_id` ne seront pas distribuées aux sections
- ✅ La photo de profil utilise `section_id: "profile"` + `is_profile: true`
- ✅ Les URLs sont signées pour 1 an (31536000 secondes)
- ✅ Limite de 5MB par photo
- ✅ Formats acceptés : JPEG, PNG, WebP
