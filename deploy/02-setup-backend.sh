#!/bin/bash
###############################################
# CRM - Backend Setup as systemd Service
# Run as root: sudo bash 02-setup-backend.sh
#
# FIXED:
# - Detect project directory relative to this script (works from any cwd)
# - Copy backend from <project_root>/backend instead of /root/CRM/backend
# - Use mariadb/mysql client whichever exists
###############################################

set -euo pipefail

APP_DIR="/opt/crm/backend"
APP_USER="crm"
SERVICE_NAME="crm-backend"

# Detect project root (assumes this script lives in <project_root>/deploy)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Pick DB client (MariaDB on OL9 typically provides mariadb, sometimes mysql symlink exists)
if command -v mariadb >/dev/null 2>&1; then
  DBCLI="mariadb"
else
  DBCLI="mysql"
fi

echo "=========================================="
echo "  CRM - Backend Setup (systemd)"
echo "=========================================="
echo "Project dir: ${PROJECT_DIR}"

# Create app user
echo "[1/6] Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -m -s /bin/bash "$APP_USER"
    echo "User '$APP_USER' created."
else
    echo "User '$APP_USER' already exists."
fi

# Copy project files
echo "[2/6] Copying backend files..."
mkdir -p "$APP_DIR"

if [ ! -d "${PROJECT_DIR}/backend" ]; then
  echo "ERROR: Backend directory not found at: ${PROJECT_DIR}/backend"
  echo "Make sure your repo has a 'backend' folder next to 'deploy'."
  exit 1
fi

# Copy backend content into /opt/crm/backend
# (You can change this to rsync if you prefer incremental updates.)
cp -r "${PROJECT_DIR}/backend/"* "$APP_DIR/"

# Install dependencies and build
echo "[3/6] Installing dependencies & building..."
cd "$APP_DIR"
npm ci --omit=dev 2>/dev/null || npm install --omit=dev
npm run build

# Import database schema
echo "[4/6] Importing database schema..."
if [ -f "$APP_DIR/src/migrations/schema.sql" ]; then
    # Run as root (sudo) so unix_socket auth works when enabled
    $DBCLI -u root crm < "$APP_DIR/src/migrations/schema.sql" 2>/dev/null || echo "Schema already exists or applied."
fi

# Setup .env for production
echo "[5/6] Configuring environment..."
if [ ! -f "$APP_DIR/.env" ]; then
    cat > "$APP_DIR/.env" << 'ENV'
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_NAME=crm
DB_USER=crm_user
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
JWT_SECRET=CHANGE_ME_GENERATE_RANDOM_64_CHARS
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://YOUR_SERVER_IP
ENV
    echo "Created .env - EDIT IT WITH REAL VALUES!"
else
    echo ".env already exists."
fi

# Set permissions
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# Create systemd service
echo "[6/6] Creating systemd service..."
cat > /etc/systemd/system/${SERVICE_NAME}.service << SERVICE
[Unit]
Description=CRM Backend API
After=network.target mariadb.service
Requires=mariadb.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/dist/app.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=${APP_DIR}
ProtectHome=true
PrivateTmp=true

# Memory limit
MemoryMax=512M

[Install]
WantedBy=multi-user.target
SERVICE

# Enable and start
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

echo ""
echo "=========================================="
echo "  Backend Setup Complete!"
echo "=========================================="
echo ""
echo "Service: ${SERVICE_NAME}"
echo "Status:  systemctl status ${SERVICE_NAME}"
echo "Logs:    journalctl -u ${SERVICE_NAME} -f"
echo "Restart: systemctl restart ${SERVICE_NAME}"
echo ""
echo "IMPORTANT:"
echo "  1. Edit ${APP_DIR}/.env with real values!"
echo "  2. Change DB_PASSWORD and JWT_SECRET!"
echo "  3. Set CORS_ORIGIN to http://YOUR_SERVER_IP"
echo "  4. Then run: systemctl restart ${SERVICE_NAME}"
echo ""
