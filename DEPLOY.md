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

## Chat commerce: pesanan, ongkir, dan pengingat di chat

AI bisa mengambil pesanan sampai selesai di chat (semua kanal). **Mati secara default**: tiap toko menyalakannya di `PUT /api/v1/commerce/settings` (`enabled: true`), dan `GET /commerce/settings` menampilkan daftar hal yang masih kurang (produk, cara bayar, ongkir).

**Cara kerjanya.** Pesanan dibangun sebagai draf per pelanggan: produk, penerima dan alamat, ongkir, cara bayar, lalu ringkasan yang harus dikonfirmasi pelanggan ("YA"). Semua angka (harga, subtotal, ongkir, total, stok) dihitung server dari katalog dan aturan toko. Model AI hanya dipakai untuk membaca teks bebas pelanggan menjadi produk, jumlah, dan alamat; hasilnya divalidasi ketat (id produk harus ada di katalog toko itu, jumlah wajar, nomor HP dan kode pos dibaca dari kata pelanggan sendiri). Memilih kurir atau cara bayar, konfirmasi, dan semua kalimat tentang pesanan adalah aturan dan templat tetap, bukan karangan model, jadi total tidak bisa "salah hitung secara kreatif". Pesanan baru dibuat setelah pelanggan konfirmasi, lewat jalur yang sama dengan dashboard (stok dikunci, tidak bisa oversell, idempoten per draf). Pesanan dari chat bertanda `created_via: "chat"` dan komisi CS jatuh ke CS yang menangani chat itu.

**Ongkir** (`shippingMode`):
- `ask_team` (default): setelah alamat diterima, draf diserahkan ke tim dengan ringkasan di catatan chat; tidak ada ongkir yang dikarang.
- `flat`: ongkir tetap `shippingFlatFee`. `free`: gratis.
- `provider`: tarif langsung dari Biteship. Butuh `BITESHIP_API_KEY` di `.env` server dan `originPostalCode` toko; pelanggan diminta kode pos tujuan, lalu memilih dari maksimal 4 opsi termurah. Tanpa kunci atau tanpa hasil, ongkir diserahkan ke tim (tidak pernah memakai tabel tarif perkiraan). `allowPickup` mengizinkan ambil sendiri tanpa ongkir.

**Pembayaran.** QRIS (iPaymu; berlaku 5 menit, pelanggan bisa balas "QRIS" untuk dibuatkan lagi), transfer bank (rekening aktif di menu Rekening; bukti foto dibaca seperti biasa), dan COD (`payCod`, hanya bila alamat tidak berisiko tinggi menurut skor RTS yang sudah ada). Bila hanya satu cara yang tersedia, langsung dipilih. Jika QRIS gagal dibuat, pesanan tetap ada dan chat diserahkan ke tim.

**Resi dan status.** `PUT /api/v1/shipping/orders/:orderId` (CS, gudang, finance) mengisi kurir, resi, dan status kirim; saat resi baru diisi, pelanggan otomatis diberi tahu di chat, dan respons API menyebut apakah pesan terkirim (`notified`). Pelanggan yang bertanya "resinya mana" atau "pesananku sampai mana" dijawab dari database (plus posisi paket dari Biteship bila tersedia). Pelanggan juga diberi tahu otomatis saat pembayaran diterima. Pemberitahuan hanya untuk toko yang menyalakan chat commerce (`notifyCustomer`).

**Pengingat** untuk pesanan yang belum dibayar dan keranjang yang tidak diselesaikan (worker berjalan tiap menit di proses backend; aman bila ada beberapa instance):
- Jadwal default 30 menit, 6 jam, 20 jam setelah pesan terakhir pelanggan (`followupDelays`, maksimal 3 langkah, semuanya harus di dalam 23 jam).
- **Jendela 24 jam**: WhatsApp, Messenger, dan Instagram hanya mengizinkan pesan bebas selama 24 jam setelah pesan terakhir pelanggan, jadi pengingat tidak pernah dijadwalkan atau dikirim di luar itu. Pengingat di luar jendela (butuh templat Meta yang disetujui) menunggu fase broadcast. Telegram tanpa jendela; live chat website tidak dikirimi pengingat.
- **Jam tenang** (default 21.00 sampai 08.00 WIB): pengingat yang jatuh malam hari menunggu pagi.
- Berhenti otomatis saat: pesanan dibayar atau dibatalkan, pelanggan membalas (urutan dimulai ulang dari sekarang), CS/manusia sedang memegang chat, atau pelanggan meminta berhenti ("stop", "jangan hubungi lagi"); permintaan itu langsung dicatat (`leads.followup_opt_out`) dan bisa diubah staf lewat `PUT /leads/:id/followup-opt-out`.
- Hanya satu langkah per pesanan per putaran worker, dengan jarak minimal 30 menit antar pengingat, jadi worker yang sempat mati tidak mengirim semua langkah sekaligus.
- `unpaidCancelHours` (default 0 = mati): pesanan **dari chat** yang tidak dibayar melewati batas itu dibatalkan otomatis dan stoknya dikembalikan. Pesanan yang sudah punya bukti bayar (menunggu cek) atau pembayaran tidak disentuh, dan pesanan dari dashboard tidak pernah dibatalkan otomatis. Pelanggan diberi tahu bila jendela chat masih terbuka.

**Dashboard.** `GET /commerce/drafts` (pesanan yang sedang disusun di chat, dengan harga dari server), `POST /commerce/drafts/:id/cancel`, `GET /commerce/followups` (statistik dan pengingat berikutnya), `POST /commerce/followups/:id/cancel`. Sakelar paket: `chatCommerce` (menu Instansi Tenant).

**Batasan saat ini:** kode voucher belum diterapkan di chat (diskon tidak otomatis); pelanggan yang menyebut kode promo dijawab oleh asisten biasa. Satu pelanggan hanya punya satu draf terbuka, dan draf yang tidak disentuh 48 jam ditutup. Integrasi Biteship ditulis berdasarkan dokumentasi publik dan belum diuji dengan akun sungguhan: coba dulu dengan satu pesanan uji. Migrasi 013 jalan otomatis.

## Broadcast dengan templat Meta, persetujuan, dan laporan iklan (ROAS dan CAPI)

### Templat dan broadcast (`/api/v1/broadcast`, owner dan supervisor, sakelar paket `csBlast`)
Bisnis hanya boleh memulai percakapan WhatsApp, atau menulis setelah jendela 24 jam pelanggan tertutup, dengan **templat yang sudah disetujui Meta**.

- **Siapkan:** kanal WhatsApp butuh **ID WhatsApp Business Account (WABA)** (`wabaId` saat menghubungkan, atau `PUT /channels/:id` dengan `{ "wabaId": "..." }`) dan token yang punya izin `whatsapp_business_management`. Di aplikasi Meta, pada Webhooks WhatsApp aktifkan field `messages` (sudah, termasuk status terkirim/dibaca) dan **`message_template_status_update`**; tanpa yang kedua, status templat dicek tiap 10 menit oleh worker.
- **Templat:** `POST /broadcast/templates` mengirim templat baru ke Meta (header teks, isi dengan `{{1}}`, `{{2}}`, catatan kaki, sampai 3 tombol; contoh nilai variabel wajib). Aturan Meta dicek dulu di sini (variabel berurutan, tidak di awal atau akhir isi, panjang) supaya tidak ditolak karena hal sepele. Templat yang dibuat di Business Manager (termasuk yang berheader gambar) diambil dengan `POST /broadcast/templates/sync`. Hanya templat berstatus **approved** dan bukan kategori autentikasi yang bisa dipakai kampanye.
- **Persetujuan penerima:** templat **marketing** hanya dikirim ke kontak berstatus `opted_in`; kontak yang pernah chat tetapi belum menyetujui (`unknown`) **tidak** dianggap setuju. Templat utility (info pesanan) boleh ke `unknown`, tetapi tidak pernah ke `opted_out`. Catat persetujuan per kontak (`PUT /leads/:id/consent`) atau dari daftar yang sudah dikumpulkan (`POST /broadcast/consent/import`, wajib mencantumkan sumber dan menyatakan persetujuannya ada). Pelanggan yang menulis "stop" atau "jangan kirim promo lagi" langsung `opted_out`, mendapat balasan tetap, dan berhenti dari semua kampanye dan pengingat; ini berlaku di semua tenant, tanpa menunggu fitur lain menyala.
- **Kampanye:** pilih nomor, templat, audiens (status, label, sumber, iklan asal, kota, pernah/belum pernah beli, lama tidak dihubungi), dan isi variabel per kontak (teks tetap, atau nama depan/nama/kota dengan nilai cadangan; nama profil placeholder tidak disapa "Pelanggan"). `POST /broadcast/audience/preview` menunjukkan jumlah dan contoh (nomor disamarkan), termasuk berapa kontak yang tertahan aturan persetujuan. Kirim pesan uji ke nomor sendiri dulu (`POST /broadcast/test`, memakai 1 kredit). `POST /broadcast/campaigns/:id/launch` mengirim sekarang atau dijadwalkan (`scheduledAt`); daftar penerima dibekukan saat mulai, dan persetujuan dicek lagi tepat sebelum tiap pesan dikirim.
- **Batas yang dihormati worker** (tiap 15 detik, aman untuk beberapa instance): batas harian nomor (`dailyLimit`, isi sesuai tier pesan akun Meta Anda: 250 sebelum bisnis diverifikasi, lalu 1.000 dan seterusnya; sisanya otomatis lanjut keesokan harinya), jam tenang 21.00-08.00 WIB, jeda antar kampanye ke orang yang sama (`frequencyCapDays`, default 3 hari, hanya marketing), dan kredit blast (1 per pesan yang diterima Meta; dikembalikan bila gagal terkirim). Jika Meta membatasi laju (kode 130429, 131048, 131056) kampanye menunggu 5 sampai 30 menit; masalah templat atau token (mis. 132001, 190) menjeda seluruh kampanye (`pause_reason`) tanpa menandai penerima gagal, dan bisa dilanjutkan setelah diperbaiki; nomor yang tidak bisa dihubungi hanya menggagalkan kontak itu, dengan alasan yang terbaca.
- **Hasil** (`GET /broadcast/campaigns/:id`): diterima Meta, sampai, dibaca, gagal beserta alasannya, jumlah dan persentase balasan (dalam 48 jam), dan pesanan berbayar dari penerima dalam 7 hari setelah pesan dikirim beserta omzetnya. Pesan terkirim juga muncul di riwayat chat kontak.

### Iklan: asal pelanggan, biaya, ROAS (`/api/v1/ads`, owner, supervisor, finance)
- **Asal iklan:** pesan pertama dari iklan Click-to-WhatsApp membawa `referral` (id iklan dan click id). Disimpan di `meta_ad_referrals`; kontak mengingat iklan pertamanya (`meta_ad_id`, dasar laporan) dan click id terbaru (`ctwa_clid`, dasar kredit konversi di Meta). Klik yang sama tidak dicatat dua kali. Nama kampanye tidak ikut referral: didapat dari biaya iklan.
- **Biaya iklan:** diisi manual (`POST /ads/spend`, per hari dan iklan; menulis hari dan iklan yang sama menimpa) atau ditarik dari Meta (`PUT /ads/settings` dengan ID akun iklan dan token berizin `ads_read`, lalu `POST /ads/sync`; otomatis tiap 6 jam, 7 hari terakhir). Hanya akun iklan bermata uang IDR yang diterima.
- **ROAS** (`GET /ads/roas?from&to&groupBy=campaign|ad|day`): omzet pesanan berbayar dari kontak yang datang dari iklan, dibagi biaya. Per baris: biaya, tayangan, klik, lead, pesanan, omzet, laba kotor, ROAS, ROAS laba, biaya per lead, per pesanan, per klik, dan persen konversi; plus omzet yang bukan dari iklan sebagai pembanding. Angka yang tidak punya dasar (ROAS tanpa biaya, biaya per lead tanpa lead) bernilai `null`, tidak diperkirakan. Omzet dan lead dikreditkan ke iklan pertama kontak itu, berdasarkan tanggal pesanan. Ringkasan laporan (`/reports/summary`) kini mengisi `metaAdRoas` (30 hari terakhir).
- **Conversions API** (`PUT /integrations/meta-capi` mengisi dataset dan token): pembelian dari pelanggan Click-to-WhatsApp dikirim dengan format business messaging (`action_source: business_messaging`, `ctwa_clid`, dan WABA) supaya Meta bisa mengaitkannya ke iklan; pelanggan lain dicocokkan lewat hash nomor telepon. Event yang gagal dicoba lagi (2 menit, 10 menit, 1 jam, 6 jam; Meta menerima pembelian sampai 7 hari), id event = nomor pesanan sehingga pengulangan diabaikan Meta, dan `GET /ads/capi` menampilkan status tiap event.

**Belum diuji dengan akun Meta sungguhan:** pembuatan dan sinkronisasi templat, status pengiriman, tarikan biaya iklan, dan format Conversions API ditulis dari dokumentasi publik Meta dan diuji dengan tiruan jaringan. Uji satu templat, satu pesan uji, satu sinkronisasi biaya, dan satu pembelian dari iklan sebelum dipakai untuk kampanye besar. Migrasi 014 jalan otomatis.
