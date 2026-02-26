#!/bin/bash
###############################################
# CRM - Frontend Setup with Nginx
# Run as root: sudo bash 03-setup-frontend.sh
###############################################

set -e

FRONTEND_SRC="/root/CRM/frontend"
WEB_DIR="/var/www/crm"

# Auto-detect public IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo "=========================================="
echo "  CRM - Frontend Setup (Nginx)"
echo "  Server IP: ${SERVER_IP}"
echo "=========================================="

# Build frontend
echo "[1/4] Building frontend..."
cd "$FRONTEND_SRC"

# Set production API URL using public IP
cat > .env.production << ENV
VITE_API_URL=http://${SERVER_IP}/api
ENV

npm ci 2>/dev/null || npm install
npm run build

# Copy built files to web directory
echo "[2/4] Deploying to ${WEB_DIR}..."
mkdir -p "$WEB_DIR"
cp -r "$FRONTEND_SRC/dist/"* "$WEB_DIR/"
chown -R nginx:nginx "$WEB_DIR"

# Configure Nginx
echo "[3/4] Configuring Nginx..."
cat > /etc/nginx/conf.d/crm.conf << NGINX
server {
    listen 80;
    server_name ${SERVER_IP} _;

    # Frontend - static files
    root /var/www/crm;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)\$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API reverse proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket support (if needed)
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # SPA - all routes go to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Block access to hidden files
    location ~ /\. {
        deny all;
    }
}
NGINX

# Test and start Nginx
echo "[4/4] Starting Nginx..."
nginx -t
systemctl restart nginx
systemctl enable nginx

# SELinux - allow Nginx to connect to backend
setsebool -P httpd_can_network_connect 1 2>/dev/null || true

echo ""
echo "=========================================="
echo "  Frontend Setup Complete!"
echo "=========================================="
echo ""
echo "Site deployed to: ${WEB_DIR}"
echo "Nginx config:     /etc/nginx/conf.d/crm.conf"
echo ""
echo "Access the site at: http://${SERVER_IP}"
echo ""
echo "Also update the backend .env.production:"
echo "  CORS_ORIGIN=http://${SERVER_IP}"
echo "  Then run: systemctl restart crm-backend"
echo ""
