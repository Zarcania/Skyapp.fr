# 🔧 GUIDE RAPIDE - Corriger Supabase

## ❌ Problèmes détectés:
1. ✅ Toutes les tables existent
2. ⚠️ `clients.name` - colonne manquante
3. ⚠️ `worksites.name` - colonne manquante
4. ⚠️ Autres colonnes peut-être manquantes dans tables vides

## ✅ SOLUTION EN 3 ÉTAPES

### ÉTAPE 1️⃣: Aller sur Supabase
1. Ouvrir https://supabase.com/dashboard/project/wursductnatclwrqvgua
2. Cliquer sur "SQL Editor" (icône </> dans menu gauche)

### ÉTAPE 2️⃣: Exécuter le script de correction
1. Cliquer "New query"
2. Coller **MIGRATION_CORRECTIONS_COLONNES.sql** (fichier complet à la racine)
3. Cliquer "Run" ou appuyer F5
4. Attendre "Success" ✅

### ÉTAPE 3️⃣: Vérifier que c'est OK
```powershell
python backend\verify_supabase_tables.py
```

Si tout est ✅, redémarrer le backend:
```powershell
cd backend
python server_supabase.py
```

## 📄 Fichiers SQL disponibles:

1. **FIX_SUPABASE_URGENT.sql** (rapide - 2 colonnes critiques)
2. **MIGRATION_CORRECTIONS_COLONNES.sql** (complet - toutes les colonnes)
3. **TABLES_SUPABASE_MANQUANTES.sql** (création complète si besoin de tout recréer)

## 🎯 Recommandation:

**Utilisez MIGRATION_CORRECTIONS_COLONNES.sql** - Il ajoute tout ce qui manque sans casser l'existant.

## 🔍 Vérification après correction:

Les erreurs suivantes devraient disparaître:
- ❌ `column clients.name does not exist`
- ❌ `column worksites.name does not exist`
- ❌ `Could not find the table 'public.invoices'`
- ❌ `column invitations.sender_id does not exist`

Après la migration, toutes ces erreurs → ✅

## 🚀 Ensuite:

Une fois Supabase corrigé, votre backend fonctionnera à 100% sans fallbacks !
