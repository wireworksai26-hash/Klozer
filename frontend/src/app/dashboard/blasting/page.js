"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  RadioIcon,
  CrownIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  MessageSquareIcon,
  TagIcon,
  ClockIcon,
  SparklesIcon,
  UsersIcon,
} from "@/components/icons";

export default function SupervisorBlastingPage() {
  const { activeInstitution } = useDashboard();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [targetTag, setTargetTag] = useState("all");
  const [messageTemplate, setMessageTemplate] = useState(
    "Halo kak {{nama}}, spesial weekend ini ada diskon 20% untuk semua produk pilihan kami! Klik link untuk klaim: {{link_katalog}}"
  );

  const [campaigns, setCampaigns] = useState([
    {
      id: "BST-01",
      title: "Flash Promo Gajian Weekend 25%",
      targetSegment: "Pelanggan VIP & Repeat",
      targetCount: 1250,
      sentCount: 1250,
      readCount: 1080,
      replyCount: 310,
      status: "completed",
      date: "28 Agu 2026, 10:00 WIB",
    },
    {
      id: "BST-02",
      title: "Follow-Up Keranjang Belum Checkout",
      targetSegment: "Cold Leads (7 Hari Terakhir)",
      targetCount: 840,
      sentCount: 520,
      readCount: 410,
      replyCount: 95,
      status: "running",
      date: "29 Agu 2026, 15:30 WIB",
    },
    {
      id: "BST-03",
      title: "Katalog Edisi Ramadhan Baru",
      targetSegment: "Semua Kontak Terdaftar",
      targetCount: 3400,
      sentCount: 0,
      readCount: 0,
      replyCount: 0,
      status: "scheduled",
      date: "01 Sep 2026, 09:00 WIB",
    },
  ]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const newCamp = {
      id: `BST-0${campaigns.length + 1}`,
      title: campaignTitle || "Kampanye Broadcast Baru",
      targetSegment: targetTag === "all" ? "Semua Kontak Terdaftar" : `Segmen Label ${targetTag}`,
      targetCount: 650,
      sentCount: 0,
      readCount: 0,
      replyCount: 0,
      status: "scheduled",
      date: "Terjadwal Hari Ini",
    };
    setCampaigns([newCamp, ...campaigns]);
    setShowCreateModal(false);
    setCampaignTitle("");
    alert("Jadwal broadcast berhasil dibuat dan masuk antrian safe rate limiter!");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <RadioIcon className="w-3.5 h-3.5" />
              <span>Broadcast & Blasting WhatsApp</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Kampanye Pesan Massal (Blasting)
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Kirim penawaran promo, follow-up otomatis, dan voucher belanja ke segmen pelanggan {activeInstitution?.name || "Toko"}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RadioIcon className="w-4 h-4" />
          <span>+ Buat Broadcast Baru</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Pesan Terkirim Bulan Ini</span>
            <MessageSquareIcon className="w-4 h-4 text-[#2545ff]" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">14,250</div>
          <span className="text-[11.5px] font-bold text-emerald-600">98.4% Berhasil Masuk</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Open & Read Rate</span>
            <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">86.2%</div>
          <span className="text-[11.5px] font-bold text-emerald-600">+12% vs SMS Broadcast</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Balasan Chat Masuk</span>
            <SparklesIcon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-[26px] font-extrabold text-purple-700 mt-2">405 Percakapan</div>
          <span className="text-[11.5px] font-bold text-purple-600">Ditangani Bot AI CS</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Sisa Kuota Blast</span>
            <ClockIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">35,750</div>
          <span className="text-[11.5px] font-bold text-[#2545ff]">Dari 50,000 Kuota Bulanan</span>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Daftar Riwayat & Jadwal Broadcast</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Judul Kampanye</th>
                <th>Segmen Target</th>
                <th>Terkirim / Target</th>
                <th>Read Rate</th>
                <th>Respon Pembeli</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-[#fcfbf9] transition-colors">
                  <td>
                    <div className="font-bold text-[#1e2640] text-[13.5px]">{c.title}</div>
                    <div className="text-[11.5px] text-[#8f95a8]">{c.date}</div>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-blue-50 text-[#2545ff] border border-blue-100">
                      <TagIcon className="w-3 h-3" />
                      <span>{c.targetSegment}</span>
                    </span>
                  </td>
                  <td>
                    <div className="font-bold text-[#1e2640] text-[13px]">
                      {c.sentCount} / {c.targetCount}
                    </div>
                    <div className="w-24 h-1.5 bg-[#ede8e2] rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-[#2545ff] rounded-full"
                        style={{ width: `${(c.sentCount / (c.targetCount || 1)) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td>
                    <span className="text-[13px] font-bold text-emerald-600">
                      {c.sentCount > 0 ? Math.round((c.readCount / c.sentCount) * 100) : 0}%
                    </span>
                  </td>
                  <td>
                    <span className="text-[13px] font-bold text-purple-600">{c.replyCount} Balasan</span>
                  </td>
                  <td>
                    {c.status === "completed" && <span className="badge badge-success text-[11px]">Selesai</span>}
                    {c.status === "running" && <span className="badge badge-warning text-[11px]">Sedang Berjalan</span>}
                    {c.status === "scheduled" && <span className="badge badge-info text-[11px]">Terjadwal</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Broadcast */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[540px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#1e2640]">Buat Jadwal Broadcast WhatsApp</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center font-bold border-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-[13px]">
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Judul Kampanye (Internal)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Promo Akhir Bulan Beli 1 Gratis 1"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-semibold focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Target Segmen Label Pelanggan</label>
                <select
                  value={targetTag}
                  onChange={(e) => setTargetTag(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-bold"
                >
                  <option value="all">Semua Kontak Terdaftar (3,400 Kontak)</option>
                  <option value="VIP">Label: Pelanggan VIP (120 Kontak)</option>
                  <option value="Repeat">Label: Repeat Buyer (450 Kontak)</option>
                  <option value="Cold">Label: Cold Lead Belum Beli (840 Kontak)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Template Pesan WhatsApp</label>
                <textarea
                  rows={4}
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-3 text-[#1e2640] outline-none font-medium leading-relaxed"
                />
                <span className="text-[11px] text-[#8f95a8] mt-1 block">
                  Gunakan variabel: <code className="bg-gray-100 px-1 rounded">{"{{nama}}"}</code>, <code className="bg-gray-100 px-1 rounded">{"{{link_katalog}}"}</code>
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ede8e2] mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-[13px] font-bold">
                  Kirim & Jadwalkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
