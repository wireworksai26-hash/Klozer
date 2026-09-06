"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  BuildingIcon,
  CrownIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  QrIcon,
  XIcon,
} from "@/components/icons";

export default function SupervisorBankAccountsPage() {
  const { currentUser, activeInstitution } = useDashboard();
  const [showAddModal, setShowAddModal] = useState(false);
  const [bankName, setBankName] = useState("BCA");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko / Instansi";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [banks, setBanks] = useState(
    isDefaultDemo
      ? [
          {
            id: "BNK-01",
            bankName: "Bank Central Asia (BCA)",
            accountNumber: "8809123847",
            accountHolder: "PT Batik Mahakarya Indonesia",
            type: "Rekening Operasional Utama",
            autoMutation: true,
            status: "active",
          },
          {
            id: "BNK-02",
            bankName: "QRIS Dinamis (Xendit Settlement)",
            accountNumber: "NMID: ID1029384756102",
            accountHolder: "BATIK MAHAKARYA SOLO",
            type: "Payment Gateway In-Chat",
            autoMutation: true,
            status: "active",
          },
        ]
      : [
          {
            id: "BNK-01",
            bankName: "In-Chat Dynamic QRIS (Settlement Otomatis)",
            accountNumber: `NMID: ID${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
            accountHolder: cleanInstName.toUpperCase(),
            type: "Payment Gateway WhatsApp In-Chat",
            autoMutation: true,
            status: "active",
          },
        ]
  );

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!accountNumber.trim()) return;

    const newEntry = {
      id: `BNK-0${banks.length + 1}`,
      bankName: bankName,
      accountNumber: accountNumber,
      accountHolder: accountHolder || "Nama Pemilik Rekening",
      type: "Rekening Tambahan",
      autoMutation: true,
      status: "active",
    };
    setBanks([...banks, newEntry]);
    setShowAddModal(false);
    setAccountNumber("");
    setAccountHolder("");
    alert("Rekening bank resmi berhasil ditambahkan ke database toko!");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <BuildingIcon className="w-3.5 h-3.5" />
              <span>Master Rekening Resmi</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Rekening Bank & QRIS Resmi Toko
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Daftar nomor rekening bank resmi instansi yang digunakan bot AI untuk menerbitkan instruksi pembayaran.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <BuildingIcon className="w-4 h-4" />
          <span>+ Tambah Rekening Baru</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-[13px]">
        <ShieldCheckIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div>
          <span className="font-bold block">Proteksi Anti-Phishing Aktif:</span>
          <span>Bot AI CS hanya akan memberikan rekening yang terdaftar di halaman ini kepada calon pembeli.</span>
        </div>
      </div>

      {/* Bank Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banks.map((b) => (
          <div key={b.id} className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-3">
                <div className="font-extrabold text-[16px] text-[#1e2640] flex items-center gap-2">
                  {b.bankName.includes("QRIS") ? <QrIcon className="w-4 h-4 text-[#2545ff]" /> : <BuildingIcon className="w-4 h-4 text-purple-700" />}
                  <span>{b.bankName}</span>
                </div>
                <span className="badge badge-success text-[11px]">Aktif</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11.5px] text-[#8f95a8] uppercase font-bold">Nomor Rekening / NMID:</span>
                <span className="text-[20px] font-extrabold font-mono text-[#2545ff] tracking-wider">{b.accountNumber}</span>
                <span className="text-[13px] font-bold text-[#1e2640] mt-1">a.n. {b.accountHolder}</span>
                <span className="text-[12px] text-[#5a6380]">{b.type}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#ede8e2] flex items-center justify-between text-[12px]">
              <span className="text-[#8f95a8]">Auto-Mutasi Bank:</span>
              <span className="font-bold text-emerald-600">
                {b.autoMutation ? "Otomatis (Webhook)" : "Manual CS"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Bank */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#1e2640]">Tambah Rekening Bank Resmi</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Nama Bank / Gateway</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-bold"
                >
                  <option value="Bank Central Asia (BCA)">Bank Central Asia (BCA)</option>
                  <option value="Bank Mandiri">Bank Mandiri</option>
                  <option value="Bank Rakyat Indonesia (BRI)">Bank Rakyat Indonesia (BRI)</option>
                  <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                  <option value="Bank Negara Indonesia (BNI)">Bank Negara Indonesia (BNI)</option>
                  <option value="QRIS Dinamis">QRIS Dinamis Aggregator</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Nomor Rekening / VA *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 8809123847"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] font-mono outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Atas Nama (Account Holder) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Batik Mahakarya Indonesia"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-semibold focus:border-[#2545ff]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ede8e2] mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-[13px] font-bold">
                  Simpan Rekening
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
