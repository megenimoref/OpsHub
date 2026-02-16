@echo off
REM CRM Project Setup Script for Windows

echo ========================================
echo CRM Application - Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js is not installed or not in PATH.
    echo.
    echo Please install Node.js 18+ from: https://nodejs.org/
    echo.
    echo After installation:
    echo 1. Restart PowerShell/CMD
    echo 2. Run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js is installed: 
node --version
npm --version
echo.

REM Create .env files from examples
echo Creating environment files...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo [OK] Created backend\.env
) else (
    echo [SKIP] backend\.env already exists
)

if not exist frontend\.env (
    copy frontend\.env.example frontend\.env
    echo [OK] Created frontend\.env
) else (
    echo [SKIP] frontend\.env already exists
)

echo.
echo ========================================
echo Installing dependencies...
echo ========================================
echo.

REM Install backend dependencies
echo [1/2] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend installation failed
    pause
    exit /b 1
)
cd ..
echo [OK] Backend installed
echo.

REM Install frontend dependencies
echo [2/2] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend installation failed
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend installed
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Start MySQL: docker-compose up -d
echo 2. Start Backend: cd backend ^&^& npm run dev
echo 3. Start Frontend: cd frontend ^&^& npm run dev
echo.
echo Default credentials:
echo   Email: admin@crm.com
echo   Password: admin123
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
pause
