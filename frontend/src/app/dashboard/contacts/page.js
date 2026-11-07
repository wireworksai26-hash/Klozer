"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { UsersIcon, UploadIcon } from "@/components/icons";
import { Tabs } from "@/components/ui";
import DataTransferModal from "@/components/common/DataTransferModal";
import { PAID_STATUSES, relativeTimeKey } from "@/utils/mappers.mjs";

const VIP_SPEND = 1_000_000;
const TAG_TONE = {
  VIP: "bg-warning-100 text-warning-800",
  Repeat: "bg-success-100 text-success-800",
  Closing: "bg-success-50 text-success-800",
  Lead: "bg-brand-soft text-brand",
  Hilang: "bg-danger-50 text-danger-700",
};

export default function ContactsPage() {
  const { leads, orders, importLeads, setLeadVip, serverRole, notify, t } = useDashboard();
  const ago = (iso) => {
    const r = relativeTimeKey(iso);
    return t(r.key, r.vars);
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [segment, setSegment] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const canMark = serverRole !== "finance"; // finance reads the book; marking a contact is for the people who work it
  const [showTransferModal, setShowTransferModal] = useState(false);

  // One row per contact. Spending comes only from orders that were actually paid.
  // Closing = bought, or the sales status says so. Lead = not closing yet. VIP = marked by hand, or spent enough.
  const contacts = leads.map((l) => {
    const mine = orders.filter((o) => o.leadDbId === l.dbId && PAID_STATUSES.includes(o.status));
    const totalSpend = mine.reduce((sum, o) => sum + o.total, 0);
    const repeat = mine.length > 1 || l.status === "repeat_order";
    const closing = mine.length > 0 || l.status === "closing" || repeat;
    const vip = Boolean(l.isVip) || totalSpend >= VIP_SPEND;
    const tags = [];
    if (vip) tags.push("VIP");
    if (repeat) tags.push("Repeat");
    if (closing) tags.push("Closing");
    else if (l.status === "closed_lost") tags.push("Hilang");
    else tags.push("Lead");
    return { id: l.id, dbId: l.dbId, name: l.name, phone: l.phone, city: l.city || "-", totalOrders: mine.length, totalSpend, tags, manualVip: Boolean(l.isVip), lastActive: l.lastInteractionAt };
  });

  const count = (tag) => contacts.filter((c) => c.tags.includes(tag)).length;
  const filtered = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.phone.includes(searchQuery) || c.city.toLowerCase().includes(q);
    return matchSearch && (segment === "all" || c.tags.includes(segment));
  });

  const buyers = contacts.filter((c) => c.totalOrders > 0);
  const totalSpendAll = contacts.reduce((acc, c) => acc + c.totalSpend, 0);
  const avgLtv = buyers.length ? Math.round(totalSpendAll / buyers.length) : 0;
  const repeatRate = buyers.length ? Math.round((buyers.filter((c) => c.totalOrders > 1).length / buyers.length) * 100) : 0;

  // Import creates the contacts in one request. A number that is already in the book is left as it is, never overwritten.
  const handleImportContacts = async (rows) => {
    const summary = await importLeads(rows.map((r) => ({ name: r.name, phone: r.phone, city: r.city, label: r.category })));
    if (!summary) return;
    const parts = [t("{count} kontak diimpor", { count: summary.created })];
    if (summary.existing) parts.push(t("{count} sudah ada", { count: summary.existing }));
    if (summary.duplicates) parts.push(t("{count} ganda di file", { count: summary.duplicates }));
    if (summary.invalidCount) parts.push(t("{count} nomor tidak valid", { count: summary.invalidCount }));
    notify(summary.invalidCount ? "error" : "success", `${parts.join(", ")}.`);
  };

  const toggleVip = async (c) => {
    setBusyId(c.id);
    await setLeadVip(c.id, !c.manualVip);
    setBusyId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="page-head">
        <div>
          <h1 className="page-title">{t("Database Kontak dan Pelanggan")}</h1>
          <p className="text-body-sm text-fg-muted">{t("Seluruh kontak yang pernah chat atau membeli, lengkap dengan total belanja dari pesanan yang sudah dibayar.")}</p>
        </div>
        <button type="button" onClick={() => setShowTransferModal(true)} className="px-4 py-2.5 bg-white hover:bg-success-50 text-fg hover:text-success-700 border border-line rounded-xl text-body-sm font-bold flex items-center gap-2 cursor-pointer self-start">
          <UploadIcon className="w-4 h-4 text-success-600" />
          <span>{t("Impor / Ekspor Excel")}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ["Total Kontak", `${contacts.length}`],
          ["Pelanggan Repeat Order", `${repeatRate}%`],
          ["Rata-rata Belanja per Pembeli", `Rp ${avgLtv.toLocaleString("id-ID")}`],
        ].map(([k, v]) => (
          <div key={k} className="bg-white p-5 rounded-2xl border border-line">
            <div className="text-fg-subtle text-label font-bold uppercase mb-1">{t(k)}</div>
            <div className="text-heading-md font-bold text-fg">{v}</div>
          </div>
        ))}
      </div>

      <Tabs
        label={t("Segmen kontak")}
        value={segment}
        onChange={setSegment}
        tabs={[
          { id: "all", label: t("Semua"), count: contacts.length },
          { id: "Lead", label: t("Lead"), count: count("Lead") },
          { id: "Closing", label: t("Closing"), count: count("Closing") },
          { id: "VIP", label: t("VIP"), count: count("VIP") },
          { id: "Repeat", label: t("Repeat"), count: count("Repeat") },
        ]}
      />

      <div className="bg-white p-4 rounded-2xl border border-line flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <input type="text" placeholder={t("Cari nama, nomor, kota...")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="text-body-sm bg-sunken border border-line rounded-xl px-3.5 py-2 text-fg outline-none w-full sm:w-[260px] focus:border-brand" />
        </div>
        <div className="text-label font-bold text-fg-subtle">
          {t("Menampilkan")} <span className="text-brand">{filtered.length}</span> {t("kontak")}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-line table-scroll">
        <table className="w-full text-left border-collapse text-body-sm">
          <thead>
            <tr className="bg-canvas border-b border-line text-label font-bold uppercase text-fg-muted">
              <th className="py-3 px-4">{t("Nama")}</th>
              <th className="py-3 px-4">WhatsApp</th>
              <th className="py-3 px-4">{t("Kota")}</th>
              <th className="py-3 px-4">{t("Total Belanja")}</th>
              <th className="py-3 px-4">Label</th>
              <th className="py-3 px-4">{t("Aktivitas Terakhir")}</th>
              {canMark ? <th className="py-3 px-4" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canMark ? 7 : 6} className="py-10 text-center text-fg-muted">
                  <div className="flex flex-col items-center max-w-[340px] mx-auto">
                    <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center mb-2">
                      <UsersIcon className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-ink">{contacts.length ? t("Tidak ada kontak yang cocok") : t("Belum ada kontak")}</div>
                    {!contacts.length && <p className="text-label mt-1">{t("Kontak muncul otomatis saat pelanggan chat ke WhatsApp atau Anda membuat pesanan.")}</p>}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-soft">
                  <td className="py-3.5 px-4 font-bold text-fg">{c.name}</td>
                  <td className="py-3.5 px-4 tabular-nums text-fg-muted">{c.phone}</td>
                  <td className="py-3.5 px-4">{c.city}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-fg">Rp {c.totalSpend.toLocaleString("id-ID")}</div>
                    <div className="text-caption text-fg-subtle">{c.totalOrders} {t("pesanan dibayar")}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((tag) => (
                        <span key={tag} className={`text-micro font-bold px-2 py-0.5 rounded-full ${TAG_TONE[tag] || "bg-sunken text-fg-muted"}`}>
                          {t(tag)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-fg-muted text-label">{ago(c.lastActive)}</td>
                  {canMark ? (
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => toggleVip(c)}
                        className="px-2.5 py-1 text-caption font-bold rounded-lg border border-line bg-white hover:bg-warning-50 text-fg-muted hover:text-warning-800 cursor-pointer disabled:opacity-50"
                      >
                        {c.manualVip ? t("Lepas VIP") : t("Jadikan VIP")}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DataTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        type="contacts"
        data={contacts.map((c) => ({ name: c.name, phone: c.phone, city: c.city, category: c.tags.join(", "), totalSpent: c.totalSpend }))}
        onImportSuccess={handleImportContacts}
      />
    </div>
  );
}
