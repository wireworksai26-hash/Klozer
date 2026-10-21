# Klozer.id: AI Conversational Commerce dan CRM Multi-Tenant

Platform penjualan lewat WhatsApp untuk bisnis retail, kuliner, fesyen, jasa, dan lembaga sosial. AI membalas pelanggan memakai data toko Anda sendiri, QRIS diterbitkan dari chat, dan setiap bisnis (tenant) terisolasi penuh dari bisnis lain.

## Yang sudah berfungsi

- **Multi-tenant**: setiap query dibatasi `institution_id` dari token sesi, bukan dari input klien. Peran: superadmin, owner, supervisor, finance, CS, PIC gudang.
- **Klien menyambung WhatsApp sendiri (Embedded Signup)**: setelah tim menyiapkan aplikasi Meta sekali, klien menekan satu tombol, login Facebook, dan memasukkan nomornya di jendela Meta. Klozer menukar kodenya, memeriksa kepemilikan nomor, mendaftarkannya, dan menyimpan kanalnya. Lihat DEPLOY.md.
- **Live Chat WhatsApp** (Meta Cloud API): pesan masuk tampil realtime (Socket.io), balasan CS dikirim lewat nomor tenant. Tanda tangan webhook diperiksa dan pesan ganda dari retry Meta diabaikan.
- **Balasan AI**: NVIDIA NIM dengan failover Gemini. AI hanya memakai katalog aktif, stok, rekening terdaftar, dan persona tenant. Kuota token per tenant dicatat. Jika AI tidak tersedia, kuota habis, atau pelanggan mengirim gambar/suara, percakapan diteruskan ke CS dan muncul notifikasi.
- **API dan webhook**: API key bercakupan untuk kontak, chat, pesanan, dan produk; webhook keluar bertanda tangan untuk n8n, Make, atau kode sendiri, dengan antrean yang mencoba ulang, riwayat pengiriman, dan perlindungan agar webhook tidak bisa menjangkau jaringan internal. Lihat DEPLOY.md.
- **Broadcast dan laporan iklan**: kampanye dengan templat WhatsApp yang disetujui Meta (hanya ke kontak yang setuju, dengan batas harian, jam tenang, kredit, dan hasil per kampanye), pencatatan iklan Click-to-WhatsApp asal pelanggan, biaya iklan (manual atau dari Meta), laporan ROAS per kampanye, iklan, dan hari, serta Conversions API dengan percobaan ulang. Lihat DEPLOY.md.
- **Multi-agen AI**: beberapa peran AI per toko (penjualan, layanan pelanggan, umum) dengan aturan pemicu atau pemilihan oleh model, kemampuan pesanan per agen, cakupan pengetahuan, kunci agen oleh staf, dan jejak pergantian. Lihat DEPLOY.md.
- **Tugas dan alat agen**: tugas untuk tim (dari staf, agen AI, atau aturan otomatis) dengan riwayat, tenggat, dan pemberitahuan; agen AI bisa memakai alat terbatas (cek stok, lihat pesanan pelanggan, buat tugas, serahkan ke tim, bertanya atau mengoper chat ke agen lain) hanya bila owner mengizinkan, dengan batas dan jejak lengkap. Lihat DEPLOY.md.
- **Jalur Cepat**: pertanyaan rutin (rekening, daftar produk, harga dan stok satu produk, alamat, jam buka, sapaan) dijawab kode tanpa token; AI hanya untuk yang perlu ngobrol, dan bila AI tidak yakin percakapan dilempar ke CS manusia, yang bisa mengedit balasan AI sebelum dikirim. Lihat DEPLOY.md.
- **Kontrol admin atas token klien**: superadmin bisa memberi token langsung ke klien (dengan alasan, tercatat) dan membuat voucher diskon untuk top up (persen atau nominal, batas pemakaian, masa berlaku, khusus satu toko). Lihat DEPLOY.md.
- **QRIS dinamis dan pembelian paket**: QRIS statis merchant diubah otomatis jadi QRIS dengan nominal untuk tiap tagihan (top up dan paket), dengan kode unik agar pembayaran dikenali. Klien memilih paket di dashboard; saat dibayar, status paket, fitur, dan token AI diterapkan sekaligus. Konfirmasi otomatis memakai notifikasi pembayaran dari luar; tanpa itu, tim mengonfirmasi manual. Lihat DEPLOY.md.
- **Metode pembayaran Klozer**: superadmin mengelola QRIS merchant, rekening, dan dompet digital yang tampil di halaman bayar dan top up. Lihat DEPLOY.md.
- **Token AI**: bawaan tiap paket (Starter 700.000, Pro 1.000.000), top up dengan daftar harga tetap (bayar lalu konfirmasi, tim mengecek dan menambahkan token), saldo dan antrean di dashboard. Harga paket ada di `frontend/src/utils/plans.js`. Lihat DEPLOY.md.
- **Chat commerce**: pelanggan memesan langsung di chat (produk, alamat, ongkir, cara bayar, konfirmasi) dengan total yang dihitung server, bukan model AI; pengingat otomatis untuk pesanan belum dibayar dalam jendela chat 24 jam, jam tenang, dan opsi berhenti; pemberitahuan pembayaran dan resi. Lihat DEPLOY.md.
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
