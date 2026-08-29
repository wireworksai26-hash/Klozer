# Klozer Backend Engine — Panduan Setup & Migrasi Database

Platform Next-Gen AI Conversational Commerce & Smart CRM WhatsApp untuk Bisnis & NGO di Indonesia.

---

## Cara Cepat Menjalankan di Lokal (Local Setup)

### 1. Masuk ke Direktori Backend & Install Dependencies
```bash
cd backend
npm install
```

### 2. Salin Konfigurasi Environment (`.env`)
Pastikan file `.env` sudah ada di folder `backend/`:
```env
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Security & Secret Keys
JWT_SECRET=klozer_ultra_secure_jwt_secret_key_2026_dev_mode
DB_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Database (MySQL 8.0 / phpMyAdmin)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=klozer_db

# Google Gemini AI Model
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

---

## Menjalankan Migrasi & Seed Data

### Opsi A: Menggunakan Script NPM Otomatis (Recommended)
Jalankan migrasi skema tabel dan seeding data secara bersamaan:
```bash
# 1. Jalankan Migrasi 17 Tabel Database & Initial Seed Data
npm run migrate

# 2. (Opsional) Jalankan ulang Seeding Data saja
npm run seed
```

> **Keunggulan Resilient Driver:** Jika MySQL sedang tidak aktif/belum menyala, backend otomatis beralih ke **In-Memory Resilient Engine** dengan seluruh data seed tetap 100% siap digunakan untuk pengujian tanpa hambatan.

### Opsi B: Import Manual via phpMyAdmin / MySQL CLI
Bagi pengguna XAMPP / MySQL Workbench / phpMyAdmin:
1. Buat database baru bernama `klozer_db`.
2. Import file skema: `src/database/schema.sql`.
3. Import file data awal: `src/database/seeds.sql`.

---

## Akun Demo Pengujian (Seed Credentials)

Semua akun hasil seeding menggunakan kata sandi yang sama: **`Klozer123!`**

| Peran (Role) | Alamat Email | Kata Sandi | Deskripsi Hak Akses |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@klozer.id` | `Klozer123!` | Pengelola SaaS multi-tenant platform & server. |
| **Owner / SPV** | `owner@batikmahakarya.id` | `Klozer123!` | Pemilik toko, akses finansial, inventaris & tim CS. |
| **Staf CS 1** | `siti@batikmahakarya.id` | `Klozer123!` | Live WhatsApp inbox, closing order & komisi. |
| **Staf CS 2** | `budi@batikmahakarya.id` | `Klozer123!` | Live chat pelanggan & katalog produk. |
| **Finance** | `finance@batikmahakarya.id` | `Klozer123!` | Mutasi kas, rekonsiliasi pembayaran & laporan. |

---

## Menjalankan Server Backend
```bash
npm run dev
```
Server REST API & Socket.io akan berjalan di `http://localhost:5000/api/v1`.
Endpoint Health Check: `GET http://localhost:5000/health`.
