#!/bin/bash
set -e

PROJECT_DIR="$HOME/crm/OpsHub"

echo "=== [1/2] Build & restart containers ==="
cd "$PROJECT_DIR"
sudo docker compose --env-file .env -f docker-compose.prod.yml up -d --build

echo "=== [2/2] Health check ==="
sleep 15
sudo docker compose -f docker-compose.prod.yml ps

echo "Deploy complete"
