"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/common/Logo";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { featureForPath, FEATURE_LIST } from "@/utils/plans";
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

// Modules whose screens are interface previews: they work on sample data held in the page and are
// not saved to the server yet. A thin notice keeps that visible during client demos.
const PREVIEW_ROUTES = [
  "templates", "labels", "label-stats", "blasting", "credits", "blocked-contacts", "internal-chat", "instagram", "escalation",
  "bookings", "pic-roster", "warehouses", "etalase", "doa-knowledge",
  "superadmin/ai-scenarios", "superadmin/blasting", "superadmin/exports", "superadmin/leads", "superadmin/transactions",
].map((p) => `/dashboard/${p}`);

function DashboardContent({ children }) {
  const pathname = usePathname();
  const isPreview = PREVIEW_ROUTES.includes(pathname);
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [openSections, setOpenSections] = useState({});

  const router = useRouter();
  const {
    status,
    isBooting,
    role,
    activeInstitution,
    currentUser,
    logoutUser,
    language,
    setLanguage,
    t,
    notice,
    dismissNotice,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    whatsappStatus,
  } = useDashboard();

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const markAllNotifsRead = markAllNotificationsRead;

  // The server decides what each user may do; this only keeps the UI from showing pages that would just 403.
  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "ready" && role !== "superadmin" && pathname.startsWith("/dashboard/superadmin")) {
      router.replace("/dashboard");
    }
  }, [status, role, pathname, router]);

  // Notices disappear on their own so they never pile up over the page.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(dismissNotice, notice.type === "error" ? 9000 : 4500);
    return () => clearTimeout(timer);
  }, [notice, dismissNotice]);

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

  // Role metadata with exact SVG Icons (Zero raw emojis) and dynamic i18n
  const rolesConfig = {
    superadmin: {
      label: "Super Admin",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      avatar: "SA",
      icon: <CrownIcon className="w-4 h-4 text-purple-700" />,
      pinnedItems: [
        {
          label: t("nav.overview", "Overview Platform"),
          href: "/dashboard",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          ),
        },
        {
          label: t("nav.settings", "Akun Superadmin"),
          href: "/dashboard/settings?tab=account",
          icon: <UserIcon className="w-4.5 h-4.5" />,
        },
      ],
      navSections: [
        {
          sectionLabel: language === "en" ? "Master Data" : "Master Data",
          sectionIcon: <DatabaseIcon className="w-4 h-4" />,
          items: [
            {
              label: t("nav.institutions", "Instansi Tenant"),
              href: "/dashboard/institutions",
              icon: <BuildingIcon className="w-4.5 h-4.5" />,
            },
          ],
        },
        {
          sectionLabel: language === "en" ? "Operations" : "Operasional",
          sectionIcon: <ClipboardListIcon className="w-4 h-4" />,
          items: [
            {
              label: t("nav.leads", "Leads Global"),
              href: "/dashboard/superadmin/leads",
              icon: <UsersIcon className="w-4.5 h-4.5" />,
            },
            {
              label: t("nav.blasting", "Blasting WA"),
              href: "/dashboard/superadmin/blasting",
              icon: <RadioIcon className="w-4.5 h-4.5" />,
            },
            {
              label: t("nav.subscriptions", "Langganan CS"),
              href: "/dashboard/superadmin/subscriptions",
              icon: <CalendarIcon className="w-4.5 h-4.5" />,
            },
          ],
        },
        {
          sectionLabel: language === "en" ? "Finance" : "Keuangan",
          sectionIcon: <DollarSignIcon className="w-4 h-4" />,
          items: [
            {
              label: language === "en" ? "Transactions" : "Transaksi",
              href: "/dashboard/superadmin/transactions",
              icon: <DollarSignIcon className="w-4.5 h-4.5" />,
            },
            {
              label: language === "en" ? "Export Data" : "Export Data",
              href: "/dashboard/superadmin/exports",
              icon: <DownloadIcon className="w-4.5 h-4.5" />,
            },
          ],
        },
        {
          sectionLabel: language === "en" ? "Monitoring" : "Monitoring",
          sectionIcon: <ActivityIcon className="w-4 h-4" />,
          items: [
            {
              label: t("nav.tokenUsage", "Token AI"),
              href: "/dashboard/superadmin/token-usage",
              icon: <CpuIcon className="w-4.5 h-4.5" />,
            },
            {
              label: t("nav.serverMetrics", "Server Usage"),
              href: "/dashboard/superadmin/server-metrics",
              icon: <ActivityIcon className="w-4.5 h-4.5" />,
            },
          ],
        },
        {
          sectionLabel: language === "en" ? "Settings" : "Pengaturan",
          sectionIcon: <SettingsIcon className="w-4 h-4" />,
          items: [
            {
              label: t("nav.aiConfig", "Konfigurasi AI"),
              href: "/dashboard/settings?tab=ai-admin",
              icon: <BotIcon className="w-4.5 h-4.5" />,
            },
            {
              label: language === "en" ? "Global Settings" : "Pengaturan Global",
              href: "/dashboard/superadmin/settings",
              icon: <SettingsIcon className="w-4.5 h-4.5" />,
            },
            {
              label: language === "en" ? "Test CS AI" : "Test CS AI",
              href: "/dashboard/test-cs-ai",
              icon: <ZapIcon className="w-4.5 h-4.5" />,
            },
            {
              label: language === "en" ? "AI Scenarios" : "Skenario AI",
              href: "/dashboard/superadmin/ai-scenarios",
              icon: <ClipboardCheckIcon className="w-4.5 h-4.5" />,
            },
          ],
        },
      ],
      navItems: [],
    },
    owner: {
      label: "Owner / Supervisor",
      badgeColor: "bg-blue-100 text-brand border-blue-200",
      avatar: "OW",
      icon: <BriefcaseIcon className="w-4 h-4 text-brand" />,
      pinnedItems: [
        { label: t("nav.dashboard", "Dashboard Utama"), href: "/dashboard", icon: <BarChartIcon className="w-4.5 h-4.5" /> },
        { label: t("nav.liveChat", "Live Chat WhatsApp"), href: "/dashboard/chat", icon: <MessageSquareIcon className="w-4.5 h-4.5" /> },
        { label: t("nav.products", "Katalog & HPP"), href: "/dashboard/products", icon: <LayersIcon className="w-4.5 h-4.5" /> },
        { label: t("nav.finance", "Dynamic QRIS"), href: "/dashboard/finance", icon: <DollarSignIcon className="w-4.5 h-4.5" /> },
        { label: t("nav.orders", "Pesanan & Order"), href: "/dashboard/orders", icon: <ShoppingCartIcon className="w-4.5 h-4.5" /> },
      ],
      navSections: [
        {
          sectionLabel: language === "en" ? "Store Operations & CRM" : "Operasional Toko & CRM",
          sectionIcon: <DatabaseIcon className="w-4 h-4" />,
          items: [
            { label: language === "en" ? "Customers & CRM" : "Pelanggan & CRM", href: "/dashboard/contacts", icon: <UsersIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "BOM & Recipes" : "Resep HPP & BOM", href: "/dashboard/bom", icon: <FileTextIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Inventory Stock" : "Stok Inventaris", href: "/dashboard/stock", icon: <PackageIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Bank Accounts" : "Rekening Bank & QRIS", href: "/dashboard/bank-accounts", icon: <BuildingIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Revenue Reports" : "Laporan Omzet & CS", href: "/dashboard/reports", icon: <TrendingUpIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "AI Persona" : "Persona AI & Script", href: "/dashboard/persona-ai", icon: <SparklesIcon className="w-4.5 h-4.5" /> },
            { label: "Test CS AI", href: "/dashboard/test-cs-ai", icon: <BotIcon className="w-4.5 h-4.5" /> },
            { label: t("nav.team", "Hak Akses & Tim"), href: "/dashboard/settings?tab=team", icon: <ShieldCheckIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Store Subscription" : "Langganan & Paket Toko", href: "/dashboard/subscription", icon: <CrownIcon className="w-4.5 h-4.5 text-brand" /> },
          ],
        },
        {
          sectionLabel: language === "en" ? "Advanced Apps" : "Aplikasi Lanjutan",
          sectionIcon: <SlidersIcon className="w-4 h-4" />,
          items: [
            { label: language === "en" ? "Booking & Appointments" : "Booking & Reservasi", href: "/dashboard/bookings", icon: <CalendarIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Smart Broadcast" : "Smart Broadcast", href: "/dashboard/blasting", icon: <RadioIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Escalation Queue" : "Eskalasi & Co-Pilot", href: "/dashboard/escalation", icon: <AlertTriangleIcon className="w-4.5 h-4.5" /> },
            { label: "Instagram Omnichannel", href: "/dashboard/instagram", icon: <InstagramIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Warehouse Hubs" : "Gudang & Hub Pengiriman", href: "/dashboard/warehouses", icon: <WarehouseIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Batch Receipts" : "Cetak Resi Massal", href: "/dashboard/finance/invoices", icon: <PrinterIcon className="w-4.5 h-4.5" /> },
            { label: "AI Auto-Label & NLP", href: "/dashboard/labels", icon: <TagIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Team Chat" : "Internal Chat Tim", href: "/dashboard/internal-chat", icon: <UsersIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Blacklist & Anti-Spam" : "Blacklist & Anti-Spam", href: "/dashboard/blocked-contacts", icon: <BanIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Audit Log" : "Audit Log Aktivitas", href: "/dashboard/audit-log", icon: <ClipboardCheckIcon className="w-4.5 h-4.5" /> },
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
        { label: t("nav.dashboard", "Dashboard Toko"), href: "/dashboard", icon: <BarChartIcon className="w-4.5 h-4.5" /> },
        { label: t("nav.liveChat", "Inbox WA & Closing"), href: "/dashboard/chat", icon: <MessageSquareIcon className="w-4.5 h-4.5" /> },
        { label: t("nav.products", "Katalog & HPP"), href: "/dashboard/products", icon: <LayersIcon className="w-4.5 h-4.5" /> },
        { label: t("nav.finance", "Dynamic QRIS & Kas"), href: "/dashboard/finance", icon: <DollarSignIcon className="w-4.5 h-4.5" /> },
        { label: t("nav.orders", "Pesanan & Order"), href: "/dashboard/orders", icon: <ShoppingCartIcon className="w-4.5 h-4.5" /> },
      ],
      navSections: [
        {
          sectionLabel: language === "en" ? "Store Operations & CRM" : "Operasional Toko & CRM",
          sectionIcon: <DatabaseIcon className="w-4 h-4" />,
          items: [
            { label: language === "en" ? "Customers & CRM" : "Pelanggan & CRM", href: "/dashboard/contacts", icon: <UsersIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "BOM & Recipes" : "Resep HPP & BOM", href: "/dashboard/bom", icon: <FileTextIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Inventory Stock" : "Stok Inventaris", href: "/dashboard/stock", icon: <PackageIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Bank Accounts" : "Rekening Bank & QRIS", href: "/dashboard/bank-accounts", icon: <BuildingIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Revenue Reports" : "Laporan Omzet & CS", href: "/dashboard/reports", icon: <TrendingUpIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "AI Persona" : "Persona AI & Script", href: "/dashboard/persona-ai", icon: <SparklesIcon className="w-4.5 h-4.5" /> },
            { label: "Test CS AI", href: "/dashboard/test-cs-ai", icon: <BotIcon className="w-4.5 h-4.5" /> },
            { label: t("nav.team", "Hak Akses & Tim"), href: "/dashboard/settings?tab=team", icon: <ShieldCheckIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Store Subscription" : "Langganan & Paket Toko", href: "/dashboard/subscription", icon: <CrownIcon className="w-4.5 h-4.5 text-amber-600" /> },
          ],
        },
        {
          sectionLabel: language === "en" ? "Advanced Apps" : "Aplikasi Lanjutan",
          sectionIcon: <SlidersIcon className="w-4 h-4" />,
          items: [
            { label: language === "en" ? "Booking & Appointments" : "Booking & Reservasi", href: "/dashboard/bookings", icon: <CalendarIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Smart Broadcast" : "Smart Broadcast", href: "/dashboard/blasting", icon: <RadioIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Escalation Queue" : "Eskalasi & Co-Pilot", href: "/dashboard/escalation", icon: <AlertTriangleIcon className="w-4.5 h-4.5" /> },
            { label: "Instagram Omnichannel", href: "/dashboard/instagram", icon: <InstagramIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Warehouse Hubs" : "Gudang & Hub Pengiriman", href: "/dashboard/warehouses", icon: <WarehouseIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Batch Receipts" : "Cetak Resi Massal", href: "/dashboard/finance/invoices", icon: <PrinterIcon className="w-4.5 h-4.5" /> },
            { label: "AI Auto-Label & NLP", href: "/dashboard/labels", icon: <TagIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Team Chat" : "Internal Chat Tim", href: "/dashboard/internal-chat", icon: <UsersIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Blacklist & Anti-Spam" : "Blacklist & Anti-Spam", href: "/dashboard/blocked-contacts", icon: <BanIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Audit Log" : "Audit Log Aktivitas", href: "/dashboard/audit-log", icon: <ClipboardCheckIcon className="w-4.5 h-4.5" /> },
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
          label: t("nav.dashboard", "Dashboard Pribadi CS"),
          href: "/dashboard",
          icon: <BarChartIcon className="w-4.5 h-4.5" />,
        },
      ],
      navSections: [
        {
          sectionLabel: language === "en" ? "Operations" : "Operasional",
          sectionIcon: <MessageSquareIcon className="w-4 h-4" />,
          items: [
            { label: t("nav.liveChat", "Live Chat WhatsApp"), href: "/dashboard/chat", icon: <MessageSquareIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Smart Broadcast" : "Smart Broadcast", href: "/dashboard/blasting", icon: <RadioIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Quick Replies" : "Quick Reply & Template", href: "/dashboard/templates", icon: <FileTextIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Message Credits" : "Kredit & Kuota Pesan", href: "/dashboard/credits", icon: <CreditCardIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Escalation Queue" : "Antrean Eskalasi", href: "/dashboard/escalation", icon: <AlertTriangleIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Blocked Contacts" : "Blacklist Nomor", href: "/dashboard/blocked-contacts", icon: <BanIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Booking & Appointments" : "Booking Reservasi", href: "/dashboard/bookings", icon: <CalendarIcon className="w-4.5 h-4.5" /> },
            { label: t("nav.orders", "Pesanan & Transaksi"), href: "/dashboard/orders", icon: <ShoppingCartIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Team Chat" : "Internal Chat Tim", href: "/dashboard/internal-chat", icon: <UsersIcon className="w-4.5 h-4.5" /> },
          ],
        },
        {
          sectionLabel: language === "en" ? "Master Data" : "Master Data",
          sectionIcon: <DatabaseIcon className="w-4 h-4" />,
          items: [
            { label: language === "en" ? "Customer Contacts" : "Buku Kontak Pelanggan", href: "/dashboard/contacts", icon: <UsersIcon className="w-4.5 h-4.5" /> },
            { label: t("nav.products", "Katalog Cepat Produk"), href: "/dashboard/products", icon: <LayersIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Label Tags" : "Manajemen Label", href: "/dashboard/labels", icon: <TagIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "PIC Roster Schedule" : "Jadwal Roster PIC", href: "/dashboard/pic-roster", icon: <CalendarIcon className="w-4.5 h-4.5" /> },
          ],
        },
        {
          sectionLabel: language === "en" ? "Reports" : "Laporan",
          sectionIcon: <TrendingUpIcon className="w-4 h-4" />,
          items: [
            { label: language === "en" ? "My Performance & Commission" : "Performa & Komisi Saya", href: "/dashboard/reports", icon: <TrendingUpIcon className="w-4.5 h-4.5" /> },
          ],
        },
        {
          sectionLabel: language === "en" ? "Settings" : "Pengaturan",
          sectionIcon: <SettingsIcon className="w-4 h-4" />,
          items: [
            { label: "Simulator Latihan AI", href: "/dashboard/test-cs-ai", icon: <ZapIcon className="w-4.5 h-4.5" /> },
            { label: t("nav.doc", "Buku Panduan CS"), href: "/dashboard/documentation", icon: <HelpCircleIcon className="w-4.5 h-4.5" /> },
          ],
        },
      ],
      navItems: [],
    },
  };

  // Pages of a feature that the tenant's package does not include stay out of the menu,
  // and the page itself explains why when opened directly. The superadmin is never restricted.
  const modules = activeInstitution?.modules || {};
  const featureOff = (href) => {
    const feature = featureForPath(href);
    return role !== "superadmin" && Boolean(feature) && modules[feature] === false;
  };
  const available = (item) => !featureOff(item.href);
  const lockedFeature = featureOff(pathname) ? FEATURE_LIST.find((f) => f.key === featureForPath(pathname)) : null;
  const baseConfig = rolesConfig[role] || rolesConfig.owner;
  const currentRoleConfig = {
    ...baseConfig,
    pinnedItems: baseConfig.pinnedItems?.filter(available),
    navItems: baseConfig.navItems?.filter(available),
    navSections: baseConfig.navSections
      ?.map((section) => ({ ...section, items: section.items.filter(available) }))
      .filter((section) => section.items.length > 0),
  };

  // "booting" is also what the server renders, so this doubles as the hydration-safe first paint.
  if (isBooting || status !== "ready") {
    return (
      <div className="flex h-screen bg-canvas items-center justify-center">
        <div className="flex items-center gap-2.5 text-fg-muted font-bold text-body-sm">
          <span className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <span>{status === "anonymous" ? "Mengarahkan ke halaman login..." : "Memuat Dashboard..."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-root flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--dash-bg)' }}>
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-50 top-0 left-0 h-full w-[290px] bg-white border-r border-line flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header with Exact klozer • Logo & Brand Icon */}
        <div className="flex items-center justify-between px-6 h-[72px] border-b border-line flex-shrink-0">
          <Logo size="md" variant="dark" href="/" withIcon={true} />
          <span className={`text-micro font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${currentRoleConfig.badgeColor}`}>
            {currentRoleConfig.icon}
            <span>{role.toUpperCase()}</span>
          </span>
        </div>

        {/* Store Indicator for Merchant Tenants (Owner, SPV, CS) */}
        {role !== "superadmin" && (
          <div className="px-5 py-3 border-b border-line bg-soft flex items-center justify-between">
            <div className="truncate">
              <div className="text-label font-bold text-ink truncate">
                {currentUser?.institutionName || activeInstitution?.name || "Instansi Aktif"}
              </div>
              <div className="text-micro text-fg-muted truncate font-medium">
                {currentUser?.sector || activeInstitution?.sector || "Bisnis Terverifikasi"}
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Online" />
          </div>
        )}

        {/* Navigation items based on active Role */}
        <nav className="flex-1 px-4 py-5 flex flex-col gap-0.5 overflow-y-auto">
          <div className="px-3 pb-2 pt-1 text-caption font-bold uppercase tracking-wider text-fg-subtle mb-1">
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
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-body-sm font-bold transition-all no-underline ${
                      isActive
                        ? "bg-brand text-white shadow-[0_4px_14px_rgba(37,69,255,0.3)]"
                        : "text-fg-muted hover:text-ink hover:bg-sunken"
                    }`}
                  >
                    <span className={isActive ? "text-white" : "text-fg-subtle"}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}

              {/* Separator line */}
              <div className="mx-3 my-2 border-t border-line" />

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
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-label font-bold uppercase tracking-wide transition-all cursor-pointer border-none ${
                        hasActiveChild
                          ? "text-brand bg-brand-soft"
                          : "text-fg-subtle hover:text-fg-muted hover:bg-sunken"
                      }`}
                    >
                      <span className={hasActiveChild ? "text-brand" : "text-fg-subtle"}>
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
                              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-body-sm font-semibold transition-all no-underline ${
                                isActive
                                  ? "bg-brand text-white shadow-[0_4px_12px_rgba(37,69,255,0.25)]"
                                  : "text-fg-muted hover:text-ink hover:bg-sunken"
                              }`}
                            >
                              <span className={isActive ? "text-white" : "text-fg-subtle"}>
                                {item.icon}
                              </span>
                              <span className="flex-1">{item.label}</span>
                              {item.badge && (
                                <span className={`text-micro font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                  isActive ? "bg-white/20 text-white" : "bg-brand text-white"
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-body-sm font-bold transition-all no-underline ${
                    isActive
                      ? "bg-brand text-white shadow-[0_4px_14px_rgba(37,69,255,0.3)]"
                      : "text-fg-muted hover:text-ink hover:bg-sunken"
                  }`}
                >
                  <span className={isActive ? "text-white" : "text-fg-subtle"}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className={`text-micro font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isActive ? "bg-white/20 text-white" : "bg-brand text-white"
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
        <div className="p-4 border-t border-line flex-shrink-0 bg-canvas/60">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-line">
            <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white font-bold text-body-sm">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : currentRoleConfig.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-body-sm font-bold text-ink truncate">
                {currentUser?.name || (role === "superadmin" ? "Platform Admin" : role === "owner" ? "Owner" : "Staf CS")}
              </div>
              <div className="text-caption text-fg-subtle truncate">{currentRoleConfig.label}</div>
            </div>
            <Link href="/" title="Ke Landing Page" className="text-fg-subtle hover:text-brand p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-[72px] bg-white border-b border-line flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-canvas text-ink border-none cursor-pointer"
              aria-label="Buka menu navigasi"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            {/* Live Search bar */}
            <div className="hidden lg:flex items-center gap-2.5 bg-canvas border border-line rounded-full px-4 py-1.5 w-[260px] xl:w-[320px] focus-within:border-brand focus-within:bg-white transition-all">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#646b84" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Cari order ID, nomor WA, lead..."
                className="bg-transparent border-none outline-none text-label text-ink placeholder:text-fg-subtle flex-1 font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Authenticated User Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-canvas hover:bg-brand-soft border border-line cursor-pointer transition-all text-label font-bold text-ink"
                title="Menu Profil Pengguna"
              >
                <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-micro font-bold">
                  {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : currentRoleConfig.avatar}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="leading-tight text-label text-fg font-bold">
                    {currentUser?.name || currentRoleConfig.name}
                  </div>
                  <div className="text-micro text-fg-muted font-medium leading-none">
                    {currentRoleConfig.label}
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl p-2.5 shadow-2xl border border-line z-50 animate-scale-pop">
                  <div className="p-3 bg-soft rounded-xl border border-line mb-2">
                    <div className="font-bold text-body-sm text-fg truncate">
                      {currentUser?.name || currentRoleConfig.name}
                    </div>
                    <div className="text-caption text-fg-muted font-mono truncate">
                      {currentUser?.email || (role === "superadmin" ? "superadmin@klozer.id" : "spv@klozer.id")}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 text-micro font-bold px-2 py-0.5 rounded-md bg-brand-soft text-brand">
                      {currentRoleConfig.icon}
                      <span>{currentRoleConfig.label}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-label font-semibold text-fg">
                    <Link
                      href="/dashboard/institution"
                      onClick={() => setRoleDropdownOpen(false)}
                      className="p-2 rounded-xl hover:bg-sunken transition-colors flex items-center justify-between"
                    >
                      <span>Profil Instansi</span>
                      <span className="text-caption text-fg-subtle">→</span>
                    </Link>

                    <Link
                      href="/dashboard/documentation"
                      onClick={() => setRoleDropdownOpen(false)}
                      className="p-2 rounded-xl hover:bg-sunken transition-colors flex items-center justify-between"
                    >
                      <span>Buku Panduan</span>
                      <span className="text-caption text-fg-subtle">→</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        logoutUser();
                      }}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors font-bold text-left border-none cursor-pointer flex items-center justify-between mt-1 pt-2 border-t border-line"
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
            {role !== "superadmin" && (
              <Link
                href="/dashboard/settings?tab=profile"
                className={`hidden xl:flex items-center gap-2 px-3 py-1 rounded-full border no-underline ${
                  whatsappStatus?.configured ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                }`}
                title={whatsappStatus?.configured ? "WhatsApp Cloud API terhubung" : "Hubungkan nomor WhatsApp Anda"}
              >
                <span className={`w-2 h-2 rounded-full ${whatsappStatus?.configured ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className={`text-caption font-bold ${whatsappStatus?.configured ? "text-emerald-700" : "text-amber-700"}`}>
                  {whatsappStatus?.configured ? t("nav.connected", "WhatsApp Terhubung") : "WhatsApp belum terhubung"}
                </span>
              </Link>
            )}

            {/* Language Switcher Pill (Bilingual) */}
            <div className="flex items-center bg-brand-soft p-0.5 rounded-full border border-brand-soft">
              <button
                type="button"
                onClick={() => setLanguage("id")}
                className={`px-2 py-0.5 text-caption font-bold rounded-full transition-all border-none cursor-pointer flex items-center gap-1 ${
                  language === "id"
                    ? "bg-brand text-white shadow-xs"
                    : "text-fg-muted hover:text-ink bg-transparent"
                }`}
                title="Ganti ke Bahasa Indonesia"
              >
                <span>🇮🇩</span>
                <span>ID</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-2 py-0.5 text-caption font-bold rounded-full transition-all border-none cursor-pointer flex items-center gap-1 ${
                  language === "en"
                    ? "bg-brand text-white shadow-xs"
                    : "text-fg-muted hover:text-ink bg-transparent"
                }`}
                title="Switch to English"
              >
                <span>🇬🇧</span>
                <span>EN</span>
              </button>
            </div>

            {/* Interactive Notification Button & Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  if (roleDropdownOpen) setRoleDropdownOpen(false);
                }}
                className={`relative p-2 rounded-full border cursor-pointer transition-all ${
                  notifOpen
                    ? "bg-brand-soft border-brand text-brand"
                    : "hover:bg-canvas border-line bg-white text-ink"
                }`}
                title="Pusat Notifikasi"
                aria-label="Pusat Notifikasi"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadNotifs > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Notification Popover Modal */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-line z-50 overflow-hidden animate-scale-pop">
                  {/* Header */}
                  <div className="p-3.5 px-4 bg-soft border-b border-line flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-body-sm font-bold text-fg">Notifikasi</h4>
                      {unreadNotifs > 0 ? (
                        <span className="text-caption font-bold bg-brand text-white px-2 py-0.2 rounded-full">
                          {unreadNotifs} Baru
                        </span>
                      ) : (
                        <span className="text-caption font-semibold text-fg-muted bg-slate-100 px-2 py-0.2 rounded-full">
                          Semua Terbaca
                        </span>
                      )}
                    </div>
                    {unreadNotifs > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotifsRead}
                        className="text-caption font-bold text-brand hover:underline bg-transparent border-none cursor-pointer"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                  </div>

                  {/* List of Notification Items */}
                  <div className="max-h-[340px] overflow-y-auto divide-y divide-line">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-fg-muted text-body-sm">
                        Tidak ada notifikasi baru saat ini.
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <Link
                          key={item.id}
                          href={item.link}
                          onClick={() => {
                            setNotifOpen(false);
                            markNotificationRead(item.id);
                          }}
                          className={`p-3.5 px-4 flex items-start gap-3 transition-colors no-underline block ${
                            item.read ? "bg-white hover:bg-soft" : "bg-[#f4f7ff] hover:bg-[#ebf0fe]"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              item.type === "order"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : item.type === "chat"
                                ? "bg-blue-50 text-brand border border-blue-200"
                                : item.type === "security"
                                ? "bg-purple-50 text-purple-600 border border-purple-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {item.type === "order" ? (
                              <DollarSignIcon className="w-4 h-4" />
                            ) : item.type === "chat" ? (
                              <MessageSquareIcon className="w-4 h-4" />
                            ) : item.type === "security" ? (
                              <ShieldCheckIcon className="w-4 h-4" />
                            ) : (
                              <ZapIcon className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-bold text-body-sm text-fg truncate">
                                {item.title}
                              </span>
                              <span className="text-micro text-fg-subtle font-medium flex-shrink-0">
                                {item.time}
                              </span>
                            </div>
                            <p className="text-label text-fg-muted line-clamp-2 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>

                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-2" />
                          )}
                        </Link>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-2.5 bg-soft border-t border-line text-center">
                    <Link
                      href="/dashboard/audit-log"
                      onClick={() => setNotifOpen(false)}
                      className="text-label font-bold text-brand hover:underline"
                    >
                      Buka Log Riwayat Aktivitas Lengkap →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Main Viewport */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-7 md:p-10" style={{ backgroundColor: 'var(--dash-bg)' }}>
          <div className="max-w-[1240px] mx-auto">
            {notice && (
              <div
                role="status"
                className={`mb-5 p-3.5 rounded-xl border flex items-start gap-2.5 text-body-sm font-semibold ${
                  notice.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}
              >
                <span className="flex-1">{notice.message}</span>
                <button type="button" onClick={dismissNotice} className="bg-transparent border-none cursor-pointer text-current font-bold" aria-label="Tutup">
                  ×
                </button>
              </div>
            )}
            {isPreview && (
              <div className="mb-5 px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-caption font-semibold">
                Pratinjau fitur: tampilan ini memakai data contoh dan belum menyimpan ke server.
              </div>
            )}
            {lockedFeature ? (
              <div className="max-w-[560px] mx-auto text-center bg-white border border-line rounded-2xl p-10 mt-6">
                <span className="inline-block text-caption font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 px-3 py-1 rounded-full mb-4">Tidak termasuk paket Anda</span>
                <h1 className="page-title mb-2">{lockedFeature.label}</h1>
                <p className="text-body-sm text-fg-muted leading-relaxed">Fitur ini belum aktif di paket langganan toko Anda. Hubungi admin Klozer untuk mengaktifkannya atau menaikkan paket.</p>
                <Link href="/dashboard" className="btn-primary inline-block mt-6 !py-2 !px-5 font-bold no-underline">Kembali ke Dashboard</Link>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <DashboardProvider>
      <Suspense fallback={<div className="p-8 text-center text-fg-muted">Memuat Dashboard...</div>}>
        <DashboardContent>{children}</DashboardContent>
      </Suspense>
    </DashboardProvider>
  );
}
