@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo        MODFORGE AI - WINDOWS BUILD
echo ========================================
echo.
where node >nul 2>nul || (echo Node.js 20+ is required. Install from https://nodejs.org/ & pause & exit /b 1)
where npm >nul 2>nul || (echo npm was not found. Reinstall Node.js. & pause & exit /b 1)
where ollama >nul 2>nul || echo NOTE: Install Ollama from https://ollama.com before generating mods.
echo Installing app dependencies...
call npm install
if errorlevel 1 (echo Dependency installation failed.&pause&exit /b 1)
echo.
echo Building Windows installer and portable EXE...
call npm run dist:win
if errorlevel 1 (echo Build failed. See errors above.&pause&exit /b 1)
echo.
echo SUCCESS. Check the release folder for the EXE files.
pause
