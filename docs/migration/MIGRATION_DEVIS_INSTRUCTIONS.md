# 🔧 Instructions pour appliquer la vue quotes_with_client_name

## Migration SQL à exécuter manuellement

La migration SQL a été créée dans :
`supabase/migrations/20251115_add_quotes_with_client_view.sql`

### Étape 1 : Connexion à Supabase Dashboard

1. Ouvre https://supabase.com/dashboard
2. Sélectionne ton projet : **wursductnatclwrqvgua**
3. Va dans le menu **SQL Editor** (à gauche)

### Étape 2 : Exécution de la migration

1. Clique sur **New Query**
2. Copie-colle le contenu du fichier `supabase/migrations/20251115_add_quotes_with_client_view.sql`
3. Clique sur **Run** ou **F5**

### Étape 3 : Vérification

Exécute cette requête pour vérifier que la vue fonctionne :

```sql
SELECT * FROM quotes_with_client_name LIMIT 10;
```

Tu devrais voir les colonnes :
- `id`, `company_id`, `client_id`, `user_id`
- `title`, `description`, `amount`, `status`
- `created_at`, `updated_at`
- `client_name`, `client_email`, `client_phone`, `client_address` ✅ (nouvelles colonnes)

## 📝 Note

Si la vue n'est pas créée, le backend utilisera automatiquement un fallback sur la table `quotes` (sans les infos client).

## ✅ Une fois la vue créée

Le menu Devis affichera automatiquement le nom du client sous chaque carte de devis : 
`👤 Nom du Client`
