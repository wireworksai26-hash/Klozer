"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { BotIcon, BuildingIcon, EyeIcon, EyeOffIcon, KeyIcon, SparklesIcon, UserIcon, UsersIcon, XIcon } from "@/components/icons";

const card = "bg-white p-6 rounded-2xl border border-line shadow-soft";
const input = "w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium focus:border-brand";
const label = "font-bold text-ink block mb-1";

const PERMISSIONS = [
  ["qrisGenerate", "Terbitkan QRIS"],
  ["voiceAiManage", "Voice AI"],
  ["mutationApproval", "Approve Mutasi"],
  ["exportReports", "Export Laporan"],
];

function StatusPill({ ok, yes, no }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-bold border ${ok ? "bg-success-50 text-success-800 border-success-200" : "bg-warning-50 text-warning-800 border-warning-200"}`}>
      <span className={`w-2 h-2 rounded-full ${ok ? "bg-success-500" : "bg-warning-500"}`} />
      {ok ? yes : no}
    </span>
  );
}

const PROVIDERS = {
  nvidia: { name: "NVIDIA NIM", hint: "Dapatkan key di build.nvidia.com", modelHint: "meta/llama-3.3-70b-instruct", fallbackHint: "meta/llama-3.1-8b-instruct" },
  gemini: { name: "Google Gemini", hint: "Dapatkan key di aistudio.google.com", modelHint: "gemini-3.5-flash-lite", fallbackHint: "gemini-3.1-flash-lite" },
};
const SOURCE_TEXT = { database: "disimpan dari dashboard", environment: "dari environment server", none: "belum diatur" };

function ApiKeyField({ providerKey, settings, value, onChange, onClear, clearRequested }) {
  const [show, setShow] = useState(false);
  const p = PROVIDERS[providerKey];
  const info = settings[providerKey];
  const placeholder = info.configured ? `${info.hint} (${SOURCE_TEXT[info.source]}). Kosongkan bila tidak diubah` : `Tempel API key ${p.name}`;
  return (
    <div>
      <label className={label}>API Key {p.name}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${input} font-mono pr-11`}
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-fg-muted" aria-label={show ? "Sembunyikan" : "Tampilkan"}>
          {show ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
        </button>
      </div>
      <div className="flex items-center justify-between mt-1.5 gap-3">
        <span className="text-caption text-fg-muted">{p.hint}</span>
        {info.source === "database" && (
          <label className="text-caption text-danger-700 flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={clearRequested} onChange={(e) => onClear(e.target.checked)} />
            Hapus key tersimpan
          </label>
        )}
      </div>
    </div>
  );
}

function AiKeysCard({ onSaved }) {
  const { notify } = useDashboard();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ provider: "nvidia", nvidiaModel: "", nvidiaFallbackModel: "", geminiModel: "", geminiFallbackModel: "", nvidiaKey: "", geminiApiKey: "", clearNvidiaKey: false, clearGeminiKey: false });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState("");
  const [results, setResults] = useState({});

  const apply = (data) => {
    setSettings(data);
    setForm({ provider: data.provider, nvidiaModel: data.nvidia.model || "", nvidiaFallbackModel: data.nvidia.fallbackModel || "", geminiModel: data.gemini.model || "", geminiFallbackModel: data.gemini.fallbackModel || "", nvidiaKey: "", geminiApiKey: "", clearNvidiaKey: false, clearGeminiKey: false });
  };

  useEffect(() => {
    let cancelled = false;
    api
      .get("/system/ai-settings")
      .then((res) => !cancelled && apply(res.settings))
      .catch((err) => !cancelled && notify("error", err.message));
    return () => {
      cancelled = true;
    };
  }, [notify]);

  if (!settings) return <div className={card}>Memuat pengaturan AI...</div>;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/system/ai-settings", form);
      apply(res.settings);
      setResults({});
      notify("success", "Pengaturan AI tersimpan. Langsung dipakai untuk balasan berikutnya.");
      onSaved?.();
    } catch (err) {
      notify("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const test = async (provider) => {
    setTesting(provider);
    try {
      const res = await api.post("/system/ai-settings/test", { provider });
      setResults((r) => ({ ...r, [provider]: { ok: res.ok, lines: res.results || [], text: res.message } }));
    } catch (err) {
      setResults((r) => ({ ...r, [provider]: { ok: false, text: err.message } }));
    } finally {
      setTesting("");
    }
  };

  const fallback = form.provider === "nvidia" ? "gemini" : "nvidia";
  const modelKey = (p) => (p === "nvidia" ? "nvidiaModel" : "geminiModel");
  const fallbackKey = (p) => (p === "nvidia" ? "nvidiaFallbackModel" : "geminiFallbackModel");
  const keyKey = (p) => (p === "nvidia" ? "nvidiaKey" : "geminiApiKey");
  const clearKey = (p) => (p === "nvidia" ? "clearNvidiaKey" : "clearGeminiKey");

  const section = (p, title) => (
    <div className="rounded-xl border border-line p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-bold text-ink">{title}</div>
        <span className="text-caption font-bold text-fg-muted">{PROVIDERS[p].name}</span>
      </div>
      <ApiKeyField
        providerKey={p}
        settings={settings}
        value={form[keyKey(p)]}
        onChange={(v) => setForm({ ...form, [keyKey(p)]: v })}
        clearRequested={form[clearKey(p)]}
        onClear={(v) => setForm({ ...form, [clearKey(p)]: v })}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Model utama</label>
          <input className={`${input} font-mono`} value={form[modelKey(p)]} placeholder={PROVIDERS[p].modelHint} onChange={(e) => setForm({ ...form, [modelKey(p)]: e.target.value })} />
        </div>
        <div>
          <label className={label}>Model cadangan</label>
          <input className={`${input} font-mono`} value={form[fallbackKey(p)]} placeholder={PROVIDERS[p].fallbackHint} onChange={(e) => setForm({ ...form, [fallbackKey(p)]: e.target.value })} />
        </div>
      </div>
      <p className="text-caption text-fg-muted -mt-1">Model cadangan dicoba otomatis bila model utama gagal (kuota habis, model dihentikan, atau sedang gangguan).</p>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" disabled={testing === p || !settings[p].configured} onClick={() => test(p)} className="btn-outline !py-2 !px-4 text-body-sm font-bold disabled:opacity-50">
          {testing === p ? "Menguji..." : "Uji koneksi"}
        </button>
        {results[p] && (
          <div className="flex flex-col gap-0.5 w-full">
            {results[p].lines.length === 0 && <span className="text-caption font-semibold text-danger-700">{results[p].text}</span>}
            {results[p].lines.map((r) => (
              <span key={r.model} className={`text-caption font-semibold ${r.ok ? "text-success-700" : "text-danger-700"}`}>
                {r.ok ? "OK" : "Gagal"} · model {r.role} <span className="font-mono">{r.model}</span>{r.ok ? ` (${r.latencyMs} ms)` : `: ${r.message}`}
              </span>
            ))}
          </div>
        )}
        {!settings[p].configured && <span className="text-caption text-fg-muted">Simpan key dulu untuk bisa diuji.</span>}
      </div>
    </div>
  );

  return (
    <form onSubmit={save} className={card}>
      <div className="flex items-center gap-2 mb-1">
        <KeyIcon className="w-5 h-5 text-brand" />
        <h3 className="card-title">Kunci API AI</h3>
      </div>
      <p className="text-label text-fg-muted mb-5">
        Key disimpan terenkripsi di server dan tidak pernah dikirim kembali ke browser. Jika tidak diisi di sini, server memakai nilai dari file .env. Perubahan langsung berlaku tanpa restart.
      </p>
      <div className="mb-4">
        <label className={label}>Penyedia utama</label>
        <select className={input} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
          {Object.entries(PROVIDERS).map(([k, p]) => (
            <option key={k} value={k}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-4">
        {section(form.provider, "Model utama")}
        {section(fallback, "Cadangan (dipakai bila utama gagal)")}
      </div>
      <div className="flex justify-end mt-5">
        <button type="submit" disabled={saving} className="btn-primary !py-2.5 !px-6 font-bold disabled:opacity-60">
          {saving ? "Menyimpan..." : "Simpan Pengaturan AI"}
        </button>
      </div>
    </form>
  );
}

function PlatformTab() {
  const { t } = useDashboard();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/system/integrations")
      .then((data) => !cancelled && setState({ loading: false, data, error: "" }))
      .catch((err) => !cancelled && setState({ loading: false, data: null, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [reload]);


  if (state.loading) return <div className={card}>{t("Memuat status integrasi...")}</div>;
  if (state.error) return <div className={`${card} text-danger-700`}>{t(state.error)}</div>;
  const { ai, whatsapp, payments, email, webhooks } = state.data;

  const rows = [
    ["AI utama", `${ai.primaryProvider} (${ai.primaryProvider === "gemini" ? ai.geminiModel : ai.nvidiaModel})`, ai[ai.primaryProvider]],
    ["NVIDIA NIM", ai.nvidiaModel, ai.nvidia],
    ["Google Gemini", ai.geminiModel, ai.gemini],
    ["Meta App Secret (verifikasi webhook)", "META_APP_SECRET", whatsapp.appSecret],
    ["Meta Verify Token", "META_WEBHOOK_VERIFY_TOKEN", whatsapp.verifyToken],
    ["iPaymu (QRIS)", payments.mode ? `mode ${payments.mode}` : "IPAYMU_VA / IPAYMU_API_KEY", payments.ipaymu],
    ["Email SMTP", "SMTP_HOST / SMTP_USER / SMTP_PASS", email.smtp],
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[860px]">
      <AiKeysCard onSaved={() => setReload((n) => n + 1)} />
      <div className={card}>
        <h3 className="card-title mb-1">{t("Status Integrasi Platform")}</h3>
        <p className="text-label text-fg-muted mb-5">
          Kunci AI diatur di kartu di atas. Kunci lain (WhatsApp/Meta, iPaymu, SMTP) diatur lewat file .env di server, lalu restart layanan.
        </p>
        <div className="divide-y divide-line">
          {rows.map(([name, detail, ok]) => (
            <div key={name} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="font-bold text-ink text-body-sm">{t(name)}</div>
                <div className="text-caption text-fg-muted font-mono">{detail}</div>
              </div>
              <StatusPill ok={Boolean(ok)} yes={t("Terkonfigurasi")} no={t("Belum diatur")} />
            </div>
          ))}
        </div>
      </div>
      <div className={card}>
        <h3 className="card-title mb-3">{t("URL Webhook untuk Didaftarkan")}</h3>
        {[
          ["Meta WhatsApp", webhooks.whatsapp],
          ["iPaymu Callback (Notify) URL", webhooks.ipaymu],
        ].map(([name, url]) => (
          <div key={name} className="mb-3">
            <label className={label}>{t(name)}</label>
            <input readOnly value={url} className={`${input} font-mono text-label`} onFocus={(e) => e.target.select()} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PersonaTab() {
  const { aiConfig, updateSpvAiPersona, t } = useDashboard();
  const [form, setForm] = useState(aiConfig.spvPersona);
  const [saving, setSaving] = useState(false);

  // The persona arrives asynchronously after sign-in; adopt it unless the user has started typing.
  const [touched, setTouched] = useState(false);
  const loaded = aiConfig.spvPersona;
  const view = touched ? form : loaded;

  const set = (key) => (e) => {
    setTouched(true);
    setForm({ ...view, [key]: e.target.value });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    await updateSpvAiPersona(view);
    setSaving(false);
  };

  const fields = [
    ["botName", "Nama Admin Chat", "Contoh: Siti, Admin Toko Batik"],
    ["tone", "Gaya Bahasa", "Santai, ramah, dan to the point seperti admin toko di WhatsApp"],
  ];

  return (
    <form onSubmit={save} className={`${card} max-w-[760px] flex flex-col gap-4 text-body-sm`}>
      <div>
        <h3 className="card-title">{t("Persona dan Script AI")}</h3>
        <p className="text-label text-fg-muted">{t("Dipakai langsung saat AI membalas pelanggan di WhatsApp.")}</p>
      </div>
      {fields.map(([key, name, placeholder]) => (
        <div key={key}>
          <label className={label}>{t(name)}</label>
          <input className={input} value={view[key] || ""} placeholder={t(placeholder)} maxLength={300} onChange={set(key)} />
        </div>
      ))}
      <div>
        <label className={label}>{t("Sapaan Pembuka")}</label>
        <textarea className={input} rows={3} maxLength={500} value={view.greetingMessage || ""} onChange={set("greetingMessage")} placeholder={t("Halo kak! Terima kasih sudah menghubungi kami.")} />
      </div>
      <div>
        <label className={label}>{t("Pesan Follow-up Keranjang Ditinggalkan")}</label>
        <textarea className={input} rows={2} maxLength={500} value={view.abandonedMessage || ""} onChange={set("abandonedMessage")} />
      </div>
      <div>
        <label className={label}>{t("Topik yang Sering Ditanyakan")}</label>
        <input className={input} maxLength={500} value={view.customFaqKeywords || ""} onChange={set("customFaqKeywords")} placeholder={t("ongkir, transfer, cod, ukuran, resi")} />
      </div>
      <div className="flex justify-end pt-2 border-t border-line">
        <button type="submit" disabled={saving} className="btn-primary !py-2 !px-5 font-bold disabled:opacity-60">
          {saving ? t("Menyimpan...") : t("Simpan Persona")}
        </button>
      </div>
    </form>
  );
}

function CredentialsBox({ credentials, onClose }) {
  const { t } = useDashboard();
  const [copied, setCopied] = useState(false);
  const text = `Email: ${credentials.email}\nPassword: ${credentials.password}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="p-4 rounded-xl bg-warning-50 border border-warning-200 text-body-sm">
      <div className="font-bold text-warning-900 mb-1">{t("Simpan kredensial ini sekarang. Password hanya ditampilkan sekali.")}</div>
      <pre className="font-mono text-label bg-white border border-warning-200 rounded-lg p-3 whitespace-pre-wrap break-all">{text}</pre>
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={copy} className="btn-outline !py-1.5 !px-3 text-label">{copied ? t("Tersalin") : t("Salin")}</button>
        <button type="button" onClick={onClose} className="btn-primary !py-1.5 !px-3 text-label">{t("Selesai")}</button>
      </div>
    </div>
  );
}

function TeamTab() {
  const { teamMembers, addTeamMember, updateTeamMemberPermissions, deleteTeamMember, resetTeamMemberPassword, currentUser, t } = useDashboard();
  const [showAdd, setShowAdd] = useState(false);
  const [member, setMember] = useState({ name: "", email: "", role: "Customer Service Junior" });
  const [issued, setIssued] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const created = await addTeamMember(member);
    if (created) {
      setIssued(created.credentials);
      setShowAdd(false);
      setMember({ name: "", email: "", role: "Customer Service Junior" });
    }
  };

  const reset = async (m) => {
    const res = await resetTeamMemberPassword(m.id);
    if (res?.credentials) setIssued({ email: m.email, password: res.credentials.newPassword || res.credentials.password });
  };

  return (
    <div className="flex flex-col gap-4">
      {issued && <CredentialsBox credentials={issued} onClose={() => setIssued(null)} />}
      <div className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line mb-5">
          <div>
            <h3 className="card-title">{t("Anggota Tim dan Hak Akses")}</h3>
            <p className="text-label text-fg-muted">{t("Menonaktifkan staf langsung mengeluarkan mereka dari semua sesi yang sedang aktif.")}</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary !py-2 !px-4 text-body-sm font-bold">{t("+ Tambah Anggota Tim")}</button>
        </div>
        <div className="table-scroll">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas border-b border-line">
                <th className="py-3 px-4 text-label font-bold uppercase text-fg-muted">{t("Nama dan Peran")}</th>
                {PERMISSIONS.map(([, name]) => (
                  <th key={name} className="py-3 px-4 text-label font-bold uppercase text-fg-muted">{t(name)}</th>
                ))}
                <th className="py-3 px-4 text-label font-bold uppercase text-fg-muted text-right">{t("Aksi")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-body-sm">
              {teamMembers.map((m) => {
                const isSelf = m.dbId === currentUser?.id;
                const inactive = m.status !== "active";
                return (
                  <tr key={m.id} className={inactive ? "opacity-50" : "hover:bg-soft"}>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-ink">{m.name}{inactive ? t(" (nonaktif)") : ""}</div>
                      <div className="text-caption text-fg-muted">{m.email} • <span className="text-brand font-bold">{t(m.role)}</span></div>
                    </td>
                    {PERMISSIONS.map(([key]) => (
                      <td key={key} className="py-3.5 px-4">
                        <button
                          type="button"
                          disabled={inactive}
                          onClick={() => updateTeamMemberPermissions(m.id, key)}
                          className={`px-2.5 py-1 rounded-full text-caption font-bold border transition-all cursor-pointer ${m.permissions[key] ? "bg-success-100 text-success-800 border-success-300" : "bg-sunken text-fg-muted border-line"}`}
                        >
                          {m.permissions[key] ? t("Diizinkan") : t("Terkunci")}
                        </button>
                      </td>
                    ))}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {!isSelf && !inactive && (
                        <>
                          <button type="button" onClick={() => reset(m)} className="px-2 py-1 text-brand hover:bg-brand-soft rounded-lg text-caption font-bold border-none cursor-pointer bg-transparent">{t("Reset Password")}</button>
                          {confirmId === m.id ? (
                            <button type="button" onClick={() => { deleteTeamMember(m.id); setConfirmId(null); }} className="px-2 py-1 text-white bg-danger-600 rounded-lg text-caption font-bold border-none cursor-pointer">{t("Yakin nonaktifkan?")}</button>
                          ) : (
                            <button type="button" onClick={() => setConfirmId(m.id)} className="px-2 py-1 text-danger-600 hover:bg-danger-50 rounded-lg text-caption font-bold border-none cursor-pointer bg-transparent">{t("Nonaktifkan")}</button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {teamMembers.length === 0 && <div className="py-8 text-center text-fg-muted text-body-sm">{t("Belum ada anggota tim.")}</div>}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-line animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="card-title">{t("Tambah Anggota Tim Baru")}</h3>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-full bg-canvas hover:bg-brand-soft flex items-center justify-center text-fg-muted border-none cursor-pointer" aria-label={t("Tutup")}>
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submit} className="flex flex-col gap-3.5 text-body-sm">
              <div>
                <label className={label}>{t("Nama Lengkap *")}</label>
                <input required minLength={2} className={input} value={member.name} onChange={(e) => setMember({ ...member, name: e.target.value })} placeholder={t("Contoh: Rian Anggara")} />
              </div>
              <div>
                <label className={label}>{t("Email Login *")}</label>
                <input required type="email" className={input} value={member.email} onChange={(e) => setMember({ ...member, email: e.target.value })} placeholder="rian.cs@brand.id" />
              </div>
              <div>
                <label className={label}>{t("Peran Jabatan")}</label>
                <select className={input} value={member.role} onChange={(e) => setMember({ ...member, role: e.target.value })}>
                  <option value="Customer Service Junior">{t("Customer Service Junior")}</option>
                  <option value="Customer Service Senior">{t("Customer Service Senior")}</option>
                  <option value="Supervisor (SPV)">{t("Supervisor (SPV)")}</option>
                  <option value="Finance & Rekonsiliasi">{t("Finance & Rekonsiliasi")}</option>
                  <option value="PIC Gudang">{t("PIC Gudang")}</option>
                </select>
              </div>
              <p className="text-caption text-fg-muted">{t("Password awal dibuat otomatis dan hanya ditampilkan sekali setelah akun dibuat.")}</p>
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-line mt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-outline !py-2 !px-4 text-body-sm">{t("Batal")}</button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-body-sm font-bold">{t("Simpan Staf Baru")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileTab() {
  const { activeInstitution, updateInstitution, whatsappStatus, notify, isManager, t } = useDashboard();
  const [profile, setProfile] = useState(null);
  const [wa, setWa] = useState({ phone_number_id: "", display_phone: "", access_token: "" });
  const [channel, setChannel] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!isManager) return undefined;
    api
      .get("/whatsapp/channel")
      .then((res) => !cancelled && setChannel(res.channel))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isManager]);

  const view = profile || { name: activeInstitution?.name || "", phone: activeInstitution?.phone || "", address: activeInstitution?.address || "" };

  const saveProfile = async (e) => {
    e.preventDefault();
    await updateInstitution(activeInstitution.id, { name: view.name, phone: view.phone, address: view.address });
  };

  const saveChannel = async (e) => {
    e.preventDefault();
    try {
      await api.put("/whatsapp/channel", wa);
      setWa({ ...wa, access_token: "" });
      setChannel({ phone_number_id: wa.phone_number_id, display_phone: wa.display_phone });
      notify("success", t("Kanal WhatsApp tersimpan. Token disimpan terenkripsi."));
    } catch (err) {
      notify("error", err.message);
    }
  };

  const removeChannel = async () => {
    try {
      await api.delete("/whatsapp/channel");
      setChannel(null);
      notify("success", t("Kanal WhatsApp dilepas."));
    } catch (err) {
      notify("error", err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[760px]">
      <form onSubmit={saveProfile} className={`${card} flex flex-col gap-3.5 text-body-sm`}>
        <h3 className="card-title">{t("Profil Usaha")}</h3>
        <div>
          <label className={label}>{t("Nama Usaha / Toko")}</label>
          <input className={input} value={view.name} onChange={(e) => setProfile({ ...view, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>{t("Nomor Telepon")}</label>
            <input className={input} value={view.phone} onChange={(e) => setProfile({ ...view, phone: e.target.value })} />
          </div>
          <div>
            <label className={label}>{t("Alamat")}</label>
            <input className={input} value={view.address} onChange={(e) => setProfile({ ...view, address: e.target.value })} />
          </div>
        </div>
        {isManager && (
          <div className="flex justify-end">
            <button type="submit" className="btn-primary !py-2 !px-5 font-bold">{t("Simpan Profil")}</button>
          </div>
        )}
      </form>

      {isManager && (
        <form onSubmit={saveChannel} className={`${card} flex flex-col gap-3.5 text-body-sm`}>
          <div className="flex items-center justify-between">
            <h3 className="card-title">WhatsApp Cloud API</h3>
            <StatusPill ok={Boolean(channel || whatsappStatus?.configured)} yes={t("Terhubung")} no={t("Belum terhubung")} />
          </div>
          {channel && (
            <p className="text-label text-fg-muted">
              {t("Nomor aktif:")} <span className="font-mono font-bold">{channel.display_phone || channel.phone_number_id}</span>. {t("Token tidak pernah ditampilkan kembali. Isi ulang di bawah untuk menggantinya.")}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>{t("Phone Number ID (dari Meta)")}</label>
              <input required className={`${input} font-mono text-label`} value={wa.phone_number_id} onChange={(e) => setWa({ ...wa, phone_number_id: e.target.value })} />
            </div>
            <div>
              <label className={label}>{t("Nomor Tampilan")}</label>
              <input className={input} value={wa.display_phone} onChange={(e) => setWa({ ...wa, display_phone: e.target.value })} placeholder="+62 811-0000-0000" />
            </div>
          </div>
          <div>
            <label className={label}>Access Token (permanent)</label>
            <input required type="password" autoComplete="off" className={`${input} font-mono text-label`} value={wa.access_token} onChange={(e) => setWa({ ...wa, access_token: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            {channel && (
              <button type="button" onClick={removeChannel} className="btn-outline !py-2 !px-4 text-body-sm !text-danger-600">{t("Lepas Nomor")}</button>
            )}
            <button type="submit" className="btn-primary !py-2 !px-5 font-bold">{t("Simpan Kanal")}</button>
          </div>
        </form>
      )}
    </div>
  );
}

function AccountTab() {
  const { currentUser, changePassword, t } = useDashboard();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.next.length < 12) return setError(t("Password baru minimal 12 karakter."));
    if (form.next !== form.confirm) return setError(t("Konfirmasi password tidak sama."));
    const ok = await changePassword(form.current, form.next);
    if (ok) setForm({ current: "", next: "", confirm: "" });
  };

  return (
    <form onSubmit={submit} className={`${card} max-w-[560px] flex flex-col gap-3.5 text-body-sm`}>
      <div>
        <h3 className="card-title">{t("Akun Saya")}</h3>
        <p className="text-label text-fg-muted">{currentUser?.name} • {currentUser?.email}</p>
      </div>
      <div>
        <label className={label}>{t("Password Saat Ini")}</label>
        <input required type="password" autoComplete="current-password" className={input} value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
      </div>
      <div>
        <label className={label}>{t("Password Baru")}</label>
        <input required type="password" autoComplete="new-password" className={input} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
        <p className="text-caption text-fg-muted mt-1">{t("Minimal 12 karakter, kombinasi huruf besar, kecil, angka, dan simbol. Mengubah password mengeluarkan perangkat lain.")}</p>
      </div>
      <div>
        <label className={label}>{t("Ulangi Password Baru")}</label>
        <input required type="password" autoComplete="new-password" className={input} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      </div>
      {error && <div className="p-2.5 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 font-semibold">{error}</div>}
      <div className="flex justify-end">
        <button type="submit" className="btn-primary !py-2 !px-5 font-bold">{t("Ubah Password")}</button>
      </div>
    </form>
  );
}

function SettingsContent() {
  const params = useSearchParams();
  const { role, isManager, t } = useDashboard();

  const tabs = [
    role === "superadmin" && { key: "ai-admin", label: t("Integrasi Platform"), icon: BotIcon },
    isManager && role !== "superadmin" && { key: "ai-spv", label: t("Persona dan Script AI"), icon: SparklesIcon },
    isManager && { key: "team", label: t("Hak Akses Tim"), icon: UsersIcon },
    { key: "profile", label: t("Profil Usaha dan WhatsApp"), icon: BuildingIcon },
    { key: "account", label: t("Akun Saya"), icon: UserIcon },
  ].filter(Boolean);

  const requested = params.get("tab");
  const [picked, setPicked] = useState(null);
  const active = tabs.find((tab) => tab.key === (picked || requested))?.key || tabs[0].key;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">{t("Pengaturan")}</h1>
        <p className="text-body-sm text-fg-muted">{t("Kelola tim, persona AI, profil usaha, dan koneksi WhatsApp.")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
        {tabs.map(({ key, label: text, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setPicked(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-body-sm font-bold border-none cursor-pointer transition-all whitespace-nowrap ${active === key ? "bg-brand text-white shadow-xs" : "bg-transparent text-fg-muted hover:text-ink hover:bg-white"}`}
          >
            <Icon className="w-4 h-4" />
            <span>{text}</span>
          </button>
        ))}
      </div>

      {active === "ai-admin" && <PlatformTab />}
      {active === "ai-spv" && <PersonaTab />}
      {active === "team" && <TeamTab />}
      {active === "profile" && <ProfileTab />}
      {active === "account" && <AccountTab />}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
