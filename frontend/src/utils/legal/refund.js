import { LEGAL } from "./config";

const { brand, contactEmail, refund } = LEGAL;

export const refundIntro = [
  `Kebijakan ini menjelaskan kapan dan bagaimana pengembalian dana (refund) dapat diajukan terkait ${brand}. Ada dua situasi yang berbeda: biaya langganan ${brand} yang dibayar oleh Pengguna, dan pembayaran QRIS yang dilakukan pembeli kepada toko Pengguna.`,
];

export const refundSections = [
  {
    id: "ruang-lingkup",
    title: "Ruang lingkup",
    blocks: [
      {
        list: [
          `Biaya langganan ${brand}: dibayar oleh bisnis atau lembaga yang memakai ${brand} (Pengguna) kepada kami.`,
          `Pembayaran QRIS pesanan: dibayar oleh pembeli kepada toko Pengguna melalui ${brand}. Hubungan jual beli ada antara pembeli dan toko, bukan dengan ${brand}.`,
        ],
      },
    ],
  },
  {
    id: "langganan-layak",
    title: "Refund biaya langganan: kondisi yang dapat dikembalikan",
    blocks: [
      "Pengembalian dana dapat disetujui bila:",
      {
        list: [
          "terjadi pembayaran ganda untuk periode langganan yang sama;",
          "nominal yang ditagih atau dibayar tidak sesuai dengan harga paket yang berlaku saat pembelian;",
          "Anda sudah membayar tetapi langganan tidak aktif dan kami tidak dapat mengaktifkannya;",
          "Layanan tidak dapat dipakai dalam waktu lama akibat gangguan dari sisi kami yang tidak kami pulihkan dalam waktu yang wajar. Dalam kasus ini, pengembalian dihitung proporsional terhadap sisa periode, atau dapat diganti perpanjangan masa langganan bila Anda setuju.",
        ],
      },
    ],
  },
  {
    id: "langganan-tidak-layak",
    title: "Kondisi yang tidak dapat dikembalikan",
    blocks: [
      {
        list: [
          "periode langganan yang sudah berjalan dan sudah Anda gunakan, termasuk kuota yang sudah terpakai;",
          "perubahan pikiran, atau fitur yang tidak sesuai harapan setelah Anda menggunakannya;",
          "gangguan atau perubahan pada layanan pihak ketiga di luar kendali kami, misalnya WhatsApp/Meta, penyedia AI, atau payment gateway;",
          "akun yang dibatasi atau dihentikan karena pelanggaran Syarat dan Ketentuan;",
          "kesalahan pengaturan atau data yang dimasukkan sendiri oleh Pengguna;",
          `pengajuan setelah lewat ${refund.requestWindowDays} hari sejak tanggal pembayaran, kecuali karena kesalahan penagihan dari pihak kami.`,
        ],
      },
    ],
  },
  {
    id: "prosedur",
    title: "Cara mengajukan refund langganan",
    blocks: [
      {
        list: [
          `Kirim email ke ${contactEmail} dalam ${refund.requestWindowDays} hari sejak tanggal pembayaran, dengan subjek “Refund – nama bisnis Anda”.`,
          "Sertakan: nama bisnis, email akun, tanggal dan nominal pembayaran, nomor referensi pembayaran (bila ada), alasan pengajuan, dan bukti pendukung seperti tangkapan layar atau bukti bayar.",
          `Kami mengonfirmasi penerimaan pengajuan dalam ${refund.acknowledgeBusinessDays} hari kerja.`,
          `Kami meninjau dan memberi keputusan dalam ${refund.reviewBusinessDays} hari kerja setelah data lengkap. Bila perlu, kami meminta informasi tambahan.`,
        ],
      },
    ],
  },
  {
    id: "pengembalian",
    title: "Waktu dan cara pengembalian dana",
    blocks: [
      {
        list: [
          `Refund yang disetujui dikembalikan ke rekening atau metode pembayaran asal, paling lambat ${refund.payoutBusinessDays} hari kerja setelah persetujuan. Lama dana tiba di rekening Anda juga bergantung pada bank atau penyedia pembayaran.`,
          "Biaya transaksi yang sudah dipotong penyedia pembayaran dan tidak dapat ditarik kembali dapat dikurangkan dari nilai refund. Bila refund terjadi karena kesalahan kami, biaya tersebut kami tanggung.",
          "Setelah refund disetujui, langganan untuk periode tersebut dapat dinonaktifkan.",
        ],
      },
    ],
  },
  {
    id: "qris-pembeli",
    title: "Pembeli yang membayar QRIS ke toko",
    blocks: [
      `Bila Anda pembeli yang membayar pesanan lewat ${brand}, pengembalian barang atau dana mengikuti kebijakan toko tempat Anda berbelanja. Hubungi toko tersebut langsung, misalnya lewat percakapan WhatsApp yang sama, dengan menyebutkan nomor pesanan dan bukti pembayaran.`,
      {
        list: [
          `${brand} tidak menahan dana pembeli dan bukan pihak dalam jual beli antara pembeli dan toko.`,
          "Kode QRIS hanya berlaku 5 menit. Bila Anda terlanjur membayar setelah kode kedaluwarsa atau setelah pesanan dibatalkan, pembayaran tersebut tidak otomatis melunasi pesanan. Hubungi toko dengan bukti pembayaran agar ditinjau dan, bila perlu, dikembalikan.",
          "Pembayaran ganda atau nominal yang salah dapat diajukan ke toko. Toko atau kami akan meneruskannya ke payment gateway. Proses dan waktu pengembalian mengikuti ketentuan payment gateway dan bank penerbit.",
        ],
      },
    ],
  },
  {
    id: "sengketa",
    title: "Sengketa pembayaran",
    blocks: [
      "Bila ada keberatan atas keputusan refund, Anda dapat mengajukan peninjauan ulang dengan membalas email keputusan kami disertai data tambahan. Penyelesaian sengketa mengikuti bagian hukum yang berlaku di Syarat dan Ketentuan.",
    ],
  },
  {
    id: "kontak",
    title: "Kontak",
    blocks: [`Pertanyaan tentang kebijakan ini dapat dikirim ke ${contactEmail}.`],
  },
];
