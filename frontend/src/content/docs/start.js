import { faq, h, p, steps, terms, tip, warn } from "./blocks.js";

const ALL = ["owner", "spv", "cs", "superadmin"];
const MANAGER = ["owner", "spv"];

export const startGuides = [
  {
    id: "mengenal-klozer",
    title: "Mengenal Klozer",
    summary: "Apa itu Klozer, dan bagaimana alurnya dari pelanggan chat sampai pembayaran.",
    for: ALL,
    keywords: "pengenalan dasar alur istilah",
    blocks: [
      h("Fungsi"),
      p("Klozer membantu toko menjawab chat pelanggan, mencatat pesanan, dan menerima pembayaran dari satu tempat. Pelanggan menghubungi toko lewat WhatsApp, Instagram, Messenger, Telegram, atau chat di website. Asisten AI menjawab lebih dulu. Kalau pertanyaannya rumit, tim toko yang melanjutkan."),
      h("Alurnya"),
      steps([
        "Pelanggan mengirim pesan ke nomor atau akun toko.",
        "Pertanyaan rutin seperti rekening, daftar produk, harga, atau alamat dijawab langsung oleh **Jalur Cepat**. Ini tidak memakai token.",
        "Pertanyaan lain dijawab AI memakai data toko: produk, stok, rekening, dan dokumen yang Anda isi.",
        "Kalau AI tidak yakin, atau pelanggan minta bicara dengan manusia, chat diteruskan ke tim.",
        "Pelanggan memesan lalu membayar lewat QRIS atau transfer. Pesanan dan stok tercatat otomatis.",
      ]),
      h("Istilah yang sering muncul"),
      terms([
        ["Saluran", "Akun tempat pelanggan menghubungi toko, misalnya satu nomor WhatsApp."],
        ["Token", "Jatah pemakaian AI. Setiap kali AI menjawab, token berkurang."],
        ["Jalur Cepat", "Jawaban otomatis tanpa AI untuk pertanyaan rutin, jadi hemat token."],
        ["Paket", "Starter, Pro, atau Enterprise. Paket menentukan fitur dan jumlah saluran yang boleh dipakai."],
        ["Tim", "Staf toko: owner, supervisor, CS, finance, dan gudang."],
      ]),
      tip("Baru mendaftar? Buka panduan **Langkah pertama setelah daftar** dan ikuti urutannya."),
    ],
  },
  {
    id: "langkah-pertama",
    title: "Langkah pertama setelah daftar",
    summary: "Daftar kerja berurutan supaya toko siap melayani pelanggan.",
    for: MANAGER,
    open: "/dashboard/settings",
    keywords: "mulai setup awal checklist onboarding",
    blocks: [
      h("Fungsi"),
      p("Panduan ini membantu toko Anda siap dipakai, dari nol sampai bisa menjawab pelanggan sungguhan. Kerjakan berurutan. Tiap langkah punya panduan sendiri kalau Anda butuh penjelasan lebih."),
      h("Cara melakukannya"),
      steps([
        "Buka **Pengaturan**, tab **Profil Usaha dan WhatsApp**, lalu isi nama dan alamat toko. AI memakai alamat ini saat pelanggan bertanya lokasi.",
        "Hubungkan nomor WhatsApp di **Saluran Chat** (panduan: **Saluran Chat dan WhatsApp**).",
        "Isi produk di **Katalog & HPP**: nama, harga, dan stok. Banyak produk sekaligus bisa diimpor dari Excel (panduan: **Produk dan katalog**).",
        "Daftarkan rekening di **Rekening Bank & QRIS**. Hanya rekening yang terdaftar yang boleh disebut AI.",
        "Atur gaya bicara AI di **Pengaturan**, tab **Persona dan Script AI**.",
        "Isi jam buka di **Jalur Cepat** kalau Anda ingin pelanggan bisa bertanya jam buka.",
        "Coba semuanya di **Test CS AI** sebelum pelanggan sungguhan menghubungi toko.",
        "Tambahkan anggota tim di **Pengaturan**, tab **Hak Akses Tim**.",
        "Opsional: nyalakan **Pesanan di Chat** supaya AI mengambil pesanan sampai selesai.",
        "Cek sisa token di **Top Up Token AI** dan isi bila perlu.",
      ]),
      warn("AI hanya memakai data yang Anda isi. Kalau produk atau rekening masih kosong, AI akan jujur bilang infonya belum ada, dan itu membuat pelanggan menunggu tim."),
    ],
  },
  {
    id: "peran-dan-akses",
    title: "Peran dan hak akses",
    summary: "Siapa boleh melakukan apa, dan cara menambah anggota tim.",
    for: MANAGER,
    open: "/dashboard/settings",
    keywords: "owner supervisor cs finance gudang akun staf password",
    blocks: [
      h("Fungsi"),
      p("Setiap anggota tim punya peran. Peran menentukan menu yang terlihat dan hal yang boleh dilakukan, supaya orang hanya memegang yang perlu."),
      terms([
        ["Owner dan Supervisor", "Mengatur toko: saluran, AI, produk, tim, paket, dan top up token."],
        ["CS", "Membalas chat, melihat pesanan, dan mengerjakan tugas miliknya."],
        ["Finance", "Mengurus pembayaran, laporan, dan melihat biaya serta omzet iklan."],
        ["Gudang", "Mengurus stok dan pengiriman."],
        ["Admin Klozer", "Tim Klozer yang mengelola semua toko. Bukan bagian dari tim toko."],
      ]),
      h("Menambah anggota tim"),
      steps([
        "Buka **Pengaturan**, tab **Hak Akses Tim**.",
        "Tambah anggota, isi nama, email, dan pilih perannya.",
        "Password awal hanya tampil **satu kali**. Salin dan berikan ke orangnya.",
        "Untuk mengeluarkan seseorang, nonaktifkan akunnya. Ia langsung keluar dari semua perangkat.",
      ]),
      tip("Buat akun terpisah untuk tiap orang. Jangan berbagi satu akun, supaya **Audit Log Aktivitas** bisa menunjukkan siapa melakukan apa."),
      faq([
        ["Staf lupa password, bagaimana?", "Owner atau supervisor bisa mengatur ulang password di tab **Hak Akses Tim**. Password baru tampil satu kali."],
        ["Apakah staf bisa memakai akun yang sama di dua perangkat?", "Bisa. Tetapi mengganti password mengeluarkan perangkat lainnya."],
      ]),
    ],
  },
];
