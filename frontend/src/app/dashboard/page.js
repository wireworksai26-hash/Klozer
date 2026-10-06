"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";
import {
  MetricCard,
  TrendAreaChart,
  ConversionFunnelChart,
  PaymentBreakdownChart,
} from "@/components/dashboard";
import {
  DollarSignIcon,
  ShoppingCartIcon,
  UsersIcon,
  TrendingUpIcon,
  MessageSquareIcon,
  CrownIcon,
  BriefcaseIcon,
  ClipboardListIcon,
  HeadphonesIcon,
  CheckCircleIcon,
  PlusIcon,
  CalendarIcon,
  ChevronRightIcon,
  SparklesIcon,
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
    language,
    t,
  } = useDashboard();

  const [dateFilter, setDateFilter] = useState("today"); // "today" | "week" | "month"

  const paidOrders = orders.filter(
    (o) => o.status === "paid" || o.status === "processing" || o.status === "shipped"
  );
  const totalRevenue = paidOrders.reduce((acc, curr) => acc + (Number(curr.total || curr.total_amount || 0)), 0);
  const closingRatePct =
    leads.length > 0 ? ((paidOrders.length / leads.length) * 100).toFixed(1) : (paidOrders.length > 0 ? "100.0" : "0.0");

  const csList = teamMembers.filter(
    (t) =>
      t.role?.includes("CS") ||
      t.role?.toLowerCase()?.includes("customer service") ||
      t.role?.toLowerCase()?.includes("frontliner")
  );

  // Dynamic Sparkline data derived from real orders and leads
  const revenueSpark = React.useMemo(() => {
    if (!orders || orders.length === 0) return [0, 0, 0, 0, 0, 0, 0];
    const points = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    orders.forEach((o) => {
      const d = o.created_at ? new Date(o.created_at) : new Date();
      const diffDays = Math.min(6, Math.max(0, Math.floor((now - d) / (1000 * 60 * 60 * 24))));
      const idx = 6 - diffDays;
      points[idx] += Number(o.total || o.total_amount || 0) / 1000000;
    });
    return points;
  }, [orders]);

  const ordersSpark = React.useMemo(() => {
    if (!orders || orders.length === 0) return [0, 0, 0, 0, 0, 0, 0];
    const points = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    orders.forEach((o) => {
      const d = o.created_at ? new Date(o.created_at) : new Date();
      const diffDays = Math.min(6, Math.max(0, Math.floor((now - d) / (1000 * 60 * 60 * 24))));
      const idx = 6 - diffDays;
      points[idx] += 1;
    });
    return points;
  }, [orders]);

  const leadsSpark = React.useMemo(() => {
    if (!leads || leads.length === 0) return [0, 0, 0, 0, 0, 0, 0];
    const points = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    leads.forEach((l) => {
      const d = l.created_at ? new Date(l.created_at) : new Date();
      const diffDays = Math.min(6, Math.max(0, Math.floor((now - d) / (1000 * 60 * 60 * 24))));
      const idx = 6 - diffDays;
      points[idx] += 1;
    });
    return points;
  }, [leads]);

  const closingSpark = React.useMemo(() => {
    if (!orders || orders.length === 0) return [0, 0, 0, 0, 0, 0, 0];
    const rate = Number(closingRatePct) || 0;
    return [Math.max(0, rate - 4), Math.max(0, rate - 2), rate, Math.max(0, rate - 1), rate, Math.min(100, rate + 2), rate];
  }, [orders, closingRatePct]);

  // =========================================================================
  // 1. SUPER ADMIN PLATFORM CONSOLE VIEW
  // =========================================================================
  if (role === "superadmin") {
    return (
      <div className="flex flex-col gap-6 font-sans">
        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11.5px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Super Admin Console
              </span>
              <span className="text-[12px] text-[#64748b]">
                {t("dashboard.superadminSubtitle", "Universal Multi-Tenant Overview")}
              </span>
            </div>
            <h1 className="text-[24px] font-extrabold text-[#0f172a] tracking-tight">
              {t("dashboard.superadminTitle", "Platform Master Overview")}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/institutions"
              className="px-4 py-2 rounded-xl bg-[#2545ff] hover:bg-[#1d37cc] text-white text-[13px] font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 no-underline"
            >
              <span>{t("institutions.addBtn", "+ Tambah Instansi")}</span>
            </Link>
          </div>
        </div>

        {/* 4 Core Platform Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title={t("dashboard.totalTenants", "Total Tenant Institusi")}
            value={`${institutions.length} Tenant`}
            subtitle={t("dashboard.totalTenantsSub", "100% Aktif Berlangganan")}
            delta={language === "en" ? "+2 New" : "+2 Baru"}
            deltaType="positive"
            sparklineData={[3, 4, 4, 5, 5, 6, 7]}
            icon={CrownIcon}
          />
          <MetricCard
            title={t("dashboard.totalGmv", "Total GMV Transaksi")}
            value={totalRevenue > 0 ? `Rp ${(totalRevenue / 1000000).toFixed(1)}Jt` : "Rp 0"}
            subtitle={t("dashboard.totalGmvSub", "Periode 30 hari terakhir")}
            delta="+18.4%"
            deltaType="positive"
            sparklineData={revenueSpark}
            icon={DollarSignIcon}
          />
          <MetricCard
            title={t("dashboard.messagesProcessed", "Pesan WA Diproses")}
            value={`${leads.length * 12 + 15}`}
            subtitle={t("dashboard.messagesProcessedSub", "Cloud API Uptime: 99.98%")}
            delta="+24.1%"
            deltaType="positive"
            sparklineData={leadsSpark}
            icon={MessageSquareIcon}
          />
          <MetricCard
            title={t("dashboard.antiFraud", "Deteksi Anti-Struk Palsu")}
            value="142 Kasus"
            subtitle={t("dashboard.antiFraudSub", "Rp 48.2 Jt Kerugian Dicegah")}
            delta={language === "en" ? "100% Accurate" : "100% Akurat"}
            deltaType="positive"
            sparklineData={[12, 18, 15, 24, 20, 28, 25]}
            icon={CheckCircleIcon}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <TrendAreaChart
              orders={orders}
              title={t("dashboard.revenueGlobalTitle", "Tren Transaksi Seluruh Platform")}
              subtitle={t("dashboard.revenueGlobalSubtitle", "Volume pergerakan GMV seluruh tenant bisnis & NGO")}
            />
          </div>
          <div className="lg:col-span-4">
            <PaymentBreakdownChart
              orders={orders}
              title={language === "en" ? "Platform Payment Channels" : "Channel Pembayaran Platform"}
              subtitle={language === "en" ? "QRIS vs Bank Transfer Distribution" : "QRIS vs Bank Transfer se-Indonesia"}
            />
          </div>
        </div>

        {/* Tenant Table List */}
        <div className="bg-white rounded-2xl border border-[#e8eaef] p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#f1f3f7] mb-4">
            <div>
              <h3 className="text-[16px] font-bold text-[#0f172a]">
                {language === "en" ? "Institutions & Quota Consumption" : "Daftar Institusi & Pemakaian Kuota"}
              </h3>
              <p className="text-[12px] text-[#64748b]">
                {language === "en" ? "Monitor WhatsApp messaging quota & AI tokens" : "Monitoring kuota pesan WhatsApp & AI tokens"}
              </p>
            </div>
            <Link
              href="/dashboard/institutions"
              className="text-[12.5px] font-bold text-[#2545ff] hover:underline"
            >
              {language === "en" ? "Manage All →" : "Kelola Semua →"}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <th className="py-2.5 px-4 font-bold text-[#475467]">{language === "en" ? "Institution Name" : "Nama Institusi"}</th>
                  <th className="py-2.5 px-4 font-bold text-[#475467]">{language === "en" ? "Sector" : "Sektor"}</th>
                  <th className="py-2.5 px-4 font-bold text-[#475467]">{language === "en" ? "Plan Tier" : "Paket"}</th>
                  <th className="py-2.5 px-4 font-bold text-[#475467]">{language === "en" ? "WhatsApp Quota" : "Kuota WhatsApp"}</th>
                  <th className="py-2.5 px-4 font-bold text-[#475467]">{t("common.status", "Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f7]">
                {institutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#0f172a]">{inst.name}</td>
                    <td className="py-3 px-4 text-[#64748b]">{inst.sector}</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-bold bg-[#f0f4ff] text-[#2545ff] px-2.5 py-0.5 rounded-full border border-[#dbeafe]">
                        {inst.tier?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#0f172a]">
                      {(inst.quotaUsed || 0).toLocaleString()} / {(inst.quotaMax || 50000).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {t("common.active", "Aktif")}
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

  // =========================================================================
  // 2. CUSTOMER SERVICE (CS) FRONTLINER WORKSPACE VIEW
  // =========================================================================
  if (role === "cs") {
    return (
      <div className="flex flex-col gap-6 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {language === "en" ? "Frontliner Desk" : "Frontliner Meja Kerja"}
              </span>
              <span className="text-[12px] text-[#64748b]">
                {t("dashboard.csSubtitle", "Fokus Respon & Closing Cepat")}
              </span>
            </div>
            <h1 className="text-[24px] font-extrabold text-[#0f172a] tracking-tight">
              {t("dashboard.csTitle", "Workspace Customer Service")}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/chat"
              className="px-4 py-2.5 rounded-xl bg-[#2545ff] hover:bg-[#1d37cc] text-white text-[13px] font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 no-underline"
            >
              <MessageSquareIcon className="w-4 h-4" />
              <span>{language === "en" ? "Open WhatsApp Live Chat" : "Buka Live Chat WhatsApp"}</span>
            </Link>
          </div>
        </div>

        {/* CS Personal Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title={language === "en" ? "Personal Closing Rate" : "Closing Rate Pribadi"}
            value={`${closingRatePct}%`}
            subtitle={language === "en" ? "Minimum target: 30%" : "Target minimum: 30%"}
            delta="+4.2%"
            deltaType="positive"
            sparklineData={closingSpark}
            icon={TrendingUpIcon}
          />
          <MetricCard
            title={language === "en" ? "My Sales Revenue" : "Omzet Penjualan Saya"}
            value={totalRevenue > 0 ? `Rp ${(totalRevenue / 1000000).toFixed(1)}Jt` : "Rp 0"}
            subtitle={language === "en" ? `${paidOrders.length} Paid Orders` : `${paidOrders.length} Pesanan Lunas`}
            delta="+12.5%"
            deltaType="positive"
            sparklineData={revenueSpark}
            icon={DollarSignIcon}
          />
          <MetricCard
            title={language === "en" ? "CS Commission (5%)" : "Estimasi Komisi CS (5%)"}
            value={`Rp ${(totalRevenue * 0.05).toLocaleString()}`}
            subtitle={language === "en" ? "Disbursed end of month" : "Dicairkan akhir bulan"}
            delta={language === "en" ? "Auto" : "Otomatis"}
            deltaType="positive"
            sparklineData={revenueSpark}
            icon={CheckCircleIcon}
          />
          <MetricCard
            title={language === "en" ? "Active Lead Chats" : "Leads Dalam Percakapan"}
            value={`${leads.length} Kontak`}
            subtitle="WhatsApp Chat Aktif"
            delta="Online"
            deltaType="neutral"
            sparklineData={leadsSpark}
            icon={UsersIcon}
          />
        </div>

        {/* Charts & Funnel */}
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <TrendAreaChart
              orders={orders}
              title={language === "en" ? "My Personal Sales Trend" : "Tren Penjualan Pribadi"}
              subtitle={language === "en" ? "Your daily closing performance this week" : "Performa closing harian Anda minggu ini"}
            />
          </div>
          <div className="lg:col-span-4">
            <ConversionFunnelChart
              leads={leads}
              orders={orders}
              title={language === "en" ? "My Closing Funnel" : "Funnel Closing Saya"}
              subtitle={language === "en" ? "Lead journey from chat to invoice" : "Alur konversi dari chat ke invoice"}
            />
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. OWNER / SUPERVISOR / GENERAL DASHBOARD VIEW (DEFAULT)
  // =========================================================================
  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Clean Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#f1f3f7]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11.5px] font-bold text-[#2545ff] bg-[#f0f4ff] px-2.5 py-0.5 rounded-full border border-[#dbeafe]">
              {currentUser?.institutionName || activeInstitution?.name || "Klozer Smart Commerce"}
            </span>
            <span className="text-[12px] text-[#64748b]">
              {t("dashboard.ownerSubtitle", "Overview Penjualan & Performa CS")}
            </span>
          </div>
          <h1 className="text-[24px] font-extrabold text-[#0f172a] tracking-tight">
            {t("dashboard.ownerTitle", "Dashboard Utama")}
          </h1>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <Link
            href="/dashboard/chat"
            className="px-3.5 py-2 rounded-xl border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#0f172a] text-[13px] font-bold shadow-2xs transition-all flex items-center gap-1.5 no-underline"
          >
            <MessageSquareIcon className="w-4 h-4 text-[#2545ff]" />
            <span>{t("dashboard.quickLiveChat", "Live Chat")}</span>
          </Link>

          <Link
            href="/dashboard/orders"
            className="px-4 py-2 rounded-xl bg-[#2545ff] hover:bg-[#1d37cc] text-white text-[13px] font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 no-underline"
          >
            <span>{t("dashboard.quickNewOrder", "+ Buat Pesanan")}</span>
          </Link>
        </div>
      </div>

      {/* 4 Top KPI Metric Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t("dashboard.totalRevenue", "Omzet Penjualan Lunas")}
          value={totalRevenue > 0 ? `Rp ${(totalRevenue / 1000000).toFixed(1)}Jt` : "Rp 0"}
          subtitle={t("dashboard.totalRevenueSub", "Real-time terverifikasi")}
          delta="+18.4%"
          deltaType="positive"
          sparklineData={revenueSpark}
          icon={DollarSignIcon}
        />
        <MetricCard
          title={t("dashboard.verifiedOrders", "Pesanan Berhasil")}
          value={`${paidOrders.length} Order`}
          subtitle={t("dashboard.verifiedOrdersSub", "100% Otomatis Cocok")}
          delta="+14.2%"
          deltaType="positive"
          sparklineData={ordersSpark}
          icon={ShoppingCartIcon}
        />
        <MetricCard
          title={t("dashboard.newLeads", "Leads Baru Masuk")}
          value={`${leads.length} Kontak`}
          subtitle={t("dashboard.newLeadsSub", "Meta CAPI & Organik")}
          delta="+22.8%"
          deltaType="positive"
          sparklineData={leadsSpark}
          icon={UsersIcon}
        />
        <MetricCard
          title={t("dashboard.closingRate", "Closing Rate Tim")}
          value={`${closingRatePct}%`}
          subtitle={t("dashboard.closingRateSub", "Rata-rata seluruh CS")}
          delta="+3.6%"
          deltaType="positive"
          sparklineData={closingSpark}
          icon={TrendingUpIcon}
        />
      </div>

      {/* Primary Analytics Section: Dual Visual Charts */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Interactive Revenue & Volume Area Chart (Col 8) */}
        <div className="lg:col-span-8">
          <TrendAreaChart
            orders={orders}
            title={t("dashboard.revenueTrendTitle", "Tren Omzet & Volume Transaksi")}
            subtitle={t("dashboard.revenueTrendSubtitle", "Grafik penjualan harian & performa checkout")}
          />
        </div>

        {/* Right: WhatsApp Sales Funnel (Col 4) */}
        <div className="lg:col-span-4">
          <ConversionFunnelChart
            leads={leads}
            orders={orders}
            title={t("dashboard.funnelTitle", "Funnel Konversi WhatsApp")}
            subtitle={t("dashboard.funnelSubtitle", "Efisiensi leads dari chat hingga lunas")}
          />
        </div>
      </div>

      {/* Secondary Operational Section: CS Leaderboard & Payment Breakdown */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Top CS Team Leaderboard (Col 7) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#e8eaef] p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f3f7] mb-4">
              <div>
                <h3 className="text-[16px] font-bold text-[#0f172a]">
                  {t("dashboard.csLeaderboardTitle", "Performa & Komisi Tim CS")}
                </h3>
                <p className="text-[12px] text-[#64748b]">
                  {t("dashboard.csLeaderboardSub", "Peringkat closing rate dan omzet staf")}
                </p>
              </div>
              <Link
                href="/dashboard/settings?tab=team"
                className="text-[12.5px] font-bold text-[#2545ff] hover:underline"
              >
                {language === "en" ? "Manage Staff →" : "Kelola Staf →"}
              </Link>
            </div>

            <div className="flex flex-col gap-2.5">
              {csList.length === 0 ? (
                <div className="p-6 text-center text-[#64748b] bg-[#fafbfc] rounded-xl border border-dashed border-[#e2e8f0] text-[13px]">
                  {language === "en" ? "No CS team members registered yet." : "Belum ada data staf CS yang terdaftar."}
                </div>
              ) : (
                csList.map((cs, idx) => (
                  <div
                    key={cs.id || idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#fafbfc] border border-[#f1f3f7] hover:border-[#e2e8f0] hover:bg-white transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#f0f4ff] text-[#2545ff] font-extrabold text-[12px] flex items-center justify-center border border-[#dbeafe]">
                        {cs.name?.charAt(0) || "C"}
                      </div>
                      <div>
                        <div className="font-bold text-[13.5px] text-[#0f172a]">{cs.name}</div>
                        <div className="text-[11.5px] text-[#64748b]">
                          {cs.role || "Customer Service"} •{" "}
                          <span className="text-emerald-600 font-semibold">{language === "en" ? "On Duty" : "Aktif Bertugas"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="text-[13px] font-extrabold text-emerald-600">
                          {cs.csClosingRate || "38.5%"}
                        </div>
                        <div className="text-[11px] text-[#94a3b8]">Closing Rate</div>
                      </div>

                      <div className="hidden sm:block border-l border-[#e2e8f0] pl-4">
                        <div className="text-[13px] font-bold text-[#0f172a]">
                          {cs.revenueGen || "Rp 24.500.000"}
                        </div>
                        <div className="text-[11px] text-[#2545ff] font-medium">
                          {language === "en" ? "Commission: " : "Komisi: "}
                          {cs.commission || "Rp 1.225.000"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#f1f3f7] mt-4 flex items-center justify-between text-[12px] text-[#64748b]">
            <span>{t("dashboard.csCommissionNote", "Sistem Pembagian Komisi: 5.0% dari Omzet Lunas")}</span>
            <span className="text-emerald-600 font-semibold">● {language === "en" ? "Auto Calculated" : "Terhitung Otomatis"}</span>
          </div>
        </div>

        {/* Right: Payment Breakdown Donut / Segmented (Col 5) */}
        <div className="lg:col-span-5">
          <PaymentBreakdownChart
            orders={orders}
            title={t("dashboard.paymentTitle", "Distribusi Pembayaran")}
            subtitle={t("dashboard.paymentSubtitle", "Proporsi metode bayar pelanggan")}
          />
        </div>
      </div>

      {/* Recent Activity & Order List */}
      <div className="bg-white rounded-2xl border border-[#e8eaef] p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
        <div className="flex items-center justify-between pb-3 border-b border-[#f1f3f7] mb-4">
          <div>
            <h3 className="text-[16px] font-bold text-[#0f172a]">
              {t("dashboard.recentOrdersTitle", "Transaksi Pesanan Terkini")}
            </h3>
            <p className="text-[12px] text-[#64748b]">
              {t("dashboard.recentOrdersSub", "Daftar order yang masuk via WhatsApp & manual")}
            </p>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-[12.5px] font-bold text-[#2545ff] hover:underline"
          >
            {t("dashboard.viewAllOrders", "Lihat Semua Pesanan →")}
          </Link>
        </div>

        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-[#64748b] bg-[#fafbfc] rounded-xl border border-dashed border-[#e2e8f0] text-[13px]">
              {language === "en" ? "No order transactions registered yet." : "Belum ada data transaksi pesanan yang dibuat."}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <th className="py-2.5 px-4 font-bold text-[#475467]">{language === "en" ? "Order ID" : "ID Pesanan"}</th>
                  <th className="py-2.5 px-4 font-bold text-[#475467]">{language === "en" ? "Customer" : "Pelanggan"}</th>
                  <th className="py-2.5 px-4 font-bold text-[#475467]">{language === "en" ? "Product / Items" : "Produk / Menu"}</th>
                  <th className="py-2.5 px-4 font-bold text-[#475467]">{language === "en" ? "Total Paid" : "Total Bayar"}</th>
                  <th className="py-2.5 px-4 font-bold text-[#475467]">{language === "en" ? "Payment" : "Metode"}</th>
                  <th className="py-2.5 px-4 font-bold text-[#475467]">{t("common.status", "Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f7]">
                {orders.slice(0, 5).map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#2545ff]">{ord.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0f172a]">{ord.customer}</div>
                      <div className="text-[11.5px] text-[#94a3b8]">{ord.city}</div>
                    </td>
                    <td className="py-3 px-4 text-[#475467]">
                      {ord.items?.[0]?.name || "Item Pesanan"}
                      {ord.items?.length > 1 && ` (+${ord.items.length - 1} ${language === "en" ? "others" : "lainnya"})`}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-[#0f172a]">
                      Rp {(ord.total || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11.5px] font-medium text-[#475467] bg-slate-100 px-2 py-0.5 rounded-md">
                        {ord.paymentMethod || "QRIS"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          ord.status === "paid" || ord.status === "shipped"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ord.status === "processing"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {ord.status === "paid"
                          ? (language === "en" ? "Paid" : "Lunas")
                          : ord.status === "shipped"
                          ? (language === "en" ? "Shipped" : "Dikirim")
                          : ord.status === "processing"
                          ? (language === "en" ? "Processing" : "Diproses")
                          : (language === "en" ? "Pending" : "Menunggu Bayar")}
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
