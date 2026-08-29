# Klozer.id — AI Conversational Commerce & Multi-Tenant CRM Platform

Platform otomatisasi penjualan WhatsApp, In-Chat Dynamic QRIS, AI Voice Note Transcription, dan Smart CRM Multi-Tenant untuk bisnis retail, kuliner, fesyen, layanan jasa, hingga lembaga sosial (NGO).

---

## Ringkasan Fitur Utama

- **Multi-Tenant Architecture**: Isolasi data penuh antar-instansi. Pendaftaran instansi otomatis men-generate akun Owner dan 2 akun Customer Service (CS 1 & CS 2).
- **In-Chat Dynamic QRIS**: Pembuatan QRIS dinamis otomatis dalam obrolan WhatsApp dengan biaya flat Rp 750 per transaksi sukses.
- **AI Brain & Guardrails**: Terintegrasi dengan Google Gemini AI (`gemini-3.5-flash-lite`) dengan filter keamanan anti-prompt injection dan eskalasi otomatis ke human CS.
- **AI Voice Note Recognition**: Transkripsi dan ekstraksi entitas pesanan otomatis dari pesan suara pelanggan bahasa Indonesia.
- **Anti-Fraud & OCR Receipt Scanner**: Verifikasi keaslian bukti transfer bank via OCR untuk mencegah penipuan struk palsu.
- **Meta Conversions API (CAPI)**: Pengiriman event pembelian *server-side* langsung ke Meta Ads Manager secara real-time.
- **Manajemen Komisi CS & Live Chat**: Monitoring performa CS, sistem bagi hasil komisi otomatis, dan routing percakapan pelanggan.

---

## Arsitektur & Struktur Direktori

```text
Klozer.id/
├── backend/                  # REST API Server & Layanan AI / Webhook
│   ├── src/
│   │   ├── config/           # Konfigurasi DB (MySQL & In-Memory Store) & Environment
│   │   ├── controllers/      # Auth, AI, Leads, Orders, Products, Fraud, Reports
│   │   ├── database/         # Schema SQL (17 tabel), Seeds SQL, & Migrator
│   │   ├── middlewares/      # JWT Authentication, RBAC, Multi-Tenant Scoping
│   │   ├── routes/           # REST API Endpoint Routing
│   │   ├── services/         # Gemini AI, QRIS, Meta CAPI, OCR, Voice Note
│   │   └── utils/            # Kriptografi, Validator HMAC, Helper Pagination
│   ├── .env.example          # Template konfigurasi backend
│   └── package.json
│
├── frontend/                 # Web Dashboard & Landing Page (Next.js 16)
│   ├── public/               # Asset SVG, Favicon, & Gambar Industri
│   ├── src/
│   │   ├── app/              # Next.js App Router (Landing, Login, Register, Dashboard)
│   │   ├── components/       # Komponen Landing, Dashboard, & SVG Icon Set
│   │   ├── context/          # Dashboard Global State Context (Multi-Tenant)
│   │   └── hooks/            # Custom Hooks (GSAP Animations)
│   ├── .env.example          # Template konfigurasi frontend
│   └── package.json
│
├── DESIGN.md                 # Design System & Pedoman Antarmuka
├── PRD-AI-CONVERSATIONAL-COMMERCE-CRM.md
├── SCHEMA-AI-CONVERSATIONAL-COMMERCE-CRM.md
└── README.md
```

---

## Panduan Instalasi Lokal (Quick Start)

### 1. Kebutuhan Sistem
- **Node.js**: Versi 18.x atau lebih baru
- **MySQL**: Versi 8.0+ (Opsional jika menggunakan mode database lokal)
- **NPM / Yarn / PNPM**

---

### 2. Setup Backend Server

1. Buka terminal dan masuk ke direktori `backend/`:
   ```bash
   cd backend
   npm install
   ```

2. Buat file `.env` dari template:
   ```bash
   cp .env.example .env
   ```

3. Sesuaikan konfigurasi `.env`:
   ```env
   PORT=5000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=klozer_db

   JWT_SECRET=klozer_ultra_secure_jwt_secret_key_2026
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```

4. Jalankan migrasi dan seed database:
   ```bash
   npm run migrate
   ```

5. Jalankan backend development server:
   ```bash
   npm run dev
   ```
   *Backend akan berjalan di `http://localhost:5000`*.

---

### 3. Setup Frontend Client

1. Buka terminal baru dan masuk ke direktori `frontend/`:
   ```bash
   cd frontend
   npm install
   ```

2. Jalankan frontend development server:
   ```bash
   npm run dev
   ```
   *Frontend akan berjalan di `http://localhost:3000`*.

---

## Akun Uji Coba Default (Seed Accounts)

Seluruh akun default menggunakan kata sandi: `Klozer123!`

| Peran (Role) | Email | Deskripsi Hak Akses |
| :--- | :--- | :--- |
| **Superadmin** | `superadmin@klozer.id` | Akses penuh seluruh instansi, analitik server, dan kuota AI |
| **Owner (Batik Mahakarya)** | `owner@batikmahakarya.id` | Manajemen produk, keuangan, komisi tim, dan integrasi WA |
| **CS 1 (Frontliner)** | `siti@batikmahakarya.id` | Inbox chat pelanggan, pembuatan transaksi QRIS dinamis |
| **CS 2 (Frontliner)** | `budi@batikmahakarya.id` | Inbox chat pelanggan, booking reservasi |
| **Finance** | `finance@batikmahakarya.id` | Rekonsiliasi mutasi bank, invoice, dan laporan laba-rugi |

---

## Endpoint API Inti

| Method | Endpoint | Deskripsi | Autentikasi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Login pengguna & penerbitan JWT | Publik |
| `POST` | `/api/v1/auth/register` | Pendaftaran instansi baru & auto-generate Owner + CS | Publik |
| `GET` | `/api/v1/auth/me` | Profil pengguna yang sedang login | Bearer Token |
| `POST` | `/api/v1/ai/ask` | Endpoint AI Assistant dengan Guardrails | Publik / Token |
| `GET` | `/api/v1/leads` | Daftar kontak & CRM leads (Multi-Tenant) | Bearer Token |
| `GET` | `/api/v1/orders` | Daftar transaksi pesanan (Multi-Tenant) | Bearer Token |
| `GET` | `/api/v1/products` | Katalog produk ber-HPP & stok | Bearer Token |
| `POST` | `/api/v1/payments/qris/generate` | Pembuatan Dynamic QRIS resmi Bank Indonesia | Bearer Token |
| `POST` | `/api/v1/webhook/whatsapp` | Webhook Meta WhatsApp Cloud API | Signature Meta |

---

## Keamanan & Kepatuhan Data

- Seluruh secret API keys dilindungi melalui `.gitignore`.
- Password dienkripsi menggunakan standard `bcrypt` hashing.
- Query database difilter secara ketat dengan `institution_id` untuk menjamin privasi data antar-perusahaan.
- Validasi webhook Meta menggunakan verifikasi signature SHA256 HMAC.
