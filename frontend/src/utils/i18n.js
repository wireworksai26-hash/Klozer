// Multi-language (i18n) dictionary for Klozer Dashboard (Indonesian & English)

export const translations = {
  id: {
    // Top Navigation & Header
    nav: {
      dashboard: "Dashboard Utama",
      overview: "Overview Platform",
      liveChat: "Live Chat WhatsApp",
      products: "Katalog & HPP Produk",
      orders: "Pesanan & Transaksi",
      finance: "Dynamic QRIS & Kas",
      institutions: "Instansi Tenant",
      leads: "Leads Global",
      blasting: "Blasting WA",
      subscriptions: "Langganan CS",
      tokenUsage: "Token AI",
      serverMetrics: "Server Usage",
      aiConfig: "Konfigurasi AI",
      settings: "Pengaturan",
      team: "Hak Akses & Tim",
      doc: "Buku Panduan",
      logout: "Keluar (Logout)",
      connected: "WA Cloud API Terhubung",
      notifications: "Notifikasi",
      markAllRead: "Tandai Dibaca",
      viewAllAudit: "Lihat Semua Aktivitas →",
      noNotifs: "Tidak ada notifikasi baru.",
    },

    // Main Dashboard Page
    dashboard: {
      superadminTitle: "Platform Master Overview",
      superadminSubtitle: "Monitoring universal seluruh tenant institusi, kuota WhatsApp API, dan stabilitas server.",
      ownerTitle: "Dashboard Utama",
      ownerSubtitle: "Overview Penjualan & Performa CS",
      csTitle: "Workspace Customer Service",
      csSubtitle: "Fokus Respon & Closing Cepat",
      
      // Top Metric Cards
      totalRevenue: "Omzet Penjualan Lunas",
      totalRevenueSub: "Real-time terverifikasi",
      verifiedOrders: "Pesanan Berhasil",
      verifiedOrdersSub: "100% Otomatis Cocok",
      newLeads: "Leads Baru Masuk",
      newLeadsSub: "Meta CAPI & Organik",
      closingRate: "Closing Rate Tim",
      closingRateSub: "Rata-rata seluruh CS",
      totalTenants: "Total Tenant Institusi",
      totalTenantsSub: "100% Aktif Berlangganan",
      totalGmv: "Total GMV Transaksi",
      totalGmvSub: "Periode 30 hari terakhir",
      messagesProcessed: "Pesan WA Diproses",
      messagesProcessedSub: "Cloud API Uptime: 99.98%",
      antiFraud: "Deteksi Anti-Struk Palsu",
      antiFraudSub: "Rp 48.2 Jt Kerugian Dicegah",

      // Charts
      revenueTrendTitle: "Tren Omzet & Volume Transaksi",
      revenueTrendSubtitle: "Grafik penjualan harian & performa checkout",
      revenueGlobalTitle: "Tren Transaksi Seluruh Platform",
      revenueGlobalSubtitle: "Volume pergerakan GMV seluruh tenant bisnis & NGO",
      toggleRevenue: "Omzet (Rp)",
      toggleOrders: "Volume Pesanan",
      funnelTitle: "Funnel Konversi WhatsApp",
      funnelSubtitle: "Efisiensi leads dari chat hingga lunas",
      funnelInsight: "Konversi tagihan ke lunas mencapai 69.4%. Rekomendasi: optimalkan follow-up otomatis.",
      paymentTitle: "Distribusi Pembayaran",
      paymentSubtitle: "Proporsi metode bayar pelanggan",

      // CS Leaderboard & Tables
      csLeaderboardTitle: "Performa & Komisi Tim CS",
      csLeaderboardSub: "Peringkat closing rate dan omzet staf",
      csCommissionNote: "Sistem Pembagian Komisi: 5.0% dari Omzet Lunas",
      recentOrdersTitle: "Transaksi Pesanan Terkini",
      recentOrdersSub: "Daftar order yang masuk via WhatsApp & manual",
      viewAllOrders: "Lihat Semua Pesanan →",
      
      // Quick Actions
      quickNewOrder: "+ Buat Pesanan",
      quickLiveChat: "Live Chat",
      quickAddInstitution: "+ Tambah Institusi",
    },

    // Institutions Module
    institutions: {
      title: "Manajemen Instansi & Multi-Tenant",
      subtitle: "Kelola konfigurasi tenant, kuota WhatsApp API, bahasa default, dan reset kata sandi akun.",
      addBtn: "+ Tambah Instansi",
      editTitle: "Edit Konfigurasi Instansi",
      addTitle: "Registrasi Instansi Baru",
      nameLabel: "Nama Instansi / Bisnis",
      sectorLabel: "Sektor Industri",
      ownerLabel: "Nama Pemilik / PIC",
      emailLabel: "Email Akun Owner",
      phoneLabel: "Nomor WhatsApp",
      tierLabel: "Paket Berlangganan",
      quotaLabel: "Batas Kuota Pesan",
      languageLabel: "Bahasa Tampilan Dashboard",
      langId: "🇮🇩 Bahasa Indonesia",
      langEn: "🇬🇧 English (International)",
      resetPasswordSection: "Keamanan & Reset Kata Sandi Owner",
      resetPasswordDesc: "Atur ulang kata sandi login untuk akun Owner/Admin instansi ini.",
      newPasswordPlaceholder: "Masukkan kata sandi baru (min 6 karakter)",
      autoGenerateBtn: "⚡ Generate Sandi Acak",
      resetPasswordBtn: "Reset Kata Sandi Sekarang",
      passwordResetSuccess: "Kata sandi berhasil di-reset!",
      copyCredentials: "Salin Kredensial",
      copied: "Tersalin!",
    },

    // Common
    common: {
      save: "Simpan Perubahan",
      cancel: "Batal",
      close: "Tutup",
      active: "Aktif",
      inactive: "Nonaktif",
      search: "Cari...",
      loading: "Memuat...",
      actions: "Aksi",
      status: "Status",
    },
  },

  en: {
    // Top Navigation & Header
    nav: {
      dashboard: "Main Dashboard",
      overview: "Platform Overview",
      liveChat: "WhatsApp Live Chat",
      products: "Catalog & COGS",
      orders: "Orders & Transactions",
      finance: "Dynamic QRIS & Cash",
      institutions: "Tenant Institutions",
      leads: "Global Leads",
      blasting: "WA Broadcast",
      subscriptions: "CS Subscriptions",
      tokenUsage: "AI Tokens",
      serverMetrics: "Server Usage",
      aiConfig: "AI Configuration",
      settings: "Settings",
      team: "Access & Team",
      doc: "Documentation",
      logout: "Sign Out (Logout)",
      connected: "WA Cloud API Connected",
      notifications: "Notifications",
      markAllRead: "Mark All as Read",
      viewAllAudit: "View All Activity Logs →",
      noNotifs: "No new notifications.",
    },

    // Main Dashboard Page
    dashboard: {
      superadminTitle: "Platform Master Overview",
      superadminSubtitle: "Universal monitoring across all institution tenants, WhatsApp API quota, and server health.",
      ownerTitle: "Main Dashboard",
      ownerSubtitle: "Sales Overview & CS Performance",
      csTitle: "Customer Service Workspace",
      csSubtitle: "Focus on Quick Response & High Closing",
      
      // Top Metric Cards
      totalRevenue: "Paid Sales Revenue",
      totalRevenueSub: "Real-time verified",
      verifiedOrders: "Successful Orders",
      verifiedOrdersSub: "100% Auto-matched",
      newLeads: "New Inbound Leads",
      newLeadsSub: "Meta CAPI & Organic",
      closingRate: "Team Closing Rate",
      closingRateSub: "Average across all CS",
      totalTenants: "Total Tenant Institutions",
      totalTenantsSub: "100% Active Subscribers",
      totalGmv: "Total Platform GMV",
      totalGmvSub: "Last 30-day period",
      messagesProcessed: "WhatsApp Messages Processed",
      messagesProcessedSub: "Cloud API Uptime: 99.98%",
      antiFraud: "Anti-Fake Receipt Detections",
      antiFraudSub: "Rp 48.2M Fraud Prevented",

      // Charts
      revenueTrendTitle: "Revenue & Order Volume Trend",
      revenueTrendSubtitle: "Daily sales metrics & checkout performance",
      revenueGlobalTitle: "Platform-wide Transaction Trend",
      revenueGlobalSubtitle: "GMV movements across all business & NGO tenants",
      toggleRevenue: "Revenue ($ / Rp)",
      toggleOrders: "Order Volume",
      funnelTitle: "WhatsApp Conversion Funnel",
      funnelSubtitle: "Lead journey efficiency from initial chat to paid invoice",
      funnelInsight: "Invoice to paid conversion reached 69.4%. Tip: optimize automated payment reminders.",
      paymentTitle: "Payment Method Breakdown",
      paymentSubtitle: "Customer payment channel proportions",

      // CS Leaderboard & Tables
      csLeaderboardTitle: "CS Team Performance & Commission",
      csLeaderboardSub: "Closing rates and revenue generated by agents",
      csCommissionNote: "Commission Structure: 5.0% of Paid Revenue",
      recentOrdersTitle: "Recent Order Transactions",
      recentOrdersSub: "Orders received via WhatsApp and manual checkout",
      viewAllOrders: "View All Orders →",
      
      // Quick Actions
      quickNewOrder: "+ Create Order",
      quickLiveChat: "Live Chat",
      quickAddInstitution: "+ Add Institution",
    },

    // Institutions Module
    institutions: {
      title: "Institution & Multi-Tenant Management",
      subtitle: "Manage tenant configurations, WhatsApp quotas, default language, and reset account passwords.",
      addBtn: "+ Add Institution",
      editTitle: "Edit Institution Configuration",
      addTitle: "Register New Institution",
      nameLabel: "Institution / Business Name",
      sectorLabel: "Industry Sector",
      ownerLabel: "Owner / PIC Name",
      emailLabel: "Owner Account Email",
      phoneLabel: "WhatsApp Phone Number",
      tierLabel: "Subscription Plan",
      quotaLabel: "Message Quota Limit",
      languageLabel: "Dashboard Default Language",
      langId: "🇮🇩 Indonesian (Bahasa Indonesia)",
      langEn: "🇬🇧 English (International)",
      resetPasswordSection: "Security & Owner Password Reset",
      resetPasswordDesc: "Reset login credentials for this institution's Owner/Admin account.",
      newPasswordPlaceholder: "Enter new password (min 6 chars)",
      autoGenerateBtn: "⚡ Generate Random Password",
      resetPasswordBtn: "Reset Password Now",
      passwordResetSuccess: "Password reset successfully!",
      copyCredentials: "Copy Credentials",
      copied: "Copied!",
    },

    // Common
    common: {
      save: "Save Changes",
      cancel: "Cancel",
      close: "Close",
      active: "Active",
      inactive: "Inactive",
      search: "Search...",
      loading: "Loading...",
      actions: "Actions",
      status: "Status",
    },
  },
};

/**
 * Translation helper hook / function
 * @param {string} lang - 'id' | 'en'
 * @param {string} path - dot separated key path e.g. "dashboard.totalRevenue"
 * @param {string} fallback - fallback string if not found
 */
export function getTranslation(lang = "id", path = "", fallback = "") {
  const currentDict = translations[lang] || translations.id;
  const parts = path.split(".");
  let result = currentDict;

  for (const part of parts) {
    if (result && typeof result === "object" && part in result) {
      result = result[part];
    } else {
      return fallback || path;
    }
  }

  return typeof result === "string" ? result : fallback || path;
}
