# 📧 Configuration Email pour SkyApp

## ✅ Ce qui a été fait

1. ✅ **Module email créé** : `backend/email_service.py`
2. ✅ **Configuration ajoutée** : `backend/.env`
3. ✅ **Route d'invitation mise à jour** : Envoie automatiquement un email
4. ✅ **Template HTML professionnel** : Email moderne et responsive

---

## 🚀 Configuration Gmail SMTP (Recommandée)

### **Étape 1 : Activer l'authentification à 2 facteurs**

1. Allez sur https://myaccount.google.com/security
2. Cliquez sur "Validation en deux étapes"
3. Suivez les instructions pour activer

### **Étape 2 : Créer un mot de passe d'application**

1. Allez sur https://myaccount.google.com/apppasswords
2. Sélectionnez "Autre (nom personnalisé)"
3. Tapez "SkyApp"
4. Copiez le mot de passe généré (16 caractères, sans espaces)

### **Étape 3 : Mettre à jour le fichier .env**

Éditez `backend/.env` et remplacez :

```env
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application-16-caracteres
```

Par vos vraies valeurs :

```env
SMTP_USER=contact@skyapp.fr
SMTP_PASSWORD=abcd efgh ijkl mnop
```

**⚠️ IMPORTANT** : Supprimez les espaces du mot de passe !

### **Étape 4 : Redémarrer SkyApp**

```powershell
.\stop_skyapp.ps1
.\start_skyapp.ps1
```

---

## 📧 Test de l'envoi d'email

### **Dans l'interface SkyApp** :

1. Connectez-vous en tant qu'Admin
2. Allez dans "Bureau" → "Invitations"
3. Cliquez sur "Nouvelle Invitation"
4. Remplissez :
   - **Email** : email@test.com
   - **Rôle** : Technicien
5. Cliquez sur "Envoyer"

### **Vérifier les logs** :

Regardez dans le terminal backend, vous devriez voir :
```
✅ Email d'invitation envoyé à email@test.com
```

Si vous voyez :
```
⚠️ SMTP non configuré - Email non envoyé
```
→ Vérifiez que `SMTP_USER` et `SMTP_PASSWORD` sont bien renseignés dans `.env`

---

## 🔍 Dépannage

### **Erreur : "Authentication failed"**

→ Le mot de passe d'application est incorrect. Recréez-en un nouveau.

### **Erreur : "SMTP_AUTH_REQUIRED"**

→ Vous n'avez pas activé l'authentification à 2 facteurs sur Gmail.

### **Email arrive en SPAM**

→ Normal pour les premiers envois. Solutions :
1. Configurer SPF/DKIM (avancé)
2. Utiliser SendGrid (professionnel)
3. Demander aux utilisateurs d'ajouter noreply@skyapp.fr aux contacts

### **L'invitation fonctionne mais pas l'email**

→ L'invitation est créée en base de données. L'utilisateur peut :
1. Utiliser le lien manuel affiché dans l'interface
2. Ou vous pouvez lui copier-coller le lien

---

## 🎨 Email d'invitation

Le template d'email contient :
- ✅ Header moderne avec logo SkyApp
- ✅ Informations entreprise et rôle
- ✅ Bouton CTA "Accepter l'invitation"
- ✅ Lien de secours en texte brut
- ✅ Expiration (7 jours)
- ✅ Footer informatif
- ✅ Version HTML + texte brut (compatibilité)

---

## 📊 Alternative : SendGrid (Professionnel)

Si vous voulez un service plus fiable :

### **Avantages** :
- 100 emails/jour gratuits
- Meilleure délivrabilité
- Statistiques d'ouverture
- Pas de problème SPAM

### **Configuration** :

1. Créez un compte sur https://sendgrid.com
2. Obtenez votre API Key
3. Dans `backend/.env`, commentez les lignes SMTP et décommentez :

```env
# Option 1: Gmail SMTP (Recommandé pour commencer)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=votre-email@gmail.com
# SMTP_PASSWORD=votre-mot-de-passe-application

# Option 2: SendGrid (Décommenter pour utiliser SendGrid)
SENDGRID_API_KEY=SG.votre-clé-sendgrid
SENDGRID_FROM_EMAIL=noreply@skyapp.fr
SENDGRID_FROM_NAME=SkyApp BTP
```

4. Redémarrez SkyApp

---

## ✅ Checklist finale

- [ ] Authentification 2FA activée sur Gmail
- [ ] Mot de passe d'application créé
- [ ] Variables SMTP_USER et SMTP_PASSWORD dans .env
- [ ] SkyApp redémarré
- [ ] Test d'invitation envoyé
- [ ] Email reçu (vérifier spams)

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :

1. Vérifiez les logs du backend (terminal)
2. Testez avec un autre email
3. Vérifiez que le mot de passe n'a pas d'espaces
4. Essayez de recréer un mot de passe d'application

**Support** : Les emails d'invitation sont maintenant entièrement fonctionnels ! 🎉
