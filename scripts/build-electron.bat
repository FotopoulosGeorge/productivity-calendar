@echo off
REM scripts/build-electron.bat
REM Windows batch script to build Electron app with Google Drive credentials

echo 🔨 Building Electron app with Google Drive sync...

REM Check if .env file exists
if not exist .env (
    echo ❌ Error: .env file not found!
    echo Create .env file with:
    echo REACT_APP_GOOGLE_CLIENT_ID=your-client-id
    echo REACT_APP_GOOGLE_API_KEY=your-api-key
    pause
    exit /b 1
)

REM Load environment variables from .env file
for /f "usebackq tokens=1,2 delims==" %%i in (.env) do (
    if not "%%i"=="" if not "%%i:~0,1%"=="#" (
        set "%%i=%%j"
    )
)

REM Verify credentials are set
if "%REACT_APP_GOOGLE_CLIENT_ID%"=="" (
    echo ❌ Error: REACT_APP_GOOGLE_CLIENT_ID not found in .env file!
    pause
    exit /b 1
)

if "%REACT_APP_GOOGLE_API_KEY%"=="" (
    echo ❌ Error: REACT_APP_GOOGLE_API_KEY not found in .env file!
    pause
    exit /b 1
)

echo ✅ Google credentials loaded from .env
echo 🔧 Client ID: %REACT_APP_GOOGLE_CLIENT_ID:~0,20%...
echo 🔧 API Key: %REACT_APP_GOOGLE_API_KEY:~0,20%...

REM Build React app first
echo 🔨 Building React app...
call npm run build

if errorlevel 1 (
    echo ❌ React build failed!
    pause
    exit /b 1
)

REM Build Electron app
echo 📦 Building Electron app...
call npm run electron:build

if errorlevel 1 (
    echo ❌ Electron build failed!
    pause
    exit /b 1
)

echo 🎉 Electron build complete!
echo 📁 Built files are in the 'dist' folder
echo.
echo 🔒 Security Note:
echo    - Your Google credentials are now embedded in the app
echo    - This is safe because they're domain-restricted
echo    - Users authenticate with their own Google accounts

pause