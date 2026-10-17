"use client";
import React, { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
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

/** **bold** and `code` inside one line of guide text. The words themselves are never changed. */
function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-bold text-fg">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="font-mono text-caption bg-sunken border border-line rounded-md px-1.5 py-0.5 text-fg break-all">{part.slice(1, -1)}</code>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/** Renders the guide markup (### heading, 1. steps, - bullets, blank-line paragraphs) as clean typography. */
function GuideBody({ source }) {
  const blocks = [];
  for (const line of source.trim().split(/\r?\n/)) {
    const text = line.trim();
    if (!text) continue;
    const heading = text.match(/^#{1,6}\s+(.*)$/);
    const step = text.match(/^(\d+)\.\s+(.*)$/);
    const bullet = text.match(/^[-*]\s+(.*)$/);
    const last = blocks[blocks.length - 1];
    if (heading) blocks.push({ type: "h", text: heading[1].replace(/:\s*$/, "") });
    else if (step) {
      if (last?.type === "ol") last.items.push(step[2]);
      else blocks.push({ type: "ol", items: [step[2]] });
    } else if (bullet) {
      // Bulleted lines are numbered too, so every list in the guide reads the same way.
      if (last?.type === "ol") last.items.push(bullet[1]);
      else blocks.push({ type: "ol", items: [bullet[1]] });
    } else blocks.push({ type: "p", text });
  }

  return (
    <div className="flex flex-col gap-4 text-body-sm text-fg-muted leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === "h") return <h3 key={i} className="text-body font-bold text-fg">{b.text}</h3>;
        if (b.type === "p") return <p key={i}><Inline text={b.text} /></p>;
        const Tag = b.type === "ol" ? "ol" : "ul";
        return (
          <Tag key={i} className="flex flex-col gap-2.5 list-none">
            {b.items.map((item, j) => (
              <li key={j} className="flex items-start gap-3">
                {b.type === "ol" ? (
                  <span className="mt-0.5 w-6 h-6 flex-shrink-0 rounded-full bg-brand-soft text-brand text-caption font-bold flex items-center justify-center tabular-nums">{j + 1}</span>
                ) : (
                  <span className="mt-2 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-brand" />
                )}
                <span className="min-w-0"><Inline text={item} /></span>
              </li>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}

export default function SupervisorDocumentationPage() {
  const { t, language } = useDashboard();
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
      contentEn: `
### Steps to Connect WhatsApp:
1. Create an app in Meta for Developers and add the **WhatsApp** product.
2. Open **Settings > Business Profile and WhatsApp** in Klozer, then fill in the **Phone Number ID** and **Permanent Access Token** from Meta.
3. In Meta, register the Webhook URL: \`${origin}/api/v1/webhooks/whatsapp\` and the same Verify Token set by the Klozer admin. Enable the **messages** field.
4. Send a message to your number from another phone. The message will appear in **Live Chat** and the AI replies automatically.

The token is stored encrypted and is never shown again. One WhatsApp number can only be used by one tenant.
      `,
    },
    {
      id: "ai-persona",
      title: "2. Mengatur Persona AI",
      icon: <BotIcon className="w-4 h-4 text-accent-600" />,
      summary: "Nama bot, gaya bahasa, dan sapaan pembuka yang dipakai AI saat membalas pelanggan.",
      content: `
### Cara kerja AI:
- Atur nama, gaya bahasa, dan sapaan di **Pengaturan > Persona dan Script AI**.
- AI hanya memakai data toko Anda: **katalog produk aktif beserta stok**, **rekening yang Anda daftarkan**, dan persona tersebut. AI tidak boleh mengarang harga, promo, atau nomor rekening.
- Jika kuota token habis, AI tidak aktif, atau pelanggan mengirim gambar atau suara, percakapan diteruskan ke tim CS dan Anda mendapat notifikasi di lonceng dashboard.
- Saat CS manusia sudah membalas dalam sebuah percakapan, AI berhenti membalas di percakapan itu.
- Gunakan **Simulator AI** untuk mencoba balasan sebelum dipakai pelanggan. Setiap percobaan memakai kuota token.
      `,
      contentEn: `
### How the AI works:
- Set the name, tone of voice, and greeting in **Settings > AI Persona and Script**.
- The AI only uses your store's data: **active product catalog with stock**, **bank accounts you register**, and that persona. The AI must not invent prices, promos, or account numbers.
- If the token quota runs out, the AI is inactive, or the customer sends an image or voice note, the conversation is handed over to the CS team and you get a notification in the dashboard bell.
- Once a human CS has replied in a conversation, the AI stops replying in that conversation.
- Use the **AI Simulator** to try replies before customers see them. Every attempt uses token quota.
      `,
    },
    {
      id: "qris-settle",
      title: "3. Pembayaran QRIS (iPaymu)",
      icon: <QrIcon className="w-4 h-4 text-success-600" />,
      summary: "Menerbitkan QRIS dari chat dan pelunasan otomatis.",
      content: `
### Cara kerja QRIS:
1. Di Live Chat, klik **Terbitkan QRIS**, pilih produk dan jumlah. Klozer membuat pesanan sungguhan (stok berkurang) lalu mengirim tautan QRIS ke pelanggan.
2. Nominal selalu diambil dari pesanan di server, bukan dari yang diketik.
3. Setelah pelanggan membayar, iPaymu mengirim callback ke \`${origin}/api/v1/payments/webhook\`. Tanda tangan callback diperiksa, nominal dicocokkan, dan pesanan otomatis menjadi **Lunas**.
4. Callback ganda diabaikan, jadi komisi CS hanya dihitung sekali.

QRIS membutuhkan VA dan API Key iPaymu yang diatur admin di server. Kode QRIS berlaku 5 menit; jika kedaluwarsa, terbitkan ulang. Untuk pembayaran transfer manual, pesanan dikonfirmasi oleh owner, supervisor, atau finance di menu **Keuangan**.
      `,
      contentEn: `
### How QRIS works:
1. In Live Chat, click **Issue QRIS**, then pick the product and quantity. Klozer creates a real order (stock decreases) and sends the QRIS link to the customer.
2. The amount is always taken from the order on the server, not from what is typed.
3. After the customer pays, iPaymu sends a callback to \`${origin}/api/v1/payments/webhook\`. The callback signature is verified, the amount is matched, and the order automatically becomes **Paid**.
4. Duplicate callbacks are ignored, so CS commission is only counted once.

QRIS requires an iPaymu VA and API Key configured by the admin on the server. A QRIS code is valid for 5 minutes; issue a new one if it expires. For manual transfer payments, orders are confirmed by the owner, supervisor, or finance in the **Finance** menu.
      `,
    },
    {
      id: "security",
      title: "4. Keamanan Akun dan Tim",
      icon: <ShieldCheckIcon className="w-4 h-4 text-danger-600" />,
      summary: "Hak akses staf, password, dan jejak aktivitas.",
      content: `
### Praktik yang disarankan:
- Buat akun terpisah untuk setiap staf di **Pengaturan > Hak Akses Tim**. Password awal hanya ditampilkan sekali saat dibuat atau direset.
- Menonaktifkan staf langsung mengeluarkan mereka dari semua perangkat.
- Mengubah password mengeluarkan perangkat lain. Gunakan minimal 12 karakter.
- Semua tindakan penting (login, perubahan pesanan, impor, perubahan rekening) tercatat di **Log Aktivitas**.
- Akun terkunci sementara setelah beberapa kali salah password.
      `,
      contentEn: `
### Recommended practices:
- Create a separate account for each staff member in **Settings > Team Access Rights**. The initial password is shown only once when created or reset.
- Deactivating a staff member immediately signs them out of all devices.
- Changing the password signs out other devices. Use at least 12 characters.
- All important actions (login, order changes, imports, bank account changes) are recorded in the **Activity Log**.
- Accounts are temporarily locked after several wrong password attempts.
      `,
    },
    {
      id: "import",
      title: "5. Impor Produk dan Stok",
      icon: <RadioIcon className="w-4 h-4 text-warning-500" />,
      summary: "Memasukkan banyak produk atau memperbarui stok dari Excel.",
      content: `
### Cara impor:
- Di **Katalog Produk**, buka **Impor / Ekspor** dan unduh templatenya. SKU adalah kuncinya: SKU yang sudah ada diperbarui, SKU baru dibuat.
- Mode **Ganti semua** menonaktifkan produk yang tidak ada di file (tidak dihapus, bisa diaktifkan kembali).
- Di **Stok Inventaris**, impor mengatur stok absolut per SKU. SKU yang tidak dikenal dilaporkan, tidak dibuat.
- Satu file maksimal 500 produk. Jika ada satu baris yang tidak valid, seluruh impor dibatalkan dan tidak ada yang berubah.
      `,
      contentEn: `
### How to import:
- In **Product Catalog**, open **Import / Export** and download the template. SKU is the key: existing SKUs are updated, new SKUs are created.
- **Replace all** mode deactivates products not present in the file (not deleted, can be reactivated).
- In **Inventory Stock**, import sets the absolute stock per SKU. Unknown SKUs are reported, not created.
- One file holds at most 500 products. If a single row is invalid, the entire import is cancelled and nothing changes.
      `,
    },
  ];

  const current = guides.find((g) => g.id === activeGuide) || guides[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-caption font-bold uppercase tracking-wider bg-brand-soft text-brand px-2.5 py-0.5 rounded-full border border-brand/20 flex items-center gap-1.5">
              <HelpCircleIcon className="w-3.5 h-3.5" />
              <span>{t("Pusat Bantuan & Panduan")}</span>
            </span>
          </div>
          <h1 className="page-title">
            {t("Dokumentasi & Panduan In-App")}
          </h1>
          <p className="text-body-sm text-fg-muted">
            {t("Pelajari cara memaksimalkan fitur WhatsApp AI, QRIS dinamis, segmentasi label, dan mitigasi penipuan di platform Klozer.")}
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
                <span className="font-bold text-body-sm text-fg">{t(g.title)}</span>
              </div>
              <p className="text-caption text-fg-muted line-clamp-2">{t(g.summary)}</p>
            </button>
          ))}
        </div>

        {/* Right Article Viewer */}
        <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-line shadow-xs flex flex-col gap-4 min-h-[500px]">
          <div className="pb-4 border-b border-line flex items-center gap-2">
            {current.icon}
            <h2 className="text-subheading font-bold text-fg">{t(current.title)}</h2>
          </div>

          <GuideBody source={language === "en" ? current.contentEn || current.content : current.content} />

          <div className="mt-auto pt-6 border-t border-line flex items-center justify-between text-label text-fg-subtle">
            <span>{t("Butuh bantuan lebih lanjut? Hubungi Dedicated Account Manager Klozer.")}</span>
            <span className="badge badge-success">{t("Bantuan 24/7 Aktif")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
