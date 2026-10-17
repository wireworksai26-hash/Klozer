import { LEGAL } from "./config";

const { brand, site, contactEmail } = LEGAL;

export const termsIntro = [
  `Syarat dan Ketentuan ini mengatur penggunaan layanan ${brand} di ${site} (“Layanan”). Dengan membuat akun atau menggunakan Layanan, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh isinya. Jika Anda tidak setuju, mohon jangan menggunakan Layanan.`,
];

export const termsSections = [
  {
    id: "definisi",
    title: "Definisi",
    blocks: [
      {
        list: [
          `“Kami” adalah pengelola ${brand}.`,
          "“Pengguna” adalah bisnis, lembaga, atau perorangan yang mendaftar dan memakai Layanan, termasuk seluruh akun staf (pemilik, supervisor, customer service, keuangan) di bawah akun tersebut.",
          "“Pelanggan Akhir” adalah pembeli, donatur, atau pihak lain yang berkomunikasi dengan Pengguna melalui Layanan, misalnya lewat WhatsApp.",
          "“Data Pelanggan” adalah data tentang Pelanggan Akhir yang masuk ke Layanan, seperti nama, nomor WhatsApp, isi percakapan, alamat pengiriman, dan riwayat pesanan.",
        ],
      },
    ],
  },
  {
    id: "layanan",
    title: "Layanan yang kami sediakan",
    blocks: [
      `${brand} adalah platform yang membantu Pengguna mengelola percakapan penjualan, termasuk balasan otomatis berbasis kecerdasan buatan (AI), katalog produk dan stok, pesanan, penagihan lewat QRIS, laporan, dan pembagian tugas antar staf.`,
      "Fitur yang tersedia bergantung pada paket yang Anda pilih. Sebagian fitur bergantung pada layanan pihak ketiga, antara lain WhatsApp Cloud API dari Meta, penyedia model AI, penyedia pembayaran (payment gateway), layanan pengiriman email, dan jasa pengiriman barang. Kami tidak menjamin layanan pihak ketiga selalu tersedia atau tidak berubah.",
      "Kami dapat menambah, mengubah, atau menghentikan fitur dengan pemberitahuan yang wajar, terutama bila perubahan itu berdampak material bagi Pengguna.",
    ],
  },
  {
    id: "akun",
    title: "Akun dan keamanan",
    blocks: [
      {
        list: [
          "Anda harus cakap hukum dan berusia minimal 18 tahun, atau mewakili badan usaha atau lembaga yang berwenang menyetujui syarat ini.",
          "Informasi pendaftaran harus benar dan tetap Anda perbarui.",
          "Anda bertanggung jawab atas kerahasiaan kata sandi dan atas semua aktivitas di akun Anda dan akun staf Anda. Segera hubungi kami bila ada dugaan akun disalahgunakan.",
          "Kata sandi awal yang dibuat sistem hanya ditampilkan satu kali. Segera simpan dan ganti.",
          "Satu akun tidak boleh dibagikan kepada orang di luar organisasi Anda.",
        ],
      },
    ],
  },
  {
    id: "paket-pembayaran",
    title: "Paket, harga, dan pembayaran langganan",
    blocks: [
      "Harga dan isi paket ditampilkan di halaman harga kami dan dapat berubah. Perubahan harga tidak berlaku surut untuk periode yang sudah Anda bayar.",
      "Langganan ditagih per bulan atau per tahun sesuai pilihan Anda, dimuka untuk periode yang bersangkutan. Harga belum termasuk pajak yang berlaku, bila ada.",
      "Kuota yang menyertai paket, misalnya kuota token AI atau kredit blast, memiliki batas. Penggunaan di atas kuota dapat dibatasi sampai Anda menambah kuota atau berganti paket.",
      "Bila langganan tidak diperpanjang, akun dapat dibatasi atau ditangguhkan setelah masa berlaku berakhir.",
      "Biaya langganan yang telah dibayar tidak dapat dikembalikan untuk periode yang sudah berjalan, kecuali ditentukan lain oleh peraturan perundang-undangan atau bila terjadi kesalahan penagihan dari pihak kami.",
    ],
  },
  {
    id: "qris",
    title: "Pembayaran QRIS dari Pelanggan Akhir",
    blocks: [
      `${brand} menyediakan kemampuan menerbitkan kode QRIS untuk pesanan melalui payment gateway pihak ketiga (saat ini iPaymu). ${brand} bukan bank, bukan penerbit uang elektronik, dan tidak menyimpan dana Pelanggan Akhir.`,
      {
        list: [
          "Nominal yang ditagih selalu diambil dari total pesanan yang tersimpan di server, bukan dari angka yang diketik di chat.",
          "Kode QRIS berlaku singkat (saat ini 5 menit). Bila kedaluwarsa, kode baru harus diterbitkan, dan kode lama tidak dapat dibayar lagi.",
          "Status pesanan berubah menjadi lunas hanya setelah payment gateway mengirim konfirmasi yang valid dan nominalnya sesuai. Konfirmasi ganda hanya diproses satu kali.",
          "Pemrosesan pembayaran, biaya transaksi, penyelesaian dana, pengembalian dana (refund), dan sengketa pembayaran tunduk pada ketentuan penyedia payment gateway. Pengguna wajib mengikuti ketentuan tersebut.",
          "Pengguna bertanggung jawab atas hubungan jual beli dengan Pelanggan Akhir, termasuk kualitas barang atau jasa, pengiriman, pengembalian barang, dan pengembalian dana kepada Pelanggan Akhir.",
        ],
      },
    ],
  },
  {
    id: "ai",
    title: "Fitur AI",
    blocks: [
      "Balasan otomatis dihasilkan oleh model AI dan dapat keliru, tidak lengkap, atau tidak sesuai konteks. Pengguna bertanggung jawab menyiapkan informasi produk dan kebijakan yang akurat, memantau percakapan, dan mengambil alih percakapan bila perlu.",
      "AI tidak dimaksudkan memberi nasihat hukum, keuangan, medis, atau keagamaan. Jangan mengandalkan keluarannya untuk keputusan penting tanpa pemeriksaan manusia.",
      "Untuk menghasilkan balasan, isi percakapan yang relevan dikirim ke penyedia model AI. Lihat Kebijakan Privasi untuk rinciannya.",
    ],
  },
  {
    id: "larangan",
    title: "Penggunaan yang dilarang",
    blocks: [
      "Anda dilarang menggunakan Layanan untuk:",
      {
        list: [
          "menjual atau mempromosikan barang atau jasa yang melanggar hukum, atau yang dilarang oleh kebijakan WhatsApp dan Meta;",
          "mengirim pesan spam, pesan massal tanpa persetujuan penerima, atau menghubungi orang yang sudah menolak dihubungi;",
          "penipuan, pemalsuan bukti transfer, pencucian uang, atau pendanaan kegiatan ilegal;",
          "mengumpulkan atau memproses data pribadi tanpa dasar hukum yang sah;",
          "mengganggu, membebani, atau mencoba menembus keamanan Layanan, termasuk menelusuri data Pengguna lain;",
          "menyalin, membongkar (reverse engineering), atau menjual kembali Layanan tanpa izin tertulis.",
        ],
      },
      "Pelanggaran dapat berakibat pembatasan atau penghentian akun tanpa pengembalian biaya.",
    ],
  },
  {
    id: "data",
    title: "Data Pelanggan dan kewajiban Pengguna",
    blocks: [
      "Data Pelanggan tetap milik Pengguna. Terhadap Data Pelanggan, Pengguna bertindak sebagai pengendali data dan kami sebagai pemroses yang bertindak atas instruksi Pengguna, sebagaimana dijelaskan di Kebijakan Privasi.",
      {
        list: [
          "Pengguna wajib memiliki dasar hukum yang sah, termasuk persetujuan bila diperlukan, untuk menghubungi dan memproses data Pelanggan Akhir.",
          "Pengguna wajib menghormati permintaan Pelanggan Akhir untuk berhenti dihubungi, mengakses, memperbaiki, atau menghapus datanya.",
          "Pengguna wajib mematuhi persyaratan WhatsApp Business dan kebijakan Meta untuk nomor yang dihubungkan ke Layanan.",
        ],
      },
    ],
  },
  {
    id: "ketersediaan",
    title: "Ketersediaan layanan",
    blocks: [
      "Kami berupaya menjaga Layanan tetap berjalan, tetapi tidak menjamin Layanan bebas gangguan. Pemeliharaan terjadwal, gangguan jaringan, gangguan penyedia pihak ketiga, dan keadaan di luar kendali kami dapat menyebabkan Layanan terhenti sementara.",
      "Kami menyimpan cadangan basis data secara berkala untuk pemulihan, namun Pengguna disarankan mengekspor data penting secara berkala.",
    ],
  },
  {
    id: "kekayaan-intelektual",
    title: "Kekayaan intelektual",
    blocks: [
      `Perangkat lunak, merek, tampilan, dan dokumentasi ${brand} adalah milik kami atau pemberi lisensi kami. Anda mendapat hak terbatas, tidak eksklusif, dan tidak dapat dipindahtangankan untuk menggunakan Layanan selama berlangganan.`,
      "Konten dan data yang Anda masukkan tetap milik Anda. Anda memberi kami izin terbatas untuk memproses konten tersebut sebatas yang diperlukan untuk menyediakan Layanan.",
    ],
  },
  {
    id: "tanggung-jawab",
    title: "Pembatasan tanggung jawab",
    blocks: [
      "Sejauh diizinkan hukum, Layanan diberikan sebagaimana adanya. Kami tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan, kehilangan peluang penjualan, atau kerugian akibat kesalahan balasan AI, gangguan layanan pihak ketiga, atau tindakan Pengguna dan Pelanggan Akhir.",
      "Total tanggung jawab kami kepada Anda atas klaim apa pun terkait Layanan dibatasi sebesar biaya langganan yang Anda bayarkan dalam tiga bulan terakhir sebelum kejadian yang menimbulkan klaim.",
      "Ketentuan ini tidak membatasi tanggung jawab yang menurut hukum tidak dapat dibatasi.",
    ],
  },
  {
    id: "ganti-rugi",
    title: "Ganti rugi",
    blocks: [
      "Anda setuju membebaskan kami dari tuntutan pihak ketiga, termasuk Pelanggan Akhir dan regulator, yang timbul dari pelanggaran Anda terhadap syarat ini, hukum yang berlaku, atau hak pihak lain, termasuk dari konten dan pesan yang Anda kirim lewat Layanan.",
    ],
  },
  {
    id: "penghentian",
    title: "Penangguhan dan penghentian",
    blocks: [
      "Anda dapat berhenti berlangganan kapan saja. Akses tetap berlaku sampai akhir periode yang telah dibayar.",
      "Kami dapat menangguhkan atau menghentikan akun bila terjadi pelanggaran syarat ini, tunggakan pembayaran, penyalahgunaan yang membahayakan Layanan atau pihak lain, atau perintah dari otoritas yang berwenang. Bila memungkinkan, kami memberi pemberitahuan terlebih dahulu.",
      "Setelah akun berakhir, data diperlakukan sesuai Kebijakan Privasi. Mohon ekspor data yang Anda perlukan sebelum akun berakhir.",
    ],
  },
  {
    id: "perubahan",
    title: "Perubahan syarat",
    blocks: [
      "Kami dapat memperbarui syarat ini. Perubahan penting akan diberitahukan melalui Layanan atau email. Bila Anda tetap menggunakan Layanan setelah tanggal berlaku perubahan, Anda dianggap menyetujuinya.",
    ],
  },
  {
    id: "hukum",
    title: "Hukum yang berlaku dan penyelesaian sengketa",
    blocks: [
      "Syarat ini tunduk pada hukum Republik Indonesia. Sengketa diupayakan diselesaikan secara musyawarah. Bila tidak tercapai, sengketa diselesaikan melalui pengadilan negeri yang berwenang di Indonesia.",
    ],
  },
  {
    id: "kontak",
    title: "Kontak",
    blocks: [`Pertanyaan tentang syarat ini dapat dikirim ke ${contactEmail}.`],
  },
];
