#!/bin/bash
set -e

PROJECT_DIR="$HOME/crm/OpsHub"
COMPOSE="sudo docker compose --env-file .env -f docker-compose.prod.yml"

cd "$PROJECT_DIR"

echo "=== [1/3] Remove orphan containers ==="
$COMPOSE down --remove-orphans 2>/dev/null || true

echo "=== [2/3] Build & start ==="
$COMPOSE up -d --build

echo "=== [3/3] Health check ==="
sleep 15
$COMPOSE ps

echo "Deploy complete"
