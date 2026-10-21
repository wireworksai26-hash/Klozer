"use client";
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
  DollarSignIcon,
  CpuIcon,
  CalendarIcon,
  BarChartIcon,
  DatabaseIcon,
  TrendingUpIcon,
  InstagramIcon,
  TagIcon,
  PrinterIcon,
  FileTextIcon,
  PackageIcon,
  BanIcon,
  ShoppingCartIcon,
  WarehouseIcon,
  AlertTriangleIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  TargetIcon,
} from "@/components/icons";
import Icon from "@/components/icons/Icon";

const glyph = (name) => <Icon name={name} className="w-4.5 h-4.5" />;
const sectionGlyph = (name) => <Icon name={name} className="w-4 h-4" />;

/**
 * The menu for owners and supervisors. Grouped by what the person is doing (talking with customers, selling,
 * running the team, connecting other tools, shop upkeep) so the list stays short enough to scan.
 * `badges.tasks` is the number of tasks waiting for this person, shown next to "Tugas".
 */
function managerNav({ t, language, badges, planIconClass }) {
  const en = language === "en";
  return {
    pinnedItems: [
      { label: t("nav.dashboard", "Dashboard Utama"), href: "/dashboard", icon: <BarChartIcon className="w-4.5 h-4.5" /> },
      { label: t("nav.liveChat", "Live Chat WhatsApp"), href: "/dashboard/chat", icon: <MessageSquareIcon className="w-4.5 h-4.5" /> },
      { label: t("Tugas"), href: "/dashboard/tasks", icon: glyph("task"), badge: badges.tasks || undefined },
      { label: t("nav.orders", "Pesanan & Order"), href: "/dashboard/orders", icon: <ShoppingCartIcon className="w-4.5 h-4.5" /> },
      { label: t("nav.products", "Katalog & HPP"), href: "/dashboard/products", icon: <LayersIcon className="w-4.5 h-4.5" /> },
    ],
    navSections: [
      {
        sectionLabel: t("Percakapan dan AI"),
        sectionIcon: sectionGlyph("agents"),
        items: [
          { label: t("Jalur Cepat"), href: "/dashboard/fast-path", icon: glyph("bolt") },
          { label: t("Agen AI"), href: "/dashboard/agents", icon: glyph("agents") },
          { label: t("Basis Pengetahuan"), href: "/dashboard/knowledge", icon: glyph("book") },
          { label: t("Evaluasi AI"), href: "/dashboard/ai-evaluation", icon: glyph("thumbUp") },
          { label: en ? "AI Persona" : "Persona AI & Script", href: "/dashboard/persona-ai", icon: <SparklesIcon className="w-4.5 h-4.5" /> },
          { label: "Test CS AI", href: "/dashboard/test-cs-ai", icon: <BotIcon className="w-4.5 h-4.5" /> },
        ],
      },
      {
        sectionLabel: t("Penjualan dan Pemasaran"),
        sectionIcon: <TrendingUpIcon className="w-4 h-4" />,
        items: [
          { label: en ? "Customers & CRM" : "Pelanggan & CRM", href: "/dashboard/contacts", icon: <UsersIcon className="w-4.5 h-4.5" /> },
          { label: t("Pesanan di Chat"), href: "/dashboard/chat-commerce", icon: glyph("basket") },
          { label: en ? "Smart Broadcast" : "Smart Broadcast", href: "/dashboard/blasting", icon: glyph("megaphone") },
          { label: t("Iklan dan ROAS"), href: "/dashboard/ads", icon: <TargetIcon className="w-4.5 h-4.5" /> },
          { label: en ? "Revenue Reports" : "Laporan Omzet & CS", href: "/dashboard/reports", icon: <TrendingUpIcon className="w-4.5 h-4.5" /> },
          { label: t("nav.finance", "Dynamic QRIS"), href: "/dashboard/finance", icon: <DollarSignIcon className="w-4.5 h-4.5" /> },
        ],
      },
      {
        sectionLabel: t("Saluran dan Tim"),
        sectionIcon: sectionGlyph("inbox"),
        items: [
          { label: t("Saluran Chat"), href: "/dashboard/channels", icon: glyph("inbox") },
          { label: t("nav.team", "Hak Akses & Tim"), href: "/dashboard/settings?tab=team", icon: <ShieldCheckIcon className="w-4.5 h-4.5" /> },
          { label: en ? "Bank Accounts" : "Rekening Bank & QRIS", href: "/dashboard/bank-accounts", icon: <BuildingIcon className="w-4.5 h-4.5" /> },
          { label: en ? "Team Chat" : "Internal Chat Tim", href: "/dashboard/internal-chat", icon: <UsersIcon className="w-4.5 h-4.5" /> },
          { label: en ? "Escalation Queue" : "Eskalasi & Co-Pilot", href: "/dashboard/escalation", icon: <AlertTriangleIcon className="w-4.5 h-4.5" /> },
        ],
      },
      {
        sectionLabel: t("Integrasi"),
        sectionIcon: sectionGlyph("plug"),
        items: [{ label: t("API dan Webhook"), href: "/dashboard/integrations", icon: glyph("plug") }],
      },
      {
        sectionLabel: en ? "Store Operations" : "Operasional Toko",
        sectionIcon: <DatabaseIcon className="w-4 h-4" />,
        items: [
          { label: en ? "BOM & Recipes" : "Resep HPP & BOM", href: "/dashboard/bom", icon: <FileTextIcon className="w-4.5 h-4.5" /> },
          { label: en ? "Inventory Stock" : "Stok Inventaris", href: "/dashboard/stock", icon: <PackageIcon className="w-4.5 h-4.5" /> },
          { label: en ? "Warehouse Hubs" : "Gudang & Hub Pengiriman", href: "/dashboard/warehouses", icon: <WarehouseIcon className="w-4.5 h-4.5" /> },
          { label: en ? "Batch Receipts" : "Cetak Resi Massal", href: "/dashboard/finance/invoices", icon: <PrinterIcon className="w-4.5 h-4.5" /> },
          { label: en ? "Booking & Appointments" : "Booking & Reservasi", href: "/dashboard/bookings", icon: <CalendarIcon className="w-4.5 h-4.5" /> },
          { label: "AI Auto-Label & NLP", href: "/dashboard/labels", icon: <TagIcon className="w-4.5 h-4.5" /> },
          { label: en ? "Blacklist & Anti-Spam" : "Blacklist & Anti-Spam", href: "/dashboard/blocked-contacts", icon: <BanIcon className="w-4.5 h-4.5" /> },
          { label: en ? "Audit Log" : "Audit Log Aktivitas", href: "/dashboard/audit-log", icon: <ClipboardCheckIcon className="w-4.5 h-4.5" /> },
          { label: en ? "Store Subscription" : "Langganan & Paket Toko", href: "/dashboard/subscription", icon: <CrownIcon className={planIconClass} /> },
          { label: t("Top Up Token AI"), href: "/dashboard/topup-token", icon: glyph("coins") },
        ],
      },
    ],
  };
}

/**
 * Returns the full role navigation configuration object.
 * Extracted from layout.js to reduce monolith size.
 *
 * @param {{ t: Function, language: string, badges?: { tasks?: number } }} options
 * @returns {Object} rolesConfig map keyed by role slug
 */
export function buildRolesConfig({ t, language, badges = {} }) {
  const config = {
    superadmin: {
      label: "Super Admin",
      badgeColor: "bg-accent-100 text-accent-800 border-accent-200",
      avatar: "SA",
      icon: <CrownIcon className="w-4 h-4 text-accent-700" />,
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
            { label: t("nav.institutions", "Instansi Tenant"), href: "/dashboard/institutions", icon: <BuildingIcon className="w-4.5 h-4.5" /> },
          ],
        },
        {
          sectionLabel: language === "en" ? "Operations" : "Operasional",
          sectionIcon: <ClipboardListIcon className="w-4 h-4" />,
          items: [
            { label: t("nav.leads", "Leads Global"), href: "/dashboard/superadmin/leads", icon: <UsersIcon className="w-4.5 h-4.5" /> },
            { label: t("nav.blasting", "Blasting WA"), href: "/dashboard/superadmin/blasting", icon: <RadioIcon className="w-4.5 h-4.5" /> },
            { label: t("nav.subscriptions", "Langganan CS"), href: "/dashboard/superadmin/subscriptions", icon: <CalendarIcon className="w-4.5 h-4.5" /> },
          ],
        },
        {
          sectionLabel: language === "en" ? "Finance" : "Keuangan",
          sectionIcon: <DollarSignIcon className="w-4 h-4" />,
          items: [
            { label: language === "en" ? "Transactions" : "Transaksi", href: "/dashboard/superadmin/transactions", icon: <DollarSignIcon className="w-4.5 h-4.5" /> },
            { label: t("Metode Pembayaran"), href: "/dashboard/superadmin/payment-methods", icon: glyph("coins") },
            { label: t("Voucher Diskon"), href: "/dashboard/superadmin/vouchers", icon: glyph("coins") },
            { label: t("Pembayaran Langganan"), href: "/dashboard/superadmin/billing", icon: glyph("coins") },
            { label: t("Antrean Top Up Token"), href: "/dashboard/superadmin/topups", icon: glyph("coins") },
            { label: language === "en" ? "Export Data" : "Export Data", href: "/dashboard/superadmin/exports", icon: <DownloadIcon className="w-4.5 h-4.5" /> },
          ],
        },
        {
          sectionLabel: language === "en" ? "Monitoring" : "Monitoring",
          sectionIcon: <ActivityIcon className="w-4 h-4" />,
          items: [
            { label: t("nav.tokenUsage", "Token AI"), href: "/dashboard/superadmin/token-usage", icon: <CpuIcon className="w-4.5 h-4.5" /> },
            { label: t("nav.serverMetrics", "Server Usage"), href: "/dashboard/superadmin/server-metrics", icon: <ActivityIcon className="w-4.5 h-4.5" /> },
          ],
        },
        {
          sectionLabel: language === "en" ? "Settings" : "Pengaturan",
          sectionIcon: <SettingsIcon className="w-4 h-4" />,
          items: [
            { label: t("nav.aiConfig", "Konfigurasi AI"), href: "/dashboard/settings?tab=ai-admin", icon: <BotIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Global Settings" : "Pengaturan Global", href: "/dashboard/superadmin/settings", icon: <SettingsIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "Test CS AI" : "Test CS AI", href: "/dashboard/test-cs-ai", icon: <ZapIcon className="w-4.5 h-4.5" /> },
            { label: language === "en" ? "AI Scenarios" : "Skenario AI", href: "/dashboard/superadmin/ai-scenarios", icon: <ClipboardCheckIcon className="w-4.5 h-4.5" /> },
          ],
        },
      ],
      navItems: [],
    },

    owner: {
      label: "Owner / Supervisor",
      badgeColor: "bg-brand-soft text-brand border-brand/20",
      avatar: "OW",
      icon: <BriefcaseIcon className="w-4 h-4 text-brand" />,
      ...managerNav({ t, language, badges, planIconClass: "w-4.5 h-4.5 text-brand" }),
      navItems: [],
    },

    spv: {
      label: "Supervisor (SPV)",
      badgeColor: "bg-warning-100 text-warning-800 border-warning-200",
      avatar: "SP",
      icon: <ClipboardListIcon className="w-4 h-4 text-warning-700" />,
      ...managerNav({ t, language, badges, planIconClass: "w-4.5 h-4.5 text-warning-600" }),
      navItems: [],
    },

    cs: {
      label: "Customer Service (CS)",
      badgeColor: "bg-success-100 text-success-800 border-success-200",
      avatar: "SA",
      icon: <HeadphonesIcon className="w-4 h-4 text-success-700" />,
      pinnedItems: [
        { label: t("nav.dashboard", "Dashboard Pribadi CS"), href: "/dashboard", icon: <BarChartIcon className="w-4.5 h-4.5" /> },
      ],
      navSections: [
        {
          sectionLabel: language === "en" ? "Operations" : "Operasional",
          sectionIcon: <MessageSquareIcon className="w-4 h-4" />,
          items: [
            { label: t("nav.liveChat", "Live Chat WhatsApp"), href: "/dashboard/chat", icon: <MessageSquareIcon className="w-4.5 h-4.5" /> },
            { label: t("Tugas"), href: "/dashboard/tasks", icon: glyph("task"), badge: badges.tasks || undefined },
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
          ],
        },
      ],
      navItems: [],
    },
  };

  // One place to learn every feature, for every role, always in reach at the end of the pinned items
  for (const roleConfig of Object.values(config)) {
    roleConfig.pinnedItems = [...(roleConfig.pinnedItems ?? []), { label: t("Dokumentasi"), href: "/dashboard/documentation", icon: glyph("book") }];
  }

  return markUnavailableItems(config, language);
}

/**
 * Flags nav items whose backend is not ready so the sidebar can show a
 * "Segera" badge instead of letting users open an empty-looking page.
 */
function markUnavailableItems(config, language) {
  const comingSoonLabel = language === "en" ? "Soon" : "Segera";
  const flag = (item) => {
    const path = item.href.split("?")[0];
    return UNAVAILABLE_ROUTES.includes(path)
      ? { ...item, comingSoon: true, comingSoonLabel }
      : item;
  };

  return Object.fromEntries(
    Object.entries(config).map(([role, roleConfig]) => [
      role,
      {
        ...roleConfig,
        pinnedItems: roleConfig.pinnedItems?.map(flag),
        navItems: roleConfig.navItems?.map(flag),
        navSections: roleConfig.navSections?.map((section) => ({
          ...section,
          items: section.items.map(flag),
        })),
      },
    ])
  );
}

/**
 * Routes shown with a "Segera" badge. Empty now: every page is reachable. Pages that run on sample
 * data carry a preview notice instead (see PREVIEW_ROUTES in the dashboard layout).
 */
export const UNAVAILABLE_ROUTES = [];
