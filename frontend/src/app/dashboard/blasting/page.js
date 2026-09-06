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
  XIcon,
} from "@/components/icons";

export default function SupervisorBlastingPage() {
  const { activeInstitution, currentUser } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [targetTag, setTargetTag] = useState("all");
  const [messageTemplate, setMessageTemplate] = useState(
    `Halo kak {{nama}}, ada promo spesial dari ${cleanInstName}! Dapatkan penawaran menarik hari ini dengan membalas pesan ini.`
  );

  const [campaigns, setCampaigns] = useState(
    isDefaultDemo
      ? [
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
        ]
      : []
  );

  const totalSent = campaigns.reduce((acc, c) => acc + c.sentCount, 0);
  const totalReplies = campaigns.reduce((acc, c) => acc + c.replyCount, 0);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!campaignTitle.trim()) return;

    const newCamp = {
      id: `BST-0${campaigns.length + 1}`,
      title: campaignTitle,
      targetSegment: targetTag === "all" ? "Semua Kontak Pelanggan" : targetTag,
      targetCount: 100,
      sentCount: 100,
      readCount: 0,
      replyCount: 0,
      status: "running",
      date: "Baru saja",
    };
    setCampaigns([newCamp, ...campaigns]);
    setShowCreateModal(false);
    setCampaignTitle("");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <RadioIcon className="w-3.5 h-3.5" />
              <span>Smart WhatsApp Broadcast</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Broadcast & Auto-Campaign
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Kirim pesan promosi massal yang dipersonalisasi berdasarkan label pembeli via WhatsApp Cloud API resmi (Anti-Banned).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RadioIcon className="w-4 h-4" />
          <span>+ Buat Kampanye Broadcast</span>
        </button>
      </div>

      {/* Dynamic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Pesan Terkirim</span>
            <MessageSquareIcon className="w-4 h-4 text-[#2545ff]" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">{totalSent}</div>
          <span className={`text-[11.5px] font-bold ${totalSent > 0 ? "text-emerald-600" : "text-[#8f95a8]"}`}>
            {totalSent > 0 ? "100% Terkirim" : "Belum ada kampanye"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Open & Read Rate</span>
            <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-[26px] font-extrabold text-[#1e2640] mt-2">
            {campaigns.length > 0 ? "86.2%" : "0%"}
          </div>
          <span className="text-[11.5px] font-bold text-emerald-600">WhatsApp Cloud API</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Balasan Chat Masuk</span>
            <SparklesIcon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-[26px] font-extrabold text-purple-700 mt-2">{totalReplies} Percakapan</div>
          <span className="text-[11.5px] font-bold text-purple-600">Ditangani Bot AI CS</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between text-[#8f95a8] text-[12px] font-bold uppercase">
            <span>Status Akun WhatsApp</span>
            <ClockIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-[26px] font-extrabold text-emerald-600 mt-2">Official Tier</div>
          <span className="text-[11.5px] font-bold text-[#2545ff]">Meta Verified Business</span>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Daftar Riwayat & Jadwal Broadcast</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13.5px]">
            <thead>
              <tr className="bg-[#f9f8f6] border-b border-[#ede8e2] text-[12px] font-bold uppercase text-[#64748b]">
                <th className="py-3 px-4">Judul Kampanye</th>
                <th className="py-3 px-4">Segmen Target</th>
                <th className="py-3 px-4">Terkirim / Target</th>
                <th className="py-3 px-4">Respon Pembeli</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e2]">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center max-w-[340px] mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center mb-2">
                        <RadioIcon className="w-5 h-5 text-[#2545ff]" />
                      </div>
                      <div className="font-extrabold text-[#0c1754] text-[14px]">Belum Ada Kampanye Broadcast</div>
                      <p className="text-[12px] text-[#64748b] mt-1">
                        Buat pesan broadcast promosi pertama Anda untuk menyapa pelanggan dan meningkatkan penjualan.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-[#fcfbf9] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1e2640] text-[13.5px]">{c.title}</div>
                      <div className="text-[11.5px] text-[#8f95a8]">{c.date}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-blue-50 text-[#2545ff] border border-blue-100">
                        <TagIcon className="w-3 h-3" />
                        <span>{c.targetSegment}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1e2640] text-[13px]">
                        {c.sentCount} / {c.targetCount}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-purple-700 text-[13px]">{c.replyCount} Balasan</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.status === "completed" && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          Selesai
                        </span>
                      )}
                      {c.status === "running" && (
                        <span className="text-[11px] font-bold text-[#2545ff] bg-[#eaebf8] px-2.5 py-0.5 rounded-full">
                          Sedang Berjalan
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Broadcast */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[520px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#1e2640]">Buat Kampanye WhatsApp Broadcast</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-[13px]">
              <div>
                <label className="block text-[12px] font-bold text-[#1e2640] mb-1">
                  Nama / Judul Kampanye *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Promo Diskon Hari Kemerdekaan"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ede8e2] text-[13.5px] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#1e2640] mb-1">
                  Pesan Siaran (Broadcast Template) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ede8e2] text-[13px] outline-none focus:border-[#2545ff] font-sans leading-relaxed"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 text-[13px] font-bold text-[#5a6380] bg-[#f5f4f2] hover:bg-[#ede8e2] rounded-xl border-none cursor-pointer"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 btn-primary !py-2.5 text-[13px] font-bold">
                  Kirim Broadcast Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
