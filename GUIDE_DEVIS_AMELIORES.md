# 📝 Guide d'utilisation - Devis améliorés

## 🎯 Nouvelles fonctionnalités

### 1️⃣ Choix manuel du statut

Vous pouvez désormais **choisir manuellement** le statut de vos devis :

- 📋 **Brouillon** : Devis en cours de préparation
- ✉️ **Envoyé** : Devis transmis au client
- ✅ **Accepté** : Devis validé par le client
- ❌ **Refusé** : Devis décliné

**Où trouver ?**
- Dans le formulaire de création/modification de devis
- Juste en dessous du champ "Client"

### 2️⃣ Bouton "Envoyer" automatique

Le bouton **"Envoyer"** dans la vue Kanban :
- Met automatiquement le statut à **"Envoyé"** ✉️
- Ignore le statut manuel que vous avez choisi
- Affiche une confirmation

**Où trouver ?**
1. Cliquez sur un en-tête de colonne Kanban (ex: "Brouillons")
2. La section détaillée s'ouvre en dessous
3. Cliquez sur le bouton vert **"Envoyer"**

### 3️⃣ Articles / Prestations conservés

Les items que vous ajoutez sont maintenant **sauvegardés** :

**✅ Ce qui fonctionne :**
- Ajout d'articles avec nom, quantité, prix
- Calcul automatique du total
- Sauvegarde dans la base de données
- Récupération lors de la modification

**📝 Comment l'utiliser :**
1. Créez ou modifiez un devis
2. Section "Articles / Prestations"
3. Cliquez sur **"+ Ajouter"** pour chaque ligne
4. Remplissez : Nom, Quantité, Prix unitaire
5. Le total se calcule automatiquement

**🔄 Lors de la modification :**
- Cliquez sur **"Modifier"** sur un devis
- Le formulaire s'ouvre avec tous les items pré-remplis
- Modifiez, ajoutez ou supprimez des lignes
- Cliquez sur **"Enregistrer les modifications"**

### 4️⃣ Lien avec le Catalogue

Un bouton **"Catalogue"** a été ajouté dans la section Articles/Prestations.

**Comment l'utiliser :**
1. Dans le formulaire de devis, section "Articles / Prestations"
2. Cliquez sur le bouton **"📊 Catalogue"**
3. Une nouvelle fenêtre s'ouvre avec votre catalogue produits
4. Gérez vos produits (ajout, modification, suppression)
5. Revenez à l'onglet du devis
6. Ajoutez manuellement les produits dans les items

**💡 Astuce :** Créez d'abord vos produits dans le Catalogue, puis copiez/collez les informations dans vos devis.

## 🛠️ Workflow complet

### Création d'un devis

1. **Menu Devis** → Cliquez sur **"Nouveau Devis"**
2. Remplissez les informations :
   - Client (optionnel)
   - **Statut** : Choisissez l'état initial
   - Titre du devis
   - Description
3. Ajoutez vos articles/prestations
4. Le total se calcule automatiquement
5. Cliquez sur **"Créer le devis"**

### Modification d'un devis

1. Trouvez votre devis dans la vue Kanban
2. Cliquez sur **"Modifier"** (bouton bleu)
3. Le formulaire s'ouvre avec toutes les données
4. Modifiez ce que vous voulez
5. Cliquez sur **"Enregistrer les modifications"**

### Envoi d'un devis

**Option 1 : Automatique**
1. Cliquez sur un en-tête Kanban pour ouvrir la section détaillée
2. Cliquez sur **"Envoyer"** (bouton vert) sur le devis
3. Le statut passe automatiquement à "Envoyé" ✉️

**Option 2 : Manuel**
1. Modifiez le devis
2. Changez le statut à "Envoyé"
3. Enregistrez

## ⚠️ Important : Migration SQL requise

Pour que les items fonctionnent, vous devez **exécuter la migration SQL** :

1. Ouvrez le fichier `MIGRATION_ITEMS_DEVIS.md`
2. Suivez les instructions étape par étape
3. Copiez/collez le SQL dans Supabase Dashboard
4. Exécutez la migration

**Sans cette migration, les items ne seront pas sauvegardés !**

## 🎓 Exemples d'utilisation

### Exemple 1 : Devis BTP standard

```
Client: Entreprise Martin
Statut: Brouillon
Titre: Travaux rénovation appartement

Articles:
- Main d'œuvre qualifiée | Qté: 40h | Prix: 45€/h | Total: 1800€
- Matériaux peinture | Qté: 1 | Prix: 350€ | Total: 350€
- Fournitures électriques | Qté: 1 | Prix: 200€ | Total: 200€

Total HT: 2350€
```

### Exemple 2 : Détection réseaux

```
Client: Mairie de Paris
Statut: Envoyé
Titre: Détection réseaux Boulevard Saint-Michel

Articles:
- Détection réseaux électriques | Qté: 150m | Prix: 8€/m | Total: 1200€
- Géoréférencement GPS | Qté: 1 | Prix: 300€ | Total: 300€
- Rapport technique + plan | Qté: 1 | Prix: 450€ | Total: 450€

Total HT: 1950€
```

## 🐛 Dépannage

### Les items ne sont pas sauvegardés
➡️ Exécutez la migration SQL (voir `MIGRATION_ITEMS_DEVIS.md`)

### Le bouton "Envoyer" ne change pas le statut
➡️ Vérifiez que le backend est bien redémarré
➡️ Ouvrez la console navigateur (F12) pour voir les erreurs

### Le statut ne s'affiche pas dans le formulaire
➡️ Rafraîchissez la page (F5)
➡️ Videz le cache navigateur (Ctrl+Shift+R)

## 📞 Support

En cas de problème, vérifiez :
1. Backend actif sur http://127.0.0.1:8001
2. Frontend actif sur http://localhost:3002
3. Migration SQL exécutée avec succès
4. Console navigateur (F12) pour les erreurs JavaScript
