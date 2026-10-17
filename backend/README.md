# Klozer Backend

Express + MySQL 8. Panduan lengkap ada di [README root](../README.md) dan [DEPLOY.md](../DEPLOY.md).

## Menjalankan

```bash
cp .env.example .env
npm ci
npm run dev          # http://localhost:5000, migrasi berjalan otomatis
```

Di development, database dibuat otomatis dan secret memakai nilai bawaan lokal. Di production server menolak start tanpa `JWT_SECRET`, `DB_ENCRYPTION_KEY`, dan kredensial database yang kuat.

## Perintah

| Perintah | Fungsi |
| :--- | :--- |
| `npm run migrate` | terapkan migrasi di `src/database/migrations` (juga otomatis saat start, matikan dengan `RUN_MIGRATIONS_ON_START=false`) |
| `npm run seed` | tiga tenant demo lengkap (staf, katalog, lead, chat, pesanan 45 hari terakhir). Password dari `SEED_PASSWORD`, atau dibuat acak dan dicetak sekali. `-- --reset` membangun ulang |
| `npm run lint` | ESLint |
| `npm test` | test integrasi pada MySQL asli (`TEST_DB_HOST/PORT/USER/PASSWORD`, bawaan `127.0.0.1:3307`, `root`/`testroot`) |

Setiap file test membuat database sementaranya sendiri lalu menghapusnya.

## Superadmin pertama

Isi `SUPERADMIN_EMAIL` dan `SUPERADMIN_PASSWORD` (minimal 12 karakter). Akun dibuat sekali saat start jika belum ada superadmin. Tidak ada akun atau password bawaan.

## Aturan migrasi

Migrasi yang sudah diterapkan dicatat dengan checksum. Jangan mengubah isinya; tambahkan file baru bernomor berikutnya. Backend menolak start jika checksum berubah.

## Struktur

```text
src/app.js          rakitan Express (helmet, CORS, pembatas laju, rute, error handler)
src/server.js       bootstrap: DB, migrasi, superadmin, Socket.io, shutdown halus
src/config/         env (validasi), db (pool, transaksi), logger
src/controllers/    satu file per domain
src/services/       AI, WhatsApp, iPaymu, token, order, komisi, audit
src/middlewares/    auth, konteks tenant, RBAC, validasi, rate limit
src/validation/     skema Zod
src/database/       migrasi, bootstrap, seed
test/               test integrasi
```
