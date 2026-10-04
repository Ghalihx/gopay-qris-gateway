#!/bin/bash
# ========================================================
# GoPay QRIS Dynamic Payment Gateway - Auto Installer
# ========================================================

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

set -e

# Warna Terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_NAME="qris-payment-server"

echo -e "${CYAN}========================================================${NC}"
echo -e "${GREEN}    🚀 GoPay QRIS Dynamic Gateway - Installer           ${NC}"
echo -e "${CYAN}========================================================${NC}"

# 1. Periksa Paket Sistem
echo -e "${BLUE}[1/4]${NC} Memeriksa paket dasar sistem..."
sudo apt-get update -y -q
sudo apt-get install -y -q curl wget git build-essential

# 2. Periksa Node.js & NPM
echo -e "${BLUE}[2/4]${NC} Memeriksa runtime Node.js..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
    echo -e "${YELLOW}[INFO]${NC} Memasang Node.js v20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y -q nodejs
fi
echo -e "${GREEN}[OK]${NC} Node.js: $(node -v) | NPM: $(npm -v)"

# 3. Pasang PM2
if ! command -v pm2 >/dev/null 2>&1; then
    echo -e "${YELLOW}[INFO]${NC} Memasang PM2 global..."
    sudo npm install -g pm2
fi

# 4. Install Dependencies
echo -e "${BLUE}[3/4]${NC} Memasang package dependencies..."
npm install --silent

# 5. Konfigurasi .env
if [ ! -f .env ]; then
    echo -e "${BLUE}[4/4]${NC} Menyiapkan konfigurasi .env..."
    cp .env.example .env
    echo -e "${YELLOW}[INFO]${NC} File .env dibuat dari template .env.example"
fi

# 6. Start dengan PM2
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start ecosystem.config.js || pm2 start server.js --name "$APP_NAME"
pm2 save
pm2 startup | tail -n 1 | bash 2>/dev/null || true

echo ""
echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}🎉 INSTALASI SELESAI & SERVER BERJALAN!                  ${NC}"
echo -e "${GREEN}========================================================${NC}"
echo -e "Silakan edit file .env untuk memasukkan QRIS statis toko Anda."
echo -e "Perintah PM2:"
echo -e "  pm2 status          - Cek status"
echo -e "  pm2 logs $APP_NAME  - Lihat log real-time"
echo -e "  pm2 restart $APP_NAME - Restart server"
echo -e "${CYAN}========================================================${NC}"
