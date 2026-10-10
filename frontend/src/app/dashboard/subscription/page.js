"use client";
import { useDashboard } from "@/context/DashboardContext";

const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

function Meter({ label, used, total }) {
  const pct = total ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="bg-white p-5 rounded-2xl border border-line">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-label font-bold text-fg-muted uppercase">{label}</span>
        <span className="text-caption text-fg-muted">{pct}%</span>
      </div>
      <div className="text-heading-md font-bold text-ink">
        {fmt(used)} <span className="text-body-sm font-medium text-fg-muted">/ {fmt(total)}</span>
      </div>
      <div className="h-2 bg-canvas rounded-full overflow-hidden mt-3">
        <div className={`h-full ${pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function StoreSubscriptionPage() {
  const { activeSubscription: sub, activeInstitution, tokenBalance, teamMembers } = useDashboard();

  if (!sub) return <div className="p-8 text-center text-fg-muted">Memuat data paket...</div>;

  const used = tokenBalance?.consumedTokens ?? sub.tokenUsed;
  const total = tokenBalance?.totalQuota ?? sub.tokenQuotaTotal;
  const staff = teamMembers.filter((m) => m.status === "active").length;
  const blocked = sub.status !== "active";

  return (
    <div className="flex flex-col gap-6 max-w-[900px]">
      <div>
        <h1 className="page-title">Paket Langganan</h1>
        <p className="text-body-sm text-fg-muted">Paket aktif dan pemakaian kuota {activeInstitution?.name}.</p>
      </div>

      {blocked && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">Akun tenant ini tidak aktif. Hubungi admin Klozer.</div>}

      <div className="bg-white p-6 rounded-2xl border border-line flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-label font-bold text-fg-muted uppercase">Paket saat ini</div>
          <div className="text-heading font-bold text-ink">{sub.plan}</div>
        </div>
        <span className={`px-3 py-1 rounded-full text-caption font-bold ${blocked ? "bg-gray-200 text-gray-700" : "bg-emerald-100 text-emerald-800"}`}>{blocked ? "Nonaktif" : "Aktif"}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Meter label="Token AI terpakai" used={used} total={total} />
        <div className="bg-white p-5 rounded-2xl border border-line">
          <div className="text-label font-bold text-fg-muted uppercase mb-2">Tim aktif</div>
          <div className="text-heading-md font-bold text-ink">{staff} akun</div>
          <div className="text-caption text-fg-muted mt-1">{sub.csSeatsUsed} akun CS</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-line text-body-sm text-fg-muted leading-relaxed">
        Kuota token dipakai setiap kali AI membalas pelanggan. Ketika kuota habis, AI berhenti membalas otomatis dan percakapan diteruskan ke tim CS Anda. Untuk menaikkan paket atau menambah kuota, hubungi admin Klozer.
      </div>
    </div>
  );
}
