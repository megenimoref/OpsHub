#!/bin/bash

# CRM Project Setup Script for macOS/Linux

echo "========================================"
echo "CRM Application - Setup Script"
echo "========================================"
echo ""

# Check if Node.js is installed
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo ""
    echo "ERROR: Node.js is not installed."
    echo ""
    echo "Please install Node.js 18+ from: https://nodejs.org/"
    echo ""
    echo "Or using Homebrew (macOS):"
    echo "  brew install node"
    echo ""
    echo "Or using apt (Ubuntu/Debian):"
    echo "  sudo apt-get install nodejs npm"
    echo ""
    exit 1
fi

echo "[OK] Node.js is installed:"
node --version
npm --version
echo ""

# Create .env files from examples
echo "Creating environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "[OK] Created backend/.env"
else
    echo "[SKIP] backend/.env already exists"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "[OK] Created frontend/.env"
else
    echo "[SKIP] frontend/.env already exists"
fi

echo ""
echo "========================================"
echo "Installing dependencies..."
echo "========================================"
echo ""

# Install backend dependencies
echo "[1/2] Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Backend installation failed"
    exit 1
fi
cd ..
echo "[OK] Backend installed"
echo ""

# Install frontend dependencies
echo "[2/2] Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend installation failed"
    exit 1
fi
cd ..
echo "[OK] Frontend installed"
echo ""

echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Start MySQL:       docker-compose up -d"
echo "2. Start Backend:     cd backend && npm run dev"
echo "3. Start Frontend:    cd frontend && npm run dev"
echo ""
echo "Default credentials:"
echo "  Email: admin@crm.com"
echo "  Password: admin123"
echo ""
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo ""
