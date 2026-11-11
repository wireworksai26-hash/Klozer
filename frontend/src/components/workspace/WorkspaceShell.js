"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import { RoleGuard } from "@/components/dashboard";
import Logo from "@/components/common/Logo";
import Toast from "@/components/ui/Toast";
import { BarChartIcon, BotIcon, BuildingIcon, TrendingUpIcon, UsersIcon } from "@/components/icons";
import { switchBusiness } from "./switchBusiness";

const NAV = [
  { href: "/workspace", label: "Ringkasan", icon: BarChartIcon, exact: true },
  { href: "/workspace/bisnis", label: "Bisnis", icon: BuildingIcon },
  { href: "/workspace/pelanggan", label: "Pelanggan", icon: UsersIcon },
  { href: "/workspace/laporan", label: "Laporan", icon: TrendingUpIcon },
  { href: "/workspace/asisten", label: "Asisten", icon: BotIcon },
];

/** The way into one business's own dashboard (orders, chats, team). Everything there is operated from that business. */
function EnterBusiness({ workspace }) {
  const { t, notify } = useDashboard();
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    const id = Number(e.target.value);
    if (!id) return;
    setBusy(true);
    try {
      await switchBusiness(id, "/dashboard");
    } catch (err) {
      notify("error", err.message || t("Gagal berpindah bisnis."));
      setBusy(false);
    }
  };
  return (
    <label className="flex items-center gap-2 text-label text-fg-muted">
      <span className="hidden sm:inline">{t("Operasikan bisnis")}</span>
      <select defaultValue="" onChange={go} disabled={busy} aria-label={t("Buka dashboard bisnis")} className="h-9 max-w-[220px] truncate rounded-lg border border-line bg-white px-3 text-body-sm font-medium text-ink cursor-pointer outline-none focus:border-brand disabled:opacity-60">
        <option value="" disabled>
          {t("Buka dashboard bisnis")}
        </option>
        {workspace.institutions.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The owner's own area: a workspace of several businesses, with no customer service tools in it. It has its own navigation and
 * its own look (a dark side column), so it is clear at a glance that this is the level above any single business.
 */
export default function WorkspaceShell({ children }) {
  const { t, status, currentUser, logoutUser, language, setLanguage, notice, dismissNotice } = useDashboard();
  const pathname = usePathname();
  const router = useRouter();
  const workspace = currentUser?.workspace;

  // anyone who is not an owner of a workspace business belongs in the normal dashboard
  useEffect(() => {
    if (status === "ready" && (currentUser?.role !== "owner" || !workspace)) router.replace("/dashboard");
  }, [status, currentUser, workspace, router]);

  if (status === "ready" && (currentUser?.role !== "owner" || !workspace)) return null;

  const active = (item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  return (
    <RoleGuard>
      <div className="min-h-screen bg-canvas lg:flex">
        <Toast notice={notice && { ...notice, message: t(notice.message) }} onClose={dismissNotice} label={t("Tutup")} />

        <aside className="bg-ink text-white lg:w-[248px] lg:flex-shrink-0 lg:h-screen lg:sticky lg:top-0 flex flex-col">
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 lg:pb-6">
            <div className="min-w-0">
              <Logo size="md" variant="light" withIcon={false} href="/workspace" />
              <div className="mt-1 text-caption text-white/60 truncate">{workspace?.name}</div>
            </div>
            <button type="button" onClick={logoutUser} className="lg:hidden text-label font-medium text-white/75 hover:text-white bg-transparent border border-white/20 rounded-lg px-3 py-1.5 cursor-pointer">
              {t("Keluar")}
            </button>
          </div>

          <nav aria-label={t("Menu workspace")} className="flex lg:flex-col gap-1 px-3 pb-3 lg:pb-0 overflow-x-auto lg:overflow-visible no-scrollbar">
            {NAV.map((item) => {
              const on = active(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-body-sm font-medium whitespace-nowrap no-underline transition-colors ${on ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5"}`}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>{t(item.label)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex flex-col gap-3 mt-auto p-4 border-t border-white/10">
            <div className="min-w-0 px-1">
              <div className="text-body-sm font-medium text-white truncate">{currentUser?.name}</div>
              <div className="text-caption text-white/60 truncate">{currentUser?.email}</div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex rounded-lg border border-white/20 p-0.5" role="group" aria-label={t("Bahasa")}>
                {["id", "en"].map((l) => (
                  <button key={l} type="button" onClick={() => setLanguage(l)} aria-pressed={language === l} className={`px-2.5 py-1 text-caption font-medium rounded-md cursor-pointer border-none transition-colors ${language === l ? "bg-white text-ink" : "bg-transparent text-white/75 hover:text-white"}`}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <button type="button" onClick={logoutUser} className="text-label font-medium text-white/75 hover:text-white bg-transparent border-none cursor-pointer">
                {t("Keluar")}
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-end gap-3 px-5 sm:px-8 pt-4">{workspace ? <EnterBusiness workspace={workspace} /> : null}</div>
          <main className="flex-1 px-5 sm:px-8 pb-12 pt-4">
            <div className="max-w-[1120px] mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
