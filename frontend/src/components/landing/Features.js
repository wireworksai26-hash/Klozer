"use client";
import { QrIcon, MicIcon, ShieldCheckIcon, ClockIcon, TruckIcon, TrendingUpIcon, UsersIcon } from "@/components/icons";

const features = [
  {
    num: "01",
    tag: "Bayar Instan 1-Klik",
    title: "QRIS Otomatis Langsung di Chat",
    desc: "Nominal pembayaran dan ongkir sudah terkunci otomatis. Pembeli tinggal scan pakai m-BCA, GoPay, OVO, Dana, atau ShopeePay tanpa perlu repot mengetik nomor rekening.",
    highlight: "Uang langsung masuk detik itu juga",
    icon: <QrIcon className="w-6 h-6" />,
    isDark: true,
  },
  {
    num: "02",
    tag: "Paham Bahasa Gaul",
    title: "AI Memahami Pesan Suara (Voice Note)",
    desc: "Banyak pembeli di Indonesia lebih suka kirim voice note. AI Klozer mampu mendengarkan, memahami istilah gaul online shop ('ongkir', 'sis', 'cod'), dan membalas dengan suara ramah.",
    highlight: "Hemat waktu CS dengar audio panjang",
    icon: <MicIcon className="w-6 h-6" />,
    isDark: false,
  },
  {
    num: "03",
    tag: "Proteksi Toko Online",
    title: "Deteksi Otomatis Bukti Transfer Palsu",
    desc: "Mencegah kerugian dari struk transfer editan Canva / Photoshop. Sistem otomatis memeriksa keaslian gambar dan memverifikasi mutasi rekening bank sebelum pesanan diproses.",
    highlight: "Anti-tipu struk palsu 100%",
    icon: <ShieldCheckIcon className="w-6 h-6" />,
    isDark: false,
  },
  {
    num: "04",
    tag: "Follow-Up Pintar",
    title: "Follow-Up Otomatis Calon Pembeli yang Ghosting",
    desc: "Calon pembeli yang sudah tanya harga atau minta rekening tapi belum bayar akan diingatkan secara sopan di waktu yang tepat tanpa terkesan spam.",
    highlight: "Selamatkan transaksi yang tertunda",
    icon: <ClockIcon className="w-6 h-6" />,
    isDark: false,
  },
  {
    num: "05",
    tag: "Multi-Ekspedisi Lengkap",
    title: "Cek Ongkir Semua Kurir & Booking 1-Klik",
    desc: "Bandingkan tarif ongkir J&T, SiCepat, JNE, Lion Parcel, dan SAP Express dalam satu layar. Cetak resi otomatis dan minta kurir jemput paket ke rumah/gudang.",
    highlight: "Dapatkan cashback ongkir 15-25%",
    icon: <TruckIcon className="w-6 h-6" />,
    isDark: false,
  },
  {
    num: "06",
    tag: "Iklan Facebook & IG",
    title: "Tahu Pasti Iklan Mana yang Beneran Untung",
    desc: "Hubungkan iklan Click-to-WhatsApp dengan data pesanan yang lunas. Anda bisa melihat dengan jelas iklan mana yang menghasilkan penjualan dan mana yang buang-buang biaya.",
    highlight: "Laporan ROAS Riil per campaign",
    icon: <TrendingUpIcon className="w-6 h-6" />,
    isDark: true,
  },
];

export default function Features() {
  return (
    <section id="fitur" className="py-20 md:py-28 bg-canvas border-b border-line">
      <div className="container-page">
        
        {/* Section Header */}
        <div className="text-center max-w-[760px] mx-auto mb-14 md:mb-18">
          <span className="eyebrow-label text-brand block mb-3">Fitur Praktis untuk Bisnis Anda</span>
          <h2 className="section-title">
            Semua alat yang Anda butuhkan untuk{" "}
            <span className="italic-signature">meningkatkan penjualan</span> di WhatsApp
          </h2>
          <p className="section-lead">
            Dirancang simpel dan mudah dipahami, bahkan untuk pemilik bisnis yang tidak paham teknis coding sekalipun.
          </p>
        </div>

        {/* Features Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.num}
              className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                f.isDark
                  ? "bg-ink text-white border border-line shadow-md"
                  : "bg-white text-fg border border-line shadow-sm hover:border-brand/40 hover:shadow-md"
              }`}
            >
              <div>
                {/* Top Number & Tag */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-body-sm ${
                    f.isDark ? "bg-brand text-white" : "bg-brand/10 text-brand"
                  }`}>
                    {f.num}
                  </span>
                  <span className={`text-caption font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    f.isDark ? "bg-white/10 text-line-strong" : "bg-brand-soft text-brand"
                  }`}>
                    {f.tag}
                  </span>
                </div>

                {/* Icon & Title */}
                <div className={`mb-3 ${f.isDark ? "text-brand-light" : "text-brand"}`}>
                  {f.icon}
                </div>

                <h3 className="text-title font-bold mb-2.5 leading-snug">
                  {f.title}
                </h3>

                <p className={`text-body-sm leading-relaxed mb-6 ${
                  f.isDark ? "text-line-strong" : "text-fg"
                }`}>
                  {f.desc}
                </p>
              </div>

              {/* Bottom Value Highlight */}
              <div className={`pt-3 border-t text-label font-semibold flex items-center gap-1.5 ${
                f.isDark ? "border-white/10 text-emerald-400" : "border-line text-emerald-700"
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{f.highlight}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 7th Feature: Pembagian Chat & Komisi CS */}
        <div className="mt-6 rounded-2xl p-6 sm:p-8 bg-white border border-line shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center font-bold text-body-sm">
                  07
                </span>
                <span className="text-caption font-bold bg-brand-soft text-brand uppercase px-3 py-1 rounded-full">
                  Kelola Tim CS & Sales
                </span>
              </div>
              <h3 className="text-subheading font-bold text-ink mb-2">
                Bagi Chat ke Seluruh Tim CS Secara Adil & Hitung Komisi Otomatis
              </h3>
              <p className="text-body-sm sm:text-body text-fg leading-relaxed">
                Chat masuk otomatis dialokasikan ke staf CS yang sedang online dan memiliki antrean paling sedikit. Sistem juga otomatis merekap total closing dan komisi penjualan masing-masing CS di akhir bulan.
              </p>
            </div>
            <div className="md:col-span-4 flex flex-col md:items-end justify-center">
              <div className="p-3 rounded-xl bg-canvas border border-line w-full max-w-[260px] text-center">
                <div className="text-label font-bold text-ink">Pantau Kinerja CS</div>
                <div className="text-caption text-fg-muted mt-0.5">Kecepatan balas & total omzet per CS</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
