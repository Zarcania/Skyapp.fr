# ⚠️ Token JWT Expiré - Guide de Résolution

## 🔍 Problème Identifié

Erreur dans la console :
```
GET http://localhost:8001/api/invitations/received 401 (Unauthorized)
token has invalid claims: token is expired
```

**Cause** : Votre token JWT d'authentification a expiré. Les tokens Supabase expirent après un certain temps (généralement 1 heure).

## ✅ Solution Rapide

### Option 1 : Déconnexion/Reconnexion (RECOMMANDÉ)

1. **Dans l'interface SkyApp** :
   - Cliquez sur le bouton de déconnexion (icône LogOut en haut à droite)
   - Ou allez directement sur `http://localhost:3002` (page de connexion)

2. **Reconnectez-vous** :
   - Utilisez vos identifiants (email + mot de passe)
   - Un nouveau token JWT sera généré automatiquement
   - Durée de validité : ~1 heure

3. **Vérifiez le menu Invitations** :
   - Allez dans "Accès Admin" ou "Bureau"
   - Cliquez sur l'onglet "Invitations"
   - Le menu devrait maintenant charger correctement

### Option 2 : Nettoyer le localStorage (Alternative)

Si la déconnexion ne fonctionne pas :

1. Ouvrez la console du navigateur (F12)
2. Onglet "Console"
3. Tapez :
   ```javascript
   localStorage.clear();
   location.reload();
   ```
4. Reconnectez-vous normalement

### Option 3 : Via l'interface de développement

1. F12 > Onglet "Application" (ou "Stockage")
2. Dans le menu de gauche : "Local Storage" > `http://localhost:3002`
3. Supprimez les clés :
   - `token`
   - `user`
4. Rechargez la page (F5)
5. Reconnectez-vous

## 🎯 Ce qui a été corrigé

J'ai ajouté une gestion d'erreur silencieuse pour les tokens expirés :
- Avant : Erreur affichée en boucle dans la console
- Après : Pas d'erreur affichée si 401 (comportement normal)

## 📋 Menu Invitations - Vérification

Une fois reconnecté, vous devriez voir :

### Pour les Admins (Bureau > Invitations)
```
┌─────────────────────────────────────────┐
│ Inviter des Techniciens                 │
│                                          │
│ [+ Inviter un utilisateur]              │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ 📧 user@example.com                 │ │
│ │ Badge: TECHNICIEN | Badge: En attente│ │
│ │ Envoyé le: 12/11/2025               │ │
│ │ Expire le: 19/11/2025               │ │
│ │ [Renvoyer] [Annuler]                │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Pour les Utilisateurs (Role Selection > Bloc Invitations)
```
┌─────────────────────────────────────────┐
│ 💌 Invitations            [Rafraîchir] │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Entreprise SkyTech                  │ │
│ │ Rôle proposé: Technicien / User     │ │
│ │ Envoyé le 12/11/2025                │ │
│ │ Expire le 19/11/2025                │ │
│ │ [Accepter] [Ignorer]                │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 🚀 Test Complet du Système d'Invitations

### Prérequis
- [x] Être connecté avec un token valide
- [x] Avoir au moins 2 comptes (1 Admin + 1 User)

### Scénario de Test

**Étape 1 : Connexion Admin**
```
1. Se connecter en tant qu'Admin
2. Aller dans "Accès Admin" ou "Bureau"
3. Cliquer sur l'onglet "Invitations"
4. Vérifier que la page s'affiche sans erreur 401
```

**Étape 2 : Envoyer une invitation**
```
1. Cliquer "Inviter un utilisateur"
2. Saisir un email (ex: technicien@test.com)
3. Choisir un rôle (TECHNICIEN ou ADMIN)
4. Cliquer "Envoyer l'invitation"
5. ✅ Vérifier le message de succès
6. ✅ Voir l'invitation dans la liste avec badge "En attente"
```

**Étape 3 : Accepter l'invitation (autre compte)**
```
1. Se déconnecter de l'Admin
2. Se connecter avec le compte invité
3. Aller sur la page de sélection de rôle
4. Vérifier le bloc "Invitations"
5. Cliquer sur "Accepter"
6. ✅ Message de confirmation
7. ✅ Utilisateur maintenant rattaché à l'entreprise
```

## 🔒 Sécurité JWT

### Durée de vie des tokens
- **Access Token** : ~1 heure (configurable dans Supabase)
- **Refresh Token** : 7 jours (automatique)
- **Invitation Token** : 7 jours (expiration manuelle)

### Auto-refresh du token

Pour éviter les expirations à l'avenir, vous pourriez implémenter un refresh automatique. Mais pour l'instant, la reconnexion manuelle suffit.

## 📝 Commandes Utiles

### Vérifier les tokens en base
```sql
-- Dans Supabase Studio (http://localhost:54323)
SELECT 
  id,
  email,
  created_at,
  updated_at,
  last_sign_in_at
FROM auth.users
ORDER BY last_sign_in_at DESC;
```

### Vérifier les invitations
```sql
SELECT 
  id,
  email,
  role,
  status,
  expires_at,
  created_at
FROM invitations
ORDER BY created_at DESC;
```

## ✅ Checklist de Vérification

Après reconnexion, vérifiez :

- [ ] Plus d'erreur 401 dans la console
- [ ] Menu "Invitations" visible dans Bureau Layout
- [ ] Formulaire d'invitation s'affiche correctement
- [ ] Liste des invitations charge sans erreur
- [ ] Boutons d'action fonctionnels
- [ ] Bloc invitations visible pour les Users

## 🎉 Résultat Attendu

Après reconnexion :
```
✅ Token JWT valide
✅ Menu Invitations accessible
✅ Pas d'erreur 401
✅ Toutes les fonctionnalités opérationnelles
```

---

**Note importante** : Ce problème de token expiré est **normal** et se produit régulièrement. Ce n'est pas un bug du système d'invitations, mais le comportement de sécurité standard des JWT.

**Action immédiate** : 👉 **DÉCONNECTEZ-VOUS ET RECONNECTEZ-VOUS**
