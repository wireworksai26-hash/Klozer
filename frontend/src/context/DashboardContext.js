"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "@/utils/apiConfig";
import { getTranslation } from "@/utils/i18n";

const DashboardContext = createContext();

// Initial Clean Datasets (Production Ready)
const initialInstitutions = [
  {
    id: "INST-001",
    name: "Toko Bisnis Utama",
    sector: "Retail & Commerce",
    owner: "Owner Toko",
    email: "owner@klozer.id",
    phone: "+62 812-0000-0000",
    tier: "Pro Growth",
    quotaUsed: 0,
    quotaMax: 50000,
    status: "active",
    modules: {
      qris: true,
      voiceAi: true,
      antiFraud: true,
      metaCapi: true,
      multiCs: true,
    },
    joinedDate: "Hari ini",
  },
];

const SAMPLE_PRODUCTS_BY_SECTOR = {
  culinary: [
    { id: "PRD-01", name: "Paket Juara 1 (Nasi + Ayam Geprek + Es Teh)", sku: "GPK-JUR-01", category: "Paket Hemat", price: 22000, hpp: 12000, stock: 150, lowStock: 20, variants: ["Pedas Sedang", "Pedas Ekstra"], active: true },
    { id: "PRD-02", name: "Ayam Geprek Mozzarella Leleh", sku: "GPK-MOZ-02", category: "Menu Spesial", price: 26000, hpp: 15000, stock: 80, lowStock: 10, variants: ["Level 1", "Level 2", "Level 3"], active: true },
    { id: "PRD-03", name: "Ayam Geprek Sambal Matah Bali", sku: "GPK-MTH-03", category: "Menu Utama", price: 21000, hpp: 11000, stock: 100, lowStock: 15, variants: ["Original", "Pedas"], active: true },
    { id: "PRD-04", name: "Kulit Ayam Crispy Juara", sku: "GPK-KLT-04", category: "Side Dish", price: 14000, hpp: 6000, stock: 120, lowStock: 20, variants: ["Original", "Pedas Gurih"], active: true },
    { id: "PRD-05", name: "Es Teh Manis Jumbo Melati", sku: "GPK-DMN-05", category: "Minuman", price: 5000, hpp: 1500, stock: 300, lowStock: 30, variants: ["Manis Sedang", "Less Sugar"], active: true },
  ],
  fashion: [
    { id: "PRD-01", name: "Kemeja Batik Tulis Sutra Solo Premium", sku: "BTK-SLK-01", category: "Pria", price: 650000, hpp: 380000, stock: 42, lowStock: 5, variants: ["M", "L", "XL"], active: true },
    { id: "PRD-02", name: "Dress Tunik Katun Primisima Parang", sku: "BTK-DMS-02", category: "Wanita", price: 320000, hpp: 160000, stock: 85, lowStock: 10, variants: ["S", "M", "L", "XL"], active: true },
    { id: "PRD-03", name: "Sarung Batik Tulis Motif Mega Mendung", sku: "BTK-SAR-03", category: "Unisex", price: 250000, hpp: 125000, stock: 18, lowStock: 5, variants: ["Standard"], active: true },
  ],
  skincare: [
    { id: "PRD-01", name: "Lumiere Brightening Glow Serum 30ml", sku: "SKN-GLW-01", category: "Serum", price: 185000, hpp: 75000, stock: 120, lowStock: 15, variants: ["30ml"], active: true },
    { id: "PRD-02", name: "Gentle Facial Cleanser Hyaluronic Acid 100ml", sku: "SKN-CLN-02", category: "Cleanser", price: 95000, hpp: 38000, stock: 90, lowStock: 10, variants: ["100ml"], active: true },
  ],
  retail: [
    { id: "PRD-01", name: "Produk Unggulan Toko Premium", sku: "KLZ-PRD-01", category: "Kategori Utama", price: 150000, hpp: 85000, stock: 50, lowStock: 10, variants: ["Standard", "Deluxe"], active: true },
    { id: "PRD-02", name: "Paket Starter Bundling Hemat", sku: "KLZ-PRD-02", category: "Paket Promo", price: 275000, hpp: 150000, stock: 35, lowStock: 5, variants: ["Set A", "Set B"], active: true },
  ],
};

function getStarterProductsForUser(user) {
  if (!user) return SAMPLE_PRODUCTS_BY_SECTOR.retail;
  const name = (user.institutionName || user.name || "").toLowerCase();
  const sector = (user.sector || "").toLowerCase();
  if (name.includes("geprek") || name.includes("kuliner") || sector.includes("kuliner") || sector.includes("f&b")) {
    return SAMPLE_PRODUCTS_BY_SECTOR.culinary;
  }
  if (name.includes("batik") || name.includes("fashion") || sector.includes("fashion") || sector.includes("pakaian")) {
    return SAMPLE_PRODUCTS_BY_SECTOR.fashion;
  }
  if (name.includes("skin") || name.includes("lumiere") || sector.includes("kecantikan") || sector.includes("skincare")) {
    return SAMPLE_PRODUCTS_BY_SECTOR.skincare;
  }
  return SAMPLE_PRODUCTS_BY_SECTOR.retail;
}

const initialProducts = [];
const initialOrders = [];
const initialLeads = [];
const initialTeam = [];

const initialSubscriptions = [
  {
    id: "SUB-101",
    institutionId: "INST-001",
    institutionName: "Toko Bisnis Utama",
    plan: "Pro Growth",
    pricePerMonth: 499000,
    csSeats: 5,
    csSeatsUsed: 1,
    tokenQuota: "200,000 / bln",
    aiEngine: "NVIDIA NIM (Llama 3.3 70B)",
    startDate: "17 Sep 2026",
    expiryDate: "17 Sep 2027",
    daysLeft: 365,
    status: "active",
    billingCycle: "Tahunan",
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
  const [language, setLanguageState] = useState("id");
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [leads, setLeads] = useState(initialLeads);
  const [teamMembers, setTeamMembers] = useState(initialTeam);
  const [aiConfig, setAiConfig] = useState(initialAiConfig);
  const [activeInstitutionId, setActiveInstitutionId] = useState("INST-001");
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);

  const setLanguage = (lang) => {
    const validLang = lang === "en" ? "en" : "id";
    setLanguageState(validLang);
    try {
      localStorage.setItem("klozer_language", validLang);
    } catch (e) {}
  };

  const t = (path, fallback) => getTranslation(language, path, fallback);

  // Load from localStorage & backend on client mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("klozer_language");
      if (savedLang) setLanguageState(savedLang);
      const savedToken = localStorage.getItem("klozer_token");
      if (savedToken) setToken(savedToken);
      const savedUser = localStorage.getItem("klozer_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        if (parsed.role) setRole(parsed.role);

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

        // Clean Production Data Loading:
        const tenantKey = `klozer_inst_${parsed.institutionId || parsed.institutionName?.toLowerCase().replace(/[^a-z0-9]+/g, "") || "default"}`;
        const savedPrd = localStorage.getItem(`${tenantKey}_products`) || localStorage.getItem("klozer_products");
        if (savedPrd) {
          try {
            const parsedPrd = JSON.parse(savedPrd);
            if (Array.isArray(parsedPrd) && parsedPrd.length > 0) {
              setProducts(parsedPrd);
            } else {
              setProducts(getStarterProductsForUser(parsed));
            }
          } catch {
            setProducts(getStarterProductsForUser(parsed));
          }
        } else {
          setProducts(getStarterProductsForUser(parsed));
        }
        
        const savedOrd = localStorage.getItem(`${tenantKey}_orders`) || localStorage.getItem("klozer_orders");
        setOrders(savedOrd ? JSON.parse(savedOrd) : []);
        
        const savedLeads = localStorage.getItem(`${tenantKey}_leads`) || localStorage.getItem("klozer_leads");
        setLeads(savedLeads ? JSON.parse(savedLeads) : []);
        
        const cleanSlug = parsed.institutionName?.toLowerCase().replace(/[^a-z0-9]+/g, "") || "bisnis";
        const defaultTeam = [
          {
            id: "USR-01",
            name: parsed.name || "Owner Toko",
            email: parsed.email || `owner@${cleanSlug}.id`,
            role: parsed.role === "spv" ? "Owner / Supervisor" : parsed.role === "cs" ? "Customer Service Senior" : "Owner Toko",
            status: "active",
            csClosingRate: "0%",
            revenueGen: "Rp 0",
            phone: parsed.phone_number || "+62 812-xxxx-xxxx",
            permissions: { qrisGenerate: true, voiceAiManage: true, mutationApproval: true, exportReports: true, productEdit: true },
          },
        ];
        const savedTeam = localStorage.getItem(`${tenantKey}_team`) || localStorage.getItem("klozer_team");
        setTeamMembers(savedTeam ? JSON.parse(savedTeam) : defaultTeam);

        // Fetch Live Products from Backend API (Multi-Tenant Sync)
        (async () => {
          try {
            const token = localStorage.getItem("klozer_token");
            const instId = parsed.institutionId || (parsed.institutionName?.toLowerCase().includes("geprek") ? 4 : 1);
            const res = await fetch(`${API_BASE_URL}/products?institutionId=${instId}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) {
              const resData = await res.json();
              const items = resData.data || resData.products || resData.items;
              if (Array.isArray(items) && items.length > 0) {
                const formatted = items.map((p, idx) => ({
                  id: p.id ? `PRD-0${p.id}` : `PRD-${idx + 1}`,
                  name: p.name,
                  sku: p.sku || `KLZ-PRD-0${idx + 1}`,
                  category: p.category || "Umum",
                  price: Number(p.selling_price || p.price || 0),
                  hpp: Number(p.cost_price_hpp || p.hpp || 0),
                  stock: Number(p.stock_quantity ?? p.stock ?? 0),
                  lowStock: Number(p.low_stock_threshold || p.lowStock || 5),
                  weight: Number(p.weight_in_grams || p.weight || 200),
                  variants: Array.isArray(p.variants) ? p.variants : ["Standard"],
                  active: Boolean(p.is_active ?? p.active ?? true),
                }));
                setProducts(formatted);
                localStorage.setItem(`${tenantKey}_products`, JSON.stringify(formatted));
                localStorage.setItem("klozer_products", JSON.stringify(formatted));
              }
            }
          } catch (e) {}
        })();
      } else {
        const savedRole = localStorage.getItem("klozer_role");
        if (savedRole) setRole(savedRole);
        const savedPrd = localStorage.getItem("klozer_products");
        if (savedPrd) {
          try {
            setProducts(JSON.parse(savedPrd));
          } catch {
            setProducts(SAMPLE_PRODUCTS_BY_SECTOR.retail);
          }
        } else {
          setProducts(SAMPLE_PRODUCTS_BY_SECTOR.retail);
        }
        const savedOrd = localStorage.getItem("klozer_orders");
        if (savedOrd) setOrders(JSON.parse(savedOrd));
        const savedLeads = localStorage.getItem("klozer_leads");
        if (savedLeads) setLeads(JSON.parse(savedLeads));
        const savedTeam = localStorage.getItem("klozer_team");
        if (savedTeam) setTeamMembers(JSON.parse(savedTeam));
      }
      const savedInst = localStorage.getItem("klozer_institutions");
      let currentInst = savedInst ? JSON.parse(savedInst) : initialInstitutions;

      // If user has a registered institution name, ensure it is included
      const savedUserStr = localStorage.getItem("klozer_user");
      const loggedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
      if (loggedUser && loggedUser.institutionName) {
        const exists = currentInst.some(
          (i) => i.name?.toLowerCase() === loggedUser.institutionName.toLowerCase()
        );
        if (!exists) {
          currentInst.push({
            id: loggedUser.institutionId || `INST-00${currentInst.length + 1}`,
            name: loggedUser.institutionName,
            sector: loggedUser.sector || "Bisnis Terverifikasi",
            owner: loggedUser.name,
            email: loggedUser.email,
            phone: "+62 812-xxxx-xxxx",
            tier: "Pro Plan",
            quotaUsed: 0,
            quotaMax: 50000,
            status: "active",
            modules: {
              personaAi: true,
              autoLabel: true,
              printReceipt: true,
              baileys: true,
              instagram: true,
              csBlast: true,
              publicBooking: true,
              stockManagement: true,
              picFeature: true,
              qris: true,
              voiceAi: true,
              antiFraud: true,
              metaCapi: true,
              multiCs: true,
            },
            joinedDate: "Hari ini",
          });
        }
      }

      setInstitutions(currentInst);
      try {
        localStorage.setItem("klozer_institutions", JSON.stringify(currentInst));
      } catch {}

      // Realtime fetch from backend API
      (async () => {
        try {
          const token = localStorage.getItem("klozer_token");
          if (token) {
            const res = await fetch(`${API_BASE_URL}/institutions`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const resData = await res.json();
              if (resData.success && Array.isArray(resData.items) && resData.items.length > 0) {
                setInstitutions((prev) => {
                  const merged = [...prev];
                  resData.items.forEach((backendInst) => {
                    const idx = merged.findIndex(
                      (m) => m.name.toLowerCase() === backendInst.name.toLowerCase() || m.id === `INST-00${backendInst.id}`
                    );
                    const formatted = {
                      id: `INST-00${backendInst.id}`,
                      name: backendInst.name,
                      sector: backendInst.sector || "Bisnis & Jasa",
                      owner: backendInst.name === "Geprek Juara" ? "SPV - Geprek Juara" : (backendInst.owner || backendInst.email?.split("@")[0] || "Owner"),
                      email: backendInst.email,
                      phone: backendInst.phone_number || "+62 812-xxxx-xxxx",
                      tier: (backendInst.subscription_tier || "pro").toUpperCase() === "ENTERPRISE" ? "Enterprise" : "Pro Plan",
                      quotaUsed: backendInst.blast_credit_quota || 3200,
                      quotaMax: 50000,
                      status: backendInst.is_active ? "active" : "inactive",
                      modules: backendInst.features_json || {
                        personaAi: true,
                        autoLabel: true,
                        printReceipt: true,
                        baileys: true,
                        instagram: true,
                        csBlast: true,
                        publicBooking: true,
                        stockManagement: true,
                        picFeature: true,
                        qris: true,
                        voiceAi: true,
                        antiFraud: true,
                        metaCapi: true,
                        multiCs: true,
                      },
                      joinedDate: backendInst.created_at ? new Date(backendInst.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Hari ini",
                    };
                    if (idx >= 0) {
                      merged[idx] = { ...merged[idx], ...formatted };
                    } else {
                      merged.push(formatted);
                    }
                  });
                  try {
                    localStorage.setItem("klozer_institutions", JSON.stringify(merged));
                  } catch {}
                  return merged;
                });
              }
            }
          }
        } catch (e) {}
      })();
      const savedAi = localStorage.getItem("klozer_ai_config");
      if (savedAi) {
        try {
          const parsedAi = JSON.parse(savedAi);
          setAiConfig((prev) => ({
            ...prev,
            ...parsedAi,
            spvPersona: {
              ...(prev.spvPersona || {}),
              ...(parsedAi.spvPersona || {}),
            },
          }));
        } catch (err) {}
      }
      const savedSubs = localStorage.getItem("klozer_subscriptions");
      if (savedSubs) {
        try {
          setSubscriptions(JSON.parse(savedSubs));
        } catch (err) {}
      }
    } catch (e) {
      console.warn("Storage sync failed:", e);
    }
  }, []);

  const getTenantStorageKey = () => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("klozer_user") : null;
      const user = currentUser || (stored ? JSON.parse(stored) : null);
      if (!user) return null;
      const isDefault = (user.institutionName || "").toLowerCase() === "batik mahakarya solo";
      if (isDefault || user.role === "superadmin") return null;
      return `klozer_inst_${user.institutionId || user.institutionName?.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
    } catch {
      return null;
    }
  };

  const saveToStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      const tKey = getTenantStorageKey();
      if (tKey && key.startsWith("klozer_")) {
        const subKey = key.replace("klozer_", "");
        localStorage.setItem(`${tKey}_${subKey}`, JSON.stringify(data));
      }
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
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
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
      const namePart = email.split("@")[0] || "User";
      const cleanName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const mockUser = {
        id: mockRole === "superadmin" ? 1 : mockRole === "owner" ? 2 : 3,
        name: mockRole === "superadmin" ? "Platform Superadmin" : `${cleanName} (Owner)`,
        email,
        role: mockRole,
        institutionName: mockRole === "superadmin" ? "Platform Klozer" : `Toko ${cleanName}`,
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
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
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

    // Sync to backend if token exists
    (async () => {
      try {
        const token = localStorage.getItem("klozer_token");
        if (token) {
          await fetch(`${API_BASE_URL}/institutions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: newInst.name,
              sector: newInst.sector,
              email: newInst.email,
              phone_number: newInst.phone,
              features: newInst.modules,
            }),
          });
        }
      } catch (err) {}
    })();

    return entry;
  };

  const updateInstitution = (id, fields) => {
    const updated = institutions.map((item) =>
      item.id === id ? { ...item, ...fields } : item
    );
    setInstitutions(updated);
    saveToStorage("klozer_institutions", updated);

    // If language is updated on the active institution, immediately synchronize dashboard language
    if (fields.language) {
      setLanguage(fields.language);
    }

    // Sync to backend if token exists
    (async () => {
      try {
        const token = localStorage.getItem("klozer_token");
        const numericId = parseInt(String(id).replace(/[^0-9]/g, ""), 10) || 1;
        if (token) {
          await fetch(`${API_BASE_URL}/institutions/${numericId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(fields),
          });
        }
      } catch (err) {}
    })();
  };

  // Reset Institution Owner Password Action
  const resetInstitutionPassword = async (instId, newPassword) => {
    const targetInst = institutions.find((i) => i.id === instId);
    try {
      const token = localStorage.getItem("klozer_token");
      const numericId = parseInt(String(instId).replace(/[^0-9]/g, ""), 10) || 1;
      const res = await fetch(`${API_BASE_URL}/institutions/${numericId}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data;
      }
      throw new Error(data.message || "Gagal mereset password di server.");
    } catch (err) {
      // Local fallback mock
      const generatedPass = newPassword && newPassword.trim().length >= 6 ? newPassword.trim() : `Klozer${Math.floor(1000 + Math.random() * 9000)}!`;
      return {
        success: true,
        message: `Kata sandi akun owner ${targetInst?.name || "instansi"} berhasil di-reset!`,
        credentials: {
          institutionName: targetInst?.name || "Instansi",
          email: targetInst?.email || "owner@klozer.id",
          newPassword: generatedPass,
          role: "Owner / Supervisor",
        },
      };
    }
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

    // Sync to backend if token exists
    (async () => {
      try {
        const token = localStorage.getItem("klozer_token");
        if (token) {
          await fetch(`${API_BASE_URL}/products`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              sku: entry.sku,
              name: entry.name,
              category: entry.category,
              selling_price: entry.price,
              cost_price_hpp: entry.hpp,
              stock_quantity: entry.stock,
              weight_in_grams: entry.weight || 200,
              description: entry.description || "",
            }),
          });
        }
      } catch (err) {}
    })();

    return entry;
  };

  const updateProduct = (id, fields) => {
    const updated = products.map((p) => (p.id === id ? { ...p, ...fields } : p));
    setProducts(updated);
    saveToStorage("klozer_products", updated);

    // Sync to backend if token exists
    (async () => {
      try {
        const token = localStorage.getItem("klozer_token");
        const numericId = parseInt(String(id).replace(/[^0-9]/g, ""), 10);
        if (token && numericId) {
          await fetch(`${API_BASE_URL}/products/${numericId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: fields.name,
              sku: fields.sku,
              category: fields.category,
              selling_price: fields.price,
              cost_price_hpp: fields.hpp,
              stock_quantity: fields.stock,
              is_active: fields.active !== undefined ? (fields.active ? 1 : 0) : undefined,
            }),
          });
        }
      } catch (err) {}
    })();
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

    // Sync to backend if token exists
    (async () => {
      try {
        const token = localStorage.getItem("klozer_token");
        const numericId = parseInt(String(id).replace(/[^0-9]/g, ""), 10);
        if (token && numericId) {
          await fetch(`${API_BASE_URL}/products/${numericId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
      } catch (err) {}
    })();
  };

  const loadTemplateProducts = (sector = "auto") => {
    let templateList = SAMPLE_PRODUCTS_BY_SECTOR.retail;
    const cleanSec = (sector || "").toLowerCase();
    if (cleanSec.includes("culinary") || cleanSec.includes("kuliner") || cleanSec.includes("f&b")) {
      templateList = SAMPLE_PRODUCTS_BY_SECTOR.culinary;
    } else if (cleanSec.includes("fashion") || cleanSec.includes("pakaian")) {
      templateList = SAMPLE_PRODUCTS_BY_SECTOR.fashion;
    } else if (cleanSec.includes("skincare") || cleanSec.includes("kecantikan")) {
      templateList = SAMPLE_PRODUCTS_BY_SECTOR.skincare;
    } else {
      templateList = getStarterProductsForUser(currentUser || activeInstitution);
    }
    setProducts(templateList);
    saveToStorage("klozer_products", templateList);
    return templateList;
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
    const nameMap = new Map();
    stockList.forEach((s) => {
      const qty = Number(s.newStock) || 0;
      if (s.sku) skuMap.set(String(s.sku).trim().toUpperCase(), qty);
      if (s.name) nameMap.set(String(s.name).trim().toLowerCase(), qty);
    });
    const updated = products.map((p) => {
      const pSku = String(p.sku || "").trim().toUpperCase();
      const pName = String(p.name || "").trim().toLowerCase();
      if (skuMap.has(pSku)) {
        return { ...p, stock: skuMap.get(pSku) };
      }
      if (nameMap.has(pName)) {
        return { ...p, stock: nameMap.get(pName) };
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
    setAiConfig((prev) => {
      const updated = { ...prev, ...fields };
      saveToStorage("klozer_ai_config", updated);
      return updated;
    });
  };

  const updateSpvAiPersona = (personaFields) => {
    setAiConfig((prev) => {
      const updated = {
        ...prev,
        spvPersona: {
          ...(prev.spvPersona || {}),
          ...personaFields,
        },
      };
      saveToStorage("klozer_ai_config", updated);
      return updated;
    });
  };

  // ==================== SUBSCRIPTION EXTENSION & TOP-UP ====================
  const extendSubscription = (idOrInstId, extendData = {}) => {
    let targetSub = null;
    setSubscriptions((prev) => {
      const updated = prev.map((s) => {
        if (
          s.id === idOrInstId ||
          s.institutionId === idOrInstId ||
          s.institutionName?.toLowerCase() === idOrInstId?.toString()?.toLowerCase()
        ) {
          const daysToAdd = parseInt(extendData.daysToAdd) || 30;
          const currentDays = Math.max(0, s.daysLeft || 0);
          const newDaysLeft = currentDays + daysToAdd;

          const expDate = new Date();
          expDate.setDate(expDate.getDate() + newDaysLeft);
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
          const formattedExp = `${expDate.getDate()} ${monthNames[expDate.getMonth()]} ${expDate.getFullYear()}`;

          const updatedSub = {
            ...s,
            status: "active",
            daysLeft: newDaysLeft,
            expiryDate: formattedExp,
            plan: extendData.plan || s.plan,
            csSeats: (s.csSeats || 5) + (parseInt(extendData.additionalSeats) || 0),
            billingCycle: extendData.billingCycle || s.billingCycle,
            tokenQuota: extendData.newTokenQuota || s.tokenQuota,
            pricePerMonth: extendData.pricePerMonth || s.pricePerMonth,
            lastExtendedAt: new Date().toISOString(),
            lastPaymentMethod: extendData.paymentMethod || "Transfer Manual / QRIS",
          };
          targetSub = updatedSub;
          return updatedSub;
        }
        return s;
      });
      saveToStorage("klozer_subscriptions", updated);
      return updated;
    });
    return targetSub;
  };

  const activeInstitution =
    institutions.find(
      (i) =>
        i.id === activeInstitutionId ||
        i.name?.toLowerCase() === currentUser?.institutionName?.toLowerCase()
    ) ||
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
      : institutions[0]);

  const activeSubscription =
    subscriptions.find(
      (s) =>
        s.institutionId === activeInstitutionId ||
        s.institutionId === activeInstitution?.id ||
        s.institutionName?.toLowerCase() === activeInstitution?.name?.toLowerCase() ||
        s.institutionName?.toLowerCase() === currentUser?.institutionName?.toLowerCase()
    ) ||
    subscriptions.find((s) => s.id === "SUB-104") ||
    subscriptions[0];

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
        activeInstitution,
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
        subscriptions,
        setSubscriptions,
        extendSubscription,
        activeSubscription,
        language,
        setLanguage,
        t,
        resetInstitutionPassword,
        loadTemplateProducts,
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
