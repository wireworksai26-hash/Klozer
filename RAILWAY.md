# Pindah dari VPS ke Railway

Tiga layanan dari satu repo: **MySQL**, **backend**, **frontend**. Hanya frontend yang diberi domain publik. Frontend sudah meneruskan `/api/*` dan `/socket.io` ke backend (lihat `frontend/next.config.mjs`), jadi Caddy tidak dipakai.

File di repo: `backend/railway.json`, `frontend/railway.json`, `railway/*.env.example`, `scripts/railway-import.sh`. Perubahan di `frontend/Dockerfile`: argumen build `BACKEND_INTERNAL_URL`.

## 1. Siapkan sebelum menyentuh VPS

- Catat `DB_ENCRYPTION_KEY` dan `JWT_SECRET` dari `.env` VPS. Keduanya harus sama persis di Railway. Kalau `DB_ENCRYPTION_KEY` beda, data yang terenkripsi (token channel dan sejenisnya) tidak terbaca lagi.
- Pakai domain yang sama dengan sekarang. Link QRIS yang sudah terkirim ke pelanggan memakai `APP_URL`.
- Turunkan TTL DNS domain jadi 300 detik sehari sebelum pindah.
- Buat dump: `./scripts/backup.sh` di VPS, lalu salin file `backups/klozer-*.sql.gz` ke komputer Anda.

## 2. Buat proyek di Railway

1. **New Project > Deploy MySQL**. Namai layanannya `MySQL`.
2. **New > GitHub Repo** (repo ini) dua kali, lalu atur tiap layanan:

| Layanan | Nama | Root Directory | Domain publik |
|---|---|---|---|
| backend | `backend` | `backend` | tidak |
| frontend | `frontend` | `frontend` | ya |

Railway membaca `railway.json` di root directory masing-masing: build memakai Dockerfile, healthcheck `/ready` (backend) dan `/login` (frontend), satu replika, dan hanya membangun ulang bila foldernya berubah.

## 3. Variabel

- Backend: salin dari `railway/backend.env.example`, isi rahasia dan kunci dari `.env` VPS.
- Frontend: salin dari `railway/frontend.env.example`.
- Isi variabel frontend **sebelum build pertama**. `BACKEND_INTERNAL_URL` tertanam saat build.
- Nama layanan di `railway/*.env.example` (`MySQL`, `backend`) harus sama dengan nama yang Anda pakai.

## 4. Volume WhatsApp Web

Di layanan backend: **Volumes > New Volume**, mount path `/app/data/baileys`. Variabel `RAILWAY_RUN_UID=0` (sudah ada di contoh) diperlukan agar volume bisa ditulis.

Sesi WhatsApp Web paling mudah dibuat ulang: setelah pindah, scan QR lagi di halaman Channels.

## 5. Pindahkan data

1. Hentikan layanan backend di Railway (atau jangan nyalakan dulu).
2. Di VPS: `docker compose stop backend` supaya tidak ada tulisan baru, lalu `./scripts/backup.sh` sekali lagi.
3. Ambil `MYSQL_PUBLIC_URL` dari layanan MySQL (Variables). Jalankan dari komputer Anda:

```bash
RAILWAY_MYSQL_URL='mysql://root:PASSWORD@HOST:PORT/railway' \
  ./scripts/railway-import.sh backups/klozer-YYYYMMDD-HHMMSS.sql.gz
```

4. Nyalakan backend. Migrasi yang belum ada berjalan otomatis saat start.

## 6. Domain dan layanan luar

1. Frontend: **Settings > Networking > Custom Domain**, ikuti petunjuk CNAME dari Railway.
2. Setelah DNS menunjuk ke Railway, ganti URL webhook di: Meta, iPaymu (notify dan callback), pemberitahuan pembayaran platform, dan webhook keluar milik pelanggan bila ada.

## 7. Uji sebelum VPS dimatikan

- [ ] Login dan buka dashboard
- [ ] Pesan masuk lewat channel diterima, balasan terkirim
- [ ] Buat QRIS, bayar, status berubah
- [ ] Notifikasi realtime muncul (lihat catatan di bawah)
- [ ] Unggah gambar (QRIS toko, bukti transfer)
- [ ] Email terkirim (lupa sandi atau kredensial)
- [ ] `https://domain/api/v1/auth/me` tanpa login menjawab 401, bukan 502

Jangan matikan VPS dan jangan hapus dump terakhir sampai semuanya lolos.

## Catatan

- **Satu replika saja.** Sesi WhatsApp, socket, dan pembatas laju hidup di memori proses. Jangan naikkan `numReplicas`.
- **Realtime lewat long-polling.** Rewrite Next tidak meneruskan WebSocket, jadi Socket.io otomatis memakai long-polling. Fungsinya sama, sedikit lebih boros. Bila terasa kurang mulus, tambahkan layanan Caddy kecil di depan (konfigurasi di `Caddyfile` bisa dipakai dengan `auto_https off`).
- **`TRUST_PROXY_HOPS=2`**: Railway lalu Next lalu backend. Nilai keliru membuat pembatas laju dan IP di log salah.
- **Backup tidak otomatis.** `scripts/backup.sh` dan layanan `backup` hanya ada di compose. Di Railway, jadwalkan dump berkala ke penyimpanan di luar Railway. Data pelanggan hanya ada di satu database.
- **Zona waktu.** Backend memaksa UTC di tiap koneksi, jadi tidak perlu mengatur zona waktu MySQL.
- Detail platform (UID volume, IPv6 jaringan privat, variabel saat build) bisa berubah. Bila ada yang berbeda dari tulisan ini, ikuti dokumentasi Railway.
