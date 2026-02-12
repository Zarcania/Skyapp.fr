# 🔧 Migration SQL - Ajout colonne items (JSONB)

## 📋 Instructions d'exécution

### Étape 1 : Accéder au SQL Editor Supabase
1. Ouvrez **Supabase Dashboard** : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Menu latéral → **SQL Editor**

### Étape 2 : Exécuter la migration
Copiez-collez le code SQL ci-dessous dans l'éditeur :

```sql
-- Migration: Ajouter colonne items (JSONB) à la table quotes
-- Date: 2025-11-15
-- Description: Permet de stocker les articles/prestations de chaque devis en format JSON

-- Ajouter la colonne items de type JSONB avec valeur par défaut []
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Ajouter un commentaire pour la documentation
COMMENT ON COLUMN quotes.items IS 'Articles et prestations du devis stockés en JSON (nom, quantité, prix)';

-- Index GIN pour recherches efficaces dans le JSON
CREATE INDEX IF NOT EXISTS idx_quotes_items ON quotes USING GIN (items);
```

### Étape 3 : Exécuter
1. Cliquez sur **Run** (ou Ctrl+Enter)
2. Vérifiez le message de succès
3. La colonne `items` est maintenant disponible !

## ✅ Vérification

Pour vérifier que la migration a fonctionné :

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

## 📊 Structure des items

Les items sont stockés au format JSON avec cette structure :

```json
[
  {
    "name": "Détection réseaux électriques",
    "quantity": 10,
    "price": 150.00,
    "total": 1500.00
  },
  {
    "name": "Main d'œuvre",
    "quantity": 8,
    "price": 45.00,
    "total": 360.00
  }
]
```

## 🔗 Intégration backend

Le backend (`server_supabase.py`) a été mis à jour pour :
- ✅ Accepter le champ `items` en POST /quotes
- ✅ Accepter le champ `items` en PUT /quotes/{id}
- ✅ Retourner les `items` en GET /quotes

## 🚀 Après la migration

Une fois la migration exécutée, vous pouvez :
1. Créer des devis avec articles/prestations détaillés
2. Modifier les items existants
3. Les items seront conservés lors de l'édition des devis

**Note importante :** Les devis existants auront automatiquement `items = []` (tableau vide).
