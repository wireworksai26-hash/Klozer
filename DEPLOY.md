# Deploy Klozer ke VPS (Docker Compose + Caddy)

Satu server Ubuntu/Debian, satu domain. Compose menjalankan MySQL, backend, frontend, Caddy (HTTPS otomatis), dan backup harian. Hanya port 80/443 yang terbuka ke internet; database dan API berada di jaringan privat.

## 1. Kebutuhan

- VPS 2 vCPU, RAM minimal 2 GB (4 GB disarankan untuk build pertama), SSD 25 GB
- Domain (misal `app.bisnisanda.com`) dengan A record ke IP VPS
- Port 80 dan 443 terbuka di firewall

## 2. Siapkan server

```bash
curl -fsSL https://get.docker.com | sudo sh
git clone https://github.com/ethermindagency/Klozer.git
cd Klozer
```

## 3. Isi konfigurasi

```bash
cp .env.example .env
nano .env
```

Wajib diisi (compose menolak start jika kosong):

| Variabel | Cara membuat |
|---|---|
| `DOMAIN` | domain Anda |
| `ACME_EMAIL` | email Anda (pendaftaran dan pemberitahuan sertifikat Let's Encrypt) |
| `DB_ROOT_PASSWORD`, `DB_PASSWORD` | `openssl rand -base64 32 \| tr -d '/+=' \| cut -c1-32` |
| `JWT_SECRET` | `openssl rand -hex 48` |
| `DB_ENCRYPTION_KEY` | `openssl rand -hex 32` (64 karakter hex) |
| `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` | admin platform pertama, password minimal 12 karakter |

Server menolak start di production jika secret kosong, terlalu pendek, memakai nilai placeholder, atau memakai nilai default lama yang pernah ada di repository.

> **Simpan `DB_ENCRYPTION_KEY` terpisah dari database.** Token WhatsApp tenant dienkripsi dengan kunci ini. Jika hilang, token tidak bisa dibaca lagi dan tenant harus memasukkannya ulang.

Integrasi opsional (kosongkan jika belum dipakai): `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `IPAYMU_VA` / `IPAYMU_API_KEY`, `NVIDIA_API_KEY` / `GEMINI_API_KEY`, `SMTP_*`. Tanpa kunci AI, percakapan diteruskan ke CS manusia. Tanpa iPaymu, QRIS tidak tersedia (tidak ada QR palsu).

## 4. Jalankan

```bash
docker compose up -d --build
docker compose ps          # semua service harus healthy
docker compose logs -f backend
```

Migrasi database berjalan otomatis saat backend start, dan superadmin dibuat dari `SUPERADMIN_EMAIL` jika belum ada. Setelah login pertama berhasil, kosongkan `SUPERADMIN_PASSWORD` di `.env`.

Buka `https://DOMAIN`, login sebagai superadmin, lalu buat tenant di menu **Institusi** atau biarkan pelanggan mendaftar sendiri di `/register`.

## 5. Hubungkan layanan eksternal

| Layanan | URL yang didaftarkan |
|---|---|
| Meta WhatsApp webhook | `https://DOMAIN/api/v1/webhooks/whatsapp` (verify token = `META_WEBHOOK_VERIFY_TOKEN`, aktifkan field `messages`) |
| iPaymu callback (notify) URL | `https://DOMAIN/api/v1/payments/webhook` |

Nomor WhatsApp dan access token tiap tenant diisi oleh owner di **Pengaturan > Profil Usaha dan WhatsApp**. Status integrasi platform terlihat di **Pengaturan > Integrasi Platform** (superadmin).

## 6. Backup dan restore

Layanan `backup` membuat dump terkompresi tiap 24 jam ke `./backups` dan menyimpan 14 hari terakhir. Dump yang ukurannya mencurigakan kecil ditolak. **Salin folder `backups` ke luar server secara berkala.**

```bash
./scripts/backup.sh                              # dump manual
docker compose stop backend
./scripts/restore.sh backups/klozer-YYYYMMDD-HHMMSS.sql.gz
docker compose up -d backend
```

Uji restore sekali di server cadangan sebelum Anda membutuhkannya.

## 7. Update

```bash
git pull
docker compose up -d --build
```

Migrasi baru berjalan otomatis. Migrasi yang sudah pernah diterapkan tidak boleh diubah isinya; backend menolak start jika checksum berubah.

## 8. Pemecahan masalah

| Gejala | Periksa |
|---|---|
| Backend langsung berhenti | `docker compose logs backend`: pesan `[FATAL] Konfigurasi production tidak valid` menyebut variabel yang salah |
| Sertifikat HTTPS gagal | DNS belum mengarah ke server, atau port 80/443 tertutup |
| Login selalu 429 | pembatas laju: tunggu beberapa menit, atau akun terkunci sementara setelah salah password berulang |
| WhatsApp tidak masuk | webhook belum terdaftar, `META_APP_SECRET` salah (tanda tangan ditolak, 401), atau nomor belum diisi tenant |
| AI tidak membalas | kuota token tenant habis, kunci AI belum diisi, atau percakapan sedang ditangani CS manusia |
| Disk penuh | `docker system prune`, dan pindahkan `backups` ke luar server |

## Menjalankan secara lokal (tanpa Docker untuk app)

```bash
# MySQL 8 harus berjalan; database dibuat otomatis di mode development
cd backend  && cp .env.example .env && npm ci && npm run dev      # http://localhost:5000
cd frontend && npm ci && npm run dev                               # http://localhost:3000, /api diteruskan ke backend
npm run seed   # (backend) opsional: dua tenant demo, hanya untuk development
```

Test backend memerlukan MySQL (default `127.0.0.1:3307`, password `testroot`, atur dengan `TEST_DB_*`):

```bash
docker run -d --name klozer_test_mysql -p 3307:3306 -e MYSQL_ROOT_PASSWORD=testroot mysql:8.0
cd backend && npm test
```


## Data demo untuk presentasi ke klien

Seeder membuat tiga bisnis fiktif lengkap dengan data 45 hari terakhir. Di server (NODE_ENV=production) seeder menolak berjalan kecuali Anda sengaja mengizinkannya:

```bash
docker compose exec -e ALLOW_DEMO_SEED=true -e SEED_PASSWORD='password-demo-anda' backend node src/database/seeds.js
# bangun ulang dari awal (hanya menghapus tenant demo, bukan tenant lain):
docker compose exec -e ALLOW_DEMO_SEED=true -e SEED_PASSWORD='password-demo-anda' backend node src/database/seeds.js --reset
```

- Tanpa `SEED_PASSWORD`, password dibuat acak dan dicetak sekali di akhir proses.
- Akun demo ada di domain `.demo` (mis. `owner@batikmahakarya.demo`). Daftar lengkap dicetak setelah seeding.
- Data demo ikut masuk ke database yang sama dengan data asli. Hapus dengan perintah `--reset` atau hapus tenantnya dari menu Instansi Tenant (superadmin) setelah demo.
- Tidak ada channel WhatsApp yang terhubung ke tenant demo, jadi tidak ada pesan yang dikirim ke nomor palsunya.

## AI membaca bukti pembayaran

Saat pelanggan mengirim foto atau PDF di WhatsApp, AI membacanya (nominal, bank, waktu, rekening tujuan) lalu membalas dengan kalimat tetap: terima kasih, dicek manual, atau terverifikasi.

- Pesanan **hanya** dilunasi otomatis bila nominal, rekening tujuan, dan tanggal cocok, keyakinan AI tinggi, **dan** ada mutasi bank masuk (belum direkonsiliasi) dengan nominal yang sama, serta fitur Anti-Fraud aktif di paket tenant. Selain itu pelanggan tetap diberi ucapan terima kasih, pesanan diberi tanda **Perlu dicek** di menu Pesanan, dan chatnya diberi label **Cek Pembayaran** di CRM.
- Butuh: nomor WhatsApp tenant terhubung (token dipakai untuk mengunduh berkas), dan API key AI yang bisa membaca gambar: Gemini (membaca foto dan PDF) atau NVIDIA dengan model vision (`NVIDIA_VISION_MODEL`, hanya foto).
- Berkas tidak disimpan di server. Dashboard mengambilnya dari WhatsApp saat dibuka (Meta menyimpan media sekitar 30 hari).
- Uji tanpa pelanggan sungguhan: **Test CS AI → Bukti bayar** (tidak mengubah pesanan dan tidak mengirim pesan).
- Model cadangan per penyedia diatur di **Pengaturan → Integrasi Platform** (atau `GEMINI_FALLBACK_MODEL` / `NVIDIA_FALLBACK_MODEL`).
