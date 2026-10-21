"use client";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { getTranslation } from "@/utils/i18n";
import { SERVER_BASE_URL } from "@/utils/apiConfig";
import { templateForSector } from "@/utils/sampleCatalogs";
import { api, cacheUser, clearSession, getActingTenant, readCachedUser, setActingTenant, setUnauthorizedHandler } from "@/utils/api";
import {
  DEFAULT_MODULES,
  institutionFromApi,
  institutionToApi,
  leadFromApi,
  leadToApi,
  orderFromApi,
  orderToApi,
  productFromApi,
  productToApi,
  roleToApi,
  teamMemberFromApi,
  toDbId,
  uiRoleFor,
} from "@/utils/mappers.mjs";
import {
  REVALIDATE_INTERVAL_MS,
  decideStorageAction,
  profileScopeChanged,
  shouldRevalidate,
} from "@/utils/sessionSync.mjs";

const DashboardContext = createContext();

/** The profile shape kept in state and in the localStorage copy (never the token). */
function toUiUser(user, institution) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone_number: user.phone_number,
    institutionId: user.institutionId,
    institutionName: user.institutionName ?? institution?.name,
    institutionMode: user.institutionMode ?? institution?.mode,
    sector: user.sector ?? institution?.sector,
  };
}

const MANAGER_ROLES = ["owner", "supervisor", "superadmin"];
const REPORT_ROLES = ["owner", "supervisor", "finance", "superadmin"];
const MAX_PAGES = 10;

// Persona text the owner can edit. Provider keys / models are NOT here: those live on the server.
export const DEFAULT_PERSONA = {
  botName: "",
  tone: "Santai, ramah, dan to the point seperti admin toko di WhatsApp",
  greetingMessage: "",
  abandonedMessage: "",
  customFaqKeywords: "",
  voiceAccent: "Bahasa Indonesia Standar (Aksen Ramah)",
  voiceGender: "Female (Putri)",
};

/** Walk a paginated list endpoint, newest first, up to MAX_PAGES pages. */
async function fetchAll(path, query = {}) {
  const items = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await api.get(path, { query: { ...query, page, limit: 100 } });
    items.push(...(res.items || []));
    if (!res.pagination?.hasNextPage) break;
  }
  return items;
}

export function DashboardProvider({ children }) {
  // booting: checking the stored session | anonymous: no valid session | ready: signed in
  const [status, setStatus] = useState("booting");
  const [role, setRole] = useState("owner");
  const [serverRole, setServerRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguageState] = useState("id");

  const [institutions, setInstitutions] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [aiConfig, setAiConfig] = useState({ spvPersona: DEFAULT_PERSONA });
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [reportSummary, setReportSummary] = useState(null);
  const [myPerformance, setMyPerformance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [activeInstitutionId, setActiveInstitutionIdState] = useState(null);

  const [dataLoading, setDataLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [notifications, setNotifications] = useState([]);
  // Bumps whenever a chat message arrives, so the inbox can refetch the open conversation.
  const [chatEvent, setChatEvent] = useState(null);
  // Task counts for the menu badge, and a bump whenever a task changes so an open task list can refetch.
  const [taskSummary, setTaskSummary] = useState(null);
  const [taskEvent, setTaskEvent] = useState(null);
  // Bumps when the team prices or credits a token top up, so the top up screen can refetch.
  const [topupEvent, setTopupEvent] = useState(null);
  const [billingEvent, setBillingEvent] = useState(null);
  const loadInstitutionsRef = useRef(null);

  // Latest team list for handlers that run after await (kept in a ref so they never read a stale closure).
  const teamRef = useRef([]);
  useEffect(() => {
    teamRef.current = teamMembers;
  }, [teamMembers]);
  // The same for the catalog: a stock change that arrives over the socket is compared with the number on screen.
  const productsRef = useRef([]);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const notify = useCallback((type, message) => setNotice({ type, message, at: Date.now() }), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  /** Run an API action; on failure show the server's message and resolve to null instead of throwing. */
  const attempt = useCallback(
    async (fn, { success, silent = false } = {}) => {
      try {
        const result = await fn();
        if (success) notify("success", success);
        return result;
      } catch (err) {
        if (!silent && err?.status !== 401) notify("error", err?.message || "Terjadi kesalahan.");
        return null;
      }
    },
    [notify]
  );

  // ---------------------------------------------------------------- language
  const setLanguage = (lang) => {
    const valid = lang === "en" ? "en" : "id";
    setLanguageState(valid);
    try {
      window.localStorage.setItem("klozer_language", valid);
    } catch {
      // ignore
    }
  };
  const t = useCallback((path, fallback) => getTranslation(language, path, fallback), [language]);
  // Handlers created once (useCallback) read the current translator from here instead of a stale closure.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  // BCP 47 tag for dates/months so they follow the dashboard language.
  const locale = language === "en" ? "en-US" : "id-ID";

  // ---------------------------------------------------------------- session
  const resetData = useCallback(() => {
    setInstitutions([]);
    setProducts([]);
    setOrders([]);
    setLeads([]);
    setTeamMembers([]);
    setAiConfig({ spvPersona: DEFAULT_PERSONA });
    setWhatsappStatus(null);
    setReportSummary(null);
    setMyPerformance(null);
    setTokenBalance(null);
    setTaskSummary(null);
    setActiveInstitutionIdState(null);
    setNotifications([]);
  }, []);

  // Several in-flight requests can all come back 401 at once; end the session only once.
  const endingRef = useRef(false);
  // Latest profile for event handlers that must not re-subscribe on every render.
  const currentUserRef = useRef(null);
  const lastCheckedRef = useRef(0);

  const endSession = useCallback(
    ({ redirect = true, expired = false } = {}) => {
      if (endingRef.current) return;
      endingRef.current = true;
      currentUserRef.current = null;
      clearSession();
      setCurrentUser(null);
      setServerRole(null);
      resetData();
      setStatus("anonymous");
      if (redirect && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.assign(expired ? "/login?expired=1" : "/login");
      }
    },
    [resetData]
  );

  useEffect(() => {
    setUnauthorizedHandler(() => endSession({ expired: true }));
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  const refreshTaskSummary = useCallback(async () => {
    try {
      const res = await api.get("/tasks", { query: { limit: 1 } });
      setTaskSummary(res.summary ?? null);
    } catch {
      setTaskSummary(null); // the package has no tasks, or this role cannot read them
    }
  }, []);

  // ---------------------------------------------------------------- realtime (Socket.io)
  const pushNotification = useCallback((item) => {
    setNotifications((prev) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, read: false, at: Date.now(), ...item }, ...prev].slice(0, 30));
  }, []);

  useEffect(() => {
    if (status !== "ready") return undefined;

    // The server puts this socket in the caller's own tenant room; there is nothing to choose client-side.
    const socket = io(SERVER_BASE_URL || undefined, { path: "/socket.io", withCredentials: true, transports: ["polling", "websocket"], reconnectionDelayMax: 15000 });

    socket.on("chat:message", (evt) => {
      setChatEvent({ leadId: evt.leadId, at: Date.now() });
      if (evt.direction === "inbound") {
        pushNotification({
          type: "chat",
          title: "Pesan baru dari pelanggan",
          desc: evt.messageType && evt.messageType !== "text" ? "Pelanggan mengirim lampiran." : String(evt.text || "").slice(0, 140),
          link: "/dashboard/chat",
        });
      }
    });
    // Stock and orders move without anyone reloading: an order taken by the AI in chat, a cancellation, an edit by a
    // colleague. The server says which products changed and what their stock is now, so the number on screen is the truth.
    socket.on("stock:changed", (evt) => {
      const changed = Array.isArray(evt?.products) ? evt.products : [];
      if (!changed.length) return;
      const before = new Map(productsRef.current.map((p) => [p.dbId, p.stock]));
      setProducts((prev) => prev.map((p) => {
        const next = changed.find((c) => c.id === p.dbId);
        return next ? { ...p, stock: next.stock } : p;
      }));
      for (const c of changed) {
        const was = before.get(c.id);
        if (was !== undefined && was > c.lowStockThreshold && c.stock <= c.lowStockThreshold) {
          pushNotification({ type: "security", title: c.stock <= 0 ? "Stok habis" : "Stok menipis", desc: `${c.name}: sisa ${c.stock}`, link: "/dashboard/products" });
        }
      }
    });
    let ordersTimer = null;
    const reloadOrders = () => {
      clearTimeout(ordersTimer);
      ordersTimer = setTimeout(() => {
        fetchAll("/orders").then((rows) => setOrders(rows.map(orderFromApi))).catch(() => {});
      }, 400);
    };
    socket.on("order:created", (evt) => {
      reloadOrders();
      if (evt?.createdVia === "chat") pushNotification({ type: "chat", title: "Pesanan baru dari chat", desc: "AI mencatat pesanan pelanggan. Stok sudah dikurangi.", link: "/dashboard/orders" });
    });
    socket.on("order:updated", reloadOrders);
    // a package payment settled (or a bill changed): the plan, features and tokens behind every screen follow without a refresh
    socket.on("billing:updated", () => {
      setBillingEvent({ at: Date.now() });
      api.get("/ai/token-balance").then((r) => setTokenBalance(r.balance)).catch(() => {});
      if (currentUserRef.current) loadInstitutionsRef.current?.(currentUserRef.current)?.catch(() => {});
    });
    socket.on("topup:updated", () => {
      setTopupEvent({ at: Date.now() });
      api.get("/ai/token-balance").then((r) => setTokenBalance(r.balance)).catch(() => {});
    });

    const taskChanged = () => {
      setTaskEvent({ at: Date.now() });
      refreshTaskSummary();
    };
    for (const name of ["task:created", "task:updated", "task:deleted"]) socket.on(name, taskChanged);
    socket.on("task:assigned", (task) => {
      pushNotification({ type: "chat", title: "Tugas baru untuk Anda", desc: String(task?.title || "").slice(0, 140), link: "/dashboard/tasks" });
    });
    socket.on("task:overdue", (task) => {
      taskChanged();
      pushNotification({ type: "security", title: "Tugas melewati tenggat", desc: String(task?.title || "").slice(0, 140), link: "/dashboard/tasks" });
    });
    socket.on("chat:needs_human", (evt) => {
      const reasons = {
        non_text_message: "Pelanggan mengirim gambar/suara. AI tidak membalas lampiran.",
        token_quota_exhausted: "Kuota token AI habis, percakapan perlu dibalas manual.",
        llm_unavailable: "AI sedang tidak tersedia, percakapan perlu dibalas manual.",
        human_escalation: "AI mendeteksi percakapan yang perlu ditangani manusia.",
      };
      pushNotification({ type: "security", title: "Butuh penanganan CS", desc: reasons[evt.reason] || "Percakapan ini perlu dibalas manual.", link: "/dashboard/chat" });
    });

    return () => {
      clearTimeout(ordersTimer);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [status, pushNotification, refreshTaskSummary]);

  const markNotificationRead = (id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllNotificationsRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  // ---------------------------------------------------------------- data loading
  const loadInstitutions = useCallback(async (user) => {
    const list = user.role === "superadmin" ? await fetchAll("/institutions") : (await api.get("/institutions")).items;
    setInstitutions((list || []).map(institutionFromApi));
  }, []);

  useEffect(() => {
    loadInstitutionsRef.current = loadInstitutions;
  }, [loadInstitutions]);

  const loadTeam = useCallback(async (user) => {
    if (!["owner", "supervisor", "finance", "superadmin"].includes(user.role)) {
      setTeamMembers([]);
      return;
    }
    const [users, report] = await Promise.all([
      api.get("/users"),
      REPORT_ROLES.includes(user.role) ? api.get("/reports/summary").catch(() => null) : Promise.resolve(null),
    ]);
    const perf = new Map((report?.data?.csPerformance || []).map((p) => [p.id, p]));
    setTeamMembers((users.items || []).map((u) => teamMemberFromApi(u, perf.get(u.id))));
  }, []);

  const loadPersona = useCallback(async () => {
    const res = await api.get("/ai/persona");
    setAiConfig((prev) => ({ ...prev, spvPersona: { ...DEFAULT_PERSONA, ...(res.persona || {}) } }));
  }, []);

  /** Everything tenant-scoped. Each source fails independently so one bad endpoint does not blank the dashboard. */
  const loadTenantData = useCallback(
    async (user) => {
      setDataLoading(true);
      const results = await Promise.allSettled([
        fetchAll("/products").then((rows) => setProducts(rows.map(productFromApi))),
        user.role === "pic_warehouse" ? Promise.resolve() : fetchAll("/leads").then((rows) => setLeads(rows.map(leadFromApi))),
        fetchAll("/orders").then((rows) => setOrders(rows.map(orderFromApi))),
        loadTeam(user),
        loadPersona(),
        REPORT_ROLES.includes(user.role) ? api.get("/reports/summary").then((r) => setReportSummary(r.data)) : Promise.resolve(),
        user.role === "cs" ? api.get("/reports/my-performance").then((r) => setMyPerformance(r.data)) : Promise.resolve(),
        api.get("/whatsapp/status").then((s) => setWhatsappStatus(s)),
        api.get("/ai/token-balance").then((r) => setTokenBalance(r.balance)),
        user.role === "superadmin" ? Promise.resolve() : refreshTaskSummary(),
      ]);
      const failed = results.filter((r) => r.status === "rejected" && r.reason?.status !== 403 && r.reason?.status !== 401);
      if (failed.length) notify("error", tRef.current("Sebagian data gagal dimuat: {reason}", { reason: failed[0].reason?.message || tRef.current("kesalahan jaringan") }));
      setDataLoading(false);
    },
    [loadTeam, loadPersona, notify, refreshTaskSummary]
  );

  const applyUser = useCallback((user, institution) => {
    const mapped = toUiUser(user, institution);
    endingRef.current = false;
    currentUserRef.current = mapped;
    cacheUser(mapped);
    setCurrentUser(mapped);
    setServerRole(mapped.role);
    setRole(uiRoleFor(mapped.role));
    return mapped;
  }, []);

  const bootstrap = useCallback(async () => {
    const cached = readCachedUser();
    if (cached) {
      currentUserRef.current = cached;
      setCurrentUser(cached);
      setRole(uiRoleFor(cached.role));
      setServerRole(cached.role);
    }
    try {
      // auth:false: a visitor who was never signed in should see the login page, not "session expired".
      const me = await api.get("/auth/me", { auth: false });
      lastCheckedRef.current = Date.now();
      const user = applyUser(me.user, me.institution);
      const acting = getActingTenant();
      if (acting && user.role === "superadmin") setActiveInstitutionIdState(`INST-${String(acting).padStart(3, "0")}`);
      setStatus("ready");
      await Promise.all([loadInstitutions(user), loadTenantData(user)]);
    } catch (err) {
      if (err?.status === 401) {
        endSession({ redirect: true, expired: Boolean(cached) });
        return;
      }
      setStatus(cached ? "ready" : "anonymous");
      notify("error", err?.message || "Gagal memuat sesi.");
    }
  }, [applyUser, endSession, loadInstitutions, loadTenantData, notify]);

  /**
   * Re-asks the server whether this session is still alive and reconciles the cached profile.
   * Only a 401 ends the session; a network or 5xx failure keeps the UI as is (the next check retries).
   */
  const revalidateSession = useCallback(async () => {
    lastCheckedRef.current = Date.now();
    try {
      const me = await api.get("/auth/me", { auth: false });
      const fresh = toUiUser(me.user, me.institution);
      const previous = currentUserRef.current;
      if (JSON.stringify(fresh) === JSON.stringify(previous)) return;
      const user = applyUser(me.user, me.institution);
      // Role or tenant changed on the server: reload the data this account may see.
      if (profileScopeChanged(previous, user)) {
        await Promise.all([loadInstitutions(user), loadTenantData(user)]);
      }
    } catch (err) {
      if (err?.status === 401) endSession({ redirect: true, expired: true });
    }
  }, [applyUser, endSession, loadInstitutions, loadTenantData]);

  // Keep the cached profile honest while the dashboard stays open: re-check when the tab becomes
  // visible again, regains focus or comes back online, on a slow timer, and when another tab signs
  // out or switches account.
  useEffect(() => {
    if (status !== "ready") return undefined;

    const check = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (!shouldRevalidate({ lastCheckedAt: lastCheckedRef.current })) return;
      revalidateSession();
    };
    const onStorage = (event) => {
      const action = decideStorageAction({ key: event.key, newValue: event.newValue, currentUserId: currentUserRef.current?.id });
      if (action === "end") endSession({ redirect: true });
      else if (action === "reload") window.location.reload();
    };
    const onPageShow = (event) => {
      if (event.persisted) revalidateSession();
    };

    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("storage", onStorage);
    const timer = setInterval(check, REVALIDATE_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("storage", onStorage);
      clearInterval(timer);
    };
  }, [status, revalidateSession, endSession]);

  // Hydrate from browser storage and the API once on mount. This is synchronising with external
  // systems (localStorage, network), which is what effects are for.
  useEffect(() => {
    try {
      const savedLang = window.localStorage.getItem("klozer_language");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedLang === "en" || savedLang === "id") setLanguageState(savedLang);
    } catch {
      // ignore
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshData = useCallback(async () => {
    if (!currentUser) return;
    await Promise.all([loadInstitutions(currentUser), loadTenantData(currentUser)]);
  }, [currentUser, loadInstitutions, loadTenantData]);

  const refreshLeads = useCallback(async () => {
    const rows = await fetchAll("/leads");
    setLeads(rows.map(leadFromApi));
  }, []);

  const refreshOrders = useCallback(async () => {
    const rows = await fetchAll("/orders");
    setOrders(rows.map(orderFromApi));
  }, []);

  // ---------------------------------------------------------------- auth actions
  const loginUser = async (email, password) => {
    const data = await api.post("/auth/login", { email, password }, { auth: false });
    const user = applyUser(data.user, data.institution);
    setStatus("ready");
    loadInstitutions(user).catch(() => {});
    loadTenantData(user);
    return data;
  };

  const registerUser = (regData) => api.post("/auth/register", regData, { auth: false });

  const logoutUser = async () => {
    // Ask the server to clear the httpOnly cookie; sign out locally even if that request fails.
    await api.post("/auth/logout", undefined, { auth: false }).catch(() => {});
    endSession({ redirect: true });
  };

  const changePassword = (currentPassword, newPassword) =>
    attempt(
      async () => {
        // the server replaces the session cookie; other devices are signed out
        return api.post("/auth/change-password", { currentPassword, newPassword });
      },
      { success: "Password berhasil diubah." }
    );

  // ---------------------------------------------------------------- acting tenant (superadmin)
  const setActiveInstitutionId = (id) => {
    if (serverRole !== "superadmin") return; // everyone else is pinned to their own tenant by the server
    const dbId = toDbId(id);
    setActingTenant(dbId && dbId !== currentUser?.institutionId ? dbId : null);
    setActiveInstitutionIdState(id);
    if (currentUser) loadTenantData(currentUser);
  };

  // ---------------------------------------------------------------- institutions
  const addInstitution = (newInst) =>
    attempt(
      async () => {
        const res = await api.post("/institutions", {
          name: newInst.name,
          mode: newInst.mode === "ngo" ? "ngo" : "business",
          sector: newInst.sector,
          email: newInst.email,
          phone_number: newInst.phone,
          address: newInst.address,
          features: newInst.modules,
        });
        const entry = institutionFromApi({ ...res.data, owner_name: newInst.owner || null });
        setInstitutions((prev) => [entry, ...prev]);
        return { ...entry, credentialsBundle: res.credentialsBundle };
      },
      { success: "Instansi berhasil dibuat." }
    );

  const updateInstitution = (id, fields) => {
    const dbId = toDbId(id);
    if (!dbId) return Promise.resolve(null);
    return attempt(
      async () => {
        const res = await api.put(`/institutions/${dbId}`, institutionToApi(fields, { superadmin: serverRole === "superadmin" }));
        const entry = institutionFromApi({ ...res.data, owner_name: fields.owner });
        setInstitutions((prev) => prev.map((i) => (i.dbId === dbId ? { ...i, ...entry, owner: i.owner } : i)));
        if (fields.language && dbId === currentUser?.institutionId) setLanguage(fields.language);
        return entry;
      },
      { success: "Instansi berhasil diperbarui." }
    );
  };

  const toggleInstitutionModule = (instId, moduleKey) => {
    const target = institutions.find((i) => i.id === instId);
    if (!target) return Promise.resolve(null);
    const next = !target.modules[moduleKey];
    return attempt(async () => {
      const res = await api.put(`/institutions/${target.dbId}`, { features: { [moduleKey]: next } });
      setInstitutions((prev) => prev.map((i) => (i.id === instId ? { ...i, modules: { ...DEFAULT_MODULES, ...res.data.features_json } } : i)));
      return res;
    });
  };

  const deleteInstitution = (id) => {
    const dbId = toDbId(id);
    return attempt(
      async () => {
        await api.delete(`/institutions/${dbId}`);
        setInstitutions((prev) => prev.map((i) => (i.dbId === dbId ? { ...i, status: "inactive" } : i)));
        return true;
      },
      { success: "Instansi dinonaktifkan. Data tetap tersimpan." }
    );
  };

  const resetInstitutionPassword = async (instId, newPassword) => {
    const dbId = toDbId(instId);
    const res = await api.post(`/institutions/${dbId}/reset-password`, newPassword ? { newPassword } : {});
    return res;
  };

  // ---------------------------------------------------------------- products
  const addProduct = (prd) =>
    attempt(
      async () => {
        const body = productToApi({ ...prd, sku: prd.sku || `SKU-${Date.now().toString(36).toUpperCase()}` });
        const res = await api.post("/products", body);
        const entry = productFromApi(res.data);
        setProducts((prev) => [entry, ...prev]);
        return entry;
      },
      { success: "Produk ditambahkan." }
    );

  const updateProduct = (id, fields) => {
    const dbId = toDbId(id);
    return attempt(async () => {
      const res = await api.put(`/products/${dbId}`, productToApi(fields));
      const entry = productFromApi(res.data);
      setProducts((prev) => prev.map((p) => (p.dbId === dbId ? { ...p, ...entry } : p)));
      return entry;
    });
  };

  const updateProductStock = (id, stock) => updateProduct(id, { stock });

  const toggleProductStatus = (id) => {
    const current = products.find((p) => p.id === id || p.dbId === toDbId(id));
    return current ? updateProduct(id, { active: !current.active }) : Promise.resolve(null);
  };

  const deleteProduct = (id) => {
    const dbId = toDbId(id);
    return attempt(
      async () => {
        await api.delete(`/products/${dbId}`);
        setProducts((prev) => prev.filter((p) => p.dbId !== dbId));
        return true;
      },
      { success: "Produk dihapus." }
    );
  };

  /** Bulk import (Excel/CSV). SKU is the key: existing SKUs are updated. "replace" deactivates SKUs missing from the file. */
  const importProducts = (newItems, mode = "append") =>
    attempt(
      async () => {
        const items = newItems.map((p, idx) => ({
          sku: String(p.sku || `IMP-${Date.now().toString(36)}-${idx}`).trim(),
          name: p.name,
          category: p.category || undefined,
          description: p.description || undefined,
          selling_price: Number(p.price) || 0,
          cost_price_hpp: Number(p.hpp) || 0,
          stock_quantity: Math.max(0, Math.trunc(Number(p.stock) || 0)),
          low_stock_threshold: Math.max(0, Math.trunc(Number(p.lowStock) || 5)),
          weight_in_grams: Math.max(0, Math.trunc(Number(p.weight) || 200)),
        }));
        const res = await api.post("/products/bulk", { items, mode: mode === "replace" ? "replace" : "upsert" });
        const rows = await fetchAll("/products");
        const mapped = rows.map(productFromApi);
        setProducts(mapped);
        notify("success", `${tRef.current("Impor selesai: {created} baru, {updated} diperbarui", { created: res.created, updated: res.updated })}${res.deactivated ? tRef.current(", {count} dinonaktifkan", { count: res.deactivated }) : ""}.`);
        return mapped;
      },
      { silent: false }
    );

  /** Absolute stock levels from a spreadsheet; rows are matched by SKU, then by name. */
  const importStock = (stockList) =>
    attempt(async () => {
      const byName = new Map(products.map((p) => [String(p.name).trim().toLowerCase(), p.sku]));
      const items = stockList
        .map((s) => ({
          sku: s.sku ? String(s.sku).trim() : byName.get(String(s.name || "").trim().toLowerCase()),
          stock_quantity: Math.max(0, Math.trunc(Number(s.newStock) || 0)),
        }))
        .filter((s) => s.sku);
      if (!items.length) {
        notify("error", "Tidak ada baris yang cocok dengan SKU atau nama produk.");
        return products;
      }
      const res = await api.post("/products/stock", { items });
      const rows = await fetchAll("/products");
      const mapped = rows.map(productFromApi);
      setProducts(mapped);
      notify("success", `${tRef.current("{count} stok diperbarui", { count: res.updated })}${res.unknownSkus.length ? tRef.current(", {count} SKU tidak dikenal", { count: res.unknownSkus.length }) : ""}.`);
      return mapped;
    });

  /** Creates the sector's sample catalogue as real products (explicit user action, never automatic). */
  const loadTemplateProducts = (sector = "auto") =>
    importProducts(templateForSector(sector === "auto" ? activeInstitution?.sector || currentUser?.sector : sector), "append");

  // ---------------------------------------------------------------- orders
  const PAYMENT_CHAIN = ["paid", "processing", "shipped", "delivered", "completed"];

  /** Move an order forward step by step to `target`, stopping (with a message) at the first step the server refuses. */
  const advanceOrder = async (dbId, from, target) => {
    const start = from === "waiting_payment" ? -1 : PAYMENT_CHAIN.indexOf(from);
    const end = PAYMENT_CHAIN.indexOf(target);
    for (let i = start + 1; i <= end; i++) {
      await api.patch(`/orders/${dbId}/status`, { status: PAYMENT_CHAIN[i] });
    }
  };

  const reloadOrder = async (dbId) => {
    const res = await api.get(`/orders/${dbId}`);
    return res.data ? orderFromApi(res.data) : null;
  };

  const addOrder = (newOrder) =>
    attempt(async () => {
      const body = orderToApi(newOrder);
      if (!body.items.length) throw new Error("Pilih produk yang valid untuk pesanan ini.");
      // The same key for the same submission: a retry or double-click returns the first order instead of a second one.
      const res = await api.post("/orders", body, newOrder.idempotencyKey ? { headers: { "Idempotency-Key": newOrder.idempotencyKey } } : undefined);
      const created = res.data;
      let warning = null;

      const wanted = newOrder.status;
      if (wanted && PAYMENT_CHAIN.includes(wanted) && created.status === "waiting_payment") {
        try {
          await advanceOrder(created.id, "waiting_payment", wanted);
        } catch (err) {
          warning = `Pesanan dibuat dengan status "Menunggu Bayar": ${err.message}`;
        }
      }
      const entry = (await reloadOrder(created.id)) || orderFromApi(created);
      setOrders((prev) => [entry, ...prev.filter((o) => o.dbId !== entry.dbId)]);
      // Stock comes from the server, not local arithmetic (a replayed order did not reserve stock again).
      fetchAll("/products").then((rows) => setProducts(rows.map(productFromApi))).catch(() => {});
      notify(warning ? "error" : "success", warning || (res.replayed ? "Pesanan ini sudah dibuat sebelumnya." : "Pesanan berhasil dibuat."));
      return entry;
    });

  const updateOrderStatus = (id, newStatus, extra = {}) => {
    const target = orders.find((o) => o.id === id || o.dbId === toDbId(id));
    if (!target) return Promise.resolve(null);
    return attempt(async () => {
      if (PAYMENT_CHAIN.includes(newStatus)) {
        await advanceOrder(target.dbId, target.status, newStatus);
      } else {
        await api.patch(`/orders/${target.dbId}/status`, { status: newStatus });
      }
      if (extra.awb || extra.courier) {
        await api.post("/shipping/book", { order_id: target.dbId, courier_code: extra.courier || "manual", awb_number: extra.awb || undefined });
      }
      const refreshed = await reloadOrder(target.dbId);
      if (refreshed) setOrders((prev) => prev.map((o) => (o.dbId === refreshed.dbId ? refreshed : o)));
      fetchAll("/products").then((rows) => setProducts(rows.map(productFromApi))).catch(() => {});
      return refreshed;
    });
  };

  /** Orders are financial records and are never deleted: "delete" cancels (stock is returned). */
  const deleteOrder = (id) => updateOrderStatus(id, "cancelled");

  // ---------------------------------------------------------------- leads
  const addLead = (lead) =>
    attempt(
      async () => {
        const body = leadToApi({ ...lead, status: lead.status || "new" }, teamRef.current);
        const res = await api.post("/leads", body);
        const entry = leadFromApi({ ...res.data, cs_name: lead.cs });
        setLeads((prev) => [entry, ...prev.filter((l) => l.dbId !== entry.dbId)]);
        return entry;
      },
      { success: "Kontak ditambahkan." }
    );

  const updateLead = (id, fields) => {
    const dbId = toDbId(id);
    return attempt(async () => {
      const res = await api.put(`/leads/${dbId}`, leadToApi(fields, teamRef.current));
      const entry = leadFromApi({ ...res.data, cs_name: fields.cs });
      setLeads((prev) => prev.map((l) => (l.dbId === dbId ? { ...l, ...entry, cs: fields.cs ?? l.cs } : l)));
      return entry;
    });
  };

  const deleteLead = (id) => {
    const dbId = toDbId(id);
    return attempt(
      async () => {
        await api.delete(`/leads/${dbId}`);
        setLeads((prev) => prev.filter((l) => l.dbId !== dbId));
        return true;
      },
      { success: "Kontak dihapus." }
    );
  };

  // ---------------------------------------------------------------- team
  /** Resolves to the new member plus `credentials` ({ email, password }) which are shown once and never stored. */
  const addTeamMember = (member) =>
    attempt(async () => {
      const res = await api.post("/users", {
        name: member.name,
        email: member.email,
        role: roleToApi(member.role),
        phone_number: member.phone || undefined,
        permissions: member.permissions,
      });
      const entry = teamMemberFromApi(res.data);
      setTeamMembers((prev) => [...prev, entry]);
      return { ...entry, credentials: res.credentials };
    });

  const updateTeamMemberPermissions = (id, permissionKey) => {
    const member = teamMembers.find((m) => m.id === id);
    if (!member) return Promise.resolve(null);
    const permissions = { ...member.permissions, [permissionKey]: !member.permissions[permissionKey] };
    setTeamMembers((prev) => prev.map((m) => (m.id === id ? { ...m, permissions } : m)));
    return attempt(async () => {
      await api.put(`/users/${member.dbId}`, { permissions });
      return true;
    }).then((ok) => {
      if (!ok) setTeamMembers((prev) => prev.map((m) => (m.id === id ? member : m)));
      return ok;
    });
  };

  const deleteTeamMember = (id) => {
    const member = teamMembers.find((m) => m.id === id);
    if (!member) return Promise.resolve(null);
    return attempt(
      async () => {
        await api.delete(`/users/${member.dbId}`);
        setTeamMembers((prev) => prev.map((m) => (m.id === id ? { ...m, status: "inactive" } : m)));
        return true;
      },
      { success: "Akun staf dinonaktifkan." }
    );
  };

  const resetTeamMemberPassword = (id) => {
    const member = teamMembers.find((m) => m.id === id);
    if (!member) return Promise.resolve(null);
    return attempt(() => api.post(`/users/${member.dbId}/reset-password`, {}));
  };

  // ---------------------------------------------------------------- AI persona (server-side)
  const updateSpvAiPersona = (personaFields) => {
    const next = { ...(aiConfig.spvPersona || {}), ...personaFields };
    return attempt(
      async () => {
        const body = Object.fromEntries(Object.entries(next).filter(([, v]) => typeof v === "string" && v.trim() !== ""));
        await api.put("/ai/persona", body);
        setAiConfig((prev) => ({ ...prev, spvPersona: next }));
        return next;
      },
      { success: "Persona AI tersimpan." }
    );
  };

  // ---------------------------------------------------------------- subscription (derived from the institution record)
  const subscriptions = institutions.map((i) => ({
        id: `SUB-${String(i.dbId).padStart(3, "0")}`,
        institutionId: i.id,
        institutionName: i.name,
        plan: i.tier,
        status: i.status === "active" ? "active" : "suspended",
        tokenQuotaTotal: i.quotaMax,
        tokenUsed: i.quotaUsed,
        tokenRemaining: Math.max(0, i.quotaMax - i.quotaUsed),
        csSeatsUsed: teamMembers.filter((m) => m.roleKey === "cs" && m.status === "active").length,
        blastCredits: i.blastCredits,
      }));

  /** Superadmin only: raise the AI token quota and/or change the plan. There is no payment processing here. */
  const extendSubscription = (idOrInstId, extendData = {}) => {
    const sub = subscriptions.find((s) => s.id === idOrInstId || s.institutionId === idOrInstId);
    const inst = institutions.find((i) => i.id === sub?.institutionId);
    if (!inst) return Promise.resolve(null);
    const fields = {};
    if (extendData.plan) fields.tier = extendData.plan;
    if (extendData.additionalTokens) fields.quotaMax = inst.quotaMax + Number(extendData.additionalTokens);
    if (extendData.newTokenQuota) fields.quotaMax = Number(extendData.newTokenQuota);
    return updateInstitution(inst.id, fields);
  };

  // ---------------------------------------------------------------- derived
  const actingDbId = serverRole === "superadmin" && activeInstitutionId ? toDbId(activeInstitutionId) : currentUser?.institutionId;
  const activeInstitution =
    institutions.find((i) => i.dbId === actingDbId) ||
    (currentUser?.institutionName
      ? { id: `INST-${String(currentUser.institutionId).padStart(3, "0")}`, dbId: currentUser.institutionId, name: currentUser.institutionName, sector: currentUser.sector || "", modules: { ...DEFAULT_MODULES }, status: "active" }
      : null);

  const activeSubscription = subscriptions.find((s) => s.institutionId === activeInstitution?.id) || null;

  const value = {
    // session
    status,
    isAuthenticated: status === "ready",
    isBooting: status === "booting",
    role,
    serverRole,
    isManager: MANAGER_ROLES.includes(serverRole),
    currentUser,
    loginUser,
    registerUser,
    logoutUser,
    changePassword,
    // shared state / feedback
    dataLoading,
    refreshData,
    refreshOrders,
    refreshLeads,
    notice,
    notify,
    dismissNotice,
    whatsappStatus,
    reportSummary,
    myPerformance,
    tokenBalance,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    chatEvent,
    taskSummary,
    taskEvent,
    topupEvent,
    billingEvent,
    refreshTaskSummary,
    // tenants
    institutions,
    activeInstitution,
    activeInstitutionId,
    setActiveInstitutionId,
    addInstitution,
    updateInstitution,
    toggleInstitutionModule,
    deleteInstitution,
    resetInstitutionPassword,
    // catalogue
    products,
    addProduct,
    updateProduct,
    updateProductStock,
    toggleProductStatus,
    deleteProduct,
    importProducts,
    importStock,
    loadTemplateProducts,
    // sales
    orders,
    addOrder,
    updateOrderStatus,
    deleteOrder,
    leads,
    addLead,
    updateLead,
    deleteLead,
    // team
    teamMembers,
    addTeamMember,
    updateTeamMemberPermissions,
    deleteTeamMember,
    resetTeamMemberPassword,
    // AI + plan
    aiConfig,
    updateSpvAiPersona,
    subscriptions,
    extendSubscription,
    activeSubscription,
    // i18n
    language,
    setLanguage,
    locale,
    t,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
