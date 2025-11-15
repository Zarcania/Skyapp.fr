# ⚠️ ACTION REQUISE : Migration SQL pour les items

## 🚨 Problème actuel

Vos articles/prestations ne sont **pas sauvegardés** car la colonne `items` n'existe pas encore dans la table `quotes` de votre base de données Supabase.

## ✅ Solution : Exécuter la migration SQL

### Étape 1 : Ouvrir Supabase Dashboard

1. Allez sur https://supabase.com/dashboard
2. Connectez-vous à votre compte
3. Sélectionnez votre projet Skyapp

### Étape 2 : Ouvrir l'éditeur SQL

1. Dans le menu de gauche, cliquez sur **SQL Editor**
2. Cliquez sur **"+ New query"**

### Étape 3 : Exécuter cette migration

Copiez et collez ce code SQL dans l'éditeur :

```sql
-- Ajouter la colonne items de type JSONB
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Ajouter un commentaire
COMMENT ON COLUMN quotes.items IS 'Articles et prestations du devis en JSON';

-- Créer un index pour les recherches
CREATE INDEX IF NOT EXISTS idx_quotes_items ON quotes USING GIN (items);
```

### Étape 4 : Exécuter

1. Cliquez sur le bouton **"Run"** en bas à droite
2. Attendez le message de succès
3. Fermez l'éditeur SQL

## ✅ Vérification

Pour vérifier que la migration a fonctionné, exécutez cette requête :

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'quotes' AND column_name = 'items';
```

Résultat attendu :
```
column_name | data_type | column_default
items       | jsonb     | '[]'::jsonb
```

## 🔄 Après la migration

Une fois la migration exécutée :

1. **Rafraîchissez votre navigateur** (F5)
2. **Créez un nouveau devis** avec des articles
3. **Modifiez-le** : les articles devraient être visibles !

## 🎯 Test complet

### Test 1 : Création avec articles
1. Menu Devis → Nouveau Devis
2. Ajoutez 2-3 articles avec nom, quantité, prix
3. Créez le devis
4. **Aucune erreur** ne devrait apparaître

### Test 2 : Modification avec articles
1. Cliquez sur "Modifier" sur le devis créé
2. **Les articles doivent apparaître pré-remplis** ✅
3. Modifiez un article
4. Enregistrez
5. **Les modifications sont sauvegardées** ✅

### Test 3 : Visualisation dans la section détaillée
1. Cliquez sur un en-tête Kanban (ex: "Brouillons")
2. Dans la carte du devis, colonne 2
3. **Section "ARTICLES / PRESTATIONS" visible** ✅
4. Tous les articles s'affichent avec quantité et prix

## 📊 Structure des items en JSON

Les items sont stockés dans ce format :

```json
[
  {
    "name": "Détection réseaux électriques",
    "quantity": 10,
    "price": 150.00,
    "total": 1500.00
  },
  {
    "name": "Rapport technique",
    "quantity": 1,
    "price": 450.00,
    "total": 450.00
  }
]
```

## ❓ En cas de problème

### Erreur : "column already exists"
➡️ La colonne existe déjà, vous pouvez ignorer cette étape

### Erreur : "permission denied"
➡️ Vérifiez que vous êtes connecté avec le compte propriétaire du projet

### Les items ne s'affichent toujours pas
1. Videz le cache du navigateur (Ctrl + Shift + R)
2. Vérifiez dans Supabase Table Editor que la colonne `items` existe
3. Redémarrez Skyapp : `.\restart_skyapp.ps1`

## 🚀 Après la migration

Toutes les fonctionnalités fonctionneront :
- ✅ Création de devis avec articles
- ✅ Modification avec articles pré-remplis
- ✅ Visualisation des articles dans les cartes
- ✅ Calcul automatique du total
- ✅ Sauvegarde persistante

**N'oubliez pas d'exécuter cette migration avant de continuer !** 🎯
