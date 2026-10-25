import { faq, h, list, p, terms, tip } from "./blocks.js";

const ALL = ["owner", "spv", "cs", "superadmin"];

export const helpGuides = [
  {
    id: "masalah-umum",
    title: "Masalah umum dan cara mengatasinya",
    summary: "AI tidak menjawab, pesan tidak masuk, paket belum aktif, dan masalah lain yang sering terjadi.",
    for: ALL,
    keywords: "masalah error tidak masuk ai tidak membalas token habis paket belum aktif qris tidak muncul",
    blocks: [
      h("Chat dan AI"),
      faq([
        [
          "AI tidak membalas pelanggan.",
          "Cek berurutan: (1) sisa token di **Top Up Token AI**, (2) saklar **AI menjawab** di saluran itu, (3) apakah chat sedang dipegang CS (tertulis siapa yang menjawab di atas percakapan, klik **Kembalikan ke AI**), (4) apakah AI memang menyerahkan chat itu ke tim karena komplain atau pertanyaannya di luar data toko.",
        ],
        [
          "Pesan pelanggan tidak masuk ke Live Chat.",
          "Buka **Saluran Chat** lalu klik **Tes koneksi**. Kalau gagal, token Meta mungkin sudah kedaluwarsa atau webhook belum terdaftar di Meta. Untuk WhatsApp, pastikan field messages aktif.",
        ],
        [
          "AI menjawab tidak sesuai.",
          "Coba pertanyaan yang sama di **Test CS AI**. Lalu tambah dokumen di **Basis Pengetahuan**, koreksi di **Evaluasi AI**, atau perbaiki data produk dan rekening.",
        ],
        [
          "AI bilang info belum ada.",
          "Itu artinya datanya memang belum diisi. Lengkapi produk, rekening, alamat, atau jam buka di **Jalur Cepat**.",
        ],
        [
          "Di Saluran Chat muncul peringatan pembayaran Meta, atau AI tidak terkirim padahal token ada.",
          "Meta menolak pesan karena akun WhatsApp Business Anda belum punya metode pembayaran yang valid. Pasang atau perbaiki di WhatsApp Manager milik Anda di Meta. Peringatannya hilang sendiri begitu pesan berhasil terkirim. Detailnya ada di panduan **Biaya WhatsApp dari Meta**.",
        ],
        [
          "Saya tidak bisa membalas di luar 24 jam.",
          "Aturan WhatsApp: pesan bebas hanya sampai 24 jam setelah pesan terakhir pelanggan. Gunakan templat lewat **Smart Broadcast**.",
        ],
      ]),
      h("Pembayaran dan paket"),
      faq([
        [
          "Saya sudah bayar tetapi paket atau token belum masuk.",
          "Tunggu beberapa detik dengan jendela bayar terbuka. Kalau tetap belum, klik **Unggah bukti transfer** lalu **Saya sudah bayar**. Tim Klozer akan memeriksa dan mengaktifkan.",
        ],
        [
          "QRIS tidak muncul di jendela bayar, hanya daftar rekening.",
          "Berarti QRIS dinamis belum dipasang oleh tim Klozer. Bayar ke rekening yang tampil, lalu unggah bukti dan klik **Saya sudah bayar**.",
        ],
        [
          "Nominal QRIS lebih besar beberapa rupiah dari harga paket.",
          "Itu kode unik Rp 1 sampai Rp 99 supaya pembayaran Anda dikenali otomatis. Bayar sesuai nominal yang tertulis.",
        ],
        [
          "Kode voucher ditolak.",
          "Baca pesan di bawah kolom voucher. Penyebab umum: kode salah ketik, sudah kedaluwarsa, sudah habis dipakai, belum mencapai minimal token, atau toko Anda sudah memakainya.",
        ],
        [
          "Tagihan saya hilang dari daftar.",
          "Tagihan paket berlaku 24 jam dan hanya satu yang terbuka per toko. Memilih paket lain membatalkan yang lama. Buat tagihan baru kalau perlu.",
        ],
      ]),
      h("Akun"),
      faq([
        ["Saya terkunci karena salah password.", "Tunggu beberapa menit lalu coba lagi. Kalau lupa password, minta owner atau supervisor mengaturnya ulang."],
        ["Menu yang saya cari tidak ada.", "Menu menyesuaikan peran Anda dan paket toko. Kalau terkunci, fiturnya belum termasuk paket. Lihat **Langganan & Paket Toko**."],
      ]),
      tip("Kalau masalah Anda belum terjawab, hubungi tim Klozer dan sebutkan menu, waktu kejadian, dan pesan yang tampil."),
    ],
  },
  {
    id: "menu-pratinjau",
    title: "Menu yang masih pratinjau",
    summary: "Beberapa menu baru menampilkan contoh tampilan dan belum memakai data toko Anda.",
    for: ALL,
    keywords: "pratinjau preview contoh template label kredit blacklist internal chat eskalasi booking roster gudang etalase",
    blocks: [
      h("Apa artinya pratinjau"),
      p("Beberapa menu menampilkan catatan **pratinjau**. Artinya halaman itu masih memakai data contoh, belum terhubung penuh ke data toko Anda. Jangan memakainya untuk pekerjaan nyata, dan jangan heran kalau isinya tidak berubah saat Anda mengubahnya."),
      h("Menu yang saat ini pratinjau"),
      list([
        "Quick Reply & Template, Manajemen Label, dan statistik label.",
        "Kredit & Kuota Pesan.",
        "Blacklist Nomor.",
        "Internal Chat Tim.",
        "Eskalasi & Co-Pilot (Antrean Eskalasi).",
        "Booking & Reservasi.",
        "Jadwal Roster PIC.",
        "Gudang & Hub Pengiriman.",
        "Etalase dan pengetahuan doa.",
        "Untuk admin Klozer: Skenario AI, Blasting WA, Export Data, Leads Global, dan Transaksi.",
      ]),
      tip("Untuk pekerjaan yang sama, pakai menu yang sudah berjalan: **Live Chat WhatsApp**, **Tugas**, **Smart Broadcast**, dan **Evaluasi AI**."),
    ],
  },
  {
    id: "istilah",
    title: "Daftar istilah",
    summary: "Arti kata-kata yang sering dipakai di Klozer.",
    for: ALL,
    keywords: "istilah glosarium arti kata hpp sku roas waba qris token kanal",
    blocks: [
      p("Daftar ini menjelaskan kata yang sering muncul di Klozer, diurutkan menurut abjad."),
      terms([
        ["AI", "Asisten yang menulis balasan ke pelanggan memakai data toko."],
        ["Agen AI", "Satu peran AI, misalnya penjualan atau layanan pesanan."],
        ["Ambil alih", "CS mengambil chat dari AI untuk membalas sendiri."],
        ["Broadcast", "Pesan yang dikirim ke banyak pelanggan sekaligus."],
        ["CRM", "Daftar pelanggan beserta riwayat dan belanjanya."],
        ["Dynamic QRIS", "QRIS yang nominalnya sudah terkunci di dalam kode untuk satu tagihan."],
        ["HPP", "Harga pokok penjualan: modal untuk satu produk. Dipakai menghitung laba."],
        ["Jalur Cepat", "Jawaban otomatis tanpa AI untuk pertanyaan rutin. Tidak memakai token."],
        ["Kanal atau saluran", "Akun tempat pelanggan menghubungi toko, misalnya nomor WhatsApp."],
        ["Kode unik", "Angka kecil (Rp 1 sampai Rp 99) yang ditambahkan ke nominal tagihan supaya pembayaran bisa dikenali."],
        ["Opt-in", "Persetujuan pelanggan untuk menerima pesan promosi."],
        ["QRIS", "Kode QR pembayaran standar Indonesia yang bisa dipindai dari berbagai aplikasi."],
        ["ROAS", "Omzet dibagi biaya iklan. ROAS 5 berarti tiap Rp 1 biaya iklan kembali Rp 5 omzet."],
        ["SKU", "Kode unik sebuah produk."],
        ["Templat", "Pesan baku yang disetujui Meta, wajib untuk memulai percakapan WhatsApp atau broadcast."],
        ["Token", "Jatah pemakaian AI yang berkurang setiap AI menjawab."],
        ["Top up", "Membeli token tambahan."],
        ["WABA", "WhatsApp Business Account: akun bisnis WhatsApp di Meta yang menaungi nomor Anda."],
        ["Webhook", "Kabar otomatis yang dikirim Klozer ke alat lain saat ada kejadian, misalnya pesanan dibayar."],
      ]),
    ],
  },
];
