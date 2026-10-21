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

Integrasi opsional (kosongkan jika belum dipakai): `PLATFORM_PAYMENT_NOTIFY_SECRET` (penerimaan notifikasi pembayaran, lihat bagian QRIS dinamis), `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `IPAYMU_VA` / `IPAYMU_API_KEY`, `NVIDIA_API_KEY` / `GEMINI_API_KEY`, `SMTP_*`. Tanpa kunci AI, percakapan diteruskan ke CS manusia. Tanpa iPaymu, QRIS tidak tersedia (tidak ada QR palsu).

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

## API key dan webhook keluar (n8n, Make, Zapier, atau kode sendiri)

Dikelola owner dan supervisor di `/api/v1/integrations` (sakelar paket `publicApi`; batas jumlah per paket: Starter 2 key dan 2 webhook, Pro 10, Enterprise 50).

### API key dan API publik (`/api/v1/open`)
- `POST /integrations/api-keys` membuat key (`klz_live_...`) dengan **cakupan** yang dipilih: `contacts:read`, `contacts:write`, `messages:read`, `messages:send`, `orders:read`, `orders:write`, `products:read`. Key **hanya tampil sekali** di respons pembuatan; yang disimpan hanya hash-nya. Bisa diberi tanggal kedaluwarsa dan dicabut kapan saja (`DELETE /integrations/api-keys/:id`); key milik tenant yang dinonaktifkan berhenti berlaku.
- Kirim di header `Authorization: Bearer klz_live_...` (atau `X-API-Key`). Tenant selalu ditentukan dari key, tidak pernah dari isi permintaan. Batas 120 permintaan per menit **per key**.
- Endpoint: `GET/POST /open/contacts`, `GET/PATCH /open/contacts/:id`, `PUT /open/contacts/:id/consent`, `GET /open/contacts/:id/messages`, `POST /open/messages` (teks), `POST /open/messages/template`, `GET/POST /open/orders`, `GET /open/orders/:id` (id atau nomor pesanan), `GET /open/products`. Nama field sama dengan payload event webhook.
- Aturan yang sama dengan dashboard: pesanan lewat API dihitung server (harga, stok terkunci, tanpa oversell) dan idempoten dengan header `Idempotency-Key` (8-60 karakter; pengiriman pesan juga). Teks hanya bisa dikirim dalam jendela chat 24 jam (`409 WINDOW_CLOSED`, pakai templat di luar itu). Kontak yang berhenti (`opted_out`) tidak menerima pesan kecuali `transactional: true` (info pesanan, bukan promosi); templat marketing hanya ke kontak `opted_in`; setiap templat memakai 1 kredit blast.

### Webhook keluar
- `POST /integrations/webhooks` mendaftarkan `url` (**https publik saja**), `events` (atau `["*"]`), dan menghasilkan **secret** (`whsec_...`, tampil sekali; `rotate-secret` menggantinya dan yang lama langsung tidak berlaku). `POST /integrations/webhooks/:id/test` mengirim event `ping` saat itu juga.
- **Event:** `message.received`, `message.sent`, `contact.created`, `contact.updated`, `contact.consent_changed`, `conversation.handoff`, `conversation.assigned`, `conversation.agent_changed`, `order.created`, `order.paid`, `order.status_changed`, `shipment.updated`, `broadcast.completed`, `broadcast.paused`, `template.status_changed` (daftar lengkap dengan deskripsi: `GET /integrations/events`). Bentuk amplop: `{ "id": "evt_...", "type": "order.paid", "created_at": "...", "institution_id": 1, "data": { ... } }`. Nama event dan field tidak pernah diganti artinya; field baru boleh ditambah.
- **Tanda tangan:** header `X-Klozer-Signature: t=<detik unix>,v1=<hex>`, dengan `v1 = HMAC-SHA256(secret, "<t>.<isi mentah permintaan>")`. Verifikasi dengan isi **mentah** (sebelum di-parse), tolak bila `t` selisih lebih dari 5 menit (anti-replay), dan bandingkan dengan perbandingan waktu-konstan. Header lain: `X-Klozer-Event`, `X-Klozer-Event-Id` (sama di setiap percobaan: pakai untuk de-duplikasi), `X-Klozer-Delivery`, `X-Klozer-Attempt`.

```js
// n8n "Code" node (atau Node.js biasa)
const crypto = require("crypto");
const [t, v1] = headers["x-klozer-signature"].split(",").map((p) => p.split("=")[1]);
const expected = crypto.createHmac("sha256", $env.KLOZER_WEBHOOK_SECRET).update(`${t}.${rawBody}`).digest("hex");
if (Math.abs(Date.now() / 1000 - Number(t)) > 300 || !crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected))) throw new Error("Tanda tangan tidak valid");
```
Di n8n, node Webhook perlu opsi **Raw Body** agar isi mentah tersedia.
- **Pengiriman andal:** event ditulis dulu ke antrean di database, lalu worker mengirimnya (tiap 5 detik). Sukses = jawaban 2xx dalam 10 detik. Gagal dicoba lagi setelah 1 menit, 5 menit, 30 menit, 2 jam, 6 jam, 24 jam (7 percobaan), lalu berstatus `dead` dan bisa dikirim ulang (`POST /integrations/deliveries/:id/retry`). Riwayat dan isi persis yang dikirim bisa dilihat (`GET /integrations/webhooks/:id/deliveries`, `GET /integrations/deliveries/:id`) selama 30 hari. Urutan antar event tidak dijamin: gunakan `created_at` dan id.
- Webhook yang gagal 25 kali berturut-turut, atau menjawab `410 Gone`, dimatikan otomatis (alasannya tampil; aktifkan lagi lewat `PUT` dengan `isActive: true`).
- **Keamanan:** alamat tujuan tidak boleh internal. Alamat privat, loopback, link-local (termasuk alamat metadata cloud `169.254.169.254`), dan nama host internal ditolak saat disimpan **dan** saat tiap koneksi dibuat (nama yang kemudian menunjuk ke alamat privat juga ditolak, koneksi dilakukan ke alamat yang sudah diperiksa itu), redirect tidak diikuti, dan balasan dibatasi ukurannya. Variabel `WEBHOOK_ALLOW_PRIVATE=true` hanya untuk pengembangan lokal dan diabaikan di production; `WEBHOOK_TIMEOUT_MS` mengatur batas waktu (default 10000).
- Contoh alur n8n: pesanan baru atau dibayar (`order.paid`) masuk ke Google Sheets atau akuntansi; `message.received` diteruskan ke alur AI sendiri lalu dijawab lewat `POST /open/messages`; `shipment.updated` memicu notifikasi di kanal lain. Migrasi 015 jalan otomatis.

## Multi-agen AI (beberapa peran AI dalam satu toko)

Dikelola owner dan supervisor di `/api/v1/ai/agents` (sakelar paket `multiAgent`; batas jumlah agen: Starter 2, Pro 6, Enterprise 20). Migrasi 016 jalan otomatis.

- **Tanpa agen = perilaku lama.** Toko yang belum membuat agen dijawab persis seperti sebelumnya. Begitu ada agen aktif, tiap chat ditangani satu agen.
- **Agen** punya nama, deskripsi, petunjuk peran, dan boleh menimpa nama bot, gaya bahasa, dan sapaan toko. `POST /ai/agents/presets` membuat tiga agen awal (Umum sebagai default, Penjualan, Layanan Pelanggan) hanya ke toko yang belum punya agen; sesuaikan petunjuknya.
- **Kemampuan pesanan** (`capabilities.commerce`): `full` (boleh menerima pesanan di chat), `service` (hanya menjawab soal pesanan yang sudah ada: status, pembayaran; tidak membuat pesanan baru), `off` (tidak menyentuh pesanan sama sekali).
- **Cakupan pengetahuan:** `knowledgeDocumentIds` membatasi dokumen yang dibaca agen; kosong berarti semua dokumen toko. Dokumen harus milik toko yang sama.
- **Pemilihan agen** (`GET/PUT /ai/agents/settings`, `routerMode`): urutan prioritas: (1) chat yang dikunci staf lewat `PUT /leads/:id/agent` (`pinned: true`), (2) pesanan sedang dibuat: tetap di agen penerima pesanan, (3) aturan pemicu (`triggers`: `channels`, `keywords`, `intents` buy/order_status/payment, `labelIds`, `leadStatuses`, `newContact`, `hasOpenOrder`; **AND antar jenis, OR di dalam satu jenis**; agen tanpa syarat tidak pernah cocok lewat aturan; yang paling spesifik menang, lalu `priority`), (4) mode `smart`: model diminta memilih hanya bila tidak ada aturan yang memutuskan dan ada 2+ agen; agen baru diambil bila keyakinan >= `switchConfidence` (default 70), atau berapa pun bila chat belum punya agen (dicatat sebagai penggunaan token `agent_router`), (5) tetap di agen sekarang, (6) agen default.
- **Jejak:** setiap pergantian agen dicatat (`GET /ai/agents/routing-log`, bisa per chat `?leadId=`), muncul sebagai catatan sistem di chat (`announceSwitch`), dan memicu event `conversation.agent_changed`. Tiap balasan AI menyimpan agen pengirimnya; `GET /ai/agents` menampilkan jumlah balasan, chat, dan nilai baik/buruk per agen.
- `POST /ai/agents/route-preview` mencoba aturan dengan pesan karangan tanpa mengirim apa pun. Menghapus atau menonaktifkan agen melepas chat yang ditanganinya ke pemilihan otomatis.

## Tugas untuk tim dan alat agen AI

Dua sakelar paket, keduanya bisa dimatikan superadmin per toko: `tasks` (area tugas) dan `agentTools` (agen boleh memakai alat). Migrasi 017 jalan otomatis.

### Tugas (`/api/v1/tasks`)
- **Isi tugas:** jenis (`follow_up`, `check_stock`, `call_customer`, `check_payment`, `handle_chat`, `other`), judul, catatan, prioritas, tenggat, penanggung jawab, kontak dan pesanan terkait. Status `open`, `in_progress`, `done`, `cancelled` (selesai dan batal bisa dibuka lagi). Setiap perubahan, komentar, dan pengambilan tercatat di riwayat tugas (`GET /tasks/:id`).
- **Siapa melihat apa:** owner dan supervisor melihat dan mengatur semua; cs, finance, dan gudang melihat tugas miliknya dan yang belum diambil. Anggota tim boleh mengubah status, catatan, dan tenggat tugasnya, mengambil tugas kosong (`POST /tasks/:id/claim`, dua orang menekan bersamaan: satu menang, satu mendapat `409 TASK_TAKEN`), dan menugaskan ke dirinya sendiri; mengganti judul, prioritas, atau menugaskan orang lain hanya manajer. `GET /tasks` mengembalikan juga angka ringkasan (aktif, terlambat, belum diambil, milik saya) dan mendukung filter `status`, `assignee` (`me`, `unassigned`, id), `type`, `priority`, `leadId`, `overdue`, `q`. `GET /tasks/meta` memberi daftar jenis dan orang yang bisa diberi tugas.
- **Satu tugas terbuka per kontak dan jenis** untuk tugas buatan agen AI atau aturan otomatis (meminta lagi mengembalikan yang sudah ada, bahkan bila dua permintaan datang bersamaan). Staf boleh membuat berapa pun. Tugas buatan agen AI dibatasi 200 per toko per hari.
- **Aturan otomatis** (`GET/PUT /tasks/settings`, owner dan supervisor, semuanya mati secara default): `autoOnHandoff` membuat tugas "Tangani chat" saat AI menyerahkan chat ke tim; `autoOnPaymentProof` membuat tugas "Periksa bukti pembayaran" (prioritas tinggi); `assignToChatOwner` memberikannya ke CS pemilik chat; `defaultDueMinutes` mengatur tenggat; `notifyOverdue`. Pengambilalihan manual oleh staf tidak membuat tugas. Saat tim membalas pelanggan, tugas "Tangani chat" buatan sistem atau AI untuk chat itu otomatis selesai; tugas yang ditulis orang tidak disentuh.
- **Tenggat terlewat:** worker (tiap menit) mengumumkan sekali per tugas lewat socket (`task:overdue`) dan webhook; mengubah tenggat membuatnya bisa diumumkan lagi. Aman dijalankan di beberapa server.
- **Notifikasi:** socket `task:created`, `task:updated`, `task:assigned` (ke orangnya), `task:overdue`, `task:deleted`; webhook `task.created`, `task.updated`, `task.completed`, `task.overdue` (lihat `GET /integrations/events`). Tugas selesai dihapus otomatis setelah 400 hari.

### Alat untuk agen AI (`capabilities.tools` pada agen)
- **Mati secara default.** Owner memilih alat per agen (`GET /ai/agents/tools` memberi daftar untuk layar pemilihan; `PUT /ai/agents/:id` dengan `capabilities: { tools: [...] }`).
  - `check_stock`: harga dan stok produk aktif (cari lewat nama atau SKU).
  - `lookup_order`: status pesanan pelanggan yang sedang chat saja, tidak pernah pelanggan lain.
  - `create_task`: membuat tugas untuk tim (aturan satu tugas terbuka per jenis berlaku).
  - `handoff_to_human`: menyerahkan chat ke tim setelah balasan ke pelanggan terkirim (aturan tugas otomatis ikut berlaku).
  - `consult_agent`: bertanya ke agen AI lain (dengan peran dan dokumennya sendiri, tanpa alat) untuk bahan jawaban; pelanggan tidak melihatnya; maksimal 2 per balasan, dihitung sebagai pemakaian token `agent_consult`.
  - `transfer_to_agent`: memindahkan chat ke agen lain; balasan ini tetap atas nama agen pertama, pesan berikutnya ditangani agen baru (aturan atau pilihan model tetap bisa memindahkannya lagi); tidak bisa memindahkan chat yang dikunci staf; dicatat di log routing dengan metode `tool` dan catatan di chat. Hanya muncul bila ada agen aktif lain.
- **Cara kerjanya:** model menulis satu baris `@tool {"name":"check_stock","args":{"query":"kemeja"}}`; sistem memeriksa izin agen dan argumen, menjalankannya, mengirim hasilnya kembali, lalu model menulis balasan. Maksimal 3 putaran dan 6 pemakaian alat per balasan; pelanggan tidak pernah melihat baris `@tool`. Agen yang tidak diberi alat berjalan persis seperti sebelumnya. Hasil alat diberi tahu ke model sebagai data, bukan perintah. Token semua putaran dihitung.
- **Jejak:** setiap permintaan alat (yang berhasil, ditolak, atau gagal) tercatat dengan argumen, hasil, dan lama prosesnya di `GET /ai/agents/tool-calls` (filter `tool`, `ok`, `agentId`, `leadId`; owner dan supervisor); balasan AI menyimpan daftar alat yang dipakai di `meta`. Catatan alat dihapus setelah 90 hari.
- **Yang sengaja tidak ada:** agen tidak membuat atau mengubah pesanan lewat alat (alur pesanan di chat tetap aturan tetap dengan total dari server), tidak mengubah harga, stok, atau data uang.

## Top up token AI, token bawaan paket, dan stok langsung

### Token yang ikut paket dan top up (`/api/v1/ai/topups`, migrasi 018)
- **Bawaan paket:** Starter 700.000 token, Pro 1.000.000 token (`TIER_TOKEN_BUNDLE` di `backend/src/utils/constants.js`). Toko yang dibuat superadmin mendapat bundel Pro; masa coba mengikuti paket percobaannya (`TRIAL_TIER`, `TRIAL_AI_TOKENS` bila ingin angka lain). Saat superadmin memindahkan toko ke paket lain tanpa mengisi kuota sendiri, kuota dinaikkan sampai sisa tokennya minimal sebesar bundel paket baru (`GREATEST(kuota, terpakai + bundel)`); token yang sudah dibeli tidak pernah dikurangi. Enterprise tidak punya bundel tetap. Daftar harga di situs sengaja tidak menyebut token: penjelasan kuota dan top up lewat tim.
- **Alur top up (daftar harga tetap, tanpa menunggu tim):** owner atau supervisor memilih paket atau jumlah lain (`POST /ai/topups`, kelipatan 100.000, 100.000 sampai 100.000.000, maksimal 3 tagihan terbuka per toko). Harga langsung dihitung server dari `TOPUP_PACKS` di `backend/src/utils/constants.js`: 500.000 token Rp 75.000, 1.000.000 Rp 135.000, 2.500.000 Rp 315.000, 5.000.000 Rp 595.000 (sekitar Rp 119 sampai Rp 150 per 1.000 token). Jumlah di antara paket memakai tarif paket terdekat di bawahnya dan tidak pernah melewati harga paket berikutnya. **Ubah harga di satu tempat itu saja**; `GET /ai/topups/price?tokens=` memberi harga untuk jumlah apa pun, dan `GET /ai/topups` ikut mengirim daftar paket. Tagihan langsung berstatus `quoted`. Toko membayar lewat metode di bawah ini, lalu menekan "Saya sudah bayar" dengan keterangan (`POST /ai/topups/:id/paid`, mengisi `payment_claimed_at` dan `payment_reference`). Pembayaran tetap dicek manusia: tim melihat tagihan yang sudah diklaim paling atas, mencocokkan pembayarannya, lalu menekan "Tambahkan token" (`POST /ai/topups/:id/credit`). Penambahan terjadi sekali di dalam satu transaksi dan hanya dari status `quoted`; dua klik bersamaan tetap menambah sekali. Tim masih bisa mengubah harga satu tagihan (`PUT /ai/topups/:id/quote`) atau membatalkannya (`/cancel-by-team`); layar toko hanya menawarkan batal sebelum tagihan diklaim dibayar. Status `requested` dari versi sebelumnya masih tampil di antrean tim bila ada sisa data lama. Setiap langkah tercatat di audit log dan memicu socket `topup:updated`.
- **Layar:** `/dashboard/topup-token` (saldo, paket, tagihan, cara bayar) dan `/dashboard/superadmin/topups` (antrean tim).

## Jalur Cepat, balasan manusia, dan metode pembayaran Klozer (migrasi 019)

### Jalur Cepat: pertanyaan rutin dijawab kode, bukan AI (`/api/v1/ai/fast-path`)
- **Apa yang dijawab kode:** pesan pendek (sampai 12 kata) dengan tepat satu topik: sapaan, terima kasih, rekening dan cara bayar, daftar produk, harga dan stok satu produk, alamat dan jam buka. Jawabannya disusun dari data toko (rekening terdaftar, produk aktif dan stok, alamat toko, jam buka yang diisi owner), memakai 0 token, dan ditandai di `chat_messages.reply_path` (`fast:<topik>`). Pesan yang berisi beberapa hal, keluhan, niat membeli, klaim sudah bayar, atau pertanyaan status pesanan tidak diambil kode dan tetap ke alur pesanan atau AI. Jam buka hanya dijawab bila owner mengisinya; tidak ada jam karangan.
- **Urutan:** alur pesanan di chat (aturan tetap) lebih dulu, lalu Jalur Cepat, lalu model AI. Saat kuota token habis, Jalur Cepat tetap menjawab pertanyaan rutin; sisanya diteruskan ke tim seperti sebelumnya.
- **Pengaturan:** `GET` dan `PUT /ai/fast-path` (owner atau supervisor): saklar utama, saklar per topik, dan jam buka (maksimal 300 karakter). `GET /ai/fast-path/stats?days=` memberi jumlah balasan Jalur Cepat, alur pesanan (`rules`), dan AI, serta perkiraan token yang dihemat (jawaban Jalur Cepat dikali rata-rata token satu balasan AI toko itu). Layar: `/dashboard/fast-path`.

### Bila AI tidak yakin, dan manusia yang mengedit
- **AI tidak yakin:** prompt meminta AI menjawab hanya dengan penanda `[TIM]` bila tidak punya dasar untuk menjawab. Server membuang penanda itu, pelanggan menerima sisa kalimat AI (atau pesan serah terima baku bila hanya penanda), dan percakapan dipindahkan ke tim dengan alasan `ai_unsure` ("AI tidak yakin dan meneruskan ke tim").
- **Saran balasan:** `POST /chats/:leadId/suggest` (CS ke atas) membuat draf dari pesan terakhir pelanggan; tidak dikirim ke pelanggan, dicatat sebagai pemakaian `staff_suggest`, dan memakai kuota token. Tanpa AI tersedia jawabannya 503 `AI_UNAVAILABLE`.
- **Edit balasan AI:** pesan WhatsApp yang sudah terkirim tidak bisa diubah (batasan Cloud API), jadi yang tersedia adalah "Edit dan kirim": teks balasan AI dimuat ke kotak ketik, staf mengubahnya, dan yang terkirim adalah versi staf (`POST /chats/send` dengan `edited_from_message_id`). Owner atau supervisor bisa mencentang "Ajarkan AI memakai versi ini" (`learn`) supaya koreksi masuk ke pembelajaran AI; ini hanya berlaku untuk balasan yang berasal dari model, bukan Jalur Cepat atau aturan.

### Metode pembayaran Klozer (`/api/v1/platform/payment-methods`)
- Superadmin menambah QRIS merchant, rekening bank, atau dompet digital di `/dashboard/superadmin/payment-methods`. Yang aktif tampil di `/bayar` dan di jendela bayar halaman top up (`GET /public/payment-methods`, tanpa login). Rekening dan dompet wajib berisi nama pemilik dan nomor.
- **QRIS:** unggah gambar kode QRIS merchant sendiri (PNG, JPG, atau WebP, maksimal 1,5 MB; isinya diperiksa dari byte-nya, bukan dari nama berkas). QRIS baru tersembunyi dan baru bisa ditampilkan setelah gambarnya ada; menghapus gambar menyembunyikannya lagi. Superadmin bisa melihat gambar yang masih tersembunyi lewat `GET /platform/payment-methods/:id/qris`; publik hanya bisa mengambil gambar metode yang aktif. **Gambar QRIS merchant dan nomor rekening harus Anda isi sendiri lewat halaman itu; tidak ada yang bawaan di kode.** Bila belum ada metode aktif, `/bayar` tetap memakai blok QRIS dan GoPay statis lama sebagai cadangan.
- Perubahan dicatat di audit log (`platform_payment.*`). Pembayaran tetap dikonfirmasi manual oleh tim; belum ada pencocokan otomatis dengan bank.

### Kontrol admin atas token klien: beri token langsung dan voucher diskon (migrasi 020)
- **Beri token langsung:** `POST /ai/topups/grant` (superadmin) dengan `institutionId`, `tokens` (kelipatan 1.000, sampai 100.000.000), dan `reason` (wajib). Token masuk ke kuota toko saat itu juga di dalam satu transaksi, tanpa tagihan. Tercatat sebagai baris top up berstatus `credited` dengan `is_grant = 1`, muncul di riwayat toko ("Gratis", dengan alasannya) dan di antrean tim ("Diberikan tim"), serta di audit log (`token_topup.grant`). Untuk mengubah kuota ke angka tertentu (bukan menambah) tetap lewat `PUT /institutions/:id` (`ai_token_quota`). Layar: tombol "Beri token langsung" di `/dashboard/superadmin/topups`.
- **Voucher diskon:** kode potongan yang dibuat superadmin (`/api/v1/platform/vouchers`, layar `/dashboard/superadmin/vouchers`) dan dipakai klien di halaman top up token. Pengaturan per voucher: persen (dengan batas potongan opsional) atau nominal tetap, minimal token, khusus satu toko atau semua toko, batas pemakaian total dan per toko (bawaan 1 per toko), masa berlaku, aktif atau tidak. Kode disimpan huruf besar dan tidak bisa diubah setelah dibuat.
- **Cara kerja di tagihan:** `GET /ai/topups/price?tokens=&voucher=` menampilkan harga normal, potongan, dan yang dibayar; `POST /ai/topups` dengan `voucher` membuat tagihan memakai harga setelah potongan. Tagihan menyimpan `list_price_idr`, `discount_idr`, `voucher_code` sehingga selalu bisa dijelaskan, dan mengubah voucher sesudahnya tidak mengubah tagihan yang sudah dibuat. Satu pemakaian adalah satu tagihan yang tidak dibatalkan, jadi membatalkan tagihan mengembalikan pemakaiannya. Pemakaian terakhir dikunci di dalam transaksi, sehingga dua tagihan bersamaan tidak bisa sama-sama mengambilnya. Tagihan tidak pernah dipotong sampai di bawah Rp 1.000. Kode milik toko lain, tidak ada, atau nonaktif dijawab sama ("Kode voucher tidak berlaku."), supaya kode tidak bisa ditebak. Voucher yang sudah pernah dipakai hanya bisa dinonaktifkan, bukan dihapus.
- **Cakupan:** voucher berlaku untuk top up token. Langganan paket belum punya tagihan di sistem (dibayar manual lewat halaman `/bayar` dan diatur superadmin), jadi belum ada voucher untuknya.

### QRIS dinamis, pembelian paket, dan aktivasi otomatis (migrasi 021)
- **QRIS dinamis dari QRIS statis Anda:** di `/dashboard/superadmin/payment-methods`, tambah metode QRIS lalu unggah gambar QRIS merchant (PNG atau JPG). Server membaca kode QR di dalam gambar itu dan menyimpan teksnya (hanya di database; tidak pernah dikirim ke browser). Bila gambar tidak terbaca, atau bentuknya WebP, tempel teks kodenya lewat "Tempel kode QRIS". Dari teks itu server membuat kode baru untuk tiap tagihan: jenis kode diubah dari statis ke dinamis (tag 01 = 12), nominal dimasukkan (tag 54), dan CRC dihitung ulang. Data merchant lainnya tidak disentuh. Pembayar memindai, aplikasinya menampilkan nominal yang terkunci. Hanya QRIS statis tanpa nominal yang diterima; kode rusak atau yang sudah memuat nominal ditolak. Bila tidak ada kode yang bisa dibuat, layar bayar memakai gambar statis dan daftar rekening seperti sebelumnya. **Coba dulu dengan pembayaran nyata kecil** (misalnya top up 100.000 token, sekitar Rp 15.000): pembuatan kodenya diuji dengan pembacaan ulang dan CRC, tetapi pemindaian oleh aplikasi dompet dan bank sungguhan tidak bisa diuji dari sini.
- **Nominal unik:** tiap tagihan (top up dan paket) menunggu harga ditambah kode unik 1 sampai 99 (Rp 1 sampai Rp 99; bila semua terpakai, sampai 999), dan tidak ada dua tagihan terbuka yang menunggu nominal yang sama (`platform_pay_amounts`, nominal sebagai primary key). Kode unik inilah yang membuat sebuah pembayaran dikenali sebagai milik tepat satu tagihan. Pembayar melihat nominal akhirnya di layar dan di dalam kode QRIS.
- **Beli paket:** owner atau supervisor memilih paket dan lama langganan di `/dashboard/subscription` (`GET /billing/plans`, `POST /billing/orders`, `GET /billing/orders/:id`). Satu toko punya satu tagihan terbuka; memilih lagi menggantikan yang lama. Tagihan berlaku 24 jam. Diskon pengenalan (Starter 10% bulanan dan 15% tahunan, Pro 30% dan 20%) hanya untuk pembelian pertama toko; perpanjangan memakai harga normal. Enterprise tidak dijual lewat layar ini.
- **Yang terjadi saat paket dibayar** (satu transaksi, hanya sekali): `subscription_tier` diubah ke paket itu; `subscription_expires_at` maju sebanyak bulan yang dibeli, dihitung dari akhir masa aktif bila toko memperpanjang paket yang sama dan masih aktif, selain itu dari sekarang (pindah paket tidak membawa sisa waktu paket lama); semua sakelar fitur paket di-set sesuai isi paket itu (`features_json`, termasuk mematikan yang tidak termasuk); dan token bawaan paket ditambahkan ke kuota sebesar bundel per bulan dikali bulan yang dibeli (`TIER_TOKEN_BUNDLE`, jadi paket tahunan Pro menambah 12.000.000 token). Layar toko yang terbuka ikut berubah lewat socket `billing:updated`. Aturan ini ada di `backend/src/utils/plans.js` dan `backend/src/services/billing/subscriptionOrderService.js`; harga dan isi paket di `backend/src/utils/plans.js` harus sama dengan `frontend/src/utils/plans.js`, dan tes frontend `billing-catalog.test.mjs` gagal bila keduanya berbeda.
- **Konfirmasi otomatis lewat notifikasi pembayaran:** `POST /api/v1/payments/platform-notify` dengan header `X-Notify-Secret` dan isi `{ "amount": 419396, "reference": "id-unik-notifikasi", "source": "gopay" }` (`amount` juga boleh teks seperti `Rp 419.396,00`; `reference` dipakai agar kiriman ulang tidak diproses dua kali). Server mencari tagihan terbuka yang menunggu nominal itu dan menyelesaikannya sama seperti konfirmasi manual: token top up ditambahkan, atau paket, fitur, dan token diterapkan. Tagihan paket yang sudah kedaluwarsa tidak diselesaikan otomatis; tagihan yang tidak ketemu atau sudah ditutup dicatat sebagai "tidak cocok". Semua notifikasi tercatat dan tampil di `/dashboard/superadmin/billing`. Aktifkan dengan mengisi `PLATFORM_PAYMENT_NOTIFY_SECRET` di `.env` (`openssl rand -hex 32`) dan jalankan ulang; kosong berarti endpoint menolak (503). **Pengirim notifikasinya belum termasuk di sini:** GoPay Merchant tidak punya API yang bisa dipanggil dari server ini, jadi sesuatu di luar harus meneruskan notifikasi "pembayaran diterima" ke alamat itu (misalnya n8n atau aplikasi peneruskan notifikasi di HP merchant, layanan pembacaan mutasi bank, atau payment gateway yang punya callback). Sebelum itu tersambung, pembayaran tetap dikonfirmasi manual: klien menekan "Saya sudah bayar", tim menekan "Aktifkan paket" atau "Tambahkan token".
- **Layar tim:** `/dashboard/superadmin/billing` (antrean tagihan paket, konfirmasi manual, daftar notifikasi pembayaran dan alamat penerimanya), serta kode unik dan status "Otomatis" atau "Manual" di antrean top up.

### Stok dan pesanan langsung di dashboard
Setelah perubahan tersimpan, server mengirim lewat socket ke semua dashboard toko itu: `stock:changed` (`{ products: [{ id, sku, name, stock, lowStockThreshold }] }` dengan angka stok terbaru), `order:created` (`{ orderId, status, createdVia }`) dan `order:updated` (`{ orderId, status }`). Pemicunya: pesanan baru dari dashboard, chat AI, atau API publik (stok dikurangi di transaksi yang sama, tanpa oversell); pembatalan oleh staf atau sistem (stok dikembalikan); edit stok, impor stok dan impor produk. Dashboard memperbarui angka stok di layar tanpa muat ulang dan memberi notifikasi saat stok turun sampai batas menipis atau habis, serta saat AI mencatat pesanan dari chat.
