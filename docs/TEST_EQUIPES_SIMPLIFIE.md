# Test Rapide - Gestion des Équipes

## ✅ Ce qui fonctionne déjà

1. **Backend redémarré** avec les 5 nouveaux endpoints
2. **Composants frontend créés** :
   - `TeamManagementComponent.js` (gestion équipes)
   - `BureauPlanningComponent.js` (calendrier)
   - `MesMissionsComponent.js` (technicien)

## 🔧 Étapes pour tester

### 1. D'ABORD : Appliquer la migration SQL

**Le SQL est déjà copié dans votre presse-papier !**

1. Ouvrez : https://supabase.com/dashboard/project/wursductnatclwrqvgua/editor
2. Cliquez **"New query"**
3. **Ctrl+V** pour coller le SQL
4. Cliquez **"Run"**

Vous devriez voir :
```
✓ Table team_leader_collaborators créée
✓ 4 index créés
✓ 4 policies RLS créées
✓ Vue team_leader_stats créée
```

### 2. Tester dans le navigateur (PLUS SIMPLE)

Au lieu de tester via PowerShell, testez directement l'interface :

#### A. Intégrer le composant

Dans votre fichier de routing ou menu principal, ajoutez :

```javascript
import TeamManagementComponent from './TeamManagementComponent';

// Dans votre menu Planning, ajoutez un onglet:
<Tab value="teams" label="Équipes">
  <TeamManagementComponent />
</Tab>
```

#### B. Accéder à l'interface

1. Connectez-vous à votre app : http://localhost:3002
2. Allez dans **Planning > Équipes**
3. Vous verrez vos chefs d'équipe avec compteur X/10

#### C. Tester l'assignation

1. Sur une carte de chef d'équipe, cliquez **"Ajouter un collaborateur"**
2. Sélectionnez un technicien
3. Cliquez **"Assigner"**
4. Vérifiez que le compteur s'incrémente

### 3. Alternative : Test via l'API directement

Si vous voulez tester l'API sans interface :

```powershell
# 1. Ouvrez votre app dans le navigateur (déjà connecté)
# 2. F12 > Console
# 3. Tapez:

fetch('http://127.0.0.1:8001/api/team-leaders-stats', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(d => console.log(d))

# Vous verrez la liste des chefs avec leurs stats
```

## 📋 Ordre recommandé

1. ✅ Backend redémarré → **FAIT**
2. ⏳ Appliquer migration SQL → **À FAIRE MAINTENANT**
3. ⏳ Intégrer composant dans menu → **Ensuite**
4. ⏳ Tester l'interface → **Puis tester**

## 🚨 Si problème d'authentification

Le token dans localStorage peut expirer. Si vous avez des erreurs 401 :

1. Déconnectez-vous
2. Reconnectez-vous
3. Le token sera rafraîchi
4. Réessayez

## 💡 Plus simple : Testez visuellement

Au lieu de tester via PowerShell, **utilisez l'interface graphique** une fois la migration appliquée et le composant intégré. C'est beaucoup plus intuitif !

---

**PROCHAINE ÉTAPE** : Appliquez la migration SQL dans Supabase (le SQL est dans votre presse-papier)
