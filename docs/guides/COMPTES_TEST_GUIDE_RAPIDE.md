# 🎯 GUIDE RAPIDE - Création des Comptes de Test

## Méthode Simple : Dashboard Supabase

### 1. Ouvrez votre Dashboard Supabase
- Allez sur : https://wursductnatclwrqvgua.supabase.co
- Connectez-vous à votre projet

### 2. Allez dans "Authentication" → "Users"
- Dans le menu de gauche, cliquez sur "Authentication"
- Puis sur "Users" 

### 3. Créez ces 3 comptes de test :

**🔑 COMPTE ADMIN :**
- Email: `admin@skyapp.test`
- Mot de passe: `TestAdmin123!`
- Confirmé: ✅ (cocher "Email confirmed")

**🔑 COMPTE BUREAU :**
- Email: `bureau@skyapp.test`
- Mot de passe: `TestBureau123!`
- Confirmé: ✅ (cocher "Email confirmed")

**🔑 COMPTE TECHNICIEN :**
- Email: `tech@skyapp.test`
- Mot de passe: `TestTech123!`
- Confirmé: ✅ (cocher "Email confirmed")

### 4. Vérifiez le schéma de base de données
- Allez dans "SQL Editor"
- Exécutez le contenu du fichier `supabase_schema.sql`

### 5. Testez l'application
- Démarrez le backend: `python server_supabase.py`
- Démarrez le frontend: `npm start`
- Connectez-vous avec un compte de test

## ✅ COMPTES PRÊTS À UTILISER

Une fois créés manuellement, vous pourrez vous connecter avec :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@skyapp.test | TestAdmin123! |
| Bureau | bureau@skyapp.test | TestBureau123! |
| Technicien | tech@skyapp.test | TestTech123! |

## 🚀 Prochaines étapes

1. **Créer les comptes** dans le dashboard (5 minutes)
2. **Exécuter le schema SQL** (2 minutes)  
3. **Démarrer les serveurs** et tester !

🎉 Votre application sera prête avec des comptes de test fonctionnels !