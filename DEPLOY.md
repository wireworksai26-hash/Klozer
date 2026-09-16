# 🚀 Panduan Lengkap Deploy Klozer ke VPS (Ubuntu / Debian)

Dokumentasi ini menjelaskan langkah-langkah praktis untuk mendeploy platform **Klozer** (Next-Gen AI Conversational Commerce & CRM) ke VPS (seperti DigitalOcean, Linode, AWS EC2, Biznet Gio, IDCloudHost, Niagahoster, atau Contabo).

---

## 📋 1. Kebutuhan Sistem Minimum VPS

Untuk performa optimal (Next.js SSR + Express API + MySQL 8.0 + LLM Telemetry):
- **OS**: Ubuntu 22.04 LTS atau Ubuntu 24.04 LTS (64-bit)
- **RAM**: Minimal 2 GB (Disarankan 4 GB untuk build Next.js)
- **CPU**: 2 vCPU Core
- **Penyimpanan**: SSD/NVMe minimal 25 GB
- **Domain**: Sudah memiliki domain / subdomain (misal: `app.bisnisanda.com`) yang diarahkan A Record ke IP Publik VPS.

---

## 🛠️ Pilihan Metode Deployment

Tersedia 2 metode deployment yang bisa Anda pilih sesuai kebutuhan:
1. **Metode A (Rekomendasi Utama)**: **Docker & Docker Compose** (Cepat, bersih, terisolasi, 1-perintah).
2. **Metode B (Tradisional)**: **PM2 + Nginx + MySQL Native**.

---

## 🐳 METODE A: Deploy Menggunakan Docker & Docker Compose (Paling Praktis)

Metode ini otomatis menjalankan MySQL 8.0, Backend Express, Frontend Next.js, dan Nginx Reverse Proxy dalam container terisolasi.

### Langkah 1: Hubungkan ke VPS melalui SSH
Buka Terminal / PowerShell di komputer Anda:
```bash
ssh root@IP_VPS_ANDA
```

### Langkah 2: Install Docker & Docker Compose di VPS
Jalankan script instalasi resmi Docker:
```bash
# Update repository
sudo apt update && sudo apt upgrade -y

# Install Docker otomatis
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verifikasi Docker & Docker Compose
docker --version
docker compose version
```

### Langkah 3: Clone Repository Klozer
```bash
git clone https://github.com/ethermindagency/Klozer.git
cd Klozer
```

### Langkah 4: Siapkan Konfigurasi Lingkungan (`.env`)
Salin file konfigurasi backend:
```bash
cp backend/.env.example backend/.env
nano backend/.env
```
> *Tips Edit Nano*: Gunakan panah untuk navigasi, sesuaikan kredensial API (`NVIDIA_API_KEY`, `GEMINI_API_KEY`, dll.), tekan `Ctrl + O` lalu `Enter` untuk simpan, dan `Ctrl + X` untuk keluar.

### Langkah 5: Jalankan Seluruh Sistem dengan Docker Compose
```bash
docker compose up -d --build
```
Docker akan otomatis mengunduh image, melakukan build container backend & frontend, serta mengaktifkan Nginx.

### Langkah 6: Jalankan Migrasi & Database Seeder
Setelah container aktif, buat tabel database:
```bash
docker compose exec backend npm run migrate
docker compose exec backend npm run seed
```

**Selesai!** Platform Klozer sekarang sudah aktif dan dapat diakses langsung melalui browser di:
`http://IP_VPS_ANDA`

---

## ⚡ METODE B: Deploy Manual Menggunakan PM2, Nginx & MySQL Native

Gunakan metode ini jika Anda ingin mengelola service secara native tanpa Docker.

### Langkah 1: Update VPS & Install Node.js 20 LTS
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 Process Manager secara global
sudo npm install -g pm2
```

### Langkah 2: Install & Konfigurasi MySQL Server
```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```
Masuk ke prompt MySQL untuk membuat database dan user:
```bash
sudo mysql
```
Jalankan perintah SQL berikut:
```sql
CREATE DATABASE klozer_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'klozer_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'PasswordKlozerKuat2026!';
GRANT ALL PRIVILEGES ON klozer_db.* TO 'klozer_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Langkah 3: Clone Repository Klozer
```bash
cd /var/www
sudo git clone https://github.com/ethermindagency/Klozer.git klozer
sudo chown -R $USER:$USER /var/www/klozer
cd /var/www/klozer
```

### Langkah 4: Setup & Jalankan Backend
```bash
cd /var/www/klozer/backend
cp .env.example .env
nano .env
```
Sesuaikan isi `.env`:
```ini
PORT=5000
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=klozer_user
DB_PASSWORD=PasswordKlozerKuat2026!
DB_NAME=klozer_db
JWT_SECRET=klozer_ultra_secure_jwt_secret_key_prod_2026
```
Install dependensi dan migrasi database:
```bash
npm install --omit=dev
npm run migrate
npm run seed
```
Jalankan backend dengan PM2:
```bash
pm2 start src/server.js --name klozer-backend
```

### Langkah 5: Setup & Jalankan Frontend Next.js
```bash
cd /var/www/klozer/frontend
npm install
npm run build
```
Jalankan frontend dengan PM2:
```bash
pm2 start npm --name klozer-frontend -- start
```
Simpan proses PM2 agar otomatis start saat VPS reboot:
```bash
pm2 startup
# Salin dan jalankan baris perintah yang dimunculkan oleh pm2 di terminal Anda
pm2 save
```

### Langkah 6: Konfigurasi Nginx Reverse Proxy
Buat file konfigurasi Nginx:
```bash
sudo nano /etc/nginx/sites-available/klozer
```
Isi dengan konfigurasi berikut (ganti `domainanda.com` dengan domain Anda):
```nginx
server {
    listen 80;
    server_name domainanda.com www.domainanda.com;

    client_max_body_size 25M;

    # Frontend Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API Express
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Socket.io Gateway
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Aktifkan konfigurasi Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/klozer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 3. Setup SSL HTTPS Gratis (Certbot Let's Encrypt)

Untuk mengaktifkan gembok hijau HTTPS dan keamanan transaksi perbankan / QRIS:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domainanda.com -d www.domainanda.com
```
Certbot akan otomatis memperbarui konfigurasi SSL Nginx dan menyetel auto-renewal berkala.

---

## 🌐 4. Konfigurasi Webhook WhatsApp & Payment Gateway

Setelah domain ber-SSL aktif (`https://domainanda.com`):
1. **Meta WhatsApp Cloud API Webhook**:
   - Webhook URL: `https://domainanda.com/api/v1/webhook/whatsapp`
   - Verify Token: Isikan token yang Anda buat di file `.env` (`META_WEBHOOK_VERIFY_TOKEN`).
2. **Midtrans / Xendit Webhook**:
   - Webhook URL: `https://domainanda.com/api/v1/payments/webhook`

---

## 🔄 5. Perintah Pemeliharaan & Update Kode Selanjutnya

Ketika ada update kode baru dari GitHub:

### Jika Menggunakan Docker:
```bash
cd /path/to/Klozer
git pull origin main
docker compose up -d --build
docker compose exec backend npm run migrate
```

### Jika Menggunakan PM2:
```bash
cd /var/www/klozer
git pull origin main

# Update Backend
cd backend && npm install && npm run migrate && pm2 restart klozer-backend

# Update Frontend
cd ../frontend && npm install && npm run build && pm2 restart klozer-frontend
```

### Cek Status & Log Aplikasi:
```bash
# Cek status proses
pm2 status

# Cek log error backend real-time
pm2 logs klozer-backend

# Jika menggunakan docker:
docker compose logs -f --tail=50
```
