import { LEGAL } from "./config";

const { brand, site, contactEmail } = LEGAL;

export const privacyIntro = [
  `Kebijakan Privasi ini menjelaskan data pribadi apa yang diproses ${brand} di ${site}, untuk apa, dengan siapa dibagikan, dan hak Anda. Kami memproses data pribadi sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) dan peraturan terkait.`,
  `${brand} melayani dua kelompok orang: Pengguna (bisnis atau lembaga yang berlangganan) dan Pelanggan Akhir (pembeli atau donatur yang berkomunikasi dengan Pengguna). Peran kami berbeda untuk masing-masing, dan dijelaskan di bagian “Peran kami”.`,
];

export const privacySections = [
  {
    id: "peran",
    title: "Peran kami",
    blocks: [
      {
        list: [
          `Data akun Pengguna (nama, email, nomor telepon, data langganan, log aktivitas akun): ${brand} adalah pengendali data.`,
          `Data Pelanggan Akhir yang dimasukkan atau diterima Pengguna melalui ${brand} (nama, nomor WhatsApp, isi percakapan, alamat, pesanan): Pengguna adalah pengendali data, dan ${brand} adalah pemroses yang bertindak atas instruksi Pengguna.`,
        ],
      },
      "Bila Anda adalah Pelanggan Akhir dan ingin menggunakan hak atas data Anda, hubungi bisnis yang Anda ajak berkomunikasi. Anda juga boleh menghubungi kami, dan kami akan membantu meneruskannya.",
    ],
  },
  {
    id: "data",
    title: "Data yang kami proses",
    blocks: [
      {
        list: [
          "Data pendaftaran dan akun: nama bisnis, sektor, nama pemilik, email, nomor telepon, peran staf, dan kata sandi (disimpan dalam bentuk hash, bukan teks asli).",
          "Data operasional bisnis: produk, stok, pesanan, pengiriman, laporan, pengaturan toko, dan rekening bank bisnis yang Anda masukkan untuk transfer manual.",
          "Data Pelanggan Akhir: nama, nomor WhatsApp, isi pesan teks, pesan suara bila fitur diaktifkan, alamat pengiriman, riwayat pesanan, dan label yang diberikan Pengguna.",
          "Data transaksi: nomor referensi pembayaran, nominal, status, dan waktu. Kami tidak menyimpan nomor kartu atau kredensial dompet digital Pelanggan Akhir. Proses pembayaran QRIS terjadi di sisi penyedia payment gateway dan aplikasi pembayaran Pelanggan Akhir.",
          "Data teknis dan keamanan: alamat IP, jenis peramban, catatan masuk dan keluar, serta log audit tindakan penting di akun.",
          "Data yang tersimpan di peramban Anda: token sesi dan preferensi seperti pilihan bahasa. Data ini dipakai agar Anda tetap masuk dan Layanan tampil sesuai pilihan Anda, bukan untuk pelacakan iklan.",
        ],
      },
    ],
  },
  {
    id: "tujuan",
    title: "Tujuan penggunaan data",
    blocks: [
      {
        list: [
          "Menyediakan Layanan: membuat akun, menerima dan membalas pesan WhatsApp, mencatat pesanan, menerbitkan QRIS, dan membuat laporan.",
          "Menghasilkan balasan otomatis oleh AI dari isi percakapan dan katalog Pengguna.",
          "Menagih langganan, menghitung kuota, dan menyelesaikan sengketa pembayaran.",
          "Menjaga keamanan, mencegah penipuan dan penyalahgunaan, serta memenuhi kewajiban hukum.",
          "Memperbaiki dan memelihara Layanan, termasuk mendiagnosis gangguan.",
          "Mengirim pemberitahuan penting tentang akun dan Layanan.",
        ],
      },
      "Dasar pemrosesan kami adalah pelaksanaan perjanjian dengan Pengguna, persetujuan bila diperlukan, kepentingan sah yang tidak mengesampingkan hak Anda, dan kewajiban hukum.",
    ],
  },
  {
    id: "pihak-ketiga",
    title: "Pihak ketiga yang menerima data",
    blocks: [
      "Kami membagikan data hanya bila diperlukan untuk menjalankan Layanan, dengan penyedia berikut:",
      {
        list: [
          "Meta (WhatsApp Cloud API, dan Conversions API bila Pengguna mengaktifkannya): untuk mengirim dan menerima pesan WhatsApp dan mengukur konversi iklan.",
          "Penyedia model AI (NVIDIA NIM dan/atau Google Gemini): potongan percakapan dan informasi produk dikirim agar AI dapat menyusun balasan.",
          "iPaymu: nama, nomor telepon, email (atau nilai pengganti bila tidak ada), nominal, dan referensi pesanan untuk menerbitkan dan memverifikasi pembayaran QRIS.",
          "Penyedia layanan email (SMTP): untuk mengirim email akun dan pemberitahuan.",
          "Jasa pengiriman barang: nama, nomor telepon, dan alamat tujuan, bila Pengguna memakai fitur pengiriman.",
          "Penyedia server dan hosting yang kami pakai untuk menjalankan Layanan.",
        ],
      },
      "Penyedia tersebut memproses data menurut kebijakan mereka sendiri. Kami tidak menjual data pribadi dan tidak membagikannya untuk tujuan periklanan pihak ketiga. Kami dapat mengungkapkan data bila diwajibkan oleh hukum atau permintaan otoritas yang berwenang.",
    ],
  },
  {
    id: "lintas-negara",
    title: "Transfer data ke luar Indonesia",
    blocks: [
      "Sebagian penyedia di atas, seperti Meta dan penyedia model AI, dapat memproses data di server di luar Indonesia. Kami hanya mengirim data yang diperlukan dan mengupayakan agar penerimanya menerapkan pelindungan data yang memadai sesuai UU PDP.",
    ],
  },
  {
    id: "penyimpanan",
    title: "Berapa lama data disimpan",
    blocks: [
      {
        list: [
          "Data akun dan data operasional: selama akun aktif.",
          "Log notifikasi webhook (WhatsApp dan pembayaran): dihapus otomatis setelah 90 hari.",
          "Log sesi koneksi WhatsApp: dihapus otomatis setelah 7 hari.",
          "Log audit: dihapus otomatis setelah 400 hari.",
          "Cadangan basis data harian: disimpan 14 hari, lalu dihapus otomatis.",
          "Catatan transaksi dan keuangan: dapat kami simpan lebih lama bila diwajibkan peraturan perpajakan atau kewajiban hukum lain.",
        ],
      },
      "Setelah akun berakhir, kami menghapus atau menganonimkan data akun dan data operasional dalam waktu yang wajar, kecuali data yang wajib disimpan menurut hukum. Data yang ada di cadangan akan terhapus mengikuti siklus cadangan di atas.",
    ],
  },
  {
    id: "keamanan",
    title: "Keamanan data",
    blocks: [
      "Kami menerapkan langkah teknis dan organisasi yang wajar, antara lain:",
      {
        list: [
          "koneksi terenkripsi (HTTPS) untuk akses ke Layanan;",
          "kata sandi disimpan sebagai hash, dan token integrasi WhatsApp disimpan terenkripsi;",
          "pemisahan data antar Pengguna (tenant) dan pembatasan akses berdasarkan peran staf;",
          "verifikasi tanda tangan pada notifikasi webhook dari Meta dan payment gateway;",
          "pencatatan audit untuk tindakan penting dan pembatasan laju permintaan untuk mencegah penyalahgunaan.",
        ],
      },
      `Tidak ada sistem yang sepenuhnya aman. Bila terjadi kegagalan pelindungan data pribadi yang berdampak pada Anda, kami akan memberitahukannya sesuai ketentuan UU PDP. Laporkan dugaan masalah keamanan ke ${contactEmail}.`,
    ],
  },
  {
    id: "hak",
    title: "Hak Anda",
    blocks: [
      "Sesuai UU PDP, Anda berhak untuk:",
      {
        list: [
          "mendapatkan informasi tentang pemrosesan data Anda dan meminta salinan data Anda;",
          "memperbaiki data yang tidak akurat atau tidak lengkap;",
          "meminta penghapusan atau pemusnahan data Anda, sepanjang tidak ada kewajiban hukum untuk menyimpannya;",
          "menarik persetujuan yang pernah diberikan;",
          "mengajukan keberatan atas pemrosesan tertentu, termasuk keputusan yang diambil sepenuhnya secara otomatis yang berdampak signifikan bagi Anda;",
          "membatasi pemrosesan dan meminta pemindahan data bila memungkinkan secara teknis.",
        ],
      },
      `Ajukan permintaan ke ${contactEmail} dengan menyebutkan nama dan data yang dimaksud. Kami dapat meminta bukti identitas untuk melindungi data Anda. Kami akan menanggapi dalam waktu yang wajar sesuai peraturan yang berlaku. Permintaan terkait data Pelanggan Akhir akan kami teruskan ke Pengguna yang bersangkutan sebagai pengendali data.`,
    ],
  },
  {
    id: "anak",
    title: "Anak di bawah umur",
    blocks: [`${brand} ditujukan untuk bisnis dan tidak ditujukan bagi anak di bawah 18 tahun. Jika Anda mengetahui ada data anak yang masuk tanpa izin yang sah, hubungi kami agar dapat kami tangani.`],
  },
  {
    id: "perubahan",
    title: "Perubahan kebijakan",
    blocks: ["Kami dapat memperbarui kebijakan ini. Perubahan penting akan diumumkan melalui Layanan atau email, dan tanggal “terakhir diperbarui” di halaman ini akan disesuaikan."],
  },
  {
    id: "kontak",
    title: "Kontak",
    blocks: [`Pertanyaan atau permintaan terkait data pribadi dapat dikirim ke ${contactEmail}.`],
  },
];
