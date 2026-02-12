# 📋 Migration: Ajout des Numéros de Devis

## 🎯 Objectif
Ajouter un système de numérotation automatique pour chaque devis permettant aux entreprises de retrouver facilement leurs devis par numéro.

## 📊 Format des Numéros
- **Format**: `YYYYMM-XXX`
- **Exemple**: `202511-001`, `202511-002`, `202512-001`
- Le compteur se réinitialise chaque mois
- Chaque entreprise a sa propre séquence

## 🔧 Modifications Apportées

### 1. Base de Données (Supabase)
- ✅ Nouvelle colonne `quote_number` (VARCHAR(50), UNIQUE, NOT NULL)
- ✅ Index pour les recherches rapides
- ✅ Fonction PostgreSQL `generate_quote_number(p_company_id UUID)` pour générer automatiquement les numéros
- ✅ Migration automatique des devis existants
- ✅ Vue `quotes_with_client_name` mise à jour pour inclure le numéro

### 2. Backend (server_supabase.py)
- ✅ Génération automatique du numéro lors de la création d'un devis
- ✅ Appel à la fonction `generate_quote_number` via RPC
- ✅ Inclusion du `quote_number` dans les réponses API

### 3. Frontend (App.js)
- ✅ Affichage du numéro dans les cartes de devis (toutes colonnes)
- ✅ Badge coloré selon le statut :
  - 🟣 Brouillon : Purple/Blue
  - 🔵 Envoyé : Blue/Cyan
  - 🟢 Accepté : Green/Emerald
  - 🟣 Chantier : Purple/Indigo
- ✅ Recherche par numéro de devis
- ✅ Affichage dans la vue détaillée

## 📝 Instructions d'Installation

### Étape 1: Exécuter la Migration SQL

1. **Ouvrez le Supabase Dashboard**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet

2. **Accédez au SQL Editor**
   - Menu latéral → SQL Editor
   - Cliquez sur "New query"

3. **Copiez et exécutez le fichier**
   ```
   supabase/migrations/20251116_add_quote_number.sql
   ```

4. **Vérifiez l'exécution**
   ```sql
   -- Vérifier que la colonne existe
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'quotes' AND column_name = 'quote_number';

   -- Vérifier que les numéros ont été générés
   SELECT id, quote_number, created_at 
   FROM quotes 
   ORDER BY created_at DESC 
   LIMIT 10;

   -- Tester la fonction
   SELECT generate_quote_number('votre-company-id-ici'::UUID);
   ```

### Étape 2: Redémarrer le Backend

```powershell
# Arrêter les processus en cours
Get-Process | Where-Object { $_.ProcessName -like '*python*' } | Stop-Process -Force

# Redémarrer le backend
cd c:\Users\jorda\Downloads\Skyapp-conflict_141025_2250\Skyapp-conflict_141025_2250\backend
python -m uvicorn server_supabase:app --host 127.0.0.1 --port 8001 --reload
```

### Étape 3: Le Frontend n'a Pas Besoin de Redémarrage
Si le frontend est déjà en cours d'exécution avec `npm start`, il détectera automatiquement les changements et se rechargera.

## ✅ Test de Validation

### 1. Créer un Nouveau Devis
1. Allez dans Menu Devis
2. Cliquez sur "Nouveau Devis"
3. Remplissez les champs obligatoires
4. Enregistrez

**Résultat attendu**: Un numéro au format `YYYYMM-XXX` doit apparaître sur la carte du devis

### 2. Vérifier l'Unicité
1. Créez plusieurs devis
2. Vérifiez que les numéros s'incrémentent : `202511-001`, `202511-002`, etc.

### 3. Tester la Recherche
1. Dans la barre de recherche, tapez un numéro de devis (ex: `202511-001`)
2. Le devis correspondant doit s'afficher

### 4. Vérifier l'Affichage
- ✅ Badge coloré visible dans chaque carte de devis
- ✅ Numéro affiché dans la vue détaillée (grand badge blanc avec gradient)
- ✅ Numéro inclus dans les filtres de recherche

## 🎨 Styles des Badges

### Dans les Cartes (petits badges)
```jsx
// Brouillon - Purple/Blue
from-purple-100 to-blue-100 text-purple-700

// Envoyé - Blue/Cyan
from-blue-100 to-cyan-100 text-blue-700

// Accepté - Green/Emerald
from-green-100 to-emerald-100 text-green-700

// Chantier - Purple/Indigo
from-purple-100 to-indigo-100 text-purple-700
```

### Dans la Vue Détaillée (grand badge)
```jsx
// Badge blanc avec gradient
from-purple-500 to-blue-500 text-white
```

## 🔍 Dépannage

### Problème: Les numéros ne sont pas générés
**Solution**: Vérifiez que la fonction `generate_quote_number` existe dans Supabase
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'generate_quote_number';
```

### Problème: Erreur "quote_number already exists"
**Cause**: La colonne existait déjà
**Solution**: Supprimez et recréez la colonne
```sql
ALTER TABLE quotes DROP COLUMN IF EXISTS quote_number;
-- Puis réexécutez la migration complète
```

### Problème: Les devis existants n'ont pas de numéro
**Solution**: Réexécutez la partie 4 de la migration (boucle DO)

## 📈 Avantages

1. **Traçabilité**: Chaque devis a un identifiant unique lisible
2. **Organisation**: Les numéros se réinitialisent chaque mois
3. **Multi-tenant**: Chaque entreprise a sa propre séquence
4. **Recherche**: Retrouvez facilement un devis par son numéro
5. **Professionnalisme**: Numéros formatés pour les documents officiels

## 🚀 Prochaines Étapes Suggérées

1. **PDF Generation**: Inclure le numéro de devis dans les PDFs générés
2. **Email Templates**: Mentionner le numéro dans les emails automatiques
3. **Export Excel**: Inclure la colonne quote_number dans les exports
4. **API Search**: Ajouter un endpoint `/api/quotes/by-number/:number`
5. **Dashboard Analytics**: Statistiques par période (utiliser le préfixe YYYYMM)

## 📞 Support

Si vous rencontrez des problèmes lors de l'installation, vérifiez :
1. Les logs du backend (terminal Python)
2. La console du navigateur (F12)
3. Les logs Supabase (Dashboard → Logs)
