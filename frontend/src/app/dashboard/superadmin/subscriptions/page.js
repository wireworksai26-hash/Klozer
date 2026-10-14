"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { XIcon } from "@/components/icons";

const PLANS = ["Starter", "Pro Plan", "Enterprise"];
const fmt = (n) => Number(n || 0).toLocaleString("id-ID");
const input = "w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium focus:border-brand";

export default function SubscriptionsAdminPage() {
  const { subscriptions, institutions, extendSubscription, updateInstitution, t } = useDashboard();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [plan, setPlan] = useState("Pro Plan");
  const [addTokens, setAddTokens] = useState(0);
  const [busy, setBusy] = useState(false);

  const rows = subscriptions.filter((s) => (filter === "all" || s.status === filter) && s.institutionName.toLowerCase().includes(search.trim().toLowerCase()));
  const totals = subscriptions.reduce(
    (acc, s) => ({ quota: acc.quota + s.tokenQuotaTotal, used: acc.used + s.tokenUsed, active: acc.active + (s.status === "active" ? 1 : 0) }),
    { quota: 0, used: 0, active: 0 }
  );

  const open = (sub) => {
    setEditing(sub);
    setPlan(sub.plan);
    setAddTokens(0);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await extendSubscription(editing.id, { plan, additionalTokens: Math.max(0, Math.trunc(Number(addTokens) || 0)) });
    setBusy(false);
    if (ok) setEditing(null);
  };

  const toggleActive = (sub) => updateInstitution(sub.institutionId, { status: sub.status === "active" ? "inactive" : "active" });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">{t("Paket dan Kuota Tenant")}</h1>
        <p className="text-body-sm text-fg-muted">{t("Atur paket dan kuota token AI setiap tenant. Perubahan langsung berlaku. Penagihan dilakukan di luar aplikasi.")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ["Tenant aktif", `${totals.active} / ${subscriptions.length}`],
          ["Total kuota token", fmt(totals.quota)],
          ["Token terpakai", `${fmt(totals.used)}${totals.quota ? ` (${Math.round((totals.used / totals.quota) * 100)}%)` : ""}`],
        ].map(([k, v]) => (
          <div key={k} className="bg-white p-5 rounded-2xl border border-line">
            <div className="text-label text-fg-muted font-bold uppercase">{t(k)}</div>
            <div className="text-heading-md font-bold text-ink mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Cari tenant...")} className={`${input} sm:max-w-xs`} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${input} sm:max-w-[200px]`}>
          <option value="all">{t("Semua status")}</option>
          <option value="active">{t("Aktif")}</option>
          <option value="suspended">{t("Nonaktif")}</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-line table-scroll">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-canvas border-b border-line text-label font-bold uppercase text-fg-muted">
              <th className="py-3 px-5">Tenant</th>
              <th className="py-3 px-5">{t("Paket")}</th>
              <th className="py-3 px-5">{t("Pemakaian Token AI")}</th>
              <th className="py-3 px-5">{t("Kredit Blast")}</th>
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5 text-right">{t("Aksi")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-body-sm">
            {rows.map((s) => {
              const pct = s.tokenQuotaTotal ? Math.min(100, Math.round((s.tokenUsed / s.tokenQuotaTotal) * 100)) : 0;
              return (
                <tr key={s.id} className="hover:bg-soft">
                  <td className="py-3.5 px-5 font-bold text-ink">{s.institutionName}</td>
                  <td className="py-3.5 px-5">{s.plan}</td>
                  <td className="py-3.5 px-5 min-w-[220px]">
                    <div className="text-caption text-fg-muted mb-1">
                      {fmt(s.tokenUsed)} / {fmt(s.tokenQuotaTotal)} ({pct}%)
                    </div>
                    <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                      <div className={`h-full ${pct >= 90 ? "bg-danger-500" : pct >= 70 ? "bg-warning-500" : "bg-success-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="py-3.5 px-5">{fmt(s.blastCredits)}</td>
                  <td className="py-3.5 px-5">
                    <span className={`px-2.5 py-0.5 rounded-full text-caption font-bold ${s.status === "active" ? "bg-success-100 text-success-800" : "bg-line-strong text-fg"}`}>
                      {s.status === "active" ? t("Aktif") : t("Nonaktif")}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <button onClick={() => open(s)} className="px-2.5 py-1 text-caption font-bold text-brand bg-brand-soft rounded-lg border border-brand/20 cursor-pointer mr-2">{t("Ubah Paket")}</button>
                    <button onClick={() => toggleActive(s)} className="px-2.5 py-1 text-caption font-bold text-ink bg-canvas rounded-lg border border-line cursor-pointer">
                      {s.status === "active" ? t("Nonaktifkan") : t("Aktifkan")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="py-10 text-center text-fg-muted text-body-sm">{institutions.length ? t("Tidak ada tenant yang cocok.") : t("Belum ada tenant.")}</div>}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white rounded-2xl w-full max-w-[440px] p-6 shadow-2xl border border-line animate-scale-pop flex flex-col gap-3.5 text-body-sm">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="card-title">{t("Ubah Paket:")} {editing.institutionName}</h3>
              <button type="button" onClick={() => setEditing(null)} className="w-7 h-7 rounded-full bg-canvas flex items-center justify-center border-none cursor-pointer" aria-label={t("Tutup")}>
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="font-bold text-ink block mb-1">{t("Paket")}</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value)} className={input}>
                {PLANS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-ink block mb-1">{t("Tambah kuota token AI")}</label>
              <input type="number" min={0} step={10000} value={addTokens} onChange={(e) => setAddTokens(e.target.value)} className={input} />
              <p className="text-caption text-fg-muted mt-1">{t("Kuota saat ini {current}. Setelah ditambah: {after}.", { current: fmt(editing.tokenQuotaTotal), after: fmt(editing.tokenQuotaTotal + Math.max(0, Math.trunc(Number(addTokens) || 0))) })}</p>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button type="button" onClick={() => setEditing(null)} className="btn-outline !py-2 !px-4">{t("Batal")}</button>
              <button type="submit" disabled={busy} className="btn-primary !py-2 !px-5 font-bold disabled:opacity-60">{busy ? t("Menyimpan...") : t("Simpan")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
