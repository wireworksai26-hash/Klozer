"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  CreditCardIcon,
  CrownIcon,
  CheckCircleIcon,
  QrIcon,
  RadioIcon,
  ZapIcon,
  XIcon,
} from "@/components/icons";

export default function CsCreditsPage() {
  const { currentUser, activeInstitution } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("pack-2");
  const [isProcessing, setIsProcessing] = useState(false);

  const packages = [
    { id: "pack-1", name: "Paket Starter", messages: 500, price: 75000, bestValue: false },
    { id: "pack-2", name: "Paket Pro CS", messages: 1500, price: 200000, bestValue: true },
    { id: "pack-3", name: "Paket Power Blaster", messages: 5000, price: 600000, bestValue: false },
  ];

  const [history, setHistory] = useState([
    {
      id: "CRD-001",
      date: "Hari ini",
      type: "BONUS",
      desc: `Bonus Kuota Selamat Datang (${cleanInstName})`,
      qty: 1000,
      balance: 1000,
    },
  ]);

  const handleTopupSubmit = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowTopupModal(false);
      alert("Top Up Kredit Pesan Berhasil! Saldo kuota bertambah.");
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <CreditCardIcon className="w-3.5 h-3.5" />
              <span>Saldo & Kuota WhatsApp</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Kredit & Kuota Pesan Broadcast
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Pantau sisa kuota pengiriman pesan massal WhatsApp dan lakukan top-up saldo instan via QRIS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTopupModal(true)}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <CreditCardIcon className="w-4 h-4" />
          <span>+ Top Up Kredit Pesan</span>
        </button>
      </div>

      {/* Balance Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#0c1754] to-[#2545ff] p-6 rounded-2xl text-white shadow-md flex flex-col justify-between">
          <div>
            <span className="text-white/80 text-[12px] font-bold uppercase tracking-wider block mb-1">
              Sisa Kuota Broadcast CS
            </span>
            <div className="text-[34px] font-extrabold font-mono">1,450 <span className="text-[16px] font-sans font-normal text-white/80">Pesan</span></div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/20 text-[12px] text-white/90">
            Estimasi Nilai Saldo: <span className="font-bold">Rp 217,500</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col justify-between">
          <span className="text-[12px] font-bold text-[#8f95a8] uppercase">Terkirim Bulan Ini</span>
          <div className="text-[28px] font-extrabold text-[#1e2640] my-1">420 Pesan</div>
          <span className="text-[11.5px] font-bold text-emerald-600">99.2% Berhasil Sampai</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col justify-between">
          <span className="text-[12px] font-bold text-[#8f95a8] uppercase">Status Akun WhatsApp</span>
          <div className="text-[28px] font-extrabold text-emerald-700 my-1">Tier High Quality</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Anti-Banned Safe Rate Limiter Aktif</span>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Riwayat Mutasi Kredit Kuota</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID & Waktu</th>
                <th>Tipe Mutasi</th>
                <th>Keterangan Aktivitas</th>
                <th>Perubahan Kuota</th>
                <th>Sisa Saldo Akhir</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-[#fcfbf9] transition-colors">
                  <td>
                    <div className="font-bold text-[#1e2640] text-[13px]">{h.id}</div>
                    <div className="text-[11px] text-[#8f95a8]">{h.date}</div>
                  </td>
                  <td>
                    <span
                      className={`badge text-[10.5px] font-extrabold ${
                        h.type === "TOPUP" ? "badge-success" : "badge-lavender"
                      }`}
                    >
                      {h.type}
                    </span>
                  </td>
                  <td>
                    <span className="text-[13px] font-semibold text-[#1e2640]">{h.desc}</span>
                  </td>
                  <td>
                    <span
                      className={`font-extrabold text-[13.5px] font-mono ${
                        h.qty > 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {h.qty > 0 ? `+${h.qty}` : h.qty} Pesan
                    </span>
                  </td>
                  <td>
                    <span className="font-bold text-[#1e2640] text-[13px]">{h.balance} Pesan</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Top Up */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[500px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#1e2640]">Top-Up Kuota Pesan Broadcast</h3>
              <button
                onClick={() => setShowTopupModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {packages.map((pkg) => (
                <label
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg.id)}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedPackage === pkg.id
                      ? "border-[#2545ff] bg-[#edeffe]"
                      : "border-[#ede8e2] bg-white hover:bg-[#fcfbf9]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="credit-pkg"
                      checked={selectedPackage === pkg.id}
                      onChange={() => setSelectedPackage(pkg.id)}
                      className="accent-[#2545ff]"
                    />
                    <div>
                      <div className="font-extrabold text-[14px] text-[#1e2640] flex items-center gap-2">
                        <span>{pkg.name}</span>
                        {pkg.bestValue && <span className="badge badge-success text-[10px]">Terlaris</span>}
                      </div>
                      <div className="text-[12px] text-[#5a6380]">{pkg.messages} Kuota Pesan WhatsApp</div>
                    </div>
                  </div>
                  <div className="font-extrabold text-[15px] text-[#2545ff]">
                    Rp {pkg.price.toLocaleString("id-ID")}
                  </div>
                </label>
              ))}

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[12px] text-emerald-900 flex items-center gap-2 mt-2">
                <QrIcon className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>Pembayaran instan via QRIS (BCA, GoPay, OVO, ShopeePay). Saldo masuk otomatis &lt; 5 detik.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ede8e2] mt-2">
                <button
                  type="button"
                  onClick={() => setShowTopupModal(false)}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleTopupSubmit}
                  disabled={isProcessing}
                  className="btn-primary !py-2 !px-5 text-[13px] font-bold"
                >
                  {isProcessing ? "Memproses QRIS..." : "Bayar via QRIS"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
