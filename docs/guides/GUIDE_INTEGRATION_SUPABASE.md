# Guide d'Intégration Supabase - SkyApp

## 🚀 Configuration Supabase

### **Étape 1 : Créer un projet Supabase**

1. **Aller sur [supabase.com](https://supabase.com)**
2. **Créer un compte** ou se connecter
3. **Créer un nouveau projet :**
   - Nom du projet : `SkyApp`
   - Organisation : Votre organisation
   - Région : Choisir la plus proche (Europe West pour la France)
   - Mot de passe base de données : Créer un mot de passe fort

### **Étape 2 : Récupérer les clés d'API**

Une fois le projet créé :

1. **Aller dans Settings > API**
2. **Copier les informations suivantes :**
   - **Project URL** : `https://xxxxxxxxxxx.supabase.co`
   - **anon public key** : `eyJhbG...` (clé publique)
   - **service_role key** : `eyJhbG...` (clé privée - à garder secrète)

### **Étape 3 : Configurer les variables d'environnement**

#### **Backend (.env):**
```env
# Supabase Configuration
SUPABASE_URL=https://votre-projet-id.supabase.co
SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_KEY=votre_service_role_key

# Ancienne config MongoDB (à supprimer après migration)
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=skyapp_db

# JWT Configuration (optionnel avec Supabase Auth)
JWT_SECRET=your-secret-key-change-in-production-searchapp
JWT_ALGORITHM=HS256

# Environment
ENVIRONMENT=development
```

#### **Frontend (.env.local):**
```env
REACT_APP_SUPABASE_URL=https://votre-projet-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=votre_anon_key
```

### **Étape 4 : Politiques de sécurité (RLS)**

Supabase utilise Row Level Security (RLS). Après avoir créé les tables, nous devrons :

1. **Activer RLS** sur toutes les tables
2. **Créer des politiques** pour l'authentification
3. **Configurer les permissions** par rôle (ADMIN, BUREAU, TECHNICIEN)

### **Étape 5 : Configuration de l'authentification**

Dans Supabase Dashboard > Authentication > Settings :

1. **Configurer les providers** (Email/Password activé par défaut)
2. **Définir les URLs de redirection** pour l'app React
3. **Configurer les emails** (confirmation, reset password)

---

## 📋 Prochaines étapes d'implémentation

✅ **Terminé :** Installation des dépendances
🔄 **En cours :** Configuration du projet Supabase
⏳ **À faire :** Migration des modèles de données
⏳ **À faire :** Adaptation du backend
⏳ **À faire :** Intégration de l'authentification
⏳ **À faire :** Configuration frontend
⏳ **À faire :** Tests et migration

---

**Après avoir configuré votre projet Supabase, mettez à jour les fichiers .env avec vos vraies clés !**