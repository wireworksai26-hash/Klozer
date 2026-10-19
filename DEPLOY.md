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

## Basis pengetahuan dan evaluasi AI

- **Basis pengetahuan** (`/api/v1/knowledge`, owner dan supervisor): tempel teks SOP atau unggah PDF (harus punya lapisan teks, bukan hasil scan), TXT, atau MD, maksimal 5 MB per berkas, 50 dokumen per toko. Isinya dipecah jadi potongan dan dicari dengan MySQL FULLTEXT; potongan yang relevan ikut masuk prompt AI sebagai bahan bacaan, bukan perintah. Data resmi (katalog, harga, rekening) tetap menang bila bertentangan.
- **Evaluasi AI** (`/api/v1/ai/evaluation`): daftar balasan AI beserta pertanyaan yang dijawab dan sumber dokumennya. CS boleh menilai (baik/buruk), owner dan supervisor boleh mengoreksi. Koreksi disimpan per toko dan dipakai langsung untuk pertanyaan serupa. **Aturan** (`/api/v1/ai/rules`) selalu dikirim pada setiap balasan (maks. 30).
- Keduanya punya sakelar paket: `knowledgeBase` dan `aiLearning` (menu Instansi Tenant). Ini bukan pelatihan ulang model: koreksi dan dokumen dikirim ke model pada setiap balasan, jadi menambah token per balasan.
- Migrasi 009 dan 010 jalan otomatis saat backend start.

## Banyak nomor, pembagian chat, dan serah terima AI ke manusia

- **Kanal** (`/api/v1/channels`, owner dan supervisor): tiap tenant bisa menghubungkan beberapa nomor WhatsApp Cloud API. Jumlah maksimal mengikuti paket: Starter 1, Pro 5, Enterprise 20 (`channelPlans.js`). Satu nomor hanya bisa dipakai satu tenant. Balasan selalu keluar dari nomor yang dihubungi pelanggan. Token tidak pernah dikembalikan oleh API. Endpoint lama `/whatsapp/channel` tetap jalan dan bekerja pada nomor default.
- **Webhook Meta** tetap satu: `https://DOMAIN/api/v1/webhooks/whatsapp`. Pesan dipetakan ke tenant lewat `phone_number_id` nomor penerima, jadi semua nomor dari aplikasi Meta yang sama masuk ke endpoint yang sama.
- **Pembagian chat** (`/api/v1/routing/settings`): `least_busy` (yang paling sedikit chat terbuka), `round_robin`, atau `manual`. Opsi hanya agen online, batas chat terbuka per agen, dan lama manusia memegang chat (default 30 menit). Hanya role CS yang dibagi otomatis. Tanpa agen online, chat menunggu di antrean (`/routing/overview`) dan dibagikan begitu agen online atau menyalakan **tersedia** (`PUT /users/me/availability`).
- **Status online** dihitung dari koneksi Socket.io dashboard (jeda 20 detik untuk reload halaman). Status ini disimpan di memori proses backend: bila nanti backend dijalankan lebih dari satu instance, perlu Redis.
- **Serah terima AI ke manusia**: AI berhenti membalas bila pelanggan memakai kata kunci (komplain, refund, "bicara dengan manusia", dst.; daftar bisa diubah per tenant), bila pesan terkena pengaman AI, atau bila bukti bayar perlu dicek. Pelanggan menerima kalimat tetap, bukan karangan model. CS yang membalas dari dashboard otomatis memegang chat; AI aktif lagi setelah tidak ada balasan manusia selama waktu tahan, atau lewat `POST /leads/:id/handback`. Jika semua model AI gagal, tidak ada balasan dikirim dan CS diberi notifikasi, tetapi AI tetap aktif untuk pesan berikutnya.
- Migrasi 011 jalan otomatis saat backend start dan menyalin nomor dari tabel lama `whatsapp_channels` (tabel lama dibiarkan, tidak lagi dibaca).

## Instagram, Messenger, Telegram, dan live chat website

Semua kanal masuk ke alur yang sama dengan WhatsApp: pembagian chat, serah terima ke manusia, bukti bayar, dan evaluasi AI bekerja tanpa perubahan. Jumlah kanal per paket dihitung dari semua jenis (Starter 1, Pro 5, Enterprise 20). Balasan AI yang lebih panjang dari batas platform (Instagram 1000 karakter, Messenger 2000, Telegram 4000) dikirim sebagai beberapa pesan, dan tanda tebal gaya WhatsApp (`*teks*`) dibuang di kanal selain WhatsApp.

Semua dihubungkan lewat `POST /api/v1/channels` (owner dan supervisor):

| Kanal | Isian | Yang terjadi saat dihubungkan |
|---|---|---|
| Messenger | `type: "messenger"`, `pageId`, `accessToken` (token Halaman) | Halaman dibaca, lalu didaftarkan ke webhook aplikasi Meta (`subscribed_apps`, field `messages`) |
| Instagram | `type: "instagram"`, `pageId`, `accessToken` (token Halaman yang tertaut ke akun Instagram Business) | Akun Instagram yang tertaut dicari otomatis dan jadi ID kanal; Halaman didaftarkan ke webhook |
| Telegram | `type: "telegram"`, `accessToken` (token dari @BotFather) | Bot dibaca (`getMe`), lalu webhook `https://DOMAIN/api/v1/webhooks/telegram/<id-bot>` didaftarkan dengan secret acak |
| Live chat website | `type: "webchat"`, opsional `config` (`title`, `welcomeMessage`, `color`, `allowedOrigins`) | Dibuat kunci publik `wc_...`; respons berisi `embedSnippet` untuk ditempel di situs |

Bila pendaftaran webhook gagal, kanal tidak disimpan dan pesan error dari platform ditampilkan. Menghapus kanal Telegram juga mencabut webhook-nya.

**Meta (Messenger dan Instagram).** Di aplikasi Meta yang sama dengan WhatsApp: tambahkan produk Messenger dan Instagram, lalu isi Callback URL `https://DOMAIN/api/v1/webhooks/meta` dengan Verify Token yang sama (`META_WEBHOOK_VERIFY_TOKEN`) dan field `messages`. `META_APP_SECRET` yang sama dipakai untuk memeriksa tanda tangan. Izin yang umumnya dibutuhkan: `pages_messaging`, `pages_manage_metadata`, `pages_show_list`, dan untuk Instagram `instagram_basic` dan `instagram_manage_messages` (nama dan syarat bisa berubah, periksa di dashboard Meta). Selama aplikasi masih mode Development, hanya akun yang punya peran di aplikasi yang bisa mengirim pesan; untuk pelanggan umum butuh App Review dan Business Verification. Balasan hanya bisa dikirim dalam 24 jam setelah pesan terakhir pelanggan; di luar itu Meta menolak dan pesan tersimpan sebagai "gagal terkirim". Token Halaman yang dibuat dari token pengguna jangka panjang tidak kedaluwarsa; token jangka pendek mati dalam hitungan jam.

**Bukti bayar lewat Messenger dan Instagram.** AI tetap membaca fotonya, tetapi alamat file dari Meta cepat kedaluwarsa, jadi tombol lihat gambar di dashboard bisa menjawab "tidak lagi tersedia". Ringkasan hasil bacaan tetap tersimpan di chat.

**Live chat website.** Tempel `embedSnippet` sebelum `</body>`:

```html
<script src="https://DOMAIN/api/v1/public/webchat/widget.js" data-key="wc_..." async></script>
```

- Pengunjung tidak perlu akun. Browser mereka menyimpan token bertanda tangan server yang mengikat satu pengunjung ke satu widget; token itu satu-satunya cara membaca percakapan. Widget mengambil balasan dengan polling tiap 3 detik saat jendela terbuka (melambat bila sepi).
- `allowedOrigins` (mis. `["https://tokoanda.com"]`) membatasi situs yang boleh memakai widget; kosong berarti semua situs. Endpoint publik dibatasi laju per IP.
- Catatan internal (serah terima, penugasan) tidak pernah terlihat pengunjung.
- Sesi dan balasan dihitung per proses backend tanpa penyimpanan tambahan, jadi aman bila backend dijalankan lebih dari satu instance.

Migrasi 012 jalan otomatis (memperpanjang kolom ID pesan dan alamat file bukti bayar).
