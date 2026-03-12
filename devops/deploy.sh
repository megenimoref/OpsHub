#!/bin/bash
set -e

PROJECT_DIR="$HOME/crm/OpsHub"

echo "=== [1/3] Pull latest code ==="
cd "$PROJECT_DIR"
git pull origin main

echo "=== [2/3] Build & restart containers ==="
sudo docker compose --env-file .env -f docker-compose.prod.yml up -d --build

echo "=== [3/3] Health check ==="
sleep 15
sudo docker compose -f docker-compose.prod.yml ps

echo "Deploy complete"
