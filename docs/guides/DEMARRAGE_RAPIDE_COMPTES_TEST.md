🚀 GUIDE DE DÉMARRAGE RAPIDE - SkyApp avec Comptes de Test

✅ VOS COMPTES DE TEST SONT PRÊTS !

📧 IDENTIFIANTS DE CONNEXION :
================================
🔑 ADMIN : jordancorradi91540@gmail.com / TestAdmin123!
🔑 BUREAU : jordancorradi+bureau@gmail.com / TestBureau123! 
🔑 TECHNICIEN : jordancorradi+tech@gmail.com / TestTech123!

📋 ÉTAPES DE DÉMARRAGE :

1. ⚡ CRÉER LE SCHÉMA DATABASE
   - Allez sur : https://wursductnatclwrqvgua.supabase.co
   - Cliquez "SQL Editor"
   - Copiez le contenu de "supabase_schema.sql"
   - Exécutez le script SQL

2. 🎯 DÉMARRER LE FRONTEND (Terminal 1)
   Ouvrez PowerShell et tapez :
   ```
   cd "C:\Users\jorda\Downloads\Skyapp-conflict_141025_2250\Skyapp-conflict_141025_2250\frontend"
   $env:PORT=3001
   npm start
   ```
   ➡️ Ouvrira http://localhost:3001

3. 🔧 DÉMARRER LE BACKEND (Terminal 2)
   Ouvrez un NOUVEAU PowerShell et tapez :
   ```
   cd "C:\Users\jorda\Downloads\Skyapp-conflict_141025_2250\Skyapp-conflict_141025_2250\backend"
   python server.py
   ```
   ➡️ API sur http://localhost:8000

4. 🎉 TESTER L'APPLICATION
   - Allez sur http://localhost:3001
   - Cliquez "Se connecter" 
   - Utilisez un des comptes ci-dessus
   - Testez toutes les fonctionnalités !

⚠️ IMPORTANT :
- Gardez les 2 terminaux ouverts
- Si erreur backend, vérifiez que MongoDB est installé
- Pour Supabase complet, utilisez server_supabase.py (quand prêt)

🎯 OBJECTIF : Tester toute l'application avec vos comptes !

═══════════════════════════════════════════════════════════
🆕 SUPABASE INTÉGRATION COMPLÈTE DISPONIBLE !

Tous les fichiers sont prêts pour passer à Supabase :
✅ Configuration (.env)
✅ Schéma database (supabase_schema.sql)  
✅ Backend adapté (server_supabase.py)
✅ Frontend configuré (composants Supabase)
✅ Comptes de test créés

📖 Consultez GUIDE_MIGRATION_SUPABASE_COMPLETE.md pour plus de détails.
═══════════════════════════════════════════════════════════