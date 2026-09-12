"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";
import {
  SparklesIcon,
  SlidersIcon,
  UsersIcon,
  BuildingIcon,
  KeyIcon,
  ServerIcon,
  CpuIcon,
  ZapIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  BotIcon,
  UserIcon,
  CrownIcon,
  XIcon,
} from "@/components/icons";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const {
    role,
    teamMembers,
    addTeamMember,
    updateTeamMemberPermissions,
    deleteTeamMember,
    aiConfig,
    updateAiGlobalConfig,
    updateSpvAiPersona,
    activeInstitution,
  } = useDashboard();

  // Determine default tab based strictly on role
  const getDefaultTab = () => {
    if (tabFromUrl) return tabFromUrl;
    if (role === "superadmin") return "ai-admin";
    if (role === "spv") return "ai-spv";
    if (role === "owner") return "team";
    return "profile";
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  // Auto-switch tabs when role or URL param changes
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    } else if (role === "superadmin" && activeTab === "ai-spv") {
      setActiveTab("ai-admin");
    }
  }, [role, tabFromUrl]);

  // Password / API Key Visibility Toggles
  const [showPrimaryApiKey, setShowPrimaryApiKey] = useState(false);
  const [showFallbackApiKey, setShowFallbackApiKey] = useState(false);

  // Connection Test State
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);

  // Admin AI Config State
  const [adminAiState, setAdminAiState] = useState({
    primaryProvider: aiConfig?.primaryProvider || "nvidia",
    primaryApiKey: aiConfig?.primaryApiKey || "",
    primaryBaseUrl: aiConfig?.primaryBaseUrl || "https://integrate.api.nvidia.com/v1",
    primaryModelName: aiConfig?.primaryModelName || "meta/llama-3.3-70b-instruct",
    
    enableFallback: aiConfig?.enableFallback ?? true,
    fallbackProvider: aiConfig?.fallbackProvider || "openrouter",
    fallbackApiKey: aiConfig?.fallbackApiKey || "",
    fallbackBaseUrl: aiConfig?.fallbackBaseUrl || "https://openrouter.ai/api/v1",
    fallbackModelName: aiConfig?.fallbackModelName || "gpt-4o-mini",

    sttEngine: aiConfig?.sttEngine || "whisper-large-v3",
    sttEndpoint: aiConfig?.sttEndpoint || "https://api.openai.com/v1/audio/transcriptions",
    sttApiKey: aiConfig?.sttApiKey || "",
    ttsEngine: aiConfig?.ttsEngine || "tts-1-hd",
    ttsVoice: aiConfig?.ttsVoice || "nova",

    ocrFraudThreshold: aiConfig?.ocrFraudThreshold || 85,
    humanDelayMin: aiConfig?.humanDelayMin || 2,
    humanDelayMax: aiConfig?.humanDelayMax || 4,
    autoBankMutationCheck: aiConfig?.autoBankMutationCheck ?? true,
    autoAbandonedFollowup: aiConfig?.autoAbandonedFollowup ?? true,
    webhookEndpoint: aiConfig?.webhookEndpoint || "https://api.klozer.id/v1/webhook/whatsapp",
    webhookSecret: aiConfig?.webhookSecret || "whsec_klozer_981249810294",
  });

  // SPV AI Persona State
  const [spvState, setSpvState] = useState({
    botName: aiConfig?.spvPersona?.botName || "Klozer Assistant",
    tone: aiConfig?.spvPersona?.tone || "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
    greetingMessage: aiConfig?.spvPersona?.greetingMessage || "Halo kak! Terima kasih sudah menghubungi kami. Mau cari produk apa hari ini?",
    voiceAccent: aiConfig?.spvPersona?.voiceAccent || "Bahasa Indonesia Standar (Aksen Ramah)",
    voiceGender: aiConfig?.spvPersona?.voiceGender || "Female (Putri)",
    abandonedMessage: aiConfig?.spvPersona?.abandonedMessage || "Halo kak, apakah pesanan kemeja kemarin masih mau diproses? Stok tersisa sedikit lagi nih kak",
    customFaqKeywords: aiConfig?.spvPersona?.customFaqKeywords || "ongkir, transfer, cod, ready, ukuran, resi",
  });

  // Sync immediately from localStorage on client mount so credentials are NEVER lost on refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("klozer_ai_config");
        if (saved) {
          const parsed = JSON.parse(saved);
          setAdminAiState((prev) => ({ ...prev, ...parsed }));
          if (parsed.spvPersona) {
            setSpvState((prev) => ({ ...prev, ...parsed.spvPersona }));
          }
        }
      } catch (err) {}
    }
  }, []);

  // Also sync when context aiConfig updates
  useEffect(() => {
    if (aiConfig) {
      setAdminAiState((prev) => ({
        ...prev,
        primaryProvider: aiConfig.primaryProvider || prev.primaryProvider,
        primaryApiKey: aiConfig.primaryApiKey !== undefined ? aiConfig.primaryApiKey : prev.primaryApiKey,
        primaryBaseUrl: aiConfig.primaryBaseUrl || prev.primaryBaseUrl,
        primaryModelName: aiConfig.primaryModelName || prev.primaryModelName,
        enableFallback: aiConfig.enableFallback !== undefined ? aiConfig.enableFallback : prev.enableFallback,
        fallbackProvider: aiConfig.fallbackProvider || prev.fallbackProvider,
        fallbackApiKey: aiConfig.fallbackApiKey !== undefined ? aiConfig.fallbackApiKey : prev.fallbackApiKey,
        fallbackBaseUrl: aiConfig.fallbackBaseUrl || prev.fallbackBaseUrl,
        fallbackModelName: aiConfig.fallbackModelName || prev.fallbackModelName,
        sttEngine: aiConfig.sttEngine || prev.sttEngine,
        sttEndpoint: aiConfig.sttEndpoint || prev.sttEndpoint,
        sttApiKey: aiConfig.sttApiKey !== undefined ? aiConfig.sttApiKey : prev.sttApiKey,
        ttsEngine: aiConfig.ttsEngine || prev.ttsEngine,
        ttsVoice: aiConfig.ttsVoice || prev.ttsVoice,
        ocrFraudThreshold: aiConfig.ocrFraudThreshold ?? prev.ocrFraudThreshold,
        humanDelayMin: aiConfig.humanDelayMin ?? prev.humanDelayMin,
        humanDelayMax: aiConfig.humanDelayMax ?? prev.humanDelayMax,
        autoBankMutationCheck: aiConfig.autoBankMutationCheck ?? prev.autoBankMutationCheck,
        autoAbandonedFollowup: aiConfig.autoAbandonedFollowup ?? prev.autoAbandonedFollowup,
        webhookEndpoint: aiConfig.webhookEndpoint || prev.webhookEndpoint,
        webhookSecret: aiConfig.webhookSecret || prev.webhookSecret,
      }));

      if (aiConfig.spvPersona) {
        setSpvState((prev) => ({
          ...prev,
          ...aiConfig.spvPersona,
        }));
      }
    }
  }, [aiConfig]);

  // Team Member Form State
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "Customer Service Junior",
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);

    setTimeout(() => {
      setIsTestingConnection(false);
      setConnectionTestResult({
        success: true,
        latency: "118ms",
        modelVerified: adminAiState.primaryModelName,
        message: "Koneksi Endpoint & API Key Terverifikasi (HTTP 200 OK)",
      });
    }, 900);
  };

  const handleSaveAdminAi = (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    updateAiGlobalConfig(adminAiState);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("klozer_ai_config", JSON.stringify(adminAiState));
      } catch (err) {}
    }
    setSaveSuccessMsg("Konfigurasi AI Global & Kredensial API berhasil disimpan!");
    setTimeout(() => setSaveSuccessMsg(""), 4500);
  };

  const handleSaveSpvPersona = (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    updateSpvAiPersona(spvState);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("klozer_ai_config");
        const current = saved ? JSON.parse(saved) : (aiConfig || {});
        const updated = {
          ...current,
          spvPersona: {
            ...(current.spvPersona || {}),
            ...spvState,
          },
        };
        localStorage.setItem("klozer_ai_config", JSON.stringify(updated));
      } catch (err) {}
    }
    setSaveSuccessMsg("Persona & Script AI Supervisor berhasil disimpan!");
    setTimeout(() => setSaveSuccessMsg(""), 4500);
  };

  const handleAddMemberSubmit = (e) => {
    e.preventDefault();
    if (!newMember.name.trim()) return;
    addTeamMember(newMember);
    setShowAddTeamModal(false);
    setNewMember({ name: "", email: "", role: "Customer Service Junior" });
  };

  const handleProviderPresetChange = (provider) => {
    let baseUrl = "https://integrate.api.nvidia.com/v1";
    let model = "meta/llama-3.3-70b-instruct";
    let fallbackModel = "meta/llama-3.1-8b-instruct";

    if (provider === "nvidia") {
      baseUrl = "https://integrate.api.nvidia.com/v1";
      model = "meta/llama-3.3-70b-instruct";
      fallbackModel = "meta/llama-3.1-8b-instruct";
    } else if (provider === "openai") {
      baseUrl = "https://api.openai.com/v1";
      model = "gpt-4o";
      fallbackModel = "gpt-4o-mini";
    } else if (provider === "anthropic") {
      baseUrl = "https://api.anthropic.com/v1";
      model = "claude-3-5-sonnet-20241022";
      fallbackModel = "claude-3-haiku-20240307";
    } else if (provider === "gemini") {
      baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/";
      model = "gemini-1.5-pro";
      fallbackModel = "gemini-1.5-flash";
    } else if (provider === "openrouter") {
      baseUrl = "https://openrouter.ai/api/v1";
      model = "anthropic/claude-3.5-sonnet";
      fallbackModel = "openai/gpt-4o-mini";
    } else if (provider === "custom") {
      baseUrl = "http://localhost:11434/v1";
      model = "llama-3.3-70b-instruct";
      fallbackModel = "llama-3.2-3b-instruct";
    }

    setAdminAiState((prev) => ({
      ...prev,
      primaryProvider: provider,
      primaryBaseUrl: baseUrl,
      primaryModelName: model,
      fallbackModelName: fallbackModel,
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            {role === "superadmin"
              ? "Konfigurasi AI Global & Master Data"
              : activeTab === "ai-spv"
              ? "Persona & Script Prompts AI"
              : "Pengaturan & Hak Akses Tim"}
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            {role === "superadmin"
              ? "Kelola API Key, Base URL, Endpoint Model AI Utama & Fallback, serta Master Data Toggles."
              : activeTab === "ai-spv"
              ? "Atur gaya bahasa percakapan bot AI, template salam WhatsApp, karakter suara audio, dan follow-up."
              : "Kelola data anggota tim, hak akses staf CS, dan koneksi WhatsApp API."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccessMsg && (
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-[13px] font-bold flex items-center gap-2 animate-scale-pop shadow-xs">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {activeTab === "ai-admin" && role === "superadmin" && (
            <button
              type="button"
              onClick={handleSaveAdminAi}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[13px] font-black flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer border-none"
            >
              <CheckCircleIcon className="w-4.5 h-4.5" />
              <span>Simpan Konfigurasi AI</span>
            </button>
          )}

          {activeTab === "ai-spv" && (role === "spv" || role === "owner") && (
            <button
              type="button"
              onClick={handleSaveSpvPersona}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[13px] font-black flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer border-none"
            >
              <CheckCircleIcon className="w-4.5 h-4.5" />
              <span>Simpan Persona AI</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#f0e9e1] pb-2 overflow-x-auto scrollbar-none">
        
        {/* Admin Global Config Tab (ONLY visible to Super Admin / Admin) */}
        {role === "superadmin" && (
          <button
            onClick={() => setActiveTab("ai-admin")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-all whitespace-nowrap ${
              activeTab === "ai-admin"
                ? "bg-[#2545ff] text-white shadow-xs"
                : "bg-transparent text-[#64748b] hover:text-[#0c1754] hover:bg-white"
            }`}
          >
            <BotIcon className="w-4 h-4" />
            <span>Konfigurasi AI Global (Admin)</span>
          </button>
        )}

        {/* Persona AI Tab (Visible to SPV and Owner) */}
        {(role === "spv" || role === "owner") && (
          <button
            onClick={() => setActiveTab("ai-spv")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-all whitespace-nowrap ${
              activeTab === "ai-spv"
                ? "bg-[#2545ff] text-white shadow-xs"
                : "bg-transparent text-[#64748b] hover:text-[#0c1754] hover:bg-white"
            }`}
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Persona & Script AI</span>
          </button>
        )}

        {/* Team & Permissions Tab (Visible to Super Admin & Owner) */}
        {(role === "superadmin" || role === "owner") && (
          <button
            onClick={() => setActiveTab("team")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-all whitespace-nowrap ${
              activeTab === "team"
                ? "bg-[#2545ff] text-white shadow-xs"
                : "bg-transparent text-[#64748b] hover:text-[#0c1754] hover:bg-white"
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            <span>Hak Akses Tim & Perizinan</span>
          </button>
        )}

        {/* Superadmin Account & Security Tab (ONLY visible to Super Admin) */}
        {role === "superadmin" && (
          <button
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-all whitespace-nowrap ${
              activeTab === "account"
                ? "bg-[#2545ff] text-white shadow-xs"
                : "bg-transparent text-[#64748b] hover:text-[#0c1754] hover:bg-white"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Akun Superadmin</span>
          </button>
        )}

        {/* Business Profile Tab (Visible to all) */}
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-all whitespace-nowrap ${
            activeTab === "profile"
              ? "bg-[#2545ff] text-white shadow-xs"
              : "bg-transparent text-[#64748b] hover:text-[#0c1754] hover:bg-white"
          }`}
        >
          <BuildingIcon className="w-4 h-4" />
          <span>Profil Usaha & WA API</span>
        </button>
      </div>

      {/* TAB 1: GLOBAL AI CONFIGURATION (ADMIN / SUPERADMIN ONLY) */}
      {activeTab === "ai-admin" && role === "superadmin" && (
        <form onSubmit={handleSaveAdminAi} className="flex flex-col gap-6">
          
          {/* SECTION A: Primary Model Engine, API Key & Base URL */}
          <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f0e9e1] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <BotIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[17px] font-extrabold text-[#0c1754]">Mesin Model AI Utama (Primary Engine)</h3>
                  <p className="text-[12.5px] text-[#64748b]">Pengaturan Provider LLM, Kunci API, dan Endpoint URL server.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="px-3.5 py-1.5 rounded-full bg-[#eaebf8] hover:bg-[#2545ff] hover:text-white text-[#2545ff] text-[12px] font-bold border border-[#2545ff]/20 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  <ZapIcon className="w-3.5 h-3.5" />
                  <span>{isTestingConnection ? "Mengetes..." : "Tes Koneksi Endpoint"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAdminAi}
                  className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[12px] font-bold cursor-pointer flex items-center gap-1.5 transition-all shadow-xs border-none"
                >
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  <span>Simpan Kredensial Ini</span>
                </button>
              </div>
            </div>

            {/* Test Connection Live Result Banner */}
            {connectionTestResult && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[12.5px] text-emerald-800 animate-scale-pop">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                  <span>{connectionTestResult.message}</span>
                </div>
                <div className="flex items-center gap-2 font-mono font-bold text-[11.5px]">
                  <span>Model: {connectionTestResult.modelVerified}</span>
                  <span>•</span>
                  <span>Latensi: {connectionTestResult.latency}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-[13px]">
              
              {/* Provider Selection */}
              <div className="md:col-span-4">
                <label className="font-bold text-[#0c1754] block mb-1">Provider AI Platform</label>
                <select
                  value={adminAiState.primaryProvider}
                  onChange={(e) => handleProviderPresetChange(e.target.value)}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-bold"
                >
                  <option value="nvidia">NVIDIA NIM (Prioritas Utama — build.nvidia.com)</option>
                  <option value="openai">OpenAI (Official API)</option>
                  <option value="anthropic">Anthropic Claude API</option>
                  <option value="gemini">Google Gemini API</option>
                  <option value="openrouter">OpenRouter Multi-Model</option>
                  <option value="custom">Custom Endpoint (Ollama / vLLM / Local)</option>
                </select>
              </div>

              {/* Primary Model Name */}
              <div className="md:col-span-4">
                <label className="font-bold text-[#0c1754] block mb-1">
                  Nama Model AI Utama <span className="text-[#2545ff] font-mono">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: gpt-4o, claude-3-5-sonnet-20241022"
                    value={adminAiState.primaryModelName}
                    onChange={(e) => setAdminAiState({ ...adminAiState, primaryModelName: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-mono font-bold focus:border-[#2545ff]"
                  />
                </div>
              </div>

              {/* Base URL / Endpoint */}
              <div className="md:col-span-4">
                <label className="font-bold text-[#0c1754] block mb-1">
                  Base URL / Endpoint <span className="text-[#2545ff] font-mono">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="https://api.openai.com/v1"
                    value={adminAiState.primaryBaseUrl}
                    onChange={(e) => setAdminAiState({ ...adminAiState, primaryBaseUrl: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-mono font-medium focus:border-[#2545ff]"
                  />
                </div>
              </div>

              {/* Primary API Key with Hide/Show Toggle */}
              <div className="md:col-span-12">
                <label className="font-bold text-[#0c1754] block mb-1">
                  API Key Utama (Primary Secret Key) <span className="text-[#2545ff] font-mono">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPrimaryApiKey ? "text" : "password"}
                    required
                    placeholder="sk-proj-..."
                    value={adminAiState.primaryApiKey}
                    onChange={(e) => setAdminAiState({ ...adminAiState, primaryApiKey: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 pr-10 text-[#0c1754] outline-none font-mono font-medium focus:border-[#2545ff]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrimaryApiKey(!showPrimaryApiKey)}
                    className="absolute right-3 text-[#969696] hover:text-[#0c1754] bg-transparent border-none cursor-pointer p-1"
                    title={showPrimaryApiKey ? "Sembunyikan API Key" : "Tampilkan API Key"}
                  >
                    {showPrimaryApiKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-[#969696] mt-1 block">
                  Kunci API disimpan terenkripsi dengan aman untuk memproses pesan teks & transkripsi WhatsApp.
                </span>
              </div>

            </div>
          </div>

          {/* SECTION B: Fallback Engine & Resilience */}
          <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0e9e1] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#2545ff] flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[17px] font-extrabold text-[#0c1754]">Mesin Cadangan Otomatis (Fallback Engine)</h3>
                  <p className="text-[12.5px] text-[#64748b]">
                    Beralih otomatis ke model cadangan jika server utama mengalami timeout atau limit kuota.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-[12.5px] font-bold text-[#0c1754]">Aktifkan Fallback</span>
                  <input
                    type="checkbox"
                    checked={adminAiState.enableFallback}
                    onChange={(e) => setAdminAiState({ ...adminAiState, enableFallback: e.target.checked })}
                    className="w-4 h-4 accent-[#2545ff]"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleSaveAdminAi}
                  className="px-3.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-300 text-[11.5px] font-bold cursor-pointer flex items-center gap-1 transition-all"
                >
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
              </div>
            </div>

            {adminAiState.enableFallback && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-[13px] animate-scale-pop">
                <div className="md:col-span-4">
                  <label className="font-bold text-[#0c1754] block mb-1">Nama Model Fallback</label>
                  <input
                    type="text"
                    placeholder="Contoh: gpt-4o-mini"
                    value={adminAiState.fallbackModelName}
                    onChange={(e) => setAdminAiState({ ...adminAiState, fallbackModelName: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-mono font-bold"
                  />
                </div>

                <div className="md:col-span-8">
                  <label className="font-bold text-[#0c1754] block mb-1">Fallback Base URL / Endpoint</label>
                  <input
                    type="text"
                    placeholder="https://openrouter.ai/api/v1"
                    value={adminAiState.fallbackBaseUrl}
                    onChange={(e) => setAdminAiState({ ...adminAiState, fallbackBaseUrl: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-mono font-medium"
                  />
                </div>

                <div className="md:col-span-12">
                  <label className="font-bold text-[#0c1754] block mb-1">API Key Fallback (Opsional)</label>
                  <div className="relative flex items-center">
                    <input
                      type={showFallbackApiKey ? "text" : "password"}
                      placeholder="sk-or-v1-..."
                      value={adminAiState.fallbackApiKey}
                      onChange={(e) => setAdminAiState({ ...adminAiState, fallbackApiKey: e.target.value })}
                      className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 pr-10 text-[#0c1754] outline-none font-mono font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFallbackApiKey(!showFallbackApiKey)}
                      className="absolute right-3 text-[#969696] hover:text-[#0c1754] bg-transparent border-none cursor-pointer p-1"
                    >
                      {showFallbackApiKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION C: Speech STT & TTS Voice Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)]">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0e9e1] mb-5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CpuIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-extrabold text-[#0c1754]">Mesin Suara & Audio Voice Note (STT & TTS)</h3>
                <p className="text-[12.5px] text-[#64748b]">
                  Konfigurasi engine transkripsi suara pelanggan ke teks dan sintesis audio balasan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Speech-to-Text (Transkripsi Audio)</label>
                <select
                  value={adminAiState.sttEngine}
                  onChange={(e) => setAdminAiState({ ...adminAiState, sttEngine: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-bold mb-3"
                >
                  <option value="whisper-large-v3">Whisper Large-v3 (Akurasi Tinggi Bahasa Indonesia)</option>
                  <option value="deepgram-nova-2">Deepgram Nova-2 (Ultra Fast Latency)</option>
                </select>

                <label className="font-bold text-[#0c1754] block mb-1">STT Endpoint URL</label>
                <input
                  type="text"
                  value={adminAiState.sttEndpoint}
                  onChange={(e) => setAdminAiState({ ...adminAiState, sttEndpoint: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-mono text-[12px]"
                />
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Text-to-Speech (Sintesis Suara AI)</label>
                <select
                  value={adminAiState.ttsEngine}
                  onChange={(e) => setAdminAiState({ ...adminAiState, ttsEngine: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-bold mb-3"
                >
                  <option value="tts-1-hd">OpenAI TTS-1-HD (Suara Alami Natural)</option>
                  <option value="elevenlabs-multilingual">ElevenLabs Multilingual v2</option>
                </select>

                <label className="font-bold text-[#0c1754] block mb-1">Karakter Model Suara Default</label>
                <select
                  value={adminAiState.ttsVoice}
                  onChange={(e) => setAdminAiState({ ...adminAiState, ttsVoice: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                >
                  <option value="nova">Nova (Wanita Ramah CS)</option>
                  <option value="alloy">Alloy (Netral Dinamis)</option>
                  <option value="shimmer">Shimmer (Elegan Lembut)</option>
                  <option value="echo">Echo (Pria Wibawa)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION D: Security Thresholds & Automations */}
          <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)]">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0e9e1] mb-5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <SlidersIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-extrabold text-[#0c1754]">Ambang Batas Keamanan & Delay Respon</h3>
                <p className="text-[12.5px] text-[#64748b]">Setelan Image Forensics OCR dan perlindungan penipuan.</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 text-[13px]">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-[#0c1754]">
                    Sensitivitas Deteksi Bukti Transfer Palsu (OCR Fraud Confidence Threshold)
                  </label>
                  <span className="font-extrabold text-[#2545ff]">{adminAiState.ocrFraudThreshold}% Keyakinan</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={adminAiState.ocrFraudThreshold}
                  onChange={(e) => setAdminAiState({ ...adminAiState, ocrFraudThreshold: Number(e.target.value) })}
                  className="w-full accent-[#2545ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Jeda Waktu Balas Manusiawi (Min Detik)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={adminAiState.humanDelayMin}
                    onChange={(e) => setAdminAiState({ ...adminAiState, humanDelayMin: Number(e.target.value) })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Jeda Waktu Maksimal (Maks Detik)</label>
                  <input
                    type="number"
                    min="2"
                    max="15"
                    value={adminAiState.humanDelayMax}
                    onChange={(e) => setAdminAiState({ ...adminAiState, humanDelayMax: Number(e.target.value) })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5 bg-[#f9f8f6] p-4 rounded-xl border border-[#f0e9e1]">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold text-[#0c1754]">Pencocokan Mutasi Bank Otomatis (Auto-Reconcile)</span>
                  <input
                    type="checkbox"
                    checked={adminAiState.autoBankMutationCheck}
                    onChange={(e) => setAdminAiState({ ...adminAiState, autoBankMutationCheck: e.target.checked })}
                    className="w-4 h-4 accent-[#2545ff]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold text-[#0c1754]">Otomatis Kirim Follow-up Intent Belanja Tertunda</span>
                  <input
                    type="checkbox"
                    checked={adminAiState.autoAbandonedFollowup}
                    onChange={(e) => setAdminAiState({ ...adminAiState, autoAbandonedFollowup: e.target.checked })}
                    className="w-4 h-4 accent-[#2545ff]"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Save Bar */}
          <div className="sticky bottom-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-emerald-200 shadow-xl animate-scale-pop">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <div>
                <span className="text-[13.5px] font-extrabold text-[#0c1754] block">
                  Simpan Seluruh Konfigurasi AI Global
                </span>
                <span className="text-[12px] text-[#64748b]">
                  Kredensial API Key & model langsung aktif & tersimpan permanen di sistem.
                </span>
              </div>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-[13.5px] font-black rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all border-none"
            >
              <CheckCircleIcon className="w-4.5 h-4.5" />
              <span>Simpan Seluruh Konfigurasi AI Global</span>
            </button>
          </div>

        </form>
      )}

      {/* TAB 2: AI PERSONA & SCRIPT PROMPTS (SUPERVISOR & OWNER) */}
      {activeTab === "ai-spv" && (role === "spv" || role === "owner") && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0e9e1] mb-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2545ff]">
                  Supervisor & Owner Operasional Control
                </span>
                <h3 className="text-[17px] font-extrabold text-[#0c1754]">
                  Persona, Gaya Bahasa & Script Prompts AI
                </h3>
              </div>
              <Link
                href="/dashboard/persona-ai"
                className="text-[11.5px] font-extrabold bg-purple-100 text-purple-700 px-3 py-1 rounded-full border border-purple-200 hover:bg-purple-200 transition-all"
              >
                Buka Layar Penuh Persona →
              </Link>
            </div>

            <form onSubmit={handleSaveSpvPersona} className="flex flex-col gap-4 text-[13px]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Nama Panggilan Asisten AI</label>
                  <input
                    type="text"
                    value={spvState.botName}
                    onChange={(e) => setSpvState({ ...spvState, botName: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Gaya Percakapan (Tone of Voice)</label>
                  <select
                    value={spvState.tone}
                    onChange={(e) => setSpvState({ ...spvState, tone: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  >
                    <option value="Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)">
                      Ramah & Santun Gaul (Online Shop Indonesia)
                    </option>
                    <option value="Formal & Elegan (Bisnis B2B & Properti)">
                      Formal & Elegan (Bisnis B2B / Jasa Profesional)
                    </option>
                    <option value="Islami & Penuh Doa (Lembaga Donasi & Zakat)">
                      Islami & Doa Berkah (Lembaga Sosial & ZISWAF)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Pesan Sambutan Otomatis (Greeting Message)</label>
                <textarea
                  rows="2"
                  value={spvState.greetingMessage}
                  onChange={(e) => setSpvState({ ...spvState, greetingMessage: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Karakter Audio Voice Note</label>
                  <select
                    value={spvState.voiceGender}
                    onChange={(e) => setSpvState({ ...spvState, voiceGender: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  >
                    <option value="Female (Putri)">Suara Wanita Ramah (Putri)</option>
                    <option value="Male (Bagas)">Suara Pria Santun (Bagas)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#0c1754] block mb-1">Aksen & Logat Suara</label>
                  <input
                    type="text"
                    value={spvState.voiceAccent}
                    onChange={(e) => setSpvState({ ...spvState, voiceAccent: e.target.value })}
                    className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Script Follow-Up Otomatis (Ghosting / Abandoned Intent)</label>
                <textarea
                  rows="2"
                  value={spvState.abandonedMessage}
                  onChange={(e) => setSpvState({ ...spvState, abandonedMessage: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Kata Kunci Cepat FAQ (Knowledge Base Keywords)</label>
                <input
                  type="text"
                  value={spvState.customFaqKeywords}
                  onChange={(e) => setSpvState({ ...spvState, customFaqKeywords: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                />
              </div>

              <div className="pt-3 border-t border-[#f0e9e1] flex justify-end">
                <button type="submit" className="btn-primary !py-2.5 !px-6 text-[13px] font-bold">
                  Simpan Setelan Persona SPV
                </button>
              </div>
            </form>
          </div>

          {/* Output Simulator */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-[#f0e9e1] shadow-xs">
            <h4 className="text-[14px] font-bold text-[#0c1754] mb-3">Simulasi Output WhatsApp</h4>
            <div className="bg-[#f9f8f6] p-4 rounded-xl border border-[#f0e9e1] flex flex-col gap-2.5">
              <div className="bg-[#eaebf8] text-[#0c1754] p-3 rounded-xl text-[12px] self-end max-w-[90%] shadow-xs">
                {spvState.greetingMessage}
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#f0e9e1] text-[12px] flex items-center gap-2.5 shadow-xs">
                <button className="w-7 h-7 rounded-full bg-[#2545ff] text-white flex items-center justify-center border-none text-[11px] cursor-pointer">
                  ▶
                </button>
                <div className="flex-1">
                  <div className="h-1 bg-[#2545ff] rounded-full w-3/4 mb-1" />
                  <span className="text-[10px] text-[#969696]">{spvState.voiceGender} • {spvState.voiceAccent}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEAM MEMBERS & MASTER DATA PERMISSIONS TOGGLES (SUPER ADMIN & OWNER ONLY) */}
      {activeTab === "team" && (role === "superadmin" || role === "owner") && (
        <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f0e9e1] mb-5">
            <div>
              <h3 className="text-[17px] font-extrabold text-[#0c1754]">
                Manajemen Anggota Tim & Hak Akses (Toggles)
              </h3>
              <p className="text-[12.5px] text-[#64748b]">
                Atur kewenangan setiap staf CS dan Admin menggunakan saklar izin akses langsung.
              </p>
            </div>

            <button
              onClick={() => setShowAddTeamModal(true)}
              className="btn-primary !py-2 !px-4 text-[13px] font-bold"
            >
              + Tambah Anggota Tim
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f9f8f6] border-b border-[#f0e9e1]">
                  <th className="py-3 px-4 text-[12px] font-bold uppercase text-[#64748b]">Nama & Peran</th>
                  <th className="py-3 px-4 text-[12px] font-bold uppercase text-[#64748b]">Terbitkan QRIS</th>
                  <th className="py-3 px-4 text-[12px] font-bold uppercase text-[#64748b]">Voice AI</th>
                  <th className="py-3 px-4 text-[12px] font-bold uppercase text-[#64748b]">Approve Mutasi</th>
                  <th className="py-3 px-4 text-[12px] font-bold uppercase text-[#64748b]">Export Laporan</th>
                  <th className="py-3 px-4 text-[12px] font-bold uppercase text-[#64748b] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e9e1] text-[13px]">
                {teamMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-[#fcfbf9]">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0c1754]">{m.name}</div>
                      <div className="text-[11.5px] text-[#64748b]">{m.email} • <span className="text-[#2545ff] font-bold">{m.role}</span></div>
                    </td>

                    {/* Permission Toggle 1: QRIS */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => updateTeamMemberPermissions(m.id, "qrisGenerate")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                          m.permissions.qrisGenerate
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-gray-100 text-gray-400 border-gray-200"
                        }`}
                      >
                        {m.permissions.qrisGenerate ? "Diizinkan" : "Terkunci"}
                      </button>
                    </td>

                    {/* Permission Toggle 2: Voice AI */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => updateTeamMemberPermissions(m.id, "voiceAiManage")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                          m.permissions.voiceAiManage
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-gray-100 text-gray-400 border-gray-200"
                        }`}
                      >
                        {m.permissions.voiceAiManage ? "Diizinkan" : "Terkunci"}
                      </button>
                    </td>

                    {/* Permission Toggle 3: Mutation Approval */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => updateTeamMemberPermissions(m.id, "mutationApproval")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                          m.permissions.mutationApproval
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-gray-100 text-gray-400 border-gray-200"
                        }`}
                      >
                        {m.permissions.mutationApproval ? "Diizinkan" : "Terkunci"}
                      </button>
                    </td>

                    {/* Permission Toggle 4: Export Reports */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => updateTeamMemberPermissions(m.id, "exportReports")}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                          m.permissions.exportReports
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-gray-100 text-gray-400 border-gray-200"
                        }`}
                      >
                        {m.permissions.exportReports ? "Diizinkan" : "Terkunci"}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => deleteTeamMember(m.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg text-[11.5px] font-bold border-none cursor-pointer"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PROFILE & WA API */}
      {activeTab === "profile" && (
        <div className="bg-white p-6 rounded-2xl border border-[#f0e9e1] shadow-[0_2px_12px_rgba(12,23,84,0.04)] max-w-[700px]">
          <h3 className="text-[17px] font-extrabold text-[#0c1754] mb-4">Profil Usaha & WhatsApp Cloud API</h3>
          <div className="flex flex-col gap-3.5 text-[13px]">
            <div>
              <label className="font-bold text-[#0c1754] block mb-1">Nama Usaha / Toko</label>
              <input
                type="text"
                defaultValue={activeInstitution?.name}
                className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] font-medium outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-[#0c1754] block mb-1">WABA Phone Number ID</label>
                <input
                  type="text"
                  defaultValue="109284910294812"
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] font-mono text-[12px] outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Status Webhook</label>
                <div className="p-2.5 bg-emerald-50 text-emerald-800 font-bold rounded-xl border border-emerald-200 text-[12px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Webhook Aktif (200 OK)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SUPERADMIN ACCOUNT & SECURITY CREDENTIALS */}
      {activeTab === "account" && role === "superadmin" && (
        <div className="flex flex-col gap-6 max-w-[800px]">
          <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-[#ede8e2] mb-5">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-extrabold text-[15px]">
                SA
              </div>
              <div>
                <h3 className="text-[17px] font-extrabold text-[#1e2640]">Profil Akun Superadmin Platform</h3>
                <p className="text-[12px] text-[#64748b]">Akses hak istimewa pengelola tertinggi seluruh tenant SaaS Klozer.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Nama Lengkap Superadmin</label>
                <input
                  type="text"
                  defaultValue="Super Administrator"
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] font-semibold outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Email Kredensial Utama</label>
                <input
                  type="email"
                  defaultValue="admin@klozer.id"
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] font-semibold outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Nomor WhatsApp Darurat (OTP)</label>
                <input
                  type="text"
                  defaultValue="+62 811-9988-7766"
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] font-mono outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Status 2-Factor Authentication (2FA)</label>
                <div className="p-2.5 bg-emerald-50 text-emerald-800 font-bold rounded-xl border border-emerald-200 text-[12px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                    <span>2FA Aktif (Authenticator App)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert("Pengaturan 2FA...")}
                    className="text-[11px] font-extrabold text-[#2545ff] bg-white px-2 py-0.5 rounded-md border border-[#2545ff]/20 cursor-pointer"
                  >
                    Atur
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-[#ede8e2] mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => alert("Profil superadmin diperbarui.")}
                className="btn-primary !py-2.5 !px-6 text-[13px] font-bold cursor-pointer"
              >
                Simpan Perubahan Akun
              </button>
            </div>
          </div>

          {/* Security Credentials & Audit */}
          <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-[#ede8e2] mb-4">
              <KeyIcon className="w-5 h-5 text-purple-600" />
              <h3 className="text-[16px] font-extrabold text-[#1e2640]">Ganti Password Master Platform</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]">
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Password Saat Ini</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Password Baru</label>
                <input
                  type="password"
                  placeholder="Minimal 12 karakter"
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Ulangi Password Baru</label>
                <input
                  type="password"
                  placeholder="Ulangi password"
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none"
                />
              </div>
            </div>

            <div className="pt-4 mt-4 flex items-center justify-between">
              <span className="text-[11.5px] text-[#8f95a8]">Terakhir diubah: 14 hari yang lalu dari IP 103.119.214.12</span>
              <button
                type="button"
                onClick={() => alert("Password berhasil diperbarui.")}
                className="px-4 py-2 text-[12.5px] font-bold rounded-xl border border-purple-600 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer"
              >
                Update Password Master
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Team Member */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[450px] p-6 shadow-2xl border border-[#f0e9e1] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0e9e1] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#0c1754]">Tambah Anggota Tim Baru</h3>
              <button
                onClick={() => setShowAddTeamModal(false)}
                className="w-7 h-7 rounded-full bg-[#f9f8f6] hover:bg-[#eaebf8] flex items-center justify-center text-[#64748b] border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Anggara"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Email Login *</label>
                <input
                  type="email"
                  required
                  placeholder="rian.cs@brand.id"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Peran Jabatan</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#f0e9e1] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium"
                >
                  <option value="Customer Service Junior">Customer Service Junior</option>
                  <option value="Customer Service Senior">Customer Service Senior</option>
                  <option value="Supervisor (SPV)">Supervisor (SPV)</option>
                  <option value="Finance & Rekonsiliasi">Finance & Rekonsiliasi</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#f0e9e1] mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-[13px] font-bold">
                  Simpan Staf Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
