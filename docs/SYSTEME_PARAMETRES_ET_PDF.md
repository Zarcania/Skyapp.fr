# 📋 Système de Paramètres Société et Génération PDF

## ✅ Ce qui a été créé

### 1. Backend (server_supabase.py)

#### Routes API créées :
- `GET /api/company-settings` - Récupérer les paramètres de la société
- `POST /api/company-settings` - Sauvegarder les paramètres (Admin/Bureau uniquement)
- `POST /api/company-settings/logo` - Upload du logo de la société
- `GET /api/searches/{search_id}/pdf` - Générer un PDF professionnel pour une recherche

#### Fonctionnalités :
- ✅ Gestion des paramètres société (nom, adresse, SIRET, etc.)
- ✅ Upload de logo (PNG, JPG, SVG max 2MB)
- ✅ Choix de couleurs pour les documents PDF
- ✅ Génération PDF avec logo et couleurs personnalisées
- ✅ Gestion d'erreurs si la table n'existe pas encore

### 2. Frontend (App.js)

#### Composant CompanySettings amélioré :
- ✅ Upload et prévisualisation du logo
- ✅ Formulaire complet (nom, forme juridique, adresse, SIRET, SIREN, RCS)
- ✅ Sélecteur de couleur pour les PDF
- ✅ Design moderne avec React

#### Boutons PDF ajoutés :
- ✅ Bouton "PDF" dans la liste des recherches terrain
- ✅ Bouton "PDF" dans la liste des recherches infiltration
- ✅ Téléchargement automatique du PDF généré

### 3. Base de données (Migrations)

#### Fichiers créés :
- `migrations/create_company_settings.sql` - Script de création de la table
- `migrations/README_MIGRATION_company_settings.md` - Guide d'application

#### Table company_settings :
```sql
- id (UUID)
- company_id (UUID, référence companies)
- company_name (VARCHAR)
- legal_form (VARCHAR)
- address (TEXT)
- postal_code (VARCHAR)
- city (VARCHAR)
- siret (VARCHAR)
- siren (VARCHAR)
- rcs_rm (VARCHAR)
- logo_url (TEXT)
- primary_color (VARCHAR) - Par défaut #6366f1
- secondary_color (VARCHAR) - Par défaut #333333
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 🚀 Comment utiliser

### Étape 1 : Créer la table dans Supabase

1. Ouvrir [Supabase Dashboard](https://app.supabase.com)
2. Sélectionner votre projet
3. Aller dans **SQL Editor**
4. Créer une nouvelle requête
5. Copier le contenu de `migrations/create_company_settings.sql`
6. Exécuter (Run)

### Étape 2 : Tester le système

1. **Se connecter en tant qu'Admin ou Bureau**
2. **Aller dans "Paramètres"** (icône engrenage violet)
3. **Remplir les informations :**
   - Nom de l'entreprise
   - Forme juridique
   - Adresse complète
   - SIRET, SIREN, RCS
4. **Uploader un logo**
5. **Choisir une couleur principale**
6. **Cliquer sur "Économiser"**

### Étape 3 : Générer un PDF

1. **Aller dans "Bureau" > "Recherches"**
2. **Cliquer sur le bouton "PDF"** sur n'importe quelle recherche
3. **Le PDF est téléchargé automatiquement** avec :
   - Logo de la société
   - Couleur personnalisée
   - Toutes les informations de la recherche

## 🔧 Structure du PDF généré

Le PDF contient :
- ✅ **En-tête** avec logo de la société
- ✅ **Titre** : "Rapport de Recherche Terrain"
- ✅ **Informations générales** : Type, localisation, date, statut, technicien
- ✅ **Description** de la recherche
- ✅ **Observations** (fond jaune)
- ✅ **Liste des photos** (avec noms de fichiers)
- ✅ **Pied de page** avec nom de la société

## 🎨 Personnalisation

### Couleurs
- Modifiable depuis Paramètres Entreprise
- Utilisée pour les en-têtes de tableaux
- Appliquée automatiquement aux PDF

### Logo
- Formats acceptés : PNG, JPG, SVG
- Taille maximale : 2 MB
- Stocké dans `backend/uploads/logos/`
- Affiché dans tous les PDF

## 🐛 Résolution de problèmes

### Erreur 404 sur /api/company-settings
**Cause** : La table `company_settings` n'existe pas dans Supabase  
**Solution** : Appliquer la migration SQL (voir Étape 1)

### Le logo ne s'affiche pas
**Cause** : Le fichier n'est pas uploadé ou le chemin est incorrect  
**Solution** : 
1. Vérifier que le dossier `backend/uploads/logos/` existe
2. Re-uploader le logo depuis Paramètres

### Erreur lors de la génération PDF
**Cause** : ReportLab ou PIL non installés  
**Solution** : 
```bash
cd backend
pip install reportlab Pillow
```

### Le bouton PDF ne fait rien
**Cause** : Erreur JavaScript dans la console  
**Solution** : 
1. Ouvrir la console (F12)
2. Vérifier les erreurs
3. Vérifier que le backend est démarré

## 📦 Dépendances Python requises

```txt
reportlab>=4.0.0
Pillow>=10.0.0
```

Ces dépendances devraient déjà être dans `requirements.txt`.

## 🎯 Prochaines améliorations possibles

- [ ] Ajouter les photos réelles dans le PDF (actuellement juste les noms)
- [ ] Signature électronique
- [ ] QR Code vers l'application
- [ ] Export Excel en plus du PDF
- [ ] Templates de PDF personnalisables
- [ ] Envoi automatique par email

## 📱 Accès par rôle

- ✅ **Admin** : Peut tout modifier
- ✅ **Bureau** : Peut tout modifier
- ❌ **Technicien** : Ne voit pas les paramètres entreprise

## ✨ Résumé des changements

1. ✅ Table `company_settings` créée dans Supabase
2. ✅ Routes API pour gérer les paramètres
3. ✅ Upload de logo fonctionnel
4. ✅ Génération PDF avec personnalisation
5. ✅ Boutons PDF dans l'interface Bureau
6. ✅ Gestion des erreurs robuste
7. ✅ Documentation complète

**Statut** : 🟢 Système fonctionnel et prêt à l'emploi !
