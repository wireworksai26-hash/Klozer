"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";
import {
  SparklesIcon,
  BotIcon,
  ZapIcon,
  MicIcon,
  CheckCircleIcon,
  MessageSquareIcon,
  RadioIcon,
  ShieldCheckIcon,
} from "@/components/icons";

export default function PersonaAiPage() {
  const { aiConfig, updateSpvAiPersona, role, currentUser, activeInstitution } = useDashboard();

  const [spvState, setSpvState] = useState({
    botName: aiConfig?.spvPersona?.botName || "Siti - Asisten Toko",
    tone: aiConfig?.spvPersona?.tone || "Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)",
    greetingMessage:
      aiConfig?.spvPersona?.greetingMessage ||
      "Halo Kak! Terima kasih sudah menghubungi kami. Mau cari produk apa hari ini?",
    voiceAccent: aiConfig?.spvPersona?.voiceAccent || "Bahasa Indonesia Standar (Aksen Ramah)",
    voiceGender: aiConfig?.spvPersona?.voiceGender || "Female (Putri)",
    abandonedMessage:
      aiConfig?.spvPersona?.abandonedMessage ||
      "Halo Kak, pesanan paketnya masih tersimpan di keranjang. Mau kami bantu proses pembayarannya sekarang?",
    customFaqKeywords:
      aiConfig?.spvPersona?.customFaqKeywords ||
      "jam buka, lokasi cabang, ongkir, level pedas, cara pesan",
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Sync with localStorage immediately on client mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("klozer_ai_config");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.spvPersona) {
            setSpvState((prev) => ({ ...prev, ...parsed.spvPersona }));
          }
        }
      } catch (err) {}
    }
  }, []);

  // Also sync when context aiConfig updates
  React.useEffect(() => {
    if (aiConfig?.spvPersona) {
      setSpvState((prev) => ({
        ...prev,
        ...aiConfig.spvPersona,
      }));
    }
  }, [aiConfig?.spvPersona]);

  const handleSave = (e) => {
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
    setSaveSuccessMsg("Persona & Script AI berhasil disimpan!");
    setTimeout(() => setSaveSuccessMsg(""), 3500);
  };

  const handlePlayVoiceSample = () => {
    setIsPlayingVoice(true);
    setTimeout(() => setIsPlayingVoice(false), 2200);
  };

  const storeName = currentUser?.institutionName || activeInstitution?.name || "Toko Anda";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>AI Auto-Closing Intelligence</span>
            </span>
            <span className="text-[11px] font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
              {storeName}
            </span>
          </div>
          <h1 className="text-[26px] font-black text-[#0c1754] tracking-tight">
            Persona & Script Prompts AI
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Atur gaya percakapan asisten WhatsApp otomatis, template salam pembuka, karakter suara audio, dan auto follow-up toko.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccessMsg && (
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-[13px] font-bold flex items-center gap-2 animate-scale-pop">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          <Link
            href="/test-cs-ai"
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-[13px] font-black flex items-center gap-2 shadow-md transition-all border-none"
          >
            <ZapIcon className="w-4 h-4 text-amber-300" />
            <span>Uji di Test CS AI</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Settings on Left, Live WhatsApp Preview on Right */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: 7 Columns */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#ede8e2] shadow-xs flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <BotIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[16px] font-black text-[#0c1754]">Karakter & Gaya Bicara AI</h3>
                <p className="text-[12px] text-[#64748b]">Menyesuaikan identitas brand toko dalam membalas chat pelanggan</p>
              </div>
            </div>
            <span className="text-[11px] font-extrabold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">
              Aktif Otomatis
            </span>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4.5 text-[13px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Nama Panggilan Asisten AI</label>
                <input
                  type="text"
                  value={spvState.botName}
                  onChange={(e) => setSpvState({ ...spvState, botName: e.target.value })}
                  placeholder="Misal: Siti - CS Juara"
                  className="w-full bg-[#f9f8f6] border border-[#ede8e2] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Gaya Percakapan (Tone of Voice)</label>
                <select
                  value={spvState.tone}
                  onChange={(e) => setSpvState({ ...spvState, tone: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#ede8e2] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff] focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Ramah, Santun & Solutif (Bahasa Gaul/Sopan Online Shop)">
                    Ramah, Santun & Solutif (Online Shop Indonesia)
                  </option>
                  <option value="Formal & Elegan (Bisnis B2B & Properti)">
                    Formal & Elegan (Bisnis B2B / Properti)
                  </option>
                  <option value="Islami & Penuh Doa (Lembaga Donasi & Zakat)">
                    Islami & Penuh Doa (ZISWAF / Sosial)
                  </option>
                  <option value="Ceria & Energik (F&B / Kuliner Cepat Saji)">
                    Ceria & Energik (Kuliner / F&B Kekinian)
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-[#0c1754] block mb-1">Pesan Salam Pembuka Otomatis (Greeting)</label>
              <textarea
                rows="2"
                value={spvState.greetingMessage}
                onChange={(e) => setSpvState({ ...spvState, greetingMessage: e.target.value })}
                placeholder="Pesan yang pertama kali dikirim saat pelanggan baru menyapa via WhatsApp"
                className="w-full bg-[#f9f8f6] border border-[#ede8e2] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff] focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Karakter Suara Voice Note (TTS)</label>
                <select
                  value={spvState.voiceGender}
                  onChange={(e) => setSpvState({ ...spvState, voiceGender: e.target.value })}
                  className="w-full bg-[#f9f8f6] border border-[#ede8e2] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff] focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Female (Putri)">Suara Wanita Ramah (Putri)</option>
                  <option value="Male (Bagas)">Suara Pria Santun (Bagas)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#0c1754] block mb-1">Aksen & Dialek Suara</label>
                <input
                  type="text"
                  value={spvState.voiceAccent}
                  onChange={(e) => setSpvState({ ...spvState, voiceAccent: e.target.value })}
                  placeholder="Misal: Bahasa Indonesia Standar (Aksen Ramah)"
                  className="w-full bg-[#f9f8f6] border border-[#ede8e2] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[#0c1754] block mb-1">
                Script Follow-Up Keranjang / Order Tertinggal
              </label>
              <textarea
                rows="2"
                value={spvState.abandonedMessage}
                onChange={(e) => setSpvState({ ...spvState, abandonedMessage: e.target.value })}
                placeholder="Pesan ramah untuk mengingatkan pelanggan yang belum menyelesaikan checkout QRIS"
                className="w-full bg-[#f9f8f6] border border-[#ede8e2] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="font-bold text-[#0c1754] block mb-1">
                Kata Kunci Cepat FAQ (Knowledge Base Keywords)
              </label>
              <input
                type="text"
                value={spvState.customFaqKeywords}
                onChange={(e) => setSpvState({ ...spvState, customFaqKeywords: e.target.value })}
                placeholder="jam buka, menu favorit, ongkir, level pedas, alamat toko"
                className="w-full bg-[#f9f8f6] border border-[#ede8e2] rounded-xl p-2.5 text-[#0c1754] outline-none font-medium focus:border-[#2545ff] focus:bg-white transition-all"
              />
              <span className="text-[11.5px] text-[#64748b] mt-1 block">
                Pisahkan dengan koma. AI akan memprioritaskan informasi ini saat menjawab pertanyaan pelanggan.
              </span>
            </div>

            <div className="pt-3 border-t border-[#ede8e2] flex items-center justify-between">
              <button
                type="button"
                onClick={handlePlayVoiceSample}
                className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-[12.5px] border border-purple-200 cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <MicIcon className="w-4 h-4 text-purple-600" />
                <span>{isPlayingVoice ? "Memutar Suara..." : "Dengar Sampel Suara"}</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#2545ff] hover:bg-[#1b35cc] text-white rounded-xl text-[13.5px] font-black shadow-md transition-all border-none cursor-pointer flex items-center gap-2"
              >
                <CheckCircleIcon className="w-4 h-4 text-white" />
                <span>Simpan Persona AI</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Card: 5 Columns — Live WhatsApp Mock Preview */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#eef2f5] rounded-3xl border border-[#d8e0e8] overflow-hidden shadow-md">
            {/* WhatsApp Header */}
            <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-700 border-2 border-white flex items-center justify-center font-black text-[14px] text-white">
                  {spvState.botName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-extrabold text-[14px] leading-tight">{spvState.botName}</h4>
                  <span className="text-[11px] text-emerald-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    Online • AI WhatsApp Auto-Closing
                  </span>
                </div>
              </div>
              <span className="text-[10.5px] font-bold bg-[#128c7e] px-2 py-0.5 rounded-md text-emerald-100">
                Official
              </span>
            </div>

            {/* Chat Canvas */}
            <div className="p-4 flex flex-col gap-3 min-h-[360px] bg-[#efeae2]/70 bg-[radial-gradient(#d1d7db_1px,transparent_1px)] [background-size:16px_16px]">
              {/* Customer inbound bubble */}
              <div className="self-start max-w-[80%] bg-white p-3 rounded-2xl rounded-tl-xs shadow-xs text-[12.5px] text-[#1e2640]">
                <p>Halo, selamat siang kak. Apakah tokonya buka hari ini?</p>
                <span className="text-[10px] text-[#94a3b8] block text-right mt-1">10:42 WIB</span>
              </div>

              {/* AI Auto-reply bubble */}
              <div className="self-end max-w-[85%] bg-[#d9fdd3] p-3.5 rounded-2xl rounded-tr-xs shadow-xs text-[12.5px] text-[#1e2640] border border-emerald-200">
                <div className="flex items-center gap-1.5 text-emerald-800 text-[10.5px] font-black uppercase tracking-wider mb-1">
                  <SparklesIcon className="w-3 h-3 text-emerald-600" />
                  <span>{spvState.botName} (AI CS)</span>
                </div>
                <p className="whitespace-pre-line leading-relaxed font-medium">
                  {spvState.greetingMessage}
                </p>
                <p className="mt-2 text-emerald-950 font-bold">
                  Toko {storeName} buka setiap hari! Ada yang bisa kami bantu siapkan untuk pesanan Kakak?
                </p>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-emerald-300/40 text-[10px] text-emerald-800">
                  <span>Tone: {spvState.tone.split("(")[0]}</span>
                  <span>10:42 WIB • Terkirim</span>
                </div>
              </div>

              {/* Abandoned Cart Follow-up Preview */}
              <div className="self-end max-w-[85%] bg-[#d9fdd3] p-3 rounded-2xl rounded-tr-xs shadow-xs text-[12px] text-[#1e2640] border border-emerald-200">
                <span className="text-[10px] font-extrabold text-purple-700 block mb-0.5">
                  [Auto-Followup Preview (+15 Menit)]:
                </span>
                <p className="italic text-[#334155]">{spvState.abandonedMessage}</p>
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="p-3 bg-white border-t border-[#d8e0e8] flex items-center justify-between">
              <span className="text-[11.5px] text-[#64748b]">
                Suara: <strong>{spvState.voiceGender}</strong> ({spvState.voiceAccent})
              </span>
              <Link
                href="/test-cs-ai"
                className="text-[12px] font-extrabold text-[#2545ff] hover:underline flex items-center gap-1"
              >
                <span>Coba Interaksi Langsung</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Tips Card */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-[12.5px] text-amber-950 flex flex-col gap-1.5">
            <span className="font-black text-amber-900 flex items-center gap-1.5">
              <ZapIcon className="w-4 h-4 text-amber-600" />
              <span>Tips Konversi Tinggi:</span>
            </span>
            <p className="text-amber-900/90 leading-relaxed">
              Gunakan nama panggilan asisten yang santun dan akrab. Menyebut nama toko dan menyapa ramah dengan penawaran menu terbukti menaikkan tingkat closing WhatsApp hingga <strong>34%</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
