"use client";
import { useState } from "react";
import {
  HelpCircleIcon,
  CrownIcon,
  CheckCircleIcon,
  SparklesIcon,
  MessageSquareIcon,
  QrIcon,
  ShieldCheckIcon,
  RadioIcon,
  BotIcon,
} from "@/components/icons";

export default function SupervisorDocumentationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGuide, setActiveGuide] = useState("wa-connect");

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const guides = [
    {
      id: "wa-connect",
      title: "1. Menghubungkan WhatsApp Cloud API",
      icon: <MessageSquareIcon className="w-4 h-4 text-brand" />,
      summary: "Menghubungkan nomor WhatsApp Business resmi lewat Meta Cloud API.",
      content: `
### Langkah Menghubungkan WhatsApp:
1. Buat aplikasi di Meta for Developers dan tambahkan produk **WhatsApp**.
2. Buka **Pengaturan > Profil Usaha dan WhatsApp** di Klozer, lalu isi **Phone Number ID** dan **Access Token permanen** dari Meta.
3. Di Meta, daftarkan Webhook URL: \`${origin}/api/v1/webhooks/whatsapp\` dan Verify Token yang sama dengan yang diatur admin Klozer. Aktifkan field **messages**.
4. Kirim pesan ke nomor Anda dari HP lain. Pesan akan muncul di **Live Chat** dan AI membalas otomatis.

Token disimpan terenkripsi dan tidak pernah ditampilkan lagi. Satu nomor WhatsApp hanya bisa dipakai oleh satu tenant.
      `,
    },
    {
      id: "ai-persona",
      title: "2. Mengatur Persona AI",
      icon: <BotIcon className="w-4 h-4 text-purple-600" />,
      summary: "Nama bot, gaya bahasa, dan sapaan pembuka yang dipakai AI saat membalas pelanggan.",
      content: `
### Cara kerja AI:
- Atur nama, gaya bahasa, dan sapaan di **Pengaturan > Persona dan Script AI**.
- AI hanya memakai data toko Anda: **katalog produk aktif beserta stok**, **rekening yang Anda daftarkan**, dan persona tersebut. AI tidak boleh mengarang harga, promo, atau nomor rekening.
- Jika kuota token habis, AI tidak aktif, atau pelanggan mengirim gambar atau suara, percakapan diteruskan ke tim CS dan Anda mendapat notifikasi di lonceng dashboard.
- Saat CS manusia sudah membalas dalam sebuah percakapan, AI berhenti membalas di percakapan itu.
- Gunakan **Simulator AI** untuk mencoba balasan sebelum dipakai pelanggan. Setiap percobaan memakai kuota token.
      `,
    },
    {
      id: "qris-settle",
      title: "3. Pembayaran QRIS (Midtrans)",
      icon: <QrIcon className="w-4 h-4 text-emerald-600" />,
      summary: "Menerbitkan QRIS dari chat dan pelunasan otomatis.",
      content: `
### Cara kerja QRIS:
1. Di Live Chat, klik **Terbitkan QRIS**, pilih produk dan jumlah. Klozer membuat pesanan sungguhan (stok berkurang) lalu mengirim tautan QRIS ke pelanggan.
2. Nominal selalu diambil dari pesanan di server, bukan dari yang diketik.
3. Setelah pelanggan membayar, Midtrans mengirim notifikasi ke \`${origin}/api/v1/payments/webhook\`. Tanda tangan notifikasi diperiksa, nominal dicocokkan, dan pesanan otomatis menjadi **Lunas**.
4. Notifikasi ganda diabaikan, jadi komisi CS hanya dihitung sekali.

QRIS membutuhkan Midtrans Server Key yang diatur admin di server. Untuk pembayaran transfer manual, pesanan dikonfirmasi oleh owner, supervisor, atau finance di menu **Keuangan**.
      `,
    },
    {
      id: "security",
      title: "4. Keamanan Akun dan Tim",
      icon: <ShieldCheckIcon className="w-4 h-4 text-rose-600" />,
      summary: "Hak akses staf, password, dan jejak aktivitas.",
      content: `
### Praktik yang disarankan:
- Buat akun terpisah untuk setiap staf di **Pengaturan > Hak Akses Tim**. Password awal hanya ditampilkan sekali saat dibuat atau direset.
- Menonaktifkan staf langsung mengeluarkan mereka dari semua perangkat.
- Mengubah password mengeluarkan perangkat lain. Gunakan minimal 12 karakter.
- Semua tindakan penting (login, perubahan pesanan, impor, perubahan rekening) tercatat di **Log Aktivitas**.
- Akun terkunci sementara setelah beberapa kali salah password.
      `,
    },
    {
      id: "import",
      title: "5. Impor Produk dan Stok",
      icon: <RadioIcon className="w-4 h-4 text-amber-500" />,
      summary: "Memasukkan banyak produk atau memperbarui stok dari Excel.",
      content: `
### Cara impor:
- Di **Katalog Produk**, buka **Impor / Ekspor** dan unduh templatenya. SKU adalah kuncinya: SKU yang sudah ada diperbarui, SKU baru dibuat.
- Mode **Ganti semua** menonaktifkan produk yang tidak ada di file (tidak dihapus, bisa diaktifkan kembali).
- Di **Stok Inventaris**, impor mengatur stok absolut per SKU. SKU yang tidak dikenal dilaporkan, tidak dibuat.
- Satu file maksimal 500 produk. Jika ada satu baris yang tidak valid, seluruh impor dibatalkan dan tidak ada yang berubah.
      `,
    },
  ];

  const current = guides.find((g) => g.id === activeGuide) || guides[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-caption font-bold uppercase tracking-wider bg-blue-100 text-brand px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <HelpCircleIcon className="w-3.5 h-3.5" />
              <span>Pusat Bantuan & Panduan</span>
            </span>
          </div>
          <h1 className="page-title">
            Dokumentasi & Panduan In-App
          </h1>
          <p className="text-body-sm text-fg-muted">
            Pelajari cara memaksimalkan fitur WhatsApp AI, QRIS dinamis, segmentasi label, dan mitigasi penipuan di platform Klozer.
          </p>
        </div>
      </div>

      {/* Main Documentation Viewer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Navigation Chapters */}
        <div className="md:col-span-1 flex flex-col gap-2">
          {guides.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGuide(g.id)}
              className={`p-4 text-left rounded-2xl border transition-all cursor-pointer flex flex-col gap-1 ${
                activeGuide === g.id
                  ? "border-brand bg-white shadow-xs"
                  : "border-line bg-soft hover:bg-white text-fg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                {g.icon}
                <span className="font-bold text-body-sm text-fg">{g.title}</span>
              </div>
              <p className="text-caption text-fg-muted line-clamp-2">{g.summary}</p>
            </button>
          ))}
        </div>

        {/* Right Article Viewer */}
        <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-line shadow-xs flex flex-col gap-4 min-h-[500px]">
          <div className="pb-4 border-b border-line flex items-center gap-2">
            {current.icon}
            <h2 className="text-subheading font-bold text-fg">{current.title}</h2>
          </div>

          <div className="text-body-sm text-fg-muted leading-relaxed whitespace-pre-line font-medium">
            {current.content}
          </div>

          <div className="mt-auto pt-6 border-t border-line flex items-center justify-between text-label text-fg-subtle">
            <span>Butuh bantuan lebih lanjut? Hubungi Dedicated Account Manager Klozer.</span>
            <span className="badge badge-success">Bantuan 24/7 Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
}
