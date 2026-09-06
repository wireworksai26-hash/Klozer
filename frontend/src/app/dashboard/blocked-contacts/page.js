"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  BanIcon,
  CrownIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  XIcon,
} from "@/components/icons";

export default function SupervisorBlockedContactsPage() {
  const { currentUser, activeInstitution } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newReason, setNewReason] = useState("Spam / Promosi Tak Dikenal");

  const [blockedList, setBlockedList] = useState(
    isDefaultDemo
      ? [
          {
            id: "BLK-01",
            phone: "+62 899-0011-2233",
            name: "Nomor Spam",
            reason: "Spam / Penawaran Ilegal",
            blockedAt: "28 Agu 2026",
            blockedBy: "Rian Supervisor",
          },
        ]
      : []
  );

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newPhone.trim()) return;

    const newEntry = {
      id: `BLK-0${blockedList.length + 1}`,
      phone: newPhone,
      name: newName || "Kontak Diblokir",
      reason: newReason,
      blockedAt: "Hari ini",
      blockedBy: currentUser?.name || "Supervisor",
    };
    setBlockedList([...blockedList, newEntry]);
    setShowAddModal(false);
    setNewPhone("");
    setNewName("");
  };

  const handleUnblock = (id) => {
    if (confirm("Apakah Anda yakin ingin membuka blokir nomor ini?")) {
      setBlockedList(blockedList.filter((b) => b.id !== id));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1.5">
              <BanIcon className="w-3.5 h-3.5" />
              <span>Anti-Fraud & Blacklist Filter</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Blacklist & Nomor Diblokir
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Daftar nomor WhatsApp yang diblokir oleh supervisor atau terdeteksi bot spam / bukti transfer palsu.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary !bg-rose-600 hover:!bg-rose-700 !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <BanIcon className="w-4 h-4" />
          <span>+ Blokir Nomor Baru</span>
        </button>
      </div>

      {/* Dynamic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Total Nomor Terblokir</div>
          <div className="text-[28px] font-extrabold text-rose-700">{blockedList.length} Nomor</div>
          <span className={`text-[11.5px] font-bold ${blockedList.length > 0 ? "text-rose-600" : "text-[#8f95a8]"}`}>
            {blockedList.length > 0 ? "Otomatis di-reject bot" : "Belum ada nomor di-blacklist"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Deteksi AI Anti-Fraud</div>
          <div className="text-[28px] font-extrabold text-emerald-700">Aktif (100%)</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Scan OCR Struk & Nomor COD</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Efisiensi CS</div>
          <div className="text-[28px] font-extrabold text-[#2545ff]">Bebas Spam</div>
          <span className="text-[11.5px] font-bold text-[#2545ff]">CS fokus melayani pembeli riil</span>
        </div>
      </div>

      {/* Blocked List Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Daftar Nomor Blacklist</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13.5px]">
            <thead>
              <tr className="bg-[#f9f8f6] border-b border-[#ede8e2] text-[12px] font-bold uppercase text-[#64748b]">
                <th className="py-3 px-4">Nomor WhatsApp</th>
                <th className="py-3 px-4">Nama / Label</th>
                <th className="py-3 px-4">Alasan Pemblokiran</th>
                <th className="py-3 px-4">Waktu & Pemblokir</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e2]">
              {blockedList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center max-w-[340px] mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                        <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="font-extrabold text-[#0c1754] text-[14px]">Tidak Ada Nomor di Blacklist</div>
                      <p className="text-[12px] text-[#64748b] mt-1">
                        Nomor kontak yang terindikasi spam atau penipuan dapat ditambahkan ke daftar blacklist toko.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                blockedList.map((b) => (
                  <tr key={b.id} className="hover:bg-[#fcfbf9] transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-[#1e2640] text-[13.5px]">{b.phone}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#1e2640] text-[13px]">{b.name}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                        <AlertTriangleIcon className="w-3 h-3" />
                        <span>{b.reason}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[12.5px] font-bold text-[#1e2640]">{b.blockedAt}</div>
                      <div className="text-[11px] text-[#8f95a8]">Oleh: {b.blockedBy}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleUnblock(b.id)}
                        className="px-3 py-1.5 text-[11.5px] font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                      >
                        Buka Blokir (Unblock)
                      </button>
                    </td>
                  </tr>
                ))
              )}
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
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4 text-[13px]">
              <div>
                <label className="block text-[12px] font-bold text-[#1e2640] mb-1">
                  Nomor WhatsApp (dengan kode negara) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: +62 812-3456-7890"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ede8e2] font-mono text-[13.5px] outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#1e2640] mb-1">
                  Label / Nama Pemilik Nomor
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Akun Fake Order"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ede8e2] text-[13.5px] outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#1e2640] mb-1">
                  Alasan Pemblokiran *
                </label>
                <select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ede8e2] text-[13px] outline-none focus:border-rose-500 bg-white"
                >
                  <option value="Spam / Promosi Tak Dikenal">Spam / Promosi Tak Dikenal</option>
                  <option value="Penipuan Bukti Transfer Palsu">Penipuan Bukti Transfer Palsu</option>
                  <option value="Pelecehan / Kata Kasar">Pelecehan / Kata Kasar</option>
                  <option value="Fake COD / Paket Sengaja Ditolak">Fake COD / Paket Sengaja Ditolak</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-[13px] font-bold text-[#5a6380] bg-[#f5f4f2] hover:bg-[#ede8e2] rounded-xl border-none cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-[13px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl border-none cursor-pointer"
                >
                  Simpan ke Blacklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
