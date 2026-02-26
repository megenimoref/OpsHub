#!/bin/bash
###############################################
# CRM - CentOS Package Installation Script
# Run as root: sudo bash 01-install-packages.sh
###############################################

set -e

echo "=========================================="
echo "  CRM - Installing Required Packages"
echo "=========================================="

# Update system
echo "[1/6] Updating system packages..."
dnf update -y

# Install EPEL repository
echo "[2/6] Installing EPEL repository..."
dnf install -y epel-release

# Install Node.js 20 LTS
echo "[3/6] Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install MariaDB 11
echo "[4/6] Installing MariaDB..."
cat > /etc/yum.repos.d/mariadb.repo << 'REPO'
[mariadb]
name = MariaDB
baseurl = https://mirror.mariadb.org/yum/11.4/centos/$releasever/$basearch
gpgkey = https://mirror.mariadb.org/yum/RPM-GPG-KEY-MariaDB
gpgcheck = 1
enabled = 1
module_hotfixes = 1
REPO

dnf install -y MariaDB-server MariaDB-client

# Start and enable MariaDB
systemctl start mariadb
systemctl enable mariadb

echo "[4/6] Setting up CRM database..."
mysql -u root << 'SQL'
CREATE DATABASE IF NOT EXISTS crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'crm_user'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON crm.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "MariaDB version: $(mysql --version)"

# Install Nginx
echo "[5/6] Installing Nginx..."
dnf install -y nginx
systemctl enable nginx

# Install additional tools
echo "[6/6] Installing additional tools..."
dnf install -y git curl wget firewalld

# Configure firewall
systemctl start firewalld
systemctl enable firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "Installed:"
echo "  - Node.js $(node -v)"
echo "  - npm $(npm -v)"
echo "  - MariaDB (port 3306)"
echo "  - Nginx"
echo "  - Firewall (HTTP/HTTPS open)"
echo ""
echo "IMPORTANT:"
echo "  1. Run: mysql_secure_installation"
echo "  2. Change DB password in the backend .env file"
echo "  3. Run script 02 for backend setup"
echo "  4. Run script 03 for frontend setup"
echo ""
