"use client";
import { useState } from "react";
import {
  SettingsIcon,
  CrownIcon,
  CheckCircleIcon,
  BuildingIcon,
  DollarSignIcon,
  KeyIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "@/components/icons";

export default function SuperadminSettingsPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formState, setFormState] = useState({
    // Meta Cloud API Master
    masterWabaId: "109823487192834",
    masterPhoneId: "102938475610293",
    masterAppSecret: "meta_sec_klozer_88192847190",
    webhookVerifyToken: "klozer_master_webhook_token_2026",
    
    // Platform Bank & VA Config
    paymentGateway: "xendit",
    masterApiKey: "xnd_production_891283749102834",
    bcaVaPrefix: "88091",
    mandiriVaPrefix: "89901",
    briVaPrefix: "10992",

    // Fee Structure
    qrisMdrRate: "0.7", // 0.7%
    vaFlatFee: "4000", // Rp 4.000
    codProtectionFee: "3.0", // 3.0%
    minPayoutThreshold: "100000", // Rp 100.000

    // Vouchers
    vouchers: [
      { code: "KLOZERLAUNCH2026", discount: "20%", maxUsage: 100, used: 42, active: true },
      { code: "BATIKPROMO50", discount: "50%", maxUsage: 10, used: 10, active: false },
      { code: "SUPERDEALPRO", discount: "15%", maxUsage: 200, used: 89, active: true },
    ],
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <CrownIcon className="w-3.5 h-3.5" />
              <span>Superadmin Master Konfigurasi</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Pengaturan Global Platform SaaS
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Konfigurasi master WhatsApp Meta App Pusat, Rekening Virtual Account Platform, struktur biaya MDR/Admin, dan voucher diskon.
          </p>
        </div>

        {saveSuccess && (
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-[13px] font-bold flex items-center gap-2 animate-scale-pop">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan platform berhasil disimpan!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* SECTION 1: WhatsApp Meta App Master */}
        <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#ede8e2] mb-5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <KeyIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[17px] font-extrabold text-[#1e2640]">WhatsApp Meta Cloud API (Master Platform)</h2>
              <p className="text-[12px] text-[#64748b]">Kredensial Meta Business Manager utama untuk routing multi-tenant.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-bold uppercase text-[#8f95a8] block mb-1.5">
                Master WABA Account ID:
              </label>
              <input
                type="text"
                value={formState.masterWabaId}
                onChange={(e) => setFormState({ ...formState, masterWabaId: e.target.value })}
                className="w-full text-[13px] font-mono bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3.5 py-2.5 text-[#1e2640] outline-none focus:border-[#2545ff]"
              />
            </div>

            <div>
              <label className="text-[12px] font-bold uppercase text-[#8f95a8] block mb-1.5">
                Master Phone Number ID:
              </label>
              <input
                type="text"
                value={formState.masterPhoneId}
                onChange={(e) => setFormState({ ...formState, masterPhoneId: e.target.value })}
                className="w-full text-[13px] font-mono bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3.5 py-2.5 text-[#1e2640] outline-none focus:border-[#2545ff]"
              />
            </div>

            <div>
              <label className="text-[12px] font-bold uppercase text-[#8f95a8] block mb-1.5">
                Meta App Secret Key:
              </label>
              <input
                type="password"
                value={formState.masterAppSecret}
                onChange={(e) => setFormState({ ...formState, masterAppSecret: e.target.value })}
                className="w-full text-[13px] font-mono bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3.5 py-2.5 text-[#1e2640] outline-none focus:border-[#2545ff]"
              />
            </div>

            <div>
              <label className="text-[12px] font-bold uppercase text-[#8f95a8] block mb-1.5">
                Webhook Verify Token:
              </label>
              <input
                type="text"
                value={formState.webhookVerifyToken}
                onChange={(e) => setFormState({ ...formState, webhookVerifyToken: e.target.value })}
                className="w-full text-[13px] font-mono bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3.5 py-2.5 text-[#1e2640] outline-none focus:border-[#2545ff]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Virtual Account & Payment Gateway */}
        <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#ede8e2] mb-5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#2545ff] flex items-center justify-center">
              <DollarSignIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[17px] font-extrabold text-[#1e2640]">Gateway Pembayaran & Virtual Account Platform</h2>
              <p className="text-[12px] text-[#64748b]">Pengaturan aggregator pembayaran Xendit/Midtrans dan prefix VA bank.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-bold uppercase text-[#8f95a8] block mb-1.5">
                Payment Aggregator Provider:
              </label>
              <select
                value={formState.paymentGateway}
                onChange={(e) => setFormState({ ...formState, paymentGateway: e.target.value })}
                className="w-full text-[13px] font-medium bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3.5 py-2.5 text-[#1e2640] outline-none"
              >
                <option value="xendit">Xendit Production API</option>
                <option value="midtrans">Midtrans Snap Production</option>
                <option value="doku">DOKU Payment Gateway</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] font-bold uppercase text-[#8f95a8] block mb-1.5">
                Master Secret API Key:
              </label>
              <input
                type="password"
                value={formState.masterApiKey}
                onChange={(e) => setFormState({ ...formState, masterApiKey: e.target.value })}
                className="w-full text-[13px] font-mono bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3.5 py-2.5 text-[#1e2640] outline-none focus:border-[#2545ff]"
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11.5px] font-bold uppercase text-[#8f95a8] block mb-1">Prefix BCA VA:</label>
                <input
                  type="text"
                  value={formState.bcaVaPrefix}
                  onChange={(e) => setFormState({ ...formState, bcaVaPrefix: e.target.value })}
                  className="w-full text-[13px] font-mono bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-2 text-[#1e2640] outline-none"
                />
              </div>
              <div>
                <label className="text-[11.5px] font-bold uppercase text-[#8f95a8] block mb-1">Prefix Mandiri VA:</label>
                <input
                  type="text"
                  value={formState.mandiriVaPrefix}
                  onChange={(e) => setFormState({ ...formState, mandiriVaPrefix: e.target.value })}
                  className="w-full text-[13px] font-mono bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-2 text-[#1e2640] outline-none"
                />
              </div>
              <div>
                <label className="text-[11.5px] font-bold uppercase text-[#8f95a8] block mb-1">Prefix BRI VA:</label>
                <input
                  type="text"
                  value={formState.briVaPrefix}
                  onChange={(e) => setFormState({ ...formState, briVaPrefix: e.target.value })}
                  className="w-full text-[13px] font-mono bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-2 text-[#1e2640] outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Fee Structure */}
        <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#ede8e2] mb-5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheckIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[17px] font-extrabold text-[#1e2640]">Skema Biaya MDR & Admin Platform</h2>
              <p className="text-[12px] text-[#64748b]">Tarif platform fee yang dipotong otomatis saat transaksi settlement.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[11.5px] font-bold uppercase text-[#8f95a8] block mb-1">QRIS MDR (%):</label>
              <input
                type="text"
                value={formState.qrisMdrRate}
                onChange={(e) => setFormState({ ...formState, qrisMdrRate: e.target.value })}
                className="w-full text-[13px] font-bold bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-2 text-[#1e2640] outline-none"
              />
              <span className="text-[10.5px] text-[#8f95a8] mt-0.5 block">Standar BI: 0.7%</span>
            </div>

            <div>
              <label className="text-[11.5px] font-bold uppercase text-[#8f95a8] block mb-1">Flat Fee VA (Rp):</label>
              <input
                type="text"
                value={formState.vaFlatFee}
                onChange={(e) => setFormState({ ...formState, vaFlatFee: e.target.value })}
                className="w-full text-[13px] font-bold bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-2 text-[#1e2640] outline-none"
              />
              <span className="text-[10.5px] text-[#8f95a8] mt-0.5 block">Per transaksi VA sukses</span>
            </div>

            <div>
              <label className="text-[11.5px] font-bold uppercase text-[#8f95a8] block mb-1">COD Proteksi (%):</label>
              <input
                type="text"
                value={formState.codProtectionFee}
                onChange={(e) => setFormState({ ...formState, codProtectionFee: e.target.value })}
                className="w-full text-[13px] font-bold bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-2 text-[#1e2640] outline-none"
              />
              <span className="text-[10.5px] text-[#8f95a8] mt-0.5 block">Garansi Anti-RTS AI</span>
            </div>

            <div>
              <label className="text-[11.5px] font-bold uppercase text-[#8f95a8] block mb-1">Min. Payout (Rp):</label>
              <input
                type="text"
                value={formState.minPayoutThreshold}
                onChange={(e) => setFormState({ ...formState, minPayoutThreshold: e.target.value })}
                className="w-full text-[13px] font-bold bg-[#f5f4f2] border border-[#ede8e2] rounded-xl px-3 py-2 text-[#1e2640] outline-none"
              />
              <span className="text-[10.5px] text-[#8f95a8] mt-0.5 block">Ambang batas tarik dana</span>
            </div>
          </div>
        </div>

        {/* SECTION 4: Platform Vouchers */}
        <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-5">
            <div>
              <h2 className="text-[17px] font-extrabold text-[#1e2640]">Voucher Diskon Langganan SaaS</h2>
              <p className="text-[12px] text-[#64748b]">Kode promo diskon aktivasi lisensi tenant baru.</p>
            </div>
            <button
              type="button"
              onClick={() => alert("Tambah Voucher Baru...")}
              className="px-3 py-1.5 text-[12px] font-bold rounded-xl bg-purple-50 text-purple-700 border border-purple-200 cursor-pointer"
            >
              + Tambah Voucher
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Kode Promo</th>
                  <th>Besaran Diskon</th>
                  <th>Penggunaan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {formState.vouchers.map((v) => (
                  <tr key={v.code} className="hover:bg-[#fcfbf9] transition-colors">
                    <td>
                      <span className="font-mono font-bold text-[#1e2640] text-[13px] px-2 py-0.5 bg-[#f5f4f2] rounded-md border border-[#ede8e2]">
                        {v.code}
                      </span>
                    </td>
                    <td>
                      <span className="font-extrabold text-[#2545ff] text-[13.5px]">{v.discount}</span>
                    </td>
                    <td>
                      <span className="text-[12.5px] text-[#5a6380]">
                        {v.used} / {v.maxUsage} Digunakan
                      </span>
                    </td>
                    <td>
                      {v.active ? (
                        <span className="badge badge-success text-[11px]">Aktif</span>
                      ) : (
                        <span className="badge badge-danger text-[11px]">Habis / Non-Aktif</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary !py-3 !px-8 text-[14px] font-bold flex items-center gap-2 cursor-pointer"
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>Simpan Seluruh Pengaturan Platform</span>
          </button>
        </div>
      </form>
    </div>
  );
}
