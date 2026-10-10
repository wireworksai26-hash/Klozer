"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { BotIcon, BuildingIcon, SparklesIcon, UserIcon, UsersIcon, XIcon } from "@/components/icons";

const card = "bg-white p-6 rounded-2xl border border-line shadow-[0_2px_12px_rgba(12,23,84,0.04)]";
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-bold border ${ok ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
      <span className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
      {ok ? yes : no}
    </span>
  );
}

function PlatformTab() {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    let cancelled = false;
    api
      .get("/system/integrations")
      .then((data) => !cancelled && setState({ loading: false, data, error: "" }))
      .catch((err) => !cancelled && setState({ loading: false, data: null, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) return <div className={card}>Memuat status integrasi...</div>;
  if (state.error) return <div className={`${card} text-rose-700`}>{state.error}</div>;
  const { ai, whatsapp, payments, email, webhooks } = state.data;

  const rows = [
    ["AI utama", `${ai.primaryProvider} (${ai.primaryProvider === "gemini" ? ai.geminiModel : ai.nvidiaModel})`, ai[ai.primaryProvider]],
    ["NVIDIA NIM", ai.nvidiaModel, ai.nvidia],
    ["Google Gemini", ai.geminiModel, ai.gemini],
    ["Meta App Secret (verifikasi webhook)", "META_APP_SECRET", whatsapp.appSecret],
    ["Meta Verify Token", "META_WEBHOOK_VERIFY_TOKEN", whatsapp.verifyToken],
    ["Midtrans (QRIS)", payments.mode ? `mode ${payments.mode}` : "MIDTRANS_SERVER_KEY", payments.midtrans],
    ["Email SMTP", "SMTP_HOST / SMTP_USER / SMTP_PASS", email.smtp],
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[860px]">
      <div className={card}>
        <h3 className="card-title mb-1">Status Integrasi Platform</h3>
        <p className="text-label text-fg-muted mb-5">
          Kunci API dan rahasia disimpan di environment server dan tidak pernah dikirim ke browser. Untuk mengubahnya, edit file .env di server lalu restart layanan.
        </p>
        <div className="divide-y divide-line">
          {rows.map(([name, detail, ok]) => (
            <div key={name} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="font-bold text-ink text-body-sm">{name}</div>
                <div className="text-caption text-fg-muted font-mono">{detail}</div>
              </div>
              <StatusPill ok={Boolean(ok)} yes="Terkonfigurasi" no="Belum diatur" />
            </div>
          ))}
        </div>
      </div>
      <div className={card}>
        <h3 className="card-title mb-3">URL Webhook untuk Didaftarkan</h3>
        {[
          ["Meta WhatsApp", webhooks.whatsapp],
          ["Midtrans Notification URL", webhooks.midtrans],
        ].map(([name, url]) => (
          <div key={name} className="mb-3">
            <label className={label}>{name}</label>
            <input readOnly value={url} className={`${input} font-mono text-label`} onFocus={(e) => e.target.select()} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PersonaTab() {
  const { aiConfig, updateSpvAiPersona } = useDashboard();
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
    ["botName", "Nama Asisten AI", "Contoh: Siti, Asisten Toko Batik"],
    ["tone", "Gaya Bahasa", "Ramah, santun, dan solutif"],
  ];

  return (
    <form onSubmit={save} className={`${card} max-w-[760px] flex flex-col gap-4 text-body-sm`}>
      <div>
        <h3 className="card-title">Persona dan Script AI</h3>
        <p className="text-label text-fg-muted">Dipakai langsung saat AI membalas pelanggan di WhatsApp.</p>
      </div>
      {fields.map(([key, name, placeholder]) => (
        <div key={key}>
          <label className={label}>{name}</label>
          <input className={input} value={view[key] || ""} placeholder={placeholder} maxLength={300} onChange={set(key)} />
        </div>
      ))}
      <div>
        <label className={label}>Sapaan Pembuka</label>
        <textarea className={input} rows={3} maxLength={500} value={view.greetingMessage || ""} onChange={set("greetingMessage")} placeholder="Halo kak! Terima kasih sudah menghubungi kami." />
      </div>
      <div>
        <label className={label}>Pesan Follow-up Keranjang Ditinggalkan</label>
        <textarea className={input} rows={2} maxLength={500} value={view.abandonedMessage || ""} onChange={set("abandonedMessage")} />
      </div>
      <div>
        <label className={label}>Topik yang Sering Ditanyakan</label>
        <input className={input} maxLength={500} value={view.customFaqKeywords || ""} onChange={set("customFaqKeywords")} placeholder="ongkir, transfer, cod, ukuran, resi" />
      </div>
      <div className="flex justify-end pt-2 border-t border-line">
        <button type="submit" disabled={saving} className="btn-primary !py-2 !px-5 font-bold disabled:opacity-60">
          {saving ? "Menyimpan..." : "Simpan Persona"}
        </button>
      </div>
    </form>
  );
}

function CredentialsBox({ credentials, onClose }) {
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
    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-body-sm">
      <div className="font-bold text-amber-900 mb-1">Simpan kredensial ini sekarang. Password hanya ditampilkan sekali.</div>
      <pre className="font-mono text-label bg-white border border-amber-200 rounded-lg p-3 whitespace-pre-wrap break-all">{text}</pre>
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={copy} className="btn-outline !py-1.5 !px-3 text-label">{copied ? "Tersalin" : "Salin"}</button>
        <button type="button" onClick={onClose} className="btn-primary !py-1.5 !px-3 text-label">Selesai</button>
      </div>
    </div>
  );
}

function TeamTab() {
  const { teamMembers, addTeamMember, updateTeamMemberPermissions, deleteTeamMember, resetTeamMemberPassword, currentUser } = useDashboard();
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
            <h3 className="card-title">Anggota Tim dan Hak Akses</h3>
            <p className="text-label text-fg-muted">Menonaktifkan staf langsung mengeluarkan mereka dari semua sesi yang sedang aktif.</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary !py-2 !px-4 text-body-sm font-bold">+ Tambah Anggota Tim</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas border-b border-line">
                <th className="py-3 px-4 text-label font-bold uppercase text-fg-muted">Nama dan Peran</th>
                {PERMISSIONS.map(([, name]) => (
                  <th key={name} className="py-3 px-4 text-label font-bold uppercase text-fg-muted">{name}</th>
                ))}
                <th className="py-3 px-4 text-label font-bold uppercase text-fg-muted text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-body-sm">
              {teamMembers.map((m) => {
                const isSelf = m.dbId === currentUser?.id;
                const inactive = m.status !== "active";
                return (
                  <tr key={m.id} className={inactive ? "opacity-50" : "hover:bg-soft"}>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-ink">{m.name}{inactive ? " (nonaktif)" : ""}</div>
                      <div className="text-caption text-fg-muted">{m.email} • <span className="text-brand font-bold">{m.role}</span></div>
                    </td>
                    {PERMISSIONS.map(([key]) => (
                      <td key={key} className="py-3.5 px-4">
                        <button
                          type="button"
                          disabled={inactive}
                          onClick={() => updateTeamMemberPermissions(m.id, key)}
                          className={`px-2.5 py-1 rounded-full text-caption font-bold border transition-all cursor-pointer ${m.permissions[key] ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                        >
                          {m.permissions[key] ? "Diizinkan" : "Terkunci"}
                        </button>
                      </td>
                    ))}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {!isSelf && !inactive && (
                        <>
                          <button type="button" onClick={() => reset(m)} className="px-2 py-1 text-brand hover:bg-brand-soft rounded-lg text-caption font-bold border-none cursor-pointer bg-transparent">Reset Password</button>
                          {confirmId === m.id ? (
                            <button type="button" onClick={() => { deleteTeamMember(m.id); setConfirmId(null); }} className="px-2 py-1 text-white bg-red-600 rounded-lg text-caption font-bold border-none cursor-pointer">Yakin nonaktifkan?</button>
                          ) : (
                            <button type="button" onClick={() => setConfirmId(m.id)} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg text-caption font-bold border-none cursor-pointer bg-transparent">Nonaktifkan</button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {teamMembers.length === 0 && <div className="py-8 text-center text-fg-muted text-body-sm">Belum ada anggota tim.</div>}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-line animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="card-title">Tambah Anggota Tim Baru</h3>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-full bg-canvas hover:bg-brand-soft flex items-center justify-center text-fg-muted border-none cursor-pointer" aria-label="Tutup">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submit} className="flex flex-col gap-3.5 text-body-sm">
              <div>
                <label className={label}>Nama Lengkap *</label>
                <input required minLength={2} className={input} value={member.name} onChange={(e) => setMember({ ...member, name: e.target.value })} placeholder="Contoh: Rian Anggara" />
              </div>
              <div>
                <label className={label}>Email Login *</label>
                <input required type="email" className={input} value={member.email} onChange={(e) => setMember({ ...member, email: e.target.value })} placeholder="rian.cs@brand.id" />
              </div>
              <div>
                <label className={label}>Peran Jabatan</label>
                <select className={input} value={member.role} onChange={(e) => setMember({ ...member, role: e.target.value })}>
                  <option>Customer Service Junior</option>
                  <option>Customer Service Senior</option>
                  <option>Supervisor (SPV)</option>
                  <option>Finance & Rekonsiliasi</option>
                  <option>PIC Gudang</option>
                </select>
              </div>
              <p className="text-caption text-fg-muted">Password awal dibuat otomatis dan hanya ditampilkan sekali setelah akun dibuat.</p>
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-line mt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-outline !py-2 !px-4 text-body-sm">Batal</button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-body-sm font-bold">Simpan Staf Baru</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileTab() {
  const { activeInstitution, updateInstitution, whatsappStatus, notify, isManager } = useDashboard();
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
      notify("success", "Kanal WhatsApp tersimpan. Token disimpan terenkripsi.");
    } catch (err) {
      notify("error", err.message);
    }
  };

  const removeChannel = async () => {
    try {
      await api.delete("/whatsapp/channel");
      setChannel(null);
      notify("success", "Kanal WhatsApp dilepas.");
    } catch (err) {
      notify("error", err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[760px]">
      <form onSubmit={saveProfile} className={`${card} flex flex-col gap-3.5 text-body-sm`}>
        <h3 className="card-title">Profil Usaha</h3>
        <div>
          <label className={label}>Nama Usaha / Toko</label>
          <input className={input} value={view.name} onChange={(e) => setProfile({ ...view, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>Nomor Telepon</label>
            <input className={input} value={view.phone} onChange={(e) => setProfile({ ...view, phone: e.target.value })} />
          </div>
          <div>
            <label className={label}>Alamat</label>
            <input className={input} value={view.address} onChange={(e) => setProfile({ ...view, address: e.target.value })} />
          </div>
        </div>
        {isManager && (
          <div className="flex justify-end">
            <button type="submit" className="btn-primary !py-2 !px-5 font-bold">Simpan Profil</button>
          </div>
        )}
      </form>

      {isManager && (
        <form onSubmit={saveChannel} className={`${card} flex flex-col gap-3.5 text-body-sm`}>
          <div className="flex items-center justify-between">
            <h3 className="card-title">WhatsApp Cloud API</h3>
            <StatusPill ok={Boolean(channel || whatsappStatus?.configured)} yes="Terhubung" no="Belum terhubung" />
          </div>
          {channel && (
            <p className="text-label text-fg-muted">
              Nomor aktif: <span className="font-mono font-bold">{channel.display_phone || channel.phone_number_id}</span>. Token tidak pernah ditampilkan kembali. Isi ulang di bawah untuk menggantinya.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Phone Number ID (dari Meta)</label>
              <input required className={`${input} font-mono text-label`} value={wa.phone_number_id} onChange={(e) => setWa({ ...wa, phone_number_id: e.target.value })} />
            </div>
            <div>
              <label className={label}>Nomor Tampilan</label>
              <input className={input} value={wa.display_phone} onChange={(e) => setWa({ ...wa, display_phone: e.target.value })} placeholder="+62 811-0000-0000" />
            </div>
          </div>
          <div>
            <label className={label}>Access Token (permanent)</label>
            <input required type="password" autoComplete="off" className={`${input} font-mono text-label`} value={wa.access_token} onChange={(e) => setWa({ ...wa, access_token: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            {channel && (
              <button type="button" onClick={removeChannel} className="btn-outline !py-2 !px-4 text-body-sm !text-red-600">Lepas Nomor</button>
            )}
            <button type="submit" className="btn-primary !py-2 !px-5 font-bold">Simpan Kanal</button>
          </div>
        </form>
      )}
    </div>
  );
}

function AccountTab() {
  const { currentUser, changePassword } = useDashboard();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.next.length < 12) return setError("Password baru minimal 12 karakter.");
    if (form.next !== form.confirm) return setError("Konfirmasi password tidak sama.");
    const ok = await changePassword(form.current, form.next);
    if (ok) setForm({ current: "", next: "", confirm: "" });
  };

  return (
    <form onSubmit={submit} className={`${card} max-w-[560px] flex flex-col gap-3.5 text-body-sm`}>
      <div>
        <h3 className="card-title">Akun Saya</h3>
        <p className="text-label text-fg-muted">{currentUser?.name} • {currentUser?.email}</p>
      </div>
      <div>
        <label className={label}>Password Saat Ini</label>
        <input required type="password" autoComplete="current-password" className={input} value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
      </div>
      <div>
        <label className={label}>Password Baru</label>
        <input required type="password" autoComplete="new-password" className={input} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
        <p className="text-caption text-fg-muted mt-1">Minimal 12 karakter, kombinasi huruf besar, kecil, angka, dan simbol. Mengubah password mengeluarkan perangkat lain.</p>
      </div>
      <div>
        <label className={label}>Ulangi Password Baru</label>
        <input required type="password" autoComplete="new-password" className={input} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      </div>
      {error && <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">{error}</div>}
      <div className="flex justify-end">
        <button type="submit" className="btn-primary !py-2 !px-5 font-bold">Ubah Password</button>
      </div>
    </form>
  );
}

function SettingsContent() {
  const params = useSearchParams();
  const { role, isManager } = useDashboard();

  const tabs = [
    role === "superadmin" && { key: "ai-admin", label: "Integrasi Platform", icon: BotIcon },
    isManager && role !== "superadmin" && { key: "ai-spv", label: "Persona dan Script AI", icon: SparklesIcon },
    isManager && { key: "team", label: "Hak Akses Tim", icon: UsersIcon },
    { key: "profile", label: "Profil Usaha dan WhatsApp", icon: BuildingIcon },
    { key: "account", label: "Akun Saya", icon: UserIcon },
  ].filter(Boolean);

  const requested = params.get("tab");
  const [picked, setPicked] = useState(null);
  const active = tabs.find((t) => t.key === (picked || requested))?.key || tabs[0].key;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Pengaturan</h1>
        <p className="text-body-sm text-fg-muted">Kelola tim, persona AI, profil usaha, dan koneksi WhatsApp.</p>
      </div>

      <div className="flex items-center gap-2 border-b border-line pb-2 overflow-x-auto scrollbar-none">
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
