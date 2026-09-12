"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Logo from "@/components/common/Logo";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import {
  CrownIcon,
  BriefcaseIcon,
  ClipboardListIcon,
  HeadphonesIcon,
  SlidersIcon,
  BuildingIcon,
  BotIcon,
  LayersIcon,
  UsersIcon,
  MessageSquareIcon,
  SparklesIcon,
  ZapIcon,
  RadioIcon,
  DownloadIcon,
  ActivityIcon,
  SettingsIcon,
  UserIcon,
  ClipboardCheckIcon,
  ChevronRightIcon,
  DollarSignIcon,
  CpuIcon,
  CalendarIcon,
  BarChartIcon,
  ChevronDownIcon,
  DatabaseIcon,
  TrendingUpIcon,
  InstagramIcon,
  TagIcon,
  BookOpenIcon,
  PrinterIcon,
  FileTextIcon,
  PackageIcon,
  HelpCircleIcon,
  ExternalLinkIcon,
  BanIcon,
  ShoppingCartIcon,
  WarehouseIcon,
  AlertTriangleIcon,
  CreditCardIcon,
  ShieldCheckIcon,
} from "@/components/icons";

function DashboardContent({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [mounted, setMounted] = useState(false);

  const { role, setRole, activeInstitution, institutions, setActiveInstitutionId, currentUser, logoutUser } = useDashboard();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Precise Active Navigation Detector (fixes multi-active button highlight bug)
  const isItemActive = (itemHref) => {
    if (itemHref.includes("?")) {
      const [targetPath, targetQuery] = itemHref.split("?");
      if (pathname !== targetPath) return false;

      const targetParams = new URLSearchParams(targetQuery);
      const targetTab = targetParams.get("tab");
      const currentTab = searchParams.get("tab");

      if (targetTab) {
        if (currentTab) return currentTab === targetTab;
        // Default tab fallback if user navigates to base /dashboard/settings without ?tab
        if (role === "superadmin") return targetTab === "ai-admin";
        if (role === "spv") return targetTab === "ai-spv";
        if (role === "owner") return targetTab === "team";
        return targetTab === "profile";
      }
      return true;
    }

    // Direct match for non-query routes
    return pathname === itemHref && !searchParams.get("tab");
  };

  // Role metadata with exact SVG Icons (Zero raw emojis)
  const rolesConfig = {
    superadmin: {
      label: "Super Admin",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      avatar: "SA",
      icon: <CrownIcon className="w-4 h-4 text-purple-700" />,
      // Pinned top-level items (no group)
      pinnedItems: [
        {
          label: "Overview Platform",
          href: "/dashboard",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          ),
        },
        {
          label: "Akun Superadmin",
          href: "/dashboard/settings?tab=account",
          icon: <UserIcon className="w-4.5 h-4.5" />,
        },
      ],
      // Grouped dropdown sections
      navSections: [
        {
          sectionLabel: "Master Data",
          sectionIcon: <DatabaseIcon className="w-4 h-4" />,
          items: [
            {
              label: "Instansi",
              href: "/dashboard/institutions",
              icon: <BuildingIcon className="w-4.5 h-4.5" />,
              badge: `${institutions.length}`,
            },
          ],
        },
        {
          sectionLabel: "Operasional",
          sectionIcon: <ClipboardListIcon className="w-4 h-4" />,
          items: [
            {
              label: "Leads Global",
              href: "/dashboard/superadmin/leads",
              icon: <UsersIcon className="w-4.5 h-4.5" />,
            },
            {
              label: "Blasting WA",
              href: "/dashboard/superadmin/blasting",
              icon: <RadioIcon className="w-4.5 h-4.5" />,
            },
            {
              label: "Langganan CS",
              href: "/dashboard/superadmin/subscriptions",
              icon: <CalendarIcon className="w-4.5 h-4.5" />,
            },
          ],
        },
        {
          sectionLabel: "Keuangan",
          sectionIcon: <DollarSignIcon className="w-4 h-4" />,
          items: [
            {
              label: "Transaksi",
              href: "/dashboard/superadmin/transactions",
              icon: <DollarSignIcon className="w-4.5 h-4.5" />,
            },
            {
              label: "Export Data",
              href: "/dashboard/superadmin/exports",
              icon: <DownloadIcon className="w-4.5 h-4.5" />,
            },
          ],
        },
        {
          sectionLabel: "Monitoring",
          sectionIcon: <ActivityIcon className="w-4 h-4" />,
          items: [
            {
              label: "Token AI",
              href: "/dashboard/superadmin/token-usage",
              icon: <CpuIcon className="w-4.5 h-4.5" />,
            },
            {
              label: "Server Usage",
              href: "/dashboard/superadmin/server-metrics",
              icon: <ActivityIcon className="w-4.5 h-4.5" />,
            },
          ],
        },
        {
          sectionLabel: "Pengaturan",
          sectionIcon: <SettingsIcon className="w-4 h-4" />,
          items: [
            {
              label: "Konfigurasi AI",
              href: "/dashboard/settings?tab=ai-admin",
              icon: <BotIcon className="w-4.5 h-4.5" />,
            },
            {
              label: "Pengaturan Global",
              href: "/dashboard/superadmin/settings",
              icon: <SettingsIcon className="w-4.5 h-4.5" />,
            },
            {
              label: "Test CS AI",
              href: "/test-cs-ai",
              icon: <ZapIcon className="w-4.5 h-4.5" />,
              badge: "NVIDIA",
            },
            {
              label: "Skenario AI",
              href: "/dashboard/superadmin/ai-scenarios",
              icon: <ClipboardCheckIcon className="w-4.5 h-4.5" />,
            },
          ],
        },
      ],
      navItems: [], // empty — superadmin uses pinnedItems + navSections instead
    },
    owner: {
      label: "Owner / Supervisor",
      badgeColor: "bg-blue-100 text-[#2545ff] border-blue-200",
      avatar: "OW",
      icon: <BriefcaseIcon className="w-4 h-4 text-[#2545ff]" />,
      pinnedItems: [
        { label: "Dashboard Toko", href: "/dashboard", icon: <BarChartIcon className="w-4.5 h-4.5" /> },
        { label: "Inbox WA & Closing", href: "/dashboard/chat", icon: <MessageSquareIcon className="w-4.5 h-4.5" />, badge: "Live" },
        { label: "Katalog & HPP Produk", href: "/dashboard/products", icon: <LayersIcon className="w-4.5 h-4.5" /> },
        { label: "Dynamic QRIS & Kas", href: "/dashboard/finance", icon: <DollarSignIcon className="w-4.5 h-4.5" /> },
        { label: "Pesanan & Tiket Dapur", href: "/dashboard/orders", icon: <ShoppingCartIcon className="w-4.5 h-4.5" /> },
      ],
      navSections: [
        {
          sectionLabel: "Operasional Toko & CRM",
          sectionIcon: <DatabaseIcon className="w-4 h-4" />,
          items: [
            { label: "Pelanggan & CRM", href: "/dashboard/contacts", icon: <UsersIcon className="w-4.5 h-4.5" /> },
            { label: "Resep HPP & BOM", href: "/dashboard/bom", icon: <FileTextIcon className="w-4.5 h-4.5" /> },
            { label: "Stok Inventaris", href: "/dashboard/stock", icon: <PackageIcon className="w-4.5 h-4.5" /> },
            { label: "Rekening Bank & QRIS", href: "/dashboard/bank-accounts", icon: <BuildingIcon className="w-4.5 h-4.5" /> },
            { label: "Laporan Omzet & CS", href: "/dashboard/reports", icon: <TrendingUpIcon className="w-4.5 h-4.5" /> },
            { label: "Persona AI & Script", href: "/dashboard/persona-ai", icon: <SparklesIcon className="w-4.5 h-4.5" /> },
            { label: "Test CS AI", href: "/test-cs-ai", icon: <BotIcon className="w-4.5 h-4.5" />, badge: "Simulator" },
            { label: "Hak Akses & Tim", href: "/dashboard/settings?tab=team", icon: <ShieldCheckIcon className="w-4.5 h-4.5" /> },
            { label: "Langganan & Paket Toko", href: "/dashboard/subscription", icon: <CrownIcon className="w-4.5 h-4.5 text-[#2545ff]" />, badge: "Aktif" },
          ],
        },
        {
          sectionLabel: "Aplikasi Lanjutan",
          sectionIcon: <SlidersIcon className="w-4 h-4" />,
          items: [
            { label: "Booking & Reservasi", href: "/dashboard/bookings", icon: <CalendarIcon className="w-4.5 h-4.5" /> },
            { label: "Smart Broadcast", href: "/dashboard/blasting", icon: <RadioIcon className="w-4.5 h-4.5" /> },
            { label: "Eskalasi & Co-Pilot", href: "/dashboard/escalation", icon: <AlertTriangleIcon className="w-4.5 h-4.5" />, badge: "3" },
            { label: "Instagram Omnichannel", href: "/dashboard/instagram", icon: <InstagramIcon className="w-4.5 h-4.5" /> },
            { label: "Gudang & Hub Pengiriman", href: "/dashboard/warehouses", icon: <WarehouseIcon className="w-4.5 h-4.5" /> },
            { label: "Cetak Resi Massal", href: "/dashboard/finance/invoices", icon: <PrinterIcon className="w-4.5 h-4.5" /> },
            { label: "AI Auto-Label & NLP", href: "/dashboard/labels", icon: <TagIcon className="w-4.5 h-4.5" /> },
            { label: "Internal Chat Tim", href: "/dashboard/internal-chat", icon: <UsersIcon className="w-4.5 h-4.5" /> },
            { label: "Blacklist & Anti-Spam", href: "/dashboard/blocked-contacts", icon: <BanIcon className="w-4.5 h-4.5" /> },
            { label: "Audit Log Aktivitas", href: "/dashboard/audit-log", icon: <ClipboardCheckIcon className="w-4.5 h-4.5" /> },
          ],
        },
      ],
      navItems: [],
    },
    spv: {
      label: "Supervisor (SPV)",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      avatar: "SP",
      icon: <ClipboardListIcon className="w-4 h-4 text-amber-700" />,
      pinnedItems: [
        { label: "Dashboard Toko", href: "/dashboard", icon: <BarChartIcon className="w-4.5 h-4.5" /> },
        { label: "Inbox WA & Closing", href: "/dashboard/chat", icon: <MessageSquareIcon className="w-4.5 h-4.5" />, badge: "Live" },
        { label: "Katalog & HPP Produk", href: "/dashboard/products", icon: <LayersIcon className="w-4.5 h-4.5" /> },
        { label: "Dynamic QRIS & Kas", href: "/dashboard/finance", icon: <DollarSignIcon className="w-4.5 h-4.5" /> },
        { label: "Pesanan & Tiket Dapur", href: "/dashboard/orders", icon: <ShoppingCartIcon className="w-4.5 h-4.5" /> },
      ],
      navSections: [
        {
          sectionLabel: "Operasional Toko & CRM",
          sectionIcon: <DatabaseIcon className="w-4 h-4" />,
          items: [
            { label: "Pelanggan & CRM", href: "/dashboard/contacts", icon: <UsersIcon className="w-4.5 h-4.5" /> },
            { label: "Resep HPP & BOM", href: "/dashboard/bom", icon: <FileTextIcon className="w-4.5 h-4.5" /> },
            { label: "Stok Inventaris", href: "/dashboard/stock", icon: <PackageIcon className="w-4.5 h-4.5" /> },
            { label: "Rekening Bank & QRIS", href: "/dashboard/bank-accounts", icon: <BuildingIcon className="w-4.5 h-4.5" /> },
            { label: "Laporan Omzet & CS", href: "/dashboard/reports", icon: <TrendingUpIcon className="w-4.5 h-4.5" /> },
            { label: "Persona AI & Script", href: "/dashboard/persona-ai", icon: <SparklesIcon className="w-4.5 h-4.5" /> },
            { label: "Test CS AI", href: "/test-cs-ai", icon: <BotIcon className="w-4.5 h-4.5" />, badge: "Simulator" },
            { label: "Hak Akses & Tim", href: "/dashboard/settings?tab=team", icon: <ShieldCheckIcon className="w-4.5 h-4.5" /> },
            { label: "Langganan & Paket Toko", href: "/dashboard/subscription", icon: <CrownIcon className="w-4.5 h-4.5 text-amber-600" />, badge: "Perpanjang" },
          ],
        },
        {
          sectionLabel: "Aplikasi Lanjutan",
          sectionIcon: <SlidersIcon className="w-4 h-4" />,
          items: [
            { label: "Booking & Reservasi", href: "/dashboard/bookings", icon: <CalendarIcon className="w-4.5 h-4.5" /> },
            { label: "Smart Broadcast", href: "/dashboard/blasting", icon: <RadioIcon className="w-4.5 h-4.5" /> },
            { label: "Eskalasi & Co-Pilot", href: "/dashboard/escalation", icon: <AlertTriangleIcon className="w-4.5 h-4.5" />, badge: "3" },
            { label: "Instagram Omnichannel", href: "/dashboard/instagram", icon: <InstagramIcon className="w-4.5 h-4.5" /> },
            { label: "Gudang & Hub Pengiriman", href: "/dashboard/warehouses", icon: <WarehouseIcon className="w-4.5 h-4.5" /> },
            { label: "Cetak Resi Massal", href: "/dashboard/finance/invoices", icon: <PrinterIcon className="w-4.5 h-4.5" /> },
            { label: "AI Auto-Label & NLP", href: "/dashboard/labels", icon: <TagIcon className="w-4.5 h-4.5" /> },
            { label: "Internal Chat Tim", href: "/dashboard/internal-chat", icon: <UsersIcon className="w-4.5 h-4.5" /> },
            { label: "Blacklist & Anti-Spam", href: "/dashboard/blocked-contacts", icon: <BanIcon className="w-4.5 h-4.5" /> },
            { label: "Audit Log Aktivitas", href: "/dashboard/audit-log", icon: <ClipboardCheckIcon className="w-4.5 h-4.5" /> },
          ],
        },
      ],
      navItems: [],
    },
    cs: {
      label: "Customer Service (CS)",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      avatar: "SA",
      icon: <HeadphonesIcon className="w-4 h-4 text-emerald-700" />,
      pinnedItems: [
        {
          label: "Dashboard Pribadi CS",
          href: "/dashboard",
          icon: <BarChartIcon className="w-4.5 h-4.5" />,
        },
      ],
      navSections: [
        {
          sectionLabel: "Operasional",
          sectionIcon: <MessageSquareIcon className="w-4 h-4" />,
          items: [
            { label: "Live Chat WhatsApp", href: "/dashboard/chat", icon: <MessageSquareIcon className="w-4.5 h-4.5" />, badge: "Live" },
            { label: "Smart Broadcast", href: "/dashboard/blasting", icon: <RadioIcon className="w-4.5 h-4.5" /> },
            { label: "Quick Reply & Template", href: "/dashboard/templates", icon: <FileTextIcon className="w-4.5 h-4.5" /> },
            { label: "Kredit & Kuota Pesan", href: "/dashboard/credits", icon: <CreditCardIcon className="w-4.5 h-4.5" /> },
            { label: "Antrean Eskalasi", href: "/dashboard/escalation", icon: <AlertTriangleIcon className="w-4.5 h-4.5" />, badge: "3" },
            { label: "Blacklist Nomor", href: "/dashboard/blocked-contacts", icon: <BanIcon className="w-4.5 h-4.5" /> },
            { label: "Booking Reservasi", href: "/dashboard/bookings", icon: <CalendarIcon className="w-4.5 h-4.5" /> },
            { label: "Pesanan & Transaksi", href: "/dashboard/orders", icon: <ShoppingCartIcon className="w-4.5 h-4.5" /> },
            { label: "Internal Chat Tim", href: "/dashboard/internal-chat", icon: <UsersIcon className="w-4.5 h-4.5" /> },
          ],
        },
        {
          sectionLabel: "Master Data",
          sectionIcon: <DatabaseIcon className="w-4 h-4" />,
          items: [
            { label: "Buku Kontak Pelanggan", href: "/dashboard/contacts", icon: <UsersIcon className="w-4.5 h-4.5" /> },
            { label: "Katalog Cepat Produk", href: "/dashboard/products", icon: <LayersIcon className="w-4.5 h-4.5" /> },
            { label: "Manajemen Label", href: "/dashboard/labels", icon: <TagIcon className="w-4.5 h-4.5" /> },
            { label: "Jadwal Roster PIC", href: "/dashboard/pic-roster", icon: <CalendarIcon className="w-4.5 h-4.5" /> },
          ],
        },
        {
          sectionLabel: "Laporan",
          sectionIcon: <TrendingUpIcon className="w-4 h-4" />,
          items: [
            { label: "Performa & Komisi Saya", href: "/dashboard/reports", icon: <TrendingUpIcon className="w-4.5 h-4.5" /> },
          ],
        },
        {
          sectionLabel: "Pengaturan",
          sectionIcon: <SettingsIcon className="w-4 h-4" />,
          items: [
            { label: "Simulator Latihan AI", href: "/test-cs-ai", icon: <ZapIcon className="w-4.5 h-4.5" />, badge: "Sandbox" },
            { label: "Buku Panduan CS", href: "/dashboard/documentation", icon: <HelpCircleIcon className="w-4.5 h-4.5" /> },
          ],
        },
      ],
      navItems: [],
    },
  };

  const currentRoleConfig = rolesConfig[role] || rolesConfig.owner;

  if (!mounted) {
    return (
      <div className="flex h-screen bg-[#f9f8f6] items-center justify-center">
        <div className="flex items-center gap-2.5 text-[#64748b] font-bold text-[13px]">
          <span className="w-4 h-4 rounded-full border-2 border-[#2545ff] border-t-transparent animate-spin" />
          <span>Memuat Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-root flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--dash-bg)' }}>
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-50 top-0 left-0 h-full w-[290px] bg-white border-r border-[#f0e9e1] flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header with Exact klozer • Logo & Brand Icon */}
        <div className="flex items-center justify-between px-6 h-[72px] border-b border-[#f0e9e1] flex-shrink-0">
          <Logo size="md" variant="dark" href="/dashboard" withIcon={true} />
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${currentRoleConfig.badgeColor}`}>
            {currentRoleConfig.icon}
            <span>{role.toUpperCase()}</span>
          </span>
        </div>

        {/* Store Indicator for Merchant Tenants (Owner, SPV, CS) */}
        {role !== "superadmin" && (
          <div className="px-5 py-3 border-b border-[#f0e9e1] bg-[#fcfbf9] flex items-center justify-between">
            <div className="truncate">
              <div className="text-[12.5px] font-black text-[#0c1754] truncate">
                {currentUser?.institutionName || activeInstitution?.name || "Instansi Aktif"}
              </div>
              <div className="text-[10px] text-[#64748b] truncate font-medium">
                {currentUser?.sector || activeInstitution?.sector || "Bisnis Terverifikasi"}
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Online" />
          </div>
        )}

        {/* Navigation items based on active Role */}
        <nav className="flex-1 px-4 py-5 flex flex-col gap-0.5 overflow-y-auto">
          <div className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-[#969696] mb-1">
            Menu {currentRoleConfig.label}
          </div>

          {/* Roles with Pinned items + Collapsible Dropdown Sections (Superadmin & Supervisor/Owner) */}
          {currentRoleConfig.pinnedItems && currentRoleConfig.navSections ? (
            <>
              {/* Pinned top-level items */}
              {currentRoleConfig.pinnedItems.map((item) => {
                const isActive = isItemActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13.5px] font-bold transition-all no-underline ${
                      isActive
                        ? "bg-[#2545ff] text-white shadow-[0_4px_14px_rgba(37,69,255,0.3)]"
                        : "text-[#5a6380] hover:text-[#0c1754] hover:bg-[#f5f4f2]"
                    }`}
                  >
                    <span className={isActive ? "text-white" : "text-[#8f95a8]"}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}

              {/* Separator line */}
              <div className="mx-3 my-2 border-t border-[#ede8e2]" />

              {/* Collapsible Dropdown Sections */}
              {currentRoleConfig.navSections.map((section) => {
                const sectionKey = section.sectionLabel;
                const hasActiveChild = section.items.some((item) => isItemActive(item.href));
                const isOpen = openSections[sectionKey] !== undefined ? openSections[sectionKey] : hasActiveChild;

                return (
                  <div key={sectionKey} className="mb-0.5">
                    {/* Section Toggle Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSections((prev) => ({
                          ...prev,
                          [sectionKey]: !prev[sectionKey],
                        }))
                      }
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[12.5px] font-bold uppercase tracking-wide transition-all cursor-pointer border-none ${
                        hasActiveChild
                          ? "text-[#2545ff] bg-[#edeffe]"
                          : "text-[#8f95a8] hover:text-[#5a6380] hover:bg-[#f5f4f2]"
                      }`}
                    >
                      <span className={hasActiveChild ? "text-[#2545ff]" : "text-[#b0b5c5]"}>
                        {section.sectionIcon}
                      </span>
                      <span className="flex-1 text-left">{section.sectionLabel}</span>
                      <ChevronDownIcon
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isOpen ? "rotate-0" : "-rotate-90"
                        }`}
                      />
                    </button>

                    {/* Collapsible Children */}
                    <div
                      className="overflow-hidden transition-all duration-200 ease-in-out"
                      style={{
                        maxHeight: isOpen ? `${section.items.length * 48}px` : "0px",
                        opacity: isOpen ? 1 : 0,
                      }}
                    >
                      <div className="pl-3 pt-0.5 flex flex-col gap-0.5">
                        {section.items.map((item) => {
                          const isActive = isItemActive(item.href);
                          return (
                            <Link
                              key={item.label}
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all no-underline ${
                                isActive
                                  ? "bg-[#2545ff] text-white shadow-[0_4px_12px_rgba(37,69,255,0.25)]"
                                  : "text-[#5a6380] hover:text-[#0c1754] hover:bg-[#f5f4f2]"
                              }`}
                            >
                              <span className={isActive ? "text-white" : "text-[#8f95a8]"}>
                                {item.icon}
                              </span>
                              <span className="flex-1">{item.label}</span>
                              {item.badge && (
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                  isActive ? "bg-white/20 text-white" : "bg-[#2545ff] text-white"
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            /* Other roles: flat list rendering */
            currentRoleConfig.navItems.map((item) => {
              const isActive = isItemActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13.5px] font-bold transition-all no-underline ${
                    isActive
                      ? "bg-[#2545ff] text-white shadow-[0_4px_14px_rgba(37,69,255,0.3)]"
                      : "text-[#64748b] hover:text-[#0c1754] hover:bg-[#f5f4f2]"
                  }`}
                >
                  <span className={isActive ? "text-white" : "text-[#969696]"}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isActive ? "bg-white/20 text-white" : "bg-[#2545ff] text-white"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </nav>

        {/* Bottom Profile Widget */}
        <div className="p-4 border-t border-[#f0e9e1] flex-shrink-0 bg-[#f9f8f6]/60">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-[#f0e9e1]">
            <div className="w-9 h-9 rounded-full bg-[#2545ff] flex items-center justify-center text-white font-bold text-[13px]">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : currentRoleConfig.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-[#0c1754] truncate">
                {currentUser?.name || (role === "superadmin" ? "Platform Admin" : role === "owner" ? "Owner" : "Staf CS")}
              </div>
              <div className="text-[11px] text-[#969696] truncate">{currentRoleConfig.label}</div>
            </div>
            <Link href="/" title="Ke Landing Page" className="text-[#969696] hover:text-[#2545ff] p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-[72px] bg-white border-b border-[#f0e9e1] flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-[#f9f8f6] text-[#0c1754] border-none cursor-pointer"
              aria-label="Buka menu navigasi"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            {/* Live Search bar */}
            <div className="hidden md:flex items-center gap-2.5 bg-[#f9f8f6] border border-[#f0e9e1] rounded-full px-4 py-1.5 w-[280px] lg:w-[320px] focus-within:border-[#2545ff] focus-within:bg-white transition-all">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#969696" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Cari order ID, nomor WA, lead..."
                className="bg-transparent border-none outline-none text-[12.5px] text-[#0c1754] placeholder:text-[#969696] flex-1 font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Authenticated User Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#f9f8f6] hover:bg-[#eaebf8] border border-[#f0e9e1] cursor-pointer transition-all text-[12.5px] font-bold text-[#0c1754]"
                title="Menu Profil Pengguna"
              >
                <div className="w-6 h-6 rounded-full bg-[#2545ff] text-white flex items-center justify-center text-[10.5px] font-extrabold">
                  {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : currentRoleConfig.avatar}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="leading-tight text-[12px] text-[#1e2640] font-extrabold">
                    {currentUser?.name || currentRoleConfig.name}
                  </div>
                  <div className="text-[10px] text-[#64748b] font-medium leading-none">
                    {currentRoleConfig.label}
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl p-2.5 shadow-2xl border border-[#ede8e2] z-50 animate-scale-pop">
                  <div className="p-3 bg-[#fcfbf9] rounded-xl border border-[#ede8e2] mb-2">
                    <div className="font-extrabold text-[13px] text-[#1e2640] truncate">
                      {currentUser?.name || currentRoleConfig.name}
                    </div>
                    <div className="text-[11.5px] text-[#64748b] font-mono truncate">
                      {currentUser?.email || (role === "superadmin" ? "superadmin@klozer.id" : "spv@klozer.id")}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2 py-0.5 rounded-md bg-[#edeffe] text-[#2545ff]">
                      {currentRoleConfig.icon}
                      <span>{currentRoleConfig.label}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-[12.5px] font-semibold text-[#1e2640]">
                    <Link
                      href="/dashboard/institution"
                      onClick={() => setRoleDropdownOpen(false)}
                      className="p-2 rounded-xl hover:bg-[#f5f4f2] transition-colors flex items-center justify-between"
                    >
                      <span>Profil Instansi</span>
                      <span className="text-[11px] text-[#8f95a8]">→</span>
                    </Link>

                    <Link
                      href="/dashboard/documentation"
                      onClick={() => setRoleDropdownOpen(false)}
                      className="p-2 rounded-xl hover:bg-[#f5f4f2] transition-colors flex items-center justify-between"
                    >
                      <span>Buku Panduan</span>
                      <span className="text-[11px] text-[#8f95a8]">→</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        logoutUser();
                      }}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors font-bold text-left border-none cursor-pointer flex items-center justify-between mt-1 pt-2 border-t border-[#ede8e2]"
                    >
                      <span>Keluar (Logout)</span>
                      <svg className="w-4 h-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* WA Cloud API Status */}
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-700">WA Cloud API Connected</span>
            </div>

            {/* Notification Button */}
            <button className="relative p-2 rounded-full hover:bg-[#f9f8f6] border border-[#f0e9e1] bg-white cursor-pointer transition-colors">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0c1754" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Viewport */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-7 md:p-10" style={{ backgroundColor: 'var(--dash-bg)' }}>
          <div className="max-w-[1240px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <DashboardProvider>
      <Suspense fallback={<div className="p-8 text-center text-[#64748b]">Memuat Dashboard...</div>}>
        <DashboardContent>{children}</DashboardContent>
      </Suspense>
    </DashboardProvider>
  );
}
