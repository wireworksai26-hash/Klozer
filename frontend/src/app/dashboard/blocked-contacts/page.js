"use client";
import { useState } from "react";
import {
  BanIcon,
  CrownIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
} from "@/components/icons";

export default function SupervisorBlockedContactsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newReason, setNewReason] = useState("Spam / Promosi Tak Dikenal");

  const [blockedList, setBlockedList] = useState([
    {
      id: "BLK-01",
      phone: "+62 899-0011-2233",
      name: "Nomor Spam Pinjol",
      reason: "Spam / Penawaran Ilegal",
      blockedAt: "28 Agu 2026",
      blockedBy: "Rian Supervisor",
    },
    {
      id: "BLK-02",
      phone: "+62 877-5544-3322",
      name: "Pelanggan Palsu Struk",
      reason: "Penipuan Struk Bukti Transfer Palsu (Terdeteksi AI)",
      blockedAt: "25 Agu 2026",
      blockedBy: "Sistem AI Auto-Shield",
    },
    {
      id: "BLK-03",
      phone: "+62 813-9900-8877",
      name: "Akun Abusive / Kata Kasar",
      reason: "Pelecehan & Kata Kasar kepada Staf CS",
      blockedAt: "20 Agu 2026",
      blockedBy: "Sarah Amalia (CS)",
    },
  ]);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newPhone.trim()) return;

    const newEntry = {
      id: `BLK-0${blockedList.length + 1}`,
      phone: newPhone,
      name: newName || "Kontak Tanpa Nama",
      reason: newReason,
      blockedAt: "Hari ini",
      blockedBy: "Supervisor",
    };
    setBlockedList([newEntry, ...blockedList]);
    setShowAddModal(false);
    setNewPhone("");
    setNewName("");
  };

  const handleUnblock = (id) => {
    setBlockedList((prev) => prev.filter((b) => b.id !== id));
    alert("Nomor berhasil dipulihkan dan dihapus dari blacklist.");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1.5">
              <BanIcon className="w-3.5 h-3.5" />
              <span>Keamanan & Blacklist</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Daftar Kontak Diblokir (Blacklist)
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Kelola nomor WhatsApp yang diblokir dari sistem (bot AI tidak akan merespon dan pesan tidak masuk ke CS).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 border-none cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <BanIcon className="w-4 h-4" />
          <span>+ Blokir Nomor Baru</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Total Nomor Diblokir</div>
          <div className="text-[28px] font-extrabold text-rose-600">{blockedList.length} Nomor</div>
          <span className="text-[11.5px] font-bold text-rose-600">Blacklist Terverifikasi</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Spam Otomatis Dicegah</div>
          <div className="text-[28px] font-extrabold text-[#1e2640]">1,420 Pesan</div>
          <span className="text-[11.5px] font-bold text-emerald-600">AI Shield Filter Aktif</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Status Proteksi Staf CS</div>
          <div className="text-[28px] font-extrabold text-emerald-700">100% Aman</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Filter Kata Kasar Aktif</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nomor WhatsApp</th>
                <th>Nama / Label</th>
                <th>Alasan Pemblokiran</th>
                <th>Waktu & Pemblokir</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {blockedList.map((b) => (
                <tr key={b.id} className="hover:bg-[#fcfbf9] transition-colors">
                  <td>
                    <span className="font-mono font-bold text-[#1e2640] text-[13.5px]">{b.phone}</span>
                  </td>
                  <td>
                    <span className="font-semibold text-[#1e2640] text-[13px]">{b.name}</span>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                      <AlertTriangleIcon className="w-3 h-3" />
                      <span>{b.reason}</span>
                    </span>
                  </td>
                  <td>
                    <div className="text-[12.5px] font-bold text-[#1e2640]">{b.blockedAt}</div>
                    <div className="text-[11px] text-[#8f95a8]">Oleh: {b.blockedBy}</div>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleUnblock(b.id)}
                      className="px-3 py-1.5 text-[11.5px] font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                    >
                      Buka Blokir (Unblock)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Blocked Contact */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-rose-700">Blokir Nomor WhatsApp Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center font-bold border-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4 text-[13px]">
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Nomor WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="+62 812-xxxx-xxxx"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] font-mono outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Nama Kontak / Identitas</label>
                <input
                  type="text"
                  placeholder="Contoh: Akun Spam Promo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Alasan Pemblokiran</label>
                <select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-bold"
                >
                  <option value="Spam / Promosi Tak Dikenal">Spam / Promosi Tak Dikenal</option>
                  <option value="Penipuan Struk Bukti Transfer Palsu">Penipuan Struk Bukti Transfer Palsu</option>
                  <option value="Pelecehan & Kata Kasar kepada CS">Pelecehan & Kata Kasar kepada CS</option>
                  <option value="Order Palsu COD Berulang (RTS Fraud)">Order Palsu COD Berulang (RTS Fraud)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ede8e2] mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-[13px] border-none cursor-pointer">
                  Blokir Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
