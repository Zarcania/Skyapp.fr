# 📋 Modifications - Système de Photos par Section

## ✅ Modifications Complétées

### 1. Backend - `server_supabase.py`

#### Modification de l'endpoint d'upload
**Fichier:** `backend/server_supabase.py`  
**Ligne:** ~1090

**Avant:**
```python
async def upload_search_photos(
    search_id: str,
    files: List[UploadFile] = File(...),
    is_profile: str = Form(None),
):
```

**Après:**
```python
async def upload_search_photos(
    search_id: str,
    files: List[UploadFile] = File(...),
    section_id: str = Form(None),  # ✨ NOUVEAU
    is_profile: str = Form(None),
):
```

#### Ajout de section_id au metadata
**Ligne:** ~1135

**Avant:**
```python
photo_info = {
    "filename": unique_filename,
    "url": signed_url.get('signedURL'),
    "uploaded_at": datetime.utcnow().isoformat()
}
```

**Après:**
```python
photo_info = {
    "filename": unique_filename,
    "section_id": section_id,  # ✨ NOUVEAU - Lier la photo à sa section
    "url": signed_url.get('signedURL'),
    "uploaded_at": datetime.utcnow().isoformat()
}
```

---

### 2. Frontend - `App.js`

#### A. Modification de l'auto-save pour envoyer section_id

**Fichier:** `frontend/src/App.js`  
**Ligne:** ~3608

**Avant:** Upload global de toutes les photos ensemble

**Après:** Upload section par section avec section_id

```javascript
// A. Uploader la photo de profil si présente
if (profilePhoto && !savedPhotos.some(p => p.is_profile)) {
  const formData = new FormData();
  formData.append('files', profilePhoto);
  formData.append('is_profile', 'true');
  formData.append('section_id', 'profile'); // ✨ NOUVEAU
  // ... upload
}

// B. Uploader les photos de chaque section
for (const section of sections) {
  if (section.photos && section.photos.length > 0) {
    const unsavedPhotos = section.photos.filter(photo => photo.file);
    
    if (unsavedPhotos.length > 0) {
      const formData = new FormData();
      unsavedPhotos.forEach(photo => {
        formData.append('files', photo.file);
      });
      formData.append('section_id', section.id); // ✨ NOUVEAU
      // ... upload
    }
  }
}
```

#### B. Distribution des photos au chargement

**Fichier:** `frontend/src/App.js`  
**Ligne:** ~4100

**Avant:** Photos chargées globalement dans `savedPhotos`

**Après:** Photos distribuées dans leurs sections respectives

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

#### C. Distribution dans EditSearchModal

**Fichier:** `frontend/src/App.js`  
**Ligne:** ~4860

**Avant:** TODO pour distribuer les photos

**Après:** Distribution complète avec section_id

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

#### D. Upload des photos dans EditSearchModal

**Fichier:** `frontend/src/App.js`  
**Ligne:** ~4988

**Avant:** Sauvegarde uniquement les données textuelles

**Après:** Upload des nouvelles photos avec section_id

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // ... construction du payload

  try {
    // 1. Sauvegarder d'abord les données textuelles
    await onSave(search.id, payload);

    // 2. Uploader les nouvelles photos de chaque section
    const token = localStorage.getItem('token');

    // A. Photo de profil
    if (profilePhoto) {
      const formData = new FormData();
      formData.append('files', profilePhoto);
      formData.append('is_profile', 'true');
      formData.append('section_id', 'profile');
      await axios.post(`${API}/searches/${search.id}/photos`, formData, ...);
    }

    // B. Photos de chaque section
    for (const section of sections) {
      if (section.photos && section.photos.length > 0) {
        const newPhotos = section.photos.filter(photo => photo.file);
        
        if (newPhotos.length > 0) {
          const formData = new FormData();
          newPhotos.forEach(photo => formData.append('files', photo.file));
          formData.append('section_id', section.id); // ✨
          await axios.post(`${API}/searches/${search.id}/photos`, formData, ...);
        }
      }
    }

    alert('Recherche et photos mises à jour avec succès !');
  } catch (error) {
    // ... gestion d'erreur
  }
};
```

---

## 🎯 Impact des Modifications

### Base de données
**Avant:**
```json
{
  "photos": [
    {
      "url": "...",
      "filename": "...",
      "is_profile": false
    }
  ]
}
```

**Après:**
```json
{
  "photos": [
    {
      "url": "...",
      "filename": "...",
      "section_id": "description",  // ✨ NOUVEAU
      "is_profile": false
    }
  ]
}
```

### Workflow Utilisateur

#### Avant
1. Photos ajoutées → Toutes dans une seule section globale
2. Chargement → Photos dans `savedPhotos` global
3. Pas de lien avec les sections spécifiques
4. ❌ Photos non visibles dans leurs sections d'origine

#### Après
1. Photos ajoutées → Liées à leur section (Description, Observations, etc.)
2. Upload → Chaque photo enregistrée avec son `section_id`
3. Chargement → Photos distribuées automatiquement dans leurs sections
4. ✅ Synchronisation complète : Brouillon / Modifier / Nouvelle Recherche

---

## 🧪 Test de Validation

### Scénario de test complet

1. **Créer une nouvelle recherche**
   ```
   Nom: "Dupont"
   Prénom: "Marie"
   Adresse: "10 Rue de la Paix, Paris"
   ```

2. **Ajouter des photos**
   - Photo de profil: 1 photo (façade du bâtiment)
   - Section Description: 3 photos (extérieur, entrée, boîte aux lettres)
   - Section Observations: 2 photos (escalier, ascenseur)

3. **Auto-save**
   - Cliquer sur l'onglet "Mes Recherches" → Auto-save déclenché

4. **Vérifier "Brouillon en attente"**
   - Cliquer sur le bouton "1 brouillon(s) en attente"
   - ✅ Vérifier : Photo de profil affichée en haut
   - ✅ Vérifier : 3 photos dans Description
   - ✅ Vérifier : 2 photos dans Observations

5. **Publier le brouillon**
   - Cliquer "Publier"
   - Vérifier que la recherche apparaît dans "Mes Recherches"

6. **Modifier la recherche**
   - Dans "Mes Recherches", cliquer "Modifier" sur la recherche
   - ✅ Vérifier : Photo de profil chargée
   - ✅ Vérifier : 3 photos dans Description
   - ✅ Vérifier : 2 photos dans Observations

7. **Ajouter plus de photos**
   - Ajouter 1 photo dans Description
   - Ajouter 1 photo dans Observations
   - Cliquer "Enregistrer"

8. **Réouvrir le modal**
   - Cliquer à nouveau "Modifier"
   - ✅ Vérifier : 4 photos dans Description (3 + 1)
   - ✅ Vérifier : 3 photos dans Observations (2 + 1)

---

## 📊 Résumé des Changements

| Composant | Fichier | Ligne | Modification |
|-----------|---------|-------|--------------|
| Backend | `server_supabase.py` | ~1090 | Ajout paramètre `section_id` |
| Backend | `server_supabase.py` | ~1135 | Stockage `section_id` dans metadata |
| Frontend | `App.js` | ~3608 | Upload section par section |
| Frontend | `App.js` | ~4100 | Distribution photos au chargement |
| Frontend | `App.js` | ~4860 | Distribution dans EditSearchModal |
| Frontend | `App.js` | ~4988 | Upload photos dans EditSearchModal |

---

## 🚀 Résultat Final

### ✅ Fonctionnalités Complètes

1. **Photo de profil** : Design moderne avec gradient
2. **Photos par section** : Chaque section a ses propres photos
3. **Auto-save intelligent** : Upload section par section
4. **Synchronisation totale** : 
   - Nouvelle Recherche ✅
   - Brouillon en attente ✅
   - Modifier ✅
5. **Persistance** : Photos liées aux sections dans la base de données

### 🎉 Workflow Utilisateur Final

```
Utilisateur ajoute photos
    ↓
Photos stockées avec section_id
    ↓
Auto-save upload vers Supabase
    ↓
Photos visibles partout :
    • Brouillon en attente
    • Modifier
    • Dans leurs sections d'origine
```

---

## 📝 Notes Importantes

- ⚠️ Les **anciennes photos** (sans `section_id`) ne seront pas distribuées
- ✅ Les **nouvelles photos** auront automatiquement leur `section_id`
- ✅ La photo de profil utilise `section_id: "profile"` + `is_profile: true`
- ✅ Compatible avec les sections personnalisées créées dynamiquement
- ✅ Supporte la suppression de photos par section
