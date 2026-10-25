import { LEGAL } from "./config";

// Shared by the landing-page FAQ section and the /faq page.
export const faqItems = [
  {
    q: "Apakah saya harus punya keahlian IT atau coding untuk memakai Klozer?",
    a: "Tidak. Klozer dirancang agar mudah dipakai seperti aplikasi WhatsApp biasa. Anda mendaftar, memasukkan daftar produk, lalu sistem mulai bekerja.",
  },
  {
    q: "Bagaimana cara uang masuk saat pembeli scan QRIS?",
    a: "Pembayaran QRIS diproses melalui payment gateway iPaymu. Setelah pembeli membayar, status pesanan otomatis berubah menjadi Lunas di Klozer. Waktu dan ketentuan pencairan dana mengikuti kebijakan penyedia gateway.",
  },
  {
    q: "Berapa lama kode QRIS berlaku?",
    a: "Kode QRIS berlaku 5 menit sejak diterbitkan. Jika kedaluwarsa, minta kode baru kepada penjual. Kode lama tidak dapat dibayar lagi.",
  },
  {
    q: "Saya sudah membayar, tetapi pesanan belum berstatus lunas. Apa yang harus dilakukan?",
    a: "Tunggu beberapa menit, karena konfirmasi dari payment gateway dapat tertunda. Bila status tidak berubah, hubungi toko tempat Anda berbelanja dengan menyertakan bukti pembayaran. Toko akan memeriksanya dan menghubungi kami bila perlu.",
  },
  {
    q: "Bagaimana cara mengajukan refund?",
    a: `Untuk biaya langganan Klozer, kirim email ke ${LEGAL.contactEmail} dalam ${LEGAL.refund.requestWindowDays} hari sejak pembayaran. Untuk pembelian di sebuah toko, hubungi toko tersebut. Rinciannya ada di halaman Kebijakan Refund.`,
  },
  {
    q: "Apakah nomor WhatsApp toko saya aman dari risiko diblokir?",
    a: "Klozer memakai WhatsApp Business Cloud API resmi dari Meta, dan menyediakan jeda pengiriman serta batasan follow-up untuk menekan risiko pesan dilaporkan sebagai spam. Kepatuhan terhadap kebijakan WhatsApp tetap menjadi tanggung jawab Pengguna.",
  },
  {
    q: "Bagaimana jika ada pembeli yang bertanya di luar daftar produk?",
    a: "Jika AI tidak dapat menjawab dengan yakin, percakapan diteruskan ke staf CS manusia Anda.",
  },
  {
    q: "Bagaimana Klozer mengetahui bukti transfer palsu?",
    a: "Untuk transfer manual, sistem dapat mencocokkan bukti dengan mutasi rekening bank Anda (fitur paket Pro). Bila dana belum benar-benar masuk, pesanan tidak disetujui untuk dikirim.",
  },
  {
    q: "Apakah ada biaya WhatsApp dari Meta di luar harga paket Klozer?",
    a: "Ada. Meta menagih biaya pesan WhatsApp langsung ke akun WhatsApp Business Anda, terpisah dari paket Klozer. Balasan dalam 24 jam setelah pelanggan chat gratis untuk 1.000 pesan pertama per nomor tiap bulan, sisanya sekitar Rp 357 per pesan. Pesan promosi lewat broadcast berbayar sekitar Rp 586 per pesan. Angka belum termasuk PPN dan bisa berubah mengikuti tarif Meta. Instagram, Messenger, Telegram, dan chat di website tidak dikenai biaya ini.",
  },
  {
    q: "Apakah data saya dan data pelanggan saya aman?",
    a: "Data dipisahkan antar akun, kata sandi disimpan sebagai hash, dan token integrasi WhatsApp disimpan terenkripsi. Penjelasan lengkap ada di halaman Kebijakan Privasi.",
  },
  {
    q: "Bagaimana cara berhenti berlangganan?",
    a: `Anda dapat berhenti kapan saja. Akses tetap berlaku sampai akhir periode yang sudah dibayar. Untuk bantuan, hubungi ${LEGAL.contactEmail}.`,
  },
  {
    q: "Apakah Klozer bisa dipakai di HP?",
    a: "Ya. Dashboard Klozer dapat dibuka lewat browser di HP maupun komputer.",
  },
];
