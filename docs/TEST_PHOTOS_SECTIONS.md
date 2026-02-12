# ✅ Vérification - Système Photos par Section

## 🔍 Modifications Vérifiées

### ✅ Backend (`server_supabase.py`)

**1. Paramètre section_id ajouté** (ligne 1093)
```python
async def upload_search_photos(
    search_id: str,
    files: List[UploadFile] = File(...),
    section_id: str = Form(None),  # ✅ AJOUTÉ
    is_profile: str = Form(None),
```

**2. Section_id stocké dans metadata** (ligne 1142)
```python
photo_info = {
    "filename": unique_filename,
    "section_id": section_id,  # ✅ AJOUTÉ - Lier la photo à sa section
    "url": signed_url.get('signedURL'),
    ...
}
```

### ✅ Frontend (`App.js`)

**1. Upload avec section_id dans autoSaveDraft** (ligne 3650)
```javascript
for (const section of sections) {
  if (section.photos && section.photos.length > 0) {
    const formData = new FormData();
    unsavedPhotos.forEach(photo => formData.append('files', photo.file));
    formData.append('section_id', section.id); // ✅ AJOUTÉ
    await axios.post(`${API}/searches/${targetDraftId}/photos`, formData, ...);
  }
}
```

**2. Distribution des photos dans loadDraft** (ligne 4020-4063)
```javascript
// B. Distribuer les photos dans leurs sections respectives
const sectionsWithPhotos = baseSections.map(section => {
  const sectionPhotos = draft.photos
    .filter(p => p.section_id === section.id && !p.is_profile)
    .map(p => ({
      url: p.url || `${API}/searches/${draft.id}/photos/${p.filename}`,
      filename: p.filename,
      name: p.original_name || p.filename
    }));

  if (sectionPhotos.length > 0) {
    return { ...section, photos: sectionPhotos };
  }
  return section;
});

setSections(sectionsWithPhotos); // ✅ AJOUTÉ
```

**3. Distribution dans useEffect (auto-load)** (ligne 4122-4159)
```javascript
// Même logique de distribution que loadDraft
const sectionsWithPhotos = baseSections.map(section => {
  const sectionPhotos = existingDraft.photos
    .filter(p => p.section_id === section.id && !p.is_profile)
    .map(...);
  
  if (sectionPhotos.length > 0) {
    return { ...section, photos: sectionPhotos };
  }
  return section;
});

setSections(sectionsWithPhotos); // ✅ AJOUTÉ
```

**4. Upload dans EditSearchModal** (ligne 5067)
```javascript
for (const section of sections) {
  if (section.photos && section.photos.length > 0) {
    const formData = new FormData();
    newPhotos.forEach(photo => formData.append('files', photo.file));
    formData.append('section_id', section.id); // ✅ AJOUTÉ
    await axios.post(`${API}/searches/${search.id}/photos`, formData, ...);
  }
}
```

**5. Distribution dans EditSearchModal** (ligne 4920-4945)
```javascript
// Distribuer les photos dans leurs sections
setSections(prevSections => prevSections.map(section => {
  const sectionPhotos = search.photos
    .filter(p => p.section_id === section.id && !p.is_profile)
    .map(...);

  if (sectionPhotos.length > 0) {
    return { ...section, photos: sectionPhotos };
  }
  return section;
}));
```

---

## 🎯 Points Clés

### Upload
- ✅ Photo de profil : `section_id: "profile"`
- ✅ Photos sections : `section_id: section.id` (ex: "description", "observations")
- ✅ Upload section par section (boucle `for`)

### Chargement
- ✅ **loadDraft** : Distribue photos par `section_id` ✨ CORRIGÉ
- ✅ **useEffect** : Distribue photos par `section_id` (même si désactivé)
- ✅ **EditSearchModal** : Distribue photos par `section_id`

### Filtrage
```javascript
draft.photos.filter(p => p.section_id === section.id && !p.is_profile)
```
- Exclut la photo de profil (`!p.is_profile`)
- Filtre par section (`section_id === section.id`)

---

## 🧪 Test Manuel

### Étape 1 : Vérifier la base de données
```bash
cd backend
python -c "from supabase import create_client; import os; from dotenv import load_dotenv; load_dotenv(); supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY')); result = supabase.table('searches').select('photos').eq('status', 'DRAFT').limit(1).execute(); import json; print(json.dumps(result.data[0].get('photos', []) if result.data else [], indent=2)[:1500])"
```

**Attendu :** Les photos doivent avoir `"section_id": "description"` ou autre section

### Étape 2 : Tester le chargement
1. Ouvrir http://localhost:3002
2. Cliquer sur "Brouillon en attente"
3. Cliquer "Reprendre"
4. **Vérifier console :**
   ```
   📸 [loadDraft] Section description: 2 photos chargées
   ✅ [loadDraft] Sections avec photos distribuées: [{id: "description", photosCount: 2}]
   ```
5. **Vérifier UI :** Photos visibles dans section "Description"

### Étape 3 : Tester l'upload
1. Ajouter 1 photo dans "Observations"
2. Changer d'onglet → Auto-save
3. Vérifier console réseau (F12) : 
   - Request Payload doit contenir `section_id: "observations"`

### Étape 4 : Tester "Modifier"
1. Aller dans "Mes Recherches"
2. Cliquer "Modifier"
3. **Vérifier :** Photos chargées dans leurs sections respectives

---

## 🐛 Problèmes Potentiels

### ❌ Photos anciennes sans section_id
**Symptôme :** Photos uploadées avant la modification ne s'affichent pas

**Solution :** Ces photos n'ont pas de `section_id`, donc le filtre les ignore

**Fix temporaire :**
```javascript
// Afficher les photos sans section_id dans une section par défaut
const sectionPhotos = draft.photos
  .filter(p => 
    (p.section_id === section.id || (!p.section_id && section.id === 'description')) 
    && !p.is_profile
  )
```

### ❌ Console logs manquants
**Symptôme :** Pas de logs `📸 [loadDraft]`

**Cause :** `loadDraft` pas appelé

**Vérifier :**
```javascript
// Dans resumeDraft (ligne 2691)
searchFormRef.current?.loadDraft?.(resp.data || draft);
```

---

## ✅ Checklist Finale

- [x] Backend accepte `section_id`
- [x] Backend stocke `section_id` dans metadata
- [x] Frontend envoie `section_id` lors de l'upload (autoSaveDraft)
- [x] Frontend envoie `section_id` lors de l'upload (EditSearchModal)
- [x] Frontend distribue photos au chargement (loadDraft) ✨ **CORRIGÉ**
- [x] Frontend distribue photos au chargement (useEffect)
- [x] Frontend distribue photos au chargement (EditSearchModal)
- [x] Photo de profil utilise `section_id: "profile"`
- [x] Logs de debug ajoutés

---

## 🚀 Prochaines Étapes

1. **Redémarrer l'application**
   ```powershell
   .\restart_skyapp.ps1
   ```

2. **Tester le workflow complet**
   - Charger brouillon → Photos visibles ✅
   - Ajouter photos → Auto-save → Recharger → Photos visibles ✅
   - Modifier → Photos visibles ✅

3. **Vérifier console du navigateur**
   - Logs `📸 [loadDraft]` présents
   - Logs `✅ [loadDraft] Sections avec photos distribuées`

4. **Si problème persiste**
   - Ouvrir console (F12)
   - Copier les logs
   - Vérifier les requêtes réseau (onglet Network)
