@echo off
echo.
echo ===================================================
echo   Avvio del Validatore 5 Stelle LOD - Tesi Poliba
echo ===================================================
echo.
echo Avvio del Backend in corso...
start cmd /k "cd backend && npm install && npm run dev"

echo Avvio del Frontend in corso...
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo I server sono in fase di avvio. Controlla le finestre!
pause