# Klozer.id: AI Conversational Commerce dan CRM Multi-Tenant

Platform penjualan lewat WhatsApp untuk bisnis retail, kuliner, fesyen, jasa, dan lembaga sosial. AI membalas pelanggan memakai data toko Anda sendiri, QRIS diterbitkan dari chat, dan setiap bisnis (tenant) terisolasi penuh dari bisnis lain.

## Yang sudah berfungsi

- **Multi-tenant**: setiap query dibatasi `institution_id` dari token sesi, bukan dari input klien. Peran: superadmin, owner, supervisor, finance, CS, PIC gudang.
- **Live Chat WhatsApp** (Meta Cloud API): pesan masuk tampil realtime (Socket.io), balasan CS dikirim lewat nomor tenant. Tanda tangan webhook diperiksa dan pesan ganda dari retry Meta diabaikan.
- **Balasan AI**: NVIDIA NIM dengan failover Gemini. AI hanya memakai katalog aktif, stok, rekening terdaftar, dan persona tenant. Kuota token per tenant dicatat. Jika AI tidak tersedia, kuota habis, atau pelanggan mengirim gambar/suara, percakapan diteruskan ke CS dan muncul notifikasi.
- **Omnichannel**: selain WhatsApp, Instagram DM, Facebook Messenger, Telegram, dan live chat di website sendiri masuk ke satu inbox dan satu AI. Lihat DEPLOY.md.
- **Banyak nomor dan pembagian chat**: tiap tenant bisa menghubungkan beberapa nomor WhatsApp (sesuai paket), chat baru dibagikan ke CS yang online (paling sedikit chat atau bergiliran), dan AI menyerahkan percakapan ke manusia saat pelanggan minta atau pesannya berisiko. Lihat DEPLOY.md.
- **Pesanan**: harga dan HPP selalu dihitung server, stok tidak bisa oversell (diuji dengan pembelian paralel), alur status dijaga, pembatalan mengembalikan stok.
- **QRIS (iPaymu)**: nominal dari pesanan di server, webhook diverifikasi tanda tangan dan nominalnya, notifikasi ganda diproses sekali, komisi CS dihitung sekali.
- **Laporan dan keuangan** dari data nyata, komisi CS, rekening pembayaran, log aktivitas (audit), impor produk dan stok dari Excel.
- **Keamanan**: password bcrypt, kunci akun setelah gagal berulang, token dicabut seketika saat staf dinonaktifkan atau password diganti, token WhatsApp dienkripsi AES-256-GCM, pembatas laju, header keamanan, konfigurasi production gagal-cepat bila secret lemah.

Modul yang belum terhubung ke backend (label AI, broadcast, Instagram, gudang multi-lokasi, chat internal, template pesan, etalase publik) tidak ditampilkan di menu. Halamannya menyatakan "Belum tersedia" dan tidak menampilkan data contoh.

## Struktur

```text
backend/    Express API, migrasi MySQL (src/database/migrations), test (test/)
frontend/   Next.js 16 dashboard dan landing page
scripts/    backup.sh dan restore.sh untuk MySQL
Caddyfile, docker-compose.yml, .env.example   deployment production
```

## Menjalankan lokal

Kebutuhan: Node.js 22+, MySQL 8.

```bash
cd backend  && cp .env.example .env && npm ci && npm run dev    # http://localhost:5000
cd frontend && npm ci && npm run dev                            # http://localhost:3000
```

Di mode development, database dibuat otomatis dan secret memakai nilai bawaan lokal. `/api` dan `/socket.io` diteruskan Next ke backend, jadi tidak perlu CORS atau URL API di frontend. Untuk membuat akun superadmin, isi `SUPERADMIN_EMAIL` dan `SUPERADMIN_PASSWORD` di `backend/.env`. `npm run seed` membuat tiga tenant demo (Batik Mahakarya Solo, Geprek Juara, Glowvera Skincare) lengkap dengan staf, katalog, lead, chat, pesanan, pembayaran, dan pengiriman selama 45 hari terakhir. Password semua akun dari `SEED_PASSWORD`, atau dibuat acak dan dicetak sekali di akhir proses. Tambahkan `-- --reset` untuk menghapus dan membangun ulang data demo.

## Test

```bash
docker run -d --name klozer_test_mysql -p 3307:3306 -e MYSQL_ROOT_PASSWORD=testroot mysql:8.0
cd backend  && npm test       # 157 test pada MySQL asli
cd frontend && npm test       # test mapper data dan ekspor CSV
```

CI (`.github/workflows/ci.yml`) menjalankan lint, test, audit dependensi, build, dan build image Docker.

## Deploy

Lihat [DEPLOY.md](DEPLOY.md): Docker Compose dengan Caddy (HTTPS otomatis), backup harian, dan petunjuk update.

## API inti

Semua di bawah `/api/v1`, kecuali dinyatakan lain, wajib memakai `Authorization: Bearer <token>`.

| Endpoint | Fungsi |
| :--- | :--- |
| `POST /auth/login`, `/auth/register` | login, daftar tenant (publik, dibatasi laju) |
| `GET /auth/me`, `POST /auth/change-password` | sesi dan ganti password |
| `GET/POST /products`, `POST /products/bulk`, `POST /products/stock` | katalog dan impor |
| `GET/POST /leads`, `GET /chats/:leadId`, `POST /chats/send` | CRM dan chat |
| `GET/POST /orders`, `PATCH /orders/:id/status` | pesanan |
| `POST /payments/qris` | terbitkan QRIS untuk pesanan |
| `POST /payments/webhook` | callback iPaymu (publik, header X-Signature) |
| `GET/POST /webhooks/whatsapp` | webhook Meta (publik, tanda tangan) |
| `GET /reports/summary`, `GET /audit-logs` | laporan dan jejak aktivitas |
| `PUT /ai/persona`, `POST /ai/chat` | persona AI dan simulator |
| `GET /system/metrics`, `/system/integrations`, `/ai/token-usage` | khusus superadmin |
