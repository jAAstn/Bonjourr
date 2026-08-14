@echo off
title Bonjourr - Aenderungen speichern
cd /d "%~dp0"

echo.
echo ============================================
echo  Speichere eigene Aenderungen auf Branch
echo  "newtab"
echo ============================================

git checkout newtab
if errorlevel 1 (
    echo.
    echo FEHLER: Branch "newtab" existiert nicht.
    echo Lege ihn einmalig an:  git checkout -b newtab
    goto ende
)

git add -A
git commit -m "newtab gesichert %date% %time%"
if errorlevel 1 (
    echo.
    echo Es gab nichts zu committen - alles ist bereits gesichert.
) else (
    echo.
    echo FERTIG! Deine Aenderungen sind auf dem Branch gesichert.
)

:ende
echo.
pause
