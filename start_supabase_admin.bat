@echo off
:: Script pour démarrer Supabase en libérant les ports bloqués
:: Ce script demande automatiquement les droits administrateur

:: Vérifier si on a les droits admin
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Execution avec droits administrateur...
    goto :admin
) else (
    echo Demande d'elevation des privileges...
    goto :elevate
)

:elevate
:: Créer un VBScript temporaire pour demander l'élévation
echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
"%temp%\getadmin.vbs"
del "%temp%\getadmin.vbs"
exit /B

:admin
cd /d "%~dp0"
echo.
echo Arret du service NAT Windows...
net stop winnat

echo.
echo Demarrage de Supabase...
supabase start

echo.
echo Redemarrage du service NAT...
net start winnat

echo.
echo ===================================================
echo Supabase devrait maintenant etre demarre !
echo ===================================================
pause
