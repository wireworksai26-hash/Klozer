import { faq, h, list, p, steps, terms, tip, warn } from "./blocks.js";

const MANAGER = ["owner", "spv"];

export const settingsGuides = [
  {
    id: "rekening-bank",
    title: "Rekening bank untuk transfer",
    summary: "Daftarkan rekening toko. Hanya rekening ini yang boleh disebut AI.",
    for: MANAGER,
    open: "/dashboard/bank-accounts",
    keywords: "rekening bank transfer bca bri mandiri nomor rekening aktif",
    blocks: [
      h("Fungsi"),
      p("Di **Rekening Bank & QRIS** Anda mendaftarkan rekening toko. Saat pelanggan bertanya cara bayar, AI dan Jalur Cepat menyebut rekening dari daftar ini. Rekening yang tidak terdaftar tidak akan pernah disebut."),
      h("Cara menambah rekening"),
      steps([
        "Buka **Rekening Bank & QRIS**.",
        "Tambah rekening: pilih bank, isi nomor rekening, dan nama pemilik.",
        "Pastikan statusnya aktif.",
        "Coba di **Test CS AI** dengan pertanyaan: minta rekeningnya.",
      ]),
      warn("Periksa nomor rekening dua kali. Nomor yang salah akan dikirim ke pelanggan apa adanya."),
      tip("Nonaktifkan rekening yang sudah tidak dipakai supaya AI berhenti menyebutnya."),
    ],
  },
  {
    id: "tim-dan-keamanan",
    title: "Keamanan akun dan tim",
    summary: "Praktik aman untuk password, akun staf, dan jejak aktivitas.",
    for: MANAGER,
    open: "/dashboard/settings",
    keywords: "keamanan password akun staf kunci log aktivitas perangkat",
    blocks: [
      h("Praktik yang disarankan"),
      list([
        "Buat akun terpisah untuk tiap staf di **Pengaturan**, tab **Hak Akses Tim**.",
        "Password awal hanya tampil sekali saat akun dibuat atau diatur ulang. Simpan dan berikan ke orangnya.",
        "Gunakan password minimal 12 karakter. Mengganti password mengeluarkan perangkat lain.",
        "Nonaktifkan staf yang sudah tidak bekerja. Ia langsung keluar dari semua perangkat.",
        "Akun terkunci sementara setelah beberapa kali salah password. Tunggu beberapa menit lalu coba lagi.",
      ]),
      h("Memeriksa siapa melakukan apa"),
      p("Buka **Audit Log Aktivitas** untuk melihat tindakan penting: siapa, apa, kapan, dan dari alamat IP mana. Contohnya login, perubahan pesanan, impor, dan perubahan rekening."),
      tip("Kalau ada kejanggalan, misalnya rekening berubah tanpa sepengetahuan Anda, cek log ini lebih dulu."),
    ],
  },
  {
    id: "api-webhook",
    title: "API dan webhook",
    summary: "Hubungkan Klozer ke n8n, Make, Zapier, atau program Anda sendiri.",
    for: MANAGER,
    open: "/dashboard/integrations",
    keywords: "api key webhook n8n make zapier integrasi event tanda tangan",
    blocks: [
      h("Fungsi"),
      p("**API dan Webhook** untuk menghubungkan Klozer ke alat lain. **API key** dipakai untuk mengambil atau menulis data (kontak, pesanan, produk, pesan). **Webhook** adalah kabar yang Klozer kirim ke alat Anda saat sesuatu terjadi, misalnya ada pesanan dibayar."),
      h("Membuat API key"),
      steps([
        "Buka **API dan Webhook**, tab **API key**.",
        "Buat key baru, beri nama, dan pilih izinnya (misalnya hanya membaca pesanan).",
        "Salin key yang tampil. Key **hanya tampil satu kali**. Setelah itu tidak bisa dilihat lagi.",
        "Pasang di alat Anda sebagai header Authorization dengan awalan Bearer.",
      ]),
      h("Membuat webhook"),
      steps([
        "Buka tab **Webhook** dan tambah alamat tujuan. Harus alamat https yang bisa diakses publik.",
        "Pilih event yang mau diterima. Daftarnya ada di tab **Daftar event**.",
        "Salin secret yang tampil. Ini juga hanya tampil sekali. Secret dipakai untuk memeriksa bahwa kabar itu benar dari Klozer.",
        "Klik kirim uji untuk memastikan alamat Anda menerimanya.",
      ]),
      h("Perlu diingat"),
      list([
        "Pengiriman yang gagal dicoba lagi beberapa kali, lalu ditandai gagal dan bisa dikirim ulang dari riwayat.",
        "Webhook yang gagal terus-menerus dimatikan otomatis, dan alasannya ditampilkan.",
        "Jumlah key dan webhook dibatasi sesuai paket.",
        "Kalau menu ini terkunci, fiturnya belum termasuk paket toko Anda.",
      ]),
      tip("Contoh pemakaian: kirim setiap pesanan yang dibayar ke Google Sheets lewat n8n."),
    ],
  },
  {
    id: "langganan-toko",
    title: "Halaman Langganan dan paket toko",
    summary: "Paket saat ini, masa berlaku, pemakaian token, dan jumlah tim.",
    for: MANAGER,
    open: "/dashboard/subscription",
    keywords: "langganan paket toko masa berlaku pemakaian",
    blocks: [
      h("Apa yang ada di halaman ini"),
      terms([
        ["Paket saat ini", "Starter, Pro, atau Enterprise, dan apakah akunnya aktif."],
        ["Berlaku sampai", "Tanggal paket berakhir. Perpanjang sebelum tanggal itu."],
        ["Token AI terpakai", "Berapa token yang sudah dipakai dari total kuota."],
        ["Tim aktif", "Jumlah akun staf yang aktif."],
      ]),
      p("Untuk membeli atau memperpanjang paket, lihat panduan **Memilih dan membayar paket langganan**. Untuk menambah token, lihat **Top up token**."),
      faq([
        ["Akun saya tertulis nonaktif.", "Hubungi tim Klozer. Akun yang dinonaktifkan hanya bisa dihidupkan lagi oleh admin Klozer."],
      ]),
    ],
  },
];
