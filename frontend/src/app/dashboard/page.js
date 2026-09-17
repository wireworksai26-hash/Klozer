"use client";
import { useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";
import {
  CrownIcon,
  BriefcaseIcon,
  ClipboardListIcon,
  HeadphonesIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  UsersIcon,
  MessageSquareIcon,
  CheckCircleIcon,
} from "@/components/icons";

export default function DashboardPage() {
  const {
    role,
    institutions,
    orders,
    products,
    leads,
    teamMembers,
    activeSubscription,
    currentUser,
    activeInstitution,
  } = useDashboard();
  const [activeRange, setActiveRange] = useState("7H");

  const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "processing" || o.status === "shipped");
  const totalRevenue = paidOrders.reduce((acc, curr) => acc + curr.total, 0);

  // ==================== 1. SUPER ADMIN UNIVERSAL OVERVIEW ====================
  if (role === "superadmin") {
    return (
      <div className="flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
                <CrownIcon className="w-3.5 h-3.5" />
                <span>Super Admin Universal Console</span>
              </span>
            </div>
            <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">Platform Master Overview</h1>
            <p className="text-[13.5px] text-[#64748b]">Monitoring universal seluruh tenant institusi, kuota WhatsApp API, dan stabilitas server.</p>
          </div>

          <Link href="/dashboard/institutions" className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold self-start sm:self-auto flex items-center gap-1.5">
            <span>+</span>
            <span>Tambah Institusi Baru</span>
          </Link>
        </div>

        {/* 4 Universal Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <span className="text-[12.5px] font-medium text-[#64748b]">Total Institusi Terdaftar</span>
            <div className="text-[28px] font-extrabold text-[#0c1754] mt-1">{institutions.length} Tenant</div>
            <span className="text-[11.5px] font-bold text-emerald-600">100% Aktif Berlangganan</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <span className="text-[12.5px] font-medium text-[#64748b]">Total GMV Transaksi Platform</span>
            <div className="text-[28px] font-extrabold text-[#0c1754] mt-1">Rp 1.48 Miliar</div>
            <span className="text-[11.5px] font-bold text-emerald-600">Naik 18.4% vs bulan lalu</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <span className="text-[12.5px] font-medium text-[#64748b]">Pesan WhatsApp Diproses</span>
            <div className="text-[28px] font-extrabold text-[#0c1754] mt-1">120.350</div>
            <span className="text-[11.5px] font-bold text-[#2545ff]">Cloud API Uptime: 99.98%</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <span className="text-[12.5px] font-medium text-[#64748b]">Deteksi Anti-Struk Palsu</span>
            <div className="text-[28px] font-extrabold text-emerald-600 mt-1">142 Kasus</div>
            <span className="text-[11.5px] font-bold text-emerald-700">Rp 48.2 Jt Kerugian Dicegah</span>
          </div>
        </div>

        {/* Universal Tenant Table Overview */}
        <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#f0e9e1] mb-4">
            <h3 className="text-[16px] font-extrabold text-[#0c1754]">Daftar Institusi & Penggunaan Kuota</h3>
            <Link href="/dashboard/institutions" className="text-[12.5px] font-bold text-[#2545ff] hover:underline">
              Kelola Semua Institusi →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f9f8f6] border-b border-[#f0e9e1]">
                  <th className="py-2.5 px-4 font-bold text-[#64748b]">Nama Institusi</th>
                  <th className="py-2.5 px-4 font-bold text-[#64748b]">Sektor</th>
                  <th className="py-2.5 px-4 font-bold text-[#64748b]">Paket</th>
                  <th className="py-2.5 px-4 font-bold text-[#64748b]">Kuota Terpakai</th>
                  <th className="py-2.5 px-4 font-bold text-[#64748b]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e9e1]">
                {institutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-[#fcfbf9]">
                    <td className="py-3 px-4 font-bold text-[#0c1754]">{inst.name}</td>
                    <td className="py-3 px-4 text-[#64748b]">{inst.sector}</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-bold bg-[#eaebf8] text-[#2545ff] px-2 py-0.5 rounded-full">
                        {inst.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#171417]">
                      {inst.quotaUsed.toLocaleString()} / {inst.quotaMax.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  }

  // ==================== 2. SUPERVISOR (SPV) OPERATIONAL OVERVIEW ====================
  if (role === "spv") {
    const spvClosingRate = leads.length > 0 ? ((paidOrders.length / leads.length) * 100).toFixed(1) + "%" : "0%";
    const csList = teamMembers.filter((t) => t.role?.includes("CS") || t.role?.toLowerCase()?.includes("customer service"));

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1.5">
                <ClipboardListIcon className="w-3.5 h-3.5" />
                <span>Supervisor (SPV) Operations</span>
              </span>
            </div>
            <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">Overview Operasional & CS</h1>
            <p className="text-[13.5px] text-[#64748b]">Pantau beban kerja tim CS, persetujuan pesanan, dan distribusi leads.</p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/orders" className="btn-primary !py-2 !px-4 text-[13px]">
              + Buat Pesanan Manual
            </Link>
          </div>
        </div>

        {/* SPV Active Subscription Banner */}
        <div className="bg-gradient-to-r from-[#0c1754] via-[#1a2d8a] to-[#2545ff] p-4 sm:p-5 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 flex-shrink-0">
              <CrownIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-[15px]">{activeSubscription?.plan || "Pro Growth"}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Aktif
                </span>
                <span className="text-[11.5px] text-white/70 font-mono">
                  • {currentUser?.institutionName || activeInstitution?.name || "Bisnis Saya"}
                </span>
              </div>
              <p className="text-[12.5px] text-white/80 mt-0.5">
                Masa aktif tersisa: <strong className="text-amber-300 font-mono">{activeSubscription?.daysLeft || 350} Hari</strong> (s/d {activeSubscription?.expiryDate || "28 Agu 2027"}) • Alokasi: <strong>{activeSubscription?.csSeatsUsed || 3}/{activeSubscription?.csSeats || 5} Kursi CS</strong>
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/subscription"
            className="px-4 py-2 rounded-xl bg-white text-[#0c1754] hover:bg-white/90 font-extrabold text-[12.5px] transition-all no-underline shadow-sm self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>Perpanjang Paket Toko</span>
            <span>→</span>
          </Link>
        </div>

        {/* SPV Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <span className="text-[12.5px] font-medium text-[#64748b]">Pesanan Menunggu Proses</span>
            <div className="text-[28px] font-extrabold text-amber-600 mt-1">
              {orders.filter((o) => o.status === "waiting_payment" || o.status === "processing").length} Pesanan
            </div>
            <span className="text-[11.5px] font-bold text-[#2545ff]">
              {orders.length > 0 ? "Butuh Verifikasi / Kirim" : "Belum ada pesanan masuk"}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <span className="text-[12.5px] font-medium text-[#64748b]">Lead Belum Ditugaskan</span>
            <div className="text-[28px] font-extrabold text-[#0c1754] mt-1">
              {leads.filter((l) => l.cs?.includes("Belum") || !l.cs).length} Lead
            </div>
            <span className="text-[11.5px] font-bold text-amber-600">
              {leads.length > 0 ? "Siap dibagi ke CS" : "Belum ada kontak baru"}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <span className="text-[12.5px] font-medium text-[#64748b]">Stok Gudang Kritis</span>
            <div className="text-[28px] font-extrabold text-red-600 mt-1">
              {products.filter((p) => (p.stock || 0) <= (p.lowStock || 5)).length} Produk
            </div>
            <span className="text-[11.5px] font-bold text-red-600">
              {products.length > 0 ? "Perlu Restock Segera" : "Katalog produk kosong"}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <span className="text-[12.5px] font-medium text-[#64748b]">Rata-rata Closing Rate CS</span>
            <div className="text-[28px] font-extrabold text-emerald-600 mt-1">{spvClosingRate}</div>
            <span className="text-[11.5px] font-bold text-emerald-700">
              {paidOrders.length > 0 ? "Target Tercapai" : "Belum ada data transaksi"}
            </span>
          </div>
        </div>

        {/* CS Team Leaderboard */}
        <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-xs">
          <h3 className="text-[16px] font-extrabold text-[#0c1754] mb-3">Rekap Performa & Komisi Staf CS</h3>
          <div className="overflow-x-auto">
            {csList.length === 0 ? (
              <div className="p-6 text-center text-[#64748b] bg-[#fcfbf9] rounded-xl border border-dashed border-[#ede8e2] text-[13px]">
                Belum ada data staf CS yang terdaftar.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f9f8f6] border-b border-[#f0e9e1]">
                    <th className="py-2.5 px-4 font-bold text-[#64748b]">Nama CS</th>
                    <th className="py-2.5 px-4 font-bold text-[#64748b]">Closing Rate</th>
                    <th className="py-2.5 px-4 font-bold text-[#64748b]">Omzet Dihasilkan</th>
                    <th className="py-2.5 px-4 font-bold text-[#64748b]">Estimasi Komisi (5%)</th>
                    <th className="py-2.5 px-4 font-bold text-[#64748b]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0e9e1]">
                  {csList.map((cs) => (
                    <tr key={cs.id} className="hover:bg-[#fcfbf9]">
                      <td className="py-3 px-4 font-bold text-[#0c1754]">{cs.name}</td>
                      <td className="py-3 px-4 font-extrabold text-emerald-600">{cs.csClosingRate || "0%"}</td>
                      <td className="py-3 px-4 font-bold text-[#0c1754]">{cs.revenueGen || "Rp 0"}</td>
                      <td className="py-3 px-4 font-bold text-[#2545ff]">
                        {cs.revenueGen && cs.revenueGen !== "-" && cs.revenueGen !== "Rp 0"
                          ? "Rp " + (parseInt(cs.revenueGen.replace(/[^0-9]/g, "") || 0) * 0.05).toLocaleString()
                          : "Rp 0"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          Aktif Bertugas
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== 3. CUSTOMER SERVICE (CS) VIEW ====================
  if (role === "cs") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <HeadphonesIcon className="w-3.5 h-3.5" />
                <span>CS Frontliner Workspace</span>
              </span>
            </div>
            <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">Meja Kerja Customer Service</h1>
            <p className="text-[13.5px] text-[#64748b]">Fokus respon pesan masuk, buat tagihan QRIS instan, dan capai target closing hari ini.</p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/chat" className="btn-primary !py-2.5 !px-5 text-[13px] font-bold flex items-center gap-2">
              <MessageSquareIcon className="w-4 h-4" />
              <span>Buka Live Chat WhatsApp</span>
            </Link>
          </div>
        </div>

        {/* CS Personal Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <span className="text-[12.5px] font-medium text-[#64748b]">Closing Rate Pribadi</span>
            <div className="text-[28px] font-extrabold text-emerald-600 mt-1">
              {leads.length > 0 ? ((paidOrders.length / leads.length) * 100).toFixed(1) + "%" : "0%"}
            </div>
            <span className="text-[11.5px] font-bold text-emerald-700">
              {paidOrders.length > 0 ? "Performa aktif" : "Belum ada transaksi"}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <span className="text-[12.5px] font-medium text-[#64748b]">Omzet Penjualan Saya</span>
            <div className="text-[28px] font-extrabold text-[#0c1754] mt-1">
              Rp {totalRevenue.toLocaleString()}
            </div>
            <span className="text-[11.5px] font-bold text-[#2545ff]">{paidOrders.length} Pesanan Lunas</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <span className="text-[12.5px] font-medium text-[#64748b]">Estimasi Komisi (5%)</span>
            <div className="text-[28px] font-extrabold text-[#2545ff] mt-1">
              Rp {(totalRevenue * 0.05).toLocaleString()}
            </div>
            <span className="text-[11.5px] font-bold text-emerald-600">Dicairkan Akhir Bulan</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <span className="text-[12.5px] font-medium text-[#64748b]">Leads Dalam Percakapan</span>
            <div className="text-[28px] font-extrabold text-[#0c1754] mt-1">
              {leads.length} Kontak
            </div>
            <span className="text-[11.5px] font-bold text-amber-600">WhatsApp Aktif</span>
          </div>
        </div>

        {/* Recent Deals Table */}
        <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#f0e9e1] mb-4">
            <h3 className="text-[16px] font-extrabold text-[#0c1754]">Pesanan Terakhir Berhasil Ditutup</h3>
            <Link href="/dashboard/orders" className="text-[12.5px] font-bold text-[#2545ff] hover:underline">
              Lihat Semua Pesanan →
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {orders.length === 0 ? (
              <div className="p-6 text-center text-[#64748b] bg-[#fcfbf9] rounded-xl border border-dashed border-[#ede8e2] text-[13px]">
                Belum ada riwayat pesanan yang ditutup.
              </div>
            ) : (
              orders.slice(0, 3).map((ord) => (
                <div key={ord.id} className="p-3.5 bg-[#f9f8f6] rounded-xl border border-[#f0e9e1] flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-[#2545ff]">{ord.id}</span>
                    <div className="font-bold text-[#0c1754] text-[13.5px]">{ord.customer} ({ord.city})</div>
                    <div className="text-[12px] text-[#64748b]">{ord.items[0]?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-[#0c1754] text-[14px]">Rp {ord.total.toLocaleString()}</div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      {ord.paymentMethod}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== 4. OWNER / MERCHANT ADMIN VIEW (DEFAULT) ====================
  const ownerClosingRate = leads.length > 0 ? ((paidOrders.length / leads.length) * 100).toFixed(1) + "%" : "0%";
  const ownerCsList = teamMembers.filter((t) => t.role?.includes("CS") || t.role?.toLowerCase()?.includes("customer service"));

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <BriefcaseIcon className="w-3.5 h-3.5" />
              <span>Owner / Supervisor Console</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">Dashboard Overview</h1>
          <p className="text-[13.5px] text-[#64748b]">Ringkasan performa penjualan WhatsApp hari ini</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/orders" className="btn-primary !py-2.5 !px-5 text-[13px] font-bold">
            + Buat Pesanan Manual
          </Link>
        </div>
      </div>

      {/* Owner Active Subscription Banner */}
      <div className="bg-gradient-to-r from-[#0c1754] via-[#1a2d8a] to-[#2545ff] p-4 sm:p-5 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 flex-shrink-0">
            <CrownIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-[15px]">{activeSubscription?.plan || "Pro Growth"}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Aktif
              </span>
              <span className="text-[11.5px] text-white/70 font-mono">
                • {currentUser?.institutionName || activeInstitution?.name || "Bisnis Saya"}
              </span>
            </div>
            <p className="text-[12.5px] text-white/80 mt-0.5">
              Masa aktif tersisa: <strong className="text-amber-300 font-mono">{activeSubscription?.daysLeft || 350} Hari</strong> (s/d {activeSubscription?.expiryDate || "28 Agu 2027"}) • Alokasi: <strong>{activeSubscription?.csSeatsUsed || 3}/{activeSubscription?.csSeats || 5} Kursi CS</strong>
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/subscription"
          className="px-4 py-2 rounded-xl bg-white text-[#0c1754] hover:bg-white/90 font-extrabold text-[12.5px] transition-all no-underline shadow-sm self-start sm:self-auto flex items-center gap-1.5"
        >
          <span>Perpanjang Paket Toko</span>
          <span>→</span>
        </Link>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)] flex flex-col justify-between hover:shadow-md transition-all">
          <span className="text-[13px] font-medium text-[#64748b]">Omzet Penjualan Lunas</span>
          <div className="text-[26px] font-extrabold text-[#0c1754] tracking-tight my-2">
            Rp {totalRevenue.toLocaleString()}
          </div>
          <span className={`text-[12px] font-semibold ${totalRevenue > 0 ? "text-emerald-600" : "text-[#64748b]"}`}>
            {totalRevenue > 0 ? "Omzet tercatat aktif" : "Belum ada omzet hari ini"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)] flex flex-col justify-between hover:shadow-md transition-all">
          <span className="text-[13px] font-medium text-[#64748b]">Pesanan Terverifikasi</span>
          <div className="text-[26px] font-extrabold text-[#0c1754] tracking-tight my-2">
            {paidOrders.length} Pesanan
          </div>
          <span className={`text-[12px] font-semibold ${paidOrders.length > 0 ? "text-emerald-600" : "text-[#64748b]"}`}>
            {paidOrders.length > 0 ? "100% QRIS & Mutasi Cocok" : "Menunggu transaksi pertama"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)] flex flex-col justify-between hover:shadow-md transition-all">
          <span className="text-[13px] font-medium text-[#64748b]">Lead Baru Masuk</span>
          <div className="text-[26px] font-extrabold text-[#0c1754] tracking-tight my-2">
            {leads.length} Leads
          </div>
          <span className={`text-[12px] font-semibold ${leads.length > 0 ? "text-[#2545ff]" : "text-[#64748b]"}`}>
            {leads.length > 0 ? "Meta CAPI Tracked" : "Belum ada lead baru"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)] flex flex-col justify-between hover:shadow-md transition-all">
          <span className="text-[13px] font-medium text-[#64748b]">Closing Rate Rata-rata</span>
          <div className="text-[26px] font-extrabold text-emerald-600 tracking-tight my-2">
            {ownerClosingRate}
          </div>
          <span className={`text-[12px] font-semibold ${paidOrders.length > 0 ? "text-emerald-600" : "text-[#64748b]"}`}>
            {paidOrders.length > 0 ? "Tercatat real-time" : "Belum ada data closing"}
          </span>
        </div>
      </div>

      {/* Revenue Bar Chart & Recent Activity Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Revenue Bar Chart (Col 8) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)]">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#f0e9e1]">
            <div>
              <h3 className="text-[16px] font-bold text-[#0c1754]">Tren Omzet Penjualan</h3>
              <p className="text-[12px] text-[#969696]">7 hari terakhir (Rp Juta)</p>
            </div>
            <div className="flex gap-1.5 bg-[#f9f8f6] p-1 rounded-xl border border-[#f0e9e1]">
              {["7H", "30H", "3B"].map((range) => (
                <button
                  key={range}
                  onClick={() => setActiveRange(range)}
                  className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all border-none cursor-pointer ${
                    activeRange === range
                      ? "bg-[#2545ff] text-white shadow-sm"
                      : "bg-transparent text-[#64748b] hover:text-[#0c1754]"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Visuals or Clean Empty State */}
          {totalRevenue === 0 ? (
            <div className="flex flex-col items-center justify-center h-[180px] text-center text-[#64748b] bg-[#fcfbf9] rounded-xl border border-dashed border-[#ede8e2] p-6">
              <div className="w-10 h-10 rounded-full bg-[#eaebf8] flex items-center justify-center text-[#2545ff] mb-2 font-bold">
                Rp
              </div>
              <span className="text-[13.5px] font-bold text-[#0c1754]">Belum Ada Riwayat Transaksi Penjualan</span>
              <span className="text-[12px] text-[#969696] mt-1 max-w-[400px]">
                Grafik omzet akan otomatis terisi saat pesanan pertama dibuat secara manual atau via WhatsApp QRIS.
              </span>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-3 h-[180px] pt-4 px-2">
              {[
                { day: "Sen", val: 12, height: "45%" },
                { day: "Sel", val: 18, height: "65%" },
                { day: "Rab", val: 14, height: "50%" },
                { day: "Kam", val: 22, height: "80%" },
                { day: "Jum", val: 19, height: "70%" },
                { day: "Sab", val: 28, height: "100%", active: true },
                { day: "Min", val: 18, height: "65%" },
              ].map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[11px] font-bold text-[#2545ff] opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.val}Jt
                  </span>
                  <div className="w-full bg-[#eaebf8] rounded-t-xl h-[120px] flex items-end overflow-hidden">
                    <div
                      style={{ height: d.height }}
                      className={`w-full rounded-t-xl transition-all duration-500 ${
                        d.active ? "bg-[#2545ff] shadow-md" : "bg-[#2545ff]/40 group-hover:bg-[#2545ff]"
                      }`}
                    />
                  </div>
                  <span className="text-[12px] font-medium text-[#64748b]">{d.day}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CS Closing Performance Leaderboard (Col 4) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#f0e9e1] mb-4">
              <h3 className="text-[16px] font-bold text-[#0c1754]">Top CS Leaderboard</h3>
              <span className="text-[11px] font-bold text-[#2545ff]">Komisi Otomatis</span>
            </div>

            <div className="flex flex-col gap-3">
              {ownerCsList.length === 0 ? (
                <div className="p-4 text-center text-[#64748b] bg-[#fcfbf9] rounded-xl border border-dashed border-[#ede8e2] text-[12px]">
                  Belum ada staf CS yang ditugaskan.
                </div>
              ) : (
                ownerCsList.map((cs, idx) => (
                  <div key={cs.id} className="flex items-center justify-between p-3 rounded-xl bg-[#f9f8f6] border border-[#f0e9e1]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#2545ff] text-white flex items-center justify-center font-bold text-[11px]">
                        0{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-[13px] text-[#0c1754]">{cs.name}</div>
                        <div className="text-[11px] text-[#64748b]">{cs.role}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-extrabold text-emerald-600">{cs.csClosingRate || "0%"}</div>
                      <div className="text-[10px] text-[#969696]">{cs.revenueGen || "Rp 0"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link href="/dashboard/settings?tab=team" className="btn-outline !py-2 text-[12px] text-center w-full mt-4">
            Kelola Izin & Komisi Staf →
          </Link>
        </div>

      </div>

    </div>
  );
}
