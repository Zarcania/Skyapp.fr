# Guide de Configuration des Comptes de Test

## 1. Création de Comptes Test dans Supabase

### Étape 1: Accéder à Supabase Dashboard
1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous à votre projet
3. Allez dans "Authentication" → "Users"

### Étape 2: Créer des Utilisateurs de Test
Cliquez sur "Add user" et créez ces comptes de test :

**Compte Admin de Test:**
- Email: `admin@skyapp.test`
- Password: `TestAdmin123!`
- Rôle: Admin

**Compte Utilisateur de Test:**
- Email: `user@skyapp.test` 
- Password: `TestUser123!`
- Rôle: User

**Compte Manager de Test:**
- Email: `manager@skyapp.test`
- Password: `TestManager123!`
- Rôle: Manager

## 2. Configuration pour Tests Locaux

### Données de Test dans la Base de Données

```sql
-- Insérer des entreprises de test
INSERT INTO companies (id, name, address, phone, email) VALUES
('11111111-1111-1111-1111-111111111111', 'Entreprise Test A', '123 Rue de Test, 75001 Paris', '01.23.45.67.89', 'contact@test-a.com'),
('22222222-2222-2222-2222-222222222222', 'Entreprise Test B', '456 Avenue de Test, 69000 Lyon', '04.56.78.90.12', 'info@test-b.com');

-- Insérer des matériaux de test
INSERT INTO materials (id, name, category, unit_price, description) VALUES
('aaaa1111-1111-1111-1111-111111111111', 'Béton Standard', 'Construction', 85.50, 'Béton pour fondations et structures'),
('bbbb2222-2222-2222-2222-222222222222', 'Acier Renforcé', 'Métal', 125.75, 'Acier haute résistance pour charpentes'),
('cccc3333-3333-3333-3333-333333333333', 'Isolation Thermique', 'Isolation', 45.20, 'Panneaux isolants haute performance');

-- Insérer des clients de test
INSERT INTO clients (id, company_id, name, email, phone, address) VALUES
('client01-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Jean Dupont', 'jean.dupont@email.com', '06.12.34.56.78', '789 Boulevard Test, 75015 Paris'),
('client02-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Marie Martin', 'marie.martin@email.com', '06.98.76.54.32', '321 Rue de la Paix, 69003 Lyon');
```

## 3. Variables d'Environnement pour Tests

Créez un fichier `.env.test` :

```env
# Supabase Test Configuration
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Test Mode
REACT_APP_ENVIRONMENT=test
REACT_APP_API_BASE_URL=http://localhost:8080/api

# Test Database
REACT_APP_TEST_MODE=true
```

## 4. Utilisation des Comptes de Test

### Pour l'Application React:
1. Démarrez le frontend: `npm start`
2. Utilisez un des comptes de test pour vous connecter
3. Testez toutes les fonctionnalités

### Pour les Tests Backend:
```python
# Dans vos fichiers de test Python
TEST_USERS = {
    "admin": {
        "email": "admin@skyapp.test",
        "password": "TestAdmin123!"
    },
    "user": {
        "email": "user@skyapp.test", 
        "password": "TestUser123!"
    },
    "manager": {
        "email": "manager@skyapp.test",
        "password": "TestManager123!"
    }
}
```

## 5. Script de Réinitialisation des Données de Test

Créez ce script pour réinitialiser les données :

```python
# reset_test_data.py
import os
from supabase import create_client, Client

def reset_test_data():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(url, key)
    
    # Supprimer toutes les données de test
    supabase.table('quotes').delete().neq('id', '').execute()
    supabase.table('clients').delete().neq('id', '').execute()
    supabase.table('companies').delete().neq('id', '').execute()
    
    # Réinsérer les données de test
    # ... code d'insertion ...
    
if __name__ == "__main__":
    reset_test_data()
```

## 6. Sécurité pour les Tests

⚠️ **IMPORTANT**: Ces comptes sont uniquement pour les tests locaux !

- N'utilisez jamais ces identifiants en production
- Changez les mots de passe avant la mise en production
- Supprimez les comptes de test avant le déploiement final

## 7. Tests Automatisés

Pour exécuter les tests avec ces comptes :

```bash
# Backend tests
cd backend
python -m pytest tests/ -v

# Frontend tests  
cd frontend
npm test
```

## Prochaines Étapes

1. Créez votre projet Supabase
2. Configurez l'authentification
3. Créez ces comptes de test
4. Insérez les données de test
5. Testez l'application complète