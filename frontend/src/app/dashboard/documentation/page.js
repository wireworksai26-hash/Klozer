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

  const guides = [
    {
      id: "wa-connect",
      title: "1. Menghubungkan WhatsApp Cloud API & Baileys",
      icon: <MessageSquareIcon className="w-4 h-4 text-[#2545ff]" />,
      summary: "Panduan setup nomor WhatsApp resmi Meta Cloud API atau gateway Baileys untuk live inbox.",
      content: `
### Langkah Menghubungkan WhatsApp:
1. Buka menu **Pengaturan > Profil Usaha & WA API**.
2. Masukkan **WABA Phone Number ID** dan **Permanent Access Token** dari Meta Business Suite.
3. Konfigurasikan Webhook URL ke endpoint: \`https://api.klozer.id/v1/webhook/whatsapp\`.
4. Masukkan Verify Token yang telah dibuat.
5. Klik **Tes Koneksi Webhook** untuk memastikan status 200 OK.
      `,
    },
    {
      id: "ai-persona",
      title: "2. Setting Gaya Bahasa & Larangan Persona AI",
      icon: <BotIcon className="w-4 h-4 text-purple-600" />,
      summary: "Mengatur nama bot CS, nada bicara (ramah, formal, santai), dan guardrails larangan bicara.",
      content: `
### Aturan Prompting Persona CS:
- **Nama Bot**: Berikan nama yang ramah seperti *Sarah*, *Nabila*, atau *Kak Maya*.
- **Tone of Voice**: Gunakan sapaan *"Kak"* atau *"Bunda"* untuk meningkatkan kehangatan interaksi.
- **Guardrails Larangan**: Bot secara ketat dilarang menjanjikan diskon di luar wewenang SPV (>10%) atau memberikan nomor rekening pribadi.
- **RAG Knowledge**: AI secara otomatis membaca stok katalog produk dan daftar rekening resmi toko.
      `,
    },
    {
      id: "qris-settle",
      title: "3. Konfigurasi Dynamic QRIS & Auto-Mutasi",
      icon: <QrIcon className="w-4 h-4 text-emerald-600" />,
      summary: "Penerbitan QRIS otomatis di dalam room chat dan verifikasi pelunasan tanpa kirim struk.",
      content: `
### Cara Kerja In-Chat QRIS:
1. Ketika pelanggan mengonfirmasi pesanan, AI otomatis menghitung total order + ongkir.
2. Bot menerbitkan gambar QRIS Dinamis unik langsung di dalam room chat WhatsApp.
3. Begitu pembeli scan QRIS via BCA/GoPay/OVO, webhook Xendit mengirim notifikasi lunas dalam < 2 detik.
4. Status order otomatis berubah menjadi **Paid** dan notifikasi diteruskan ke bagian packing.
      `,
    },
    {
      id: "anti-fraud",
      title: "4. Proteksi Struk Transfer Palsu (Image Forensics)",
      icon: <ShieldCheckIcon className="w-4 h-4 text-rose-600" />,
      summary: "Mendeteksi manipulasi gambar struk palsu menggunakan OCR forensics AI.",
      content: `
### Deteksi Kecurangan Pembayaran:
- Model Computer Vision AI memindai metadata gambar dan pixel font struk m-banking.
- Jika terdeteksi editan Photoshop/Canva, AI otomatis memasang label **High Risk Fraud** dan mengunci pesanan.
- CS manusia akan mendapatkan notifikasi eskalasi untuk pengecekan manual.
      `,
    },
    {
      id: "safe-blast",
      title: "5. Panduan Broadcast Blasting Anti-Banned",
      icon: <RadioIcon className="w-4 h-4 text-amber-500" />,
      summary: "Strategi safe rate limiter agar nomor WhatsApp bisnis tidak diblokir pihak Meta.",
      content: `
### Tips Broadcast Aman:
- Gunakan jeda pengiriman minimal 2-4 detik antar pesan.
- Segmentasikan pesan hanya ke pelanggan yang pernah berinteraksi (Opt-in).
- Selalu gunakan variasi teks dengan variabel \`{{nama}}\` agar pola pesan tidak dianggap robotik.
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
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <HelpCircleIcon className="w-3.5 h-3.5" />
              <span>Pusat Bantuan & Panduan</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Dokumentasi & Panduan In-App
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
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
                  ? "border-[#2545ff] bg-white shadow-xs"
                  : "border-[#ede8e2] bg-[#fcfbf9] hover:bg-white text-[#5a6380]"
              }`}
            >
              <div className="flex items-center gap-2">
                {g.icon}
                <span className="font-extrabold text-[13.5px] text-[#1e2640]">{g.title}</span>
              </div>
              <p className="text-[11.5px] text-[#64748b] line-clamp-2">{g.summary}</p>
            </button>
          ))}
        </div>

        {/* Right Article Viewer */}
        <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col gap-4 min-h-[500px]">
          <div className="pb-4 border-b border-[#ede8e2] flex items-center gap-2">
            {current.icon}
            <h2 className="text-[20px] font-extrabold text-[#1e2640]">{current.title}</h2>
          </div>

          <div className="text-[13.5px] text-[#5a6380] leading-relaxed whitespace-pre-line font-medium">
            {current.content}
          </div>

          <div className="mt-auto pt-6 border-t border-[#ede8e2] flex items-center justify-between text-[12px] text-[#8f95a8]">
            <span>Butuh bantuan lebih lanjut? Hubungi Dedicated Account Manager Klozer.</span>
            <span className="badge badge-success text-[11px]">Bantuan 24/7 Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
}
