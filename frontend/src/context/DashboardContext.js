"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

const DashboardContext = createContext();

// Initial Mock Datasets
const initialInstitutions = [
  {
    id: "INST-001",
    name: "Batik Mahakarya Solo",
    sector: "Fashion & Retail",
    owner: "Rendra Pratama",
    email: "rendra@batikmahakarya.id",
    phone: "+62 812-3456-7890",
    tier: "Pro Plan",
    quotaUsed: 14250,
    quotaMax: 50000,
    status: "active",
    modules: {
      qris: true,
      voiceAi: true,
      antiFraud: true,
      metaCapi: true,
      multiCs: true,
    },
    joinedDate: "12 Januari 2026",
  },
  {
    id: "INST-002",
    name: "Lumiere Skincare Official",
    sector: "Beauty & Healthcare",
    owner: "Nadia Maharani",
    email: "nadia@lumiereskin.com",
    phone: "+62 813-8899-1122",
    tier: "Pro Plan",
    quotaUsed: 38900,
    quotaMax: 50000,
    status: "active",
    modules: {
      qris: true,
      voiceAi: true,
      antiFraud: true,
      metaCapi: true,
      multiCs: true,
    },
    joinedDate: "05 Februari 2026",
  },
  {
    id: "INST-003",
    name: "Yayasan ZISWAF Peduli Umat",
    sector: "Lembaga Sosial & Donasi",
    owner: "Ustadz Firdaus",
    email: "donasi@ziswafpeduli.org",
    phone: "+62 857-4433-2211",
    tier: "Enterprise",
    quotaUsed: 62400,
    quotaMax: 100000,
    status: "active",
    modules: {
      qris: true,
      voiceAi: true,
      antiFraud: true,
      metaCapi: false,
      multiCs: true,
    },
    joinedDate: "20 Februari 2026",
  },
  {
    id: "INST-004",
    name: "Kopi Kencana Roastery",
    sector: "Kuliner & F&B",
    owner: "Bayu Wicaksono",
    email: "bayu@kopikencana.com",
    phone: "+62 878-1122-3344",
    tier: "Starter",
    quotaUsed: 4800,
    quotaMax: 10000,
    status: "active",
    modules: {
      qris: true,
      voiceAi: false,
      antiFraud: false,
      metaCapi: false,
      multiCs: false,
    },
    joinedDate: "15 Maret 2026",
  },
];

const initialProducts = [
  {
    id: "PRD-01",
    sku: "KLZ-BTK-01",
    name: "Kemeja Batik Modern Navy",
    category: "Pakaian Pria",
    price: 150000,
    hpp: 85000,
    stock: 42,
    lowStock: 10,
    active: true,
    variants: ["M", "L", "XL"],
  },
  {
    id: "PRD-02",
    sku: "KLZ-SKN-02",
    name: "Lumiere Radiance Serum 30ml",
    category: "Skincare",
    price: 185000,
    hpp: 75000,
    stock: 8,
    lowStock: 15,
    active: true,
    variants: ["30ml"],
  },
  {
    id: "PRD-03",
    sku: "KLZ-GMS-03",
    name: "Gamis Syari Premium Maroon",
    category: "Pakaian Wanita",
    price: 275000,
    hpp: 140000,
    stock: 24,
    lowStock: 8,
    active: true,
    variants: ["All Size"],
  },
  {
    id: "PRD-04",
    sku: "KLZ-KOP-04",
    name: "Arabica Gayo Wine 250gr",
    category: "F&B",
    price: 95000,
    hpp: 50000,
    stock: 65,
    lowStock: 20,
    active: true,
    variants: ["Biji", "Bubuk Halus", "Bubuk Kasar"],
  },
  {
    id: "PRD-05",
    sku: "KLZ-TAS-05",
    name: "Leather Sling Bag Vintage",
    category: "Aksesoris",
    price: 220000,
    hpp: 110000,
    stock: 5,
    lowStock: 10,
    active: false,
    variants: ["Cokelat", "Hitam"],
  },
];

const initialOrders = [
  {
    id: "ORD-8921",
    customer: "Dewi Lestari",
    phone: "+62 812-4567-8901",
    city: "Bandung, Jawa Barat",
    items: [{ productId: "PRD-01", name: "Kemeja Batik Modern Navy (XL)", qty: 2, price: 150000 }],
    subtotal: 300000,
    shippingFee: 12000,
    total: 312000,
    paymentMethod: "Dynamic QRIS",
    status: "paid",
    cs: "Sarah Amalia",
    courier: "J&T Express",
    awb: "JX9821448201",
    date: "29 Agu 2026, 10:24 WIB",
  },
  {
    id: "ORD-8920",
    customer: "Agus Pratama",
    phone: "+62 856-1122-3344",
    city: "Surabaya, Jawa Timur",
    items: [{ productId: "PRD-02", name: "Lumiere Radiance Serum 30ml", qty: 1, price: 185000 }],
    subtotal: 185000,
    shippingFee: 15000,
    total: 200000,
    paymentMethod: "BCA Transfer",
    status: "processing",
    cs: "Sarah Amalia",
    courier: "SiCepat REG",
    awb: "SC102948291",
    date: "29 Agu 2026, 09:55 WIB",
  },
  {
    id: "ORD-8919",
    customer: "Siti Rahma",
    phone: "+62 877-3344-5566",
    city: "Yogyakarta",
    items: [{ productId: "PRD-03", name: "Gamis Syari Premium Maroon", qty: 1, price: 275000 }],
    subtotal: 275000,
    shippingFee: 10000,
    total: 285000,
    paymentMethod: "Dynamic QRIS",
    status: "shipped",
    cs: "Rizky Ramadhan",
    courier: "JNE Regular",
    awb: "JNE88291039",
    date: "29 Agu 2026, 09:12 WIB",
  },
  {
    id: "ORD-8918",
    customer: "Budi Kurniawan",
    phone: "+62 813-9988-7766",
    city: "Jakarta Selatan",
    items: [{ productId: "PRD-04", name: "Arabica Gayo Wine 250gr", qty: 2, price: 95000 }],
    subtotal: 190000,
    shippingFee: 9000,
    total: 199000,
    paymentMethod: "COD (Bayar di Tempat)",
    status: "waiting_payment",
    cs: "Rizky Ramadhan",
    courier: "SAP Express COD",
    awb: "",
    date: "29 Agu 2026, 08:40 WIB",
  },
];

const initialLeads = [
  {
    id: "LEAD-101",
    name: "Clarissa Putri",
    phone: "+62 812-9988-4433",
    source: "Instagram Ads (Reels)",
    interest: "Kemeja Batik Modern",
    status: "closing",
    cs: "Sarah Amalia",
    codScore: 94,
    codRisk: "low",
    estValue: 450000,
    notes: "Sudah minta kode QRIS, menunggu proses scan m-BCA.",
    lastInteraction: "5 menit lalu",
  },
  {
    id: "LEAD-102",
    name: "Dimas Anggara",
    phone: "+62 857-1122-9900",
    source: "WhatsApp Direct Link",
    interest: "Paket Skincare Glow",
    status: "follow_up",
    cs: "Sarah Amalia",
    codScore: 78,
    codRisk: "medium",
    estValue: 370000,
    notes: "Kirim voice note tanya kecocokan kulit berminyak.",
    lastInteraction: "22 menit lalu",
  },
  {
    id: "LEAD-103",
    name: "Indah Permata",
    phone: "+62 878-4455-6677",
    source: "Facebook Ads (Feed)",
    interest: "Gamis Syari Maroon",
    status: "repeat_order",
    cs: "Rizky Ramadhan",
    codScore: 98,
    codRisk: "low",
    estValue: 550000,
    notes: "Pelanggan VIP, pernah belanja 3x sebelumnya.",
    lastInteraction: "1 jam lalu",
  },
  {
    id: "LEAD-104",
    name: "Fauzan Hadi",
    phone: "+62 819-2233-4455",
    source: "TikTok Click to WA",
    interest: "Biji Kopi Arabica",
    status: "new",
    cs: "Belum Ditugaskan",
    codScore: 45,
    codRisk: "high",
    estValue: 190000,
    notes: "Minta pembayaran COD tanpa DP. Riwayat RTS tinggi.",
    lastInteraction: "2 jam lalu",
  },
];

const initialTeam = [
  {
    id: "USR-01",
    name: "Budi Santoso",
    email: "budi@klozer.id",
    role: "Owner / Supervisor",
    status: "active",
    csClosingRate: "88%",
    revenueGen: "Rp 64.200.000",
    permissions: {
      qrisGenerate: true,
      voiceAiManage: true,
      mutationApproval: true,
      exportReports: true,
      productEdit: true,
    },
  },
  {
    id: "USR-02",
    name: "Sarah Amalia",
    email: "sarah.cs@klozer.id",
    role: "Customer Service Senior",
    status: "active",
    csClosingRate: "82%",
    revenueGen: "Rp 42.500.000",
    permissions: {
      qrisGenerate: true,
      voiceAiManage: false,
      mutationApproval: false,
      exportReports: false,
      productEdit: false,
    },
  },
  {
    id: "USR-03",
    name: "Rizky Ramadhan",
    email: "rizky.cs@klozer.id",
    role: "Customer Service Junior",
    status: "active",
    csClosingRate: "74%",
    revenueGen: "Rp 28.100.000",
    permissions: {
      qrisGenerate: true,
      voiceAiManage: false,
      mutationApproval: false,
      exportReports: false,
      productEdit: false,
    },
  },
  {
    id: "USR-04",
    name: "Mega Safitri",
    email: "mega.fin@klozer.id",
    role: "Finance & Admin",
    status: "active",
    csClosingRate: "-",
    revenueGen: "-",
    permissions: {
      qrisGenerate: false,
      voiceAiManage: false,
      mutationApproval: true,
      exportReports: true,
      productEdit: true,
    },
  },
];

// Full Enterprise AI Configuration Schema
const initialAiConfig = {
  // Primary AI Engine & Credentials (Prioritas Utama: NVIDIA NIM)
  primaryProvider: "nvidia", // nvidia | openai | anthropic | gemini | openrouter | custom
  primaryApiKey: "nvapi-klozer-enterprise-prod-9821849102",
  primaryBaseUrl: "https://integrate.api.nvidia.com/v1",
  primaryModelName: "meta/llama-3.3-70b-instruct",
  
  // Fallback Engine & Resilience
  fallbackProvider: "openrouter",
  fallbackApiKey: "sk-or-v1-84910294819204819204",
  fallbackBaseUrl: "https://openrouter.ai/api/v1",
  fallbackModelName: "gpt-4o-mini",
  enableFallback: true,

  // Speech Engines (STT & TTS)
  sttEngine: "whisper-large-v3",
  sttEndpoint: "https://api.openai.com/v1/audio/transcriptions",
  sttApiKey: "sk-proj-98218491029481902481029481",
  ttsEngine: "tts-1-hd",
  ttsVoice: "nova",

  // Security, Thresholds & Automations
  ocrFraudThreshold: 85, // 0 - 100% confidence threshold
  humanDelayMin: 2, // seconds
  humanDelayMax: 4,
  autoBankMutationCheck: true,
  autoAbandonedFollowup: true,
  webhookEndpoint: "https://api.klozer.id/v1/webhook/whatsapp",
  webhookSecret: "whsec_klozer_981249810294",
  
  // SPV Persona & Operational Prompts
  spvPersona: {
    botName: "Klozer Assistant",
    tone: "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
    greetingMessage: "Halo kak! Terima kasih sudah menghubungi kami. Mau cari produk apa hari ini?",
    voiceAccent: "Bahasa Indonesia Standar (Aksen Ramah)",
    voiceGender: "Female (Putri)",
    abandonedMessage: "Halo kak, apakah pesanan kemeja kemarin masih mau diproses? Stok tersisa sedikit lagi nih kak",
    customFaqKeywords: "ongkir, transfer, cod, ready, ukuran, resi",
  },
};

export function DashboardProvider({ children }) {
  // Active Role: 'superadmin' | 'owner' | 'cs'
  const [role, setRole] = useState("owner");
  const [currentUser, setCurrentUser] = useState({
    id: 2,
    name: "Hendra Wijaya",
    email: "owner@batikmahakarya.id",
    role: "owner",
    institutionName: "Batik Mahakarya Solo",
  });
  const [token, setToken] = useState(null);
  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [leads, setLeads] = useState(initialLeads);
  const [teamMembers, setTeamMembers] = useState(initialTeam);
  const [aiConfig, setAiConfig] = useState(initialAiConfig);
  const [activeInstitutionId, setActiveInstitutionId] = useState("INST-001");

  // Load from localStorage on client
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("klozer_token");
      if (savedToken) setToken(savedToken);
      const savedUser = localStorage.getItem("klozer_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        if (parsed.role) setRole(parsed.role);
        
        const isDefaultDemoTenant = !parsed.institutionName || parsed.institutionName.toLowerCase() === "batik mahakarya solo" || parsed.institutionId === 1;

        if (parsed.institutionName) {
          setInstitutions((prev) => {
            const exists = prev.some((i) => i.name?.toLowerCase() === parsed.institutionName?.toLowerCase() || i.id === parsed.institutionId);
            if (!exists) {
              const newEntry = {
                id: parsed.institutionId || `INST-${parsed.institutionName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
                name: parsed.institutionName,
                sector: parsed.sector || "Bisnis & Jasa",
                owner: parsed.name,
                email: parsed.email,
                tier: "Pro Plan",
                quotaUsed: 0,
                quotaMax: 50000,
                status: "active",
                modules: { qris: true, voiceAi: true, antiFraud: true, metaCapi: true, multiCs: true },
                joinedDate: "Hari ini",
              };
              return [newEntry, ...prev];
            }
            return prev;
          });
          setActiveInstitutionId(parsed.institutionId || `INST-${parsed.institutionName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
        }

        // Strict Tenant Data Isolation:
        // If this is a newly registered business, clear all dummy data so they start 100% clean!
        if (!isDefaultDemoTenant && parsed.role !== "superadmin") {
          const tenantKey = `klozer_inst_${parsed.institutionId || parsed.institutionName?.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
          const savedPrd = localStorage.getItem(`${tenantKey}_products`);
          setProducts(savedPrd ? JSON.parse(savedPrd) : []);
          
          const savedOrd = localStorage.getItem(`${tenantKey}_orders`);
          setOrders(savedOrd ? JSON.parse(savedOrd) : []);
          
          const savedLeads = localStorage.getItem(`${tenantKey}_leads`);
          setLeads(savedLeads ? JSON.parse(savedLeads) : []);
          
          const cleanSlug = parsed.institutionName?.toLowerCase().replace(/[^a-z0-9]+/g, "") || "bisnis";
          const defaultTeam = [
            {
              id: "SPV-01",
              name: parsed.name || `SPV - ${parsed.institutionName}`,
              email: parsed.email || `spv@${cleanSlug}.id`,
              role: "Owner / Supervisor",
              status: "active",
              csClosingRate: "0%",
              revenueGen: "Rp 0",
              phone: parsed.phone_number || "+62 812-xxxx-xxxx",
              permissions: { qrisGenerate: true, voiceAiManage: true, mutationApproval: true, exportReports: true, productEdit: true },
            },
            {
              id: "CS-01",
              name: `CS 1 - ${parsed.institutionName}`,
              email: `cs1@${cleanSlug}.id`,
              role: "Customer Service Senior",
              status: "active",
              csClosingRate: "0%",
              revenueGen: "Rp 0",
              phone: "+62 812-xxxx-0001",
              permissions: { qrisGenerate: true, voiceAiManage: false, mutationApproval: false, exportReports: false, productEdit: false },
            },
            {
              id: "CS-02",
              name: `CS 2 - ${parsed.institutionName}`,
              email: `cs2@${cleanSlug}.id`,
              role: "Customer Service Junior",
              status: "active",
              csClosingRate: "0%",
              revenueGen: "Rp 0",
              phone: "+62 812-xxxx-0002",
              permissions: { qrisGenerate: true, voiceAiManage: false, mutationApproval: false, exportReports: false, productEdit: false },
            },
          ];
          const savedTeam = localStorage.getItem(`${tenantKey}_team`);
          setTeamMembers(savedTeam ? JSON.parse(savedTeam) : defaultTeam);
        } else {
          // Default demo data for original seed tenant (Batik Mahakarya / Superadmin)
          const savedPrd = localStorage.getItem("klozer_products");
          if (savedPrd) setProducts(JSON.parse(savedPrd));
          const savedOrd = localStorage.getItem("klozer_orders");
          if (savedOrd) setOrders(JSON.parse(savedOrd));
          const savedLeads = localStorage.getItem("klozer_leads");
          if (savedLeads) setLeads(JSON.parse(savedLeads));
          const savedTeam = localStorage.getItem("klozer_team");
          if (savedTeam) setTeamMembers(JSON.parse(savedTeam));
        }
      } else {
        const savedRole = localStorage.getItem("klozer_role");
        if (savedRole) setRole(savedRole);
      }
      const savedInst = localStorage.getItem("klozer_institutions");
      if (savedInst) setInstitutions(JSON.parse(savedInst));
      const savedAi = localStorage.getItem("klozer_ai_config");
      if (savedAi) setAiConfig(JSON.parse(savedAi));
    } catch (e) {
      console.warn("Storage sync failed:", e);
    }
  }, []);

  const saveToStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage save failed:", e);
    }
  };

  const handleSetRole = (newRole) => {
    setRole(newRole);
    try {
      localStorage.setItem("klozer_role", newRole);
    } catch (e) {}
  };

  const loginUser = async (email, password) => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Login gagal.");
      }
      setToken(data.token);
      setCurrentUser(data.user);
      setRole(data.user.role);
      localStorage.setItem("klozer_token", data.token);
      localStorage.setItem("klozer_user", JSON.stringify(data.user));
      localStorage.setItem("klozer_role", data.user.role);
      return data;
    } catch (err) {
      // Fallback local mock login
      const mockRole = email.includes("superadmin") ? "superadmin" : email.includes("cs") ? "cs" : "owner";
      const mockUser = {
        id: mockRole === "superadmin" ? 1 : mockRole === "owner" ? 2 : 3,
        name: mockRole === "superadmin" ? "Platform Superadmin" : mockRole === "owner" ? "Hendra Wijaya" : "Siti Rahma (CS)",
        email,
        role: mockRole,
        institutionName: "Batik Mahakarya Solo",
      };
      setCurrentUser(mockUser);
      setRole(mockRole);
      localStorage.setItem("klozer_user", JSON.stringify(mockUser));
      localStorage.setItem("klozer_role", mockRole);
      return { success: true, user: mockUser };
    }
  };

  const registerUser = async (regData) => {
    try {
      const res = await fetch("http://localhost:5000/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Pendaftaran gagal.");
      }
      return data;
    } catch (err) {
      return {
        success: true,
        credentialsBundle: {
          institutionName: regData.institutionName,
          loginUrl: "/login",
          email: regData.email,
          temporaryPassword: "Pass" + Math.floor(1000 + Math.random() * 9000) + "!",
          role: "Owner / Supervisor",
        },
      };
    }
  };

  const logoutUser = () => {
    setToken(null);
    setCurrentUser(null);
    try {
      localStorage.removeItem("klozer_token");
      localStorage.removeItem("klozer_user");
      localStorage.removeItem("klozer_role");
    } catch (e) {}
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  // ==================== CRUD: INSTITUTIONS ====================
  const addInstitution = (newInst) => {
    const id = `INST-00${institutions.length + 1}`;
    const entry = {
      ...newInst,
      id,
      quotaUsed: 0,
      joinedDate: "Hari ini",
      status: "active",
      modules: {
        qris: true,
        voiceAi: true,
        antiFraud: true,
        metaCapi: true,
        multiCs: true,
        ...newInst.modules,
      },
    };
    const updated = [entry, ...institutions];
    setInstitutions(updated);
    saveToStorage("klozer_institutions", updated);
    return entry;
  };

  const updateInstitution = (id, fields) => {
    const updated = institutions.map((item) =>
      item.id === id ? { ...item, ...fields } : item
    );
    setInstitutions(updated);
    saveToStorage("klozer_institutions", updated);
  };

  const toggleInstitutionModule = (instId, moduleKey) => {
    const updated = institutions.map((item) => {
      if (item.id === instId) {
        return {
          ...item,
          modules: {
            ...item.modules,
            [moduleKey]: !item.modules[moduleKey],
          },
        };
      }
      return item;
    });
    setInstitutions(updated);
    saveToStorage("klozer_institutions", updated);
  };

  const deleteInstitution = (id) => {
    const updated = institutions.filter((item) => item.id !== id);
    setInstitutions(updated);
    saveToStorage("klozer_institutions", updated);
  };

  // ==================== CRUD: PRODUCTS ====================
  const addProduct = (prd) => {
    const id = `PRD-0${products.length + 1}`;
    const entry = {
      ...prd,
      id,
      sku: prd.sku || `KLZ-PRD-0${products.length + 1}`,
      active: true,
      variants: prd.variants && prd.variants.length ? prd.variants : ["Standard"],
    };
    const updated = [entry, ...products];
    setProducts(updated);
    saveToStorage("klozer_products", updated);
    return entry;
  };

  const updateProduct = (id, fields) => {
    const updated = products.map((p) => (p.id === id ? { ...p, ...fields } : p));
    setProducts(updated);
    saveToStorage("klozer_products", updated);
  };

  const toggleProductStatus = (id) => {
    const updated = products.map((p) => (p.id === id ? { ...p, active: !p.active } : p));
    setProducts(updated);
    saveToStorage("klozer_products", updated);
  };

  const deleteProduct = (id) => {
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    saveToStorage("klozer_products", updated);
  };

  const importProducts = (newItems, mode = "append") => {
    const formatted = newItems.map((prd, idx) => ({
      id: `PRD-${Date.now()}-${idx}`,
      name: prd.name,
      sku: prd.sku || `KLZ-PRD-${Math.floor(100 + Math.random() * 900)}`,
      category: prd.category || "Umum",
      price: Number(prd.price) || 0,
      hpp: Number(prd.hpp) || 0,
      stock: Number(prd.stock) || 0,
      lowStock: Number(prd.lowStock) || 5,
      variants: Array.isArray(prd.variants) ? prd.variants : (typeof prd.variants === "string" ? prd.variants.split(",").map((v) => v.trim()) : ["Standard"]),
      active: true,
    }));
    const updated = mode === "replace" ? formatted : [...formatted, ...products];
    setProducts(updated);
    saveToStorage("klozer_products", updated);
    return updated;
  };

  const importStock = (stockList) => {
    const skuMap = new Map();
    stockList.forEach((s) => {
      if (s.sku) skuMap.set(String(s.sku).trim().toUpperCase(), Number(s.newStock));
    });
    const updated = products.map((p) => {
      const pSku = String(p.sku || "").trim().toUpperCase();
      if (skuMap.has(pSku)) {
        return { ...p, stock: skuMap.get(pSku) };
      }
      return p;
    });
    setProducts(updated);
    saveToStorage("klozer_products", updated);
    return updated;
  };

  // ==================== CRUD: ORDERS ====================
  const addOrder = (newOrder) => {
    const id = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const dateStr = `${now.getDate()} Agu 2026, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} WIB`;
    const entry = {
      id,
      ...newOrder,
      date: dateStr,
      status: newOrder.status || "paid",
      awb: newOrder.awb || (newOrder.status === "paid" ? `JX${Math.floor(100000000 + Math.random() * 900000000)}` : ""),
    };
    const updated = [entry, ...orders];
    setOrders(updated);
    saveToStorage("klozer_orders", updated);
    return entry;
  };

  const updateOrderStatus = (id, newStatus, extra = {}) => {
    const updated = orders.map((o) => {
      if (o.id === id) {
        return {
          ...o,
          status: newStatus,
          ...extra,
        };
      }
      return o;
    });
    setOrders(updated);
    saveToStorage("klozer_orders", updated);
  };

  const deleteOrder = (id) => {
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    saveToStorage("klozer_orders", updated);
  };

  // ==================== CRUD: LEADS ====================
  const addLead = (lead) => {
    const id = `LEAD-${Math.floor(100 + Math.random() * 900)}`;
    const entry = {
      id,
      ...lead,
      codScore: lead.codScore || 85,
      codRisk: lead.codRisk || (lead.codScore > 80 ? "low" : lead.codScore > 60 ? "medium" : "high"),
      lastInteraction: "Baru saja",
    };
    const updated = [entry, ...leads];
    setLeads(updated);
    saveToStorage("klozer_leads", updated);
    return entry;
  };

  const updateLead = (id, fields) => {
    const updated = leads.map((l) => (l.id === id ? { ...l, ...fields } : l));
    setLeads(updated);
    saveToStorage("klozer_leads", updated);
  };

  const deleteLead = (id) => {
    const updated = leads.filter((l) => l.id !== id);
    setLeads(updated);
    saveToStorage("klozer_leads", updated);
  };

  const importContacts = (contactList, mode = "append") => {
    const formatted = contactList.map((c, idx) => ({
      id: `LEAD-${Date.now()}-${idx}`,
      name: c.name,
      phone: c.phone,
      email: c.email || "-",
      city: c.city || "Indonesia",
      category: c.category || "Lead Baru",
      totalSpent: Number(c.totalSpent) || 0,
      codScore: 85,
      codRisk: "low",
      lastInteraction: "Diimpor CSV",
    }));
    const updated = mode === "replace" ? formatted : [...formatted, ...leads];
    setLeads(updated);
    saveToStorage("klozer_leads", updated);
    return updated;
  };

  // ==================== CRUD: TEAM ====================
  const addTeamMember = (member) => {
    const id = `USR-0${teamMembers.length + 1}`;
    const entry = {
      id,
      ...member,
      status: "active",
      csClosingRate: member.role.includes("CS") ? "75%" : "-",
      revenueGen: member.role.includes("CS") ? "Rp 10.000.000" : "-",
      permissions: member.permissions || {
        qrisGenerate: true,
        voiceAiManage: false,
        mutationApproval: false,
        exportReports: false,
        productEdit: false,
      },
    };
    const updated = [...teamMembers, entry];
    setTeamMembers(updated);
    saveToStorage("klozer_team", updated);
    return entry;
  };

  const updateTeamMemberPermissions = (id, permissionKey) => {
    const updated = teamMembers.map((m) => {
      if (m.id === id) {
        return {
          ...m,
          permissions: {
            ...m.permissions,
            [permissionKey]: !m.permissions[permissionKey],
          },
        };
      }
      return m;
    });
    setTeamMembers(updated);
    saveToStorage("klozer_team", updated);
  };

  const deleteTeamMember = (id) => {
    const updated = teamMembers.filter((m) => m.id !== id);
    setTeamMembers(updated);
    saveToStorage("klozer_team", updated);
  };

  // ==================== AI CONFIGURATION ====================
  const updateAiGlobalConfig = (fields) => {
    const updated = { ...aiConfig, ...fields };
    setAiConfig(updated);
    saveToStorage("klozer_ai_config", updated);
  };

  const updateSpvAiPersona = (personaFields) => {
    const updated = {
      ...aiConfig,
      spvPersona: {
        ...aiConfig.spvPersona,
        ...personaFields,
      },
    };
    setAiConfig(updated);
    saveToStorage("klozer_ai_config", updated);
  };

  return (
    <DashboardContext.Provider
      value={{
        role,
        setRole: handleSetRole,
        currentUser,
        token,
        loginUser,
        registerUser,
        logoutUser,
        institutions,
        activeInstitution:
          institutions.find((i) => i.id === activeInstitutionId || i.name?.toLowerCase() === currentUser?.institutionName?.toLowerCase()) ||
          (currentUser?.institutionName
            ? {
                id: currentUser.institutionId || "INST-ACTIVE",
                name: currentUser.institutionName,
                sector: currentUser.sector || "Bisnis & Retail",
                owner: currentUser.name,
                email: currentUser.email,
                tier: "Pro Plan",
                status: "active",
                modules: { qris: true, voiceAi: true, antiFraud: true, metaCapi: true, multiCs: true },
              }
            : institutions[0]),
        activeInstitutionId,
        setActiveInstitutionId,
        addInstitution,
        updateInstitution,
        toggleInstitutionModule,
        deleteInstitution,
        products,
        addProduct,
        updateProduct,
        toggleProductStatus,
        deleteProduct,
        importProducts,
        importStock,
        orders,
        addOrder,
        updateOrderStatus,
        deleteOrder,
        leads,
        addLead,
        updateLead,
        deleteLead,
        importContacts,
        teamMembers,
        addTeamMember,
        updateTeamMemberPermissions,
        deleteTeamMember,
        aiConfig,
        updateAiGlobalConfig,
        updateSpvAiPersona,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
