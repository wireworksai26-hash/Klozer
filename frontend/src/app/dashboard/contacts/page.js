"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { UsersIcon, UploadIcon, TagIcon } from "@/components/icons";
import DataTransferModal from "@/components/common/DataTransferModal";
import { PAID_STATUSES } from "@/utils/mappers.mjs";

export default function ContactsPage() {
  const { leads, orders, addLead, refreshLeads, notify } = useDashboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [showTransferModal, setShowTransferModal] = useState(false);

  // One row per lead; spending comes only from orders that were actually paid.
  const contacts = leads.map((l) => {
    const mine = orders.filter((o) => o.leadDbId === l.dbId && PAID_STATUSES.includes(o.status));
    const totalSpend = mine.reduce((sum, o) => sum + o.total, 0);
    const tags = [];
    if (mine.length > 1) tags.push("Repeat");
    if (totalSpend >= 1_000_000) tags.push("VIP");
    if (mine.length === 0) tags.push(l.status === "new" ? "New Lead" : "Belum Beli");
    return { id: l.id, name: l.name, phone: l.phone, city: l.city || "-", totalOrders: mine.length, totalSpend, tags, lastActive: l.lastInteraction };
  });

  const filtered = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.phone.includes(searchQuery) || c.city.toLowerCase().includes(q);
    return matchSearch && (selectedTag === "all" || c.tags.includes(selectedTag));
  });

  const buyers = contacts.filter((c) => c.totalOrders > 0);
  const totalSpendAll = contacts.reduce((acc, c) => acc + c.totalSpend, 0);
  const avgLtv = buyers.length ? Math.round(totalSpendAll / buyers.length) : 0;
  const repeatRate = buyers.length ? Math.round((buyers.filter((c) => c.totalOrders > 1).length / buyers.length) * 100) : 0;

  // Import creates real leads. Rows whose number already exists are reported, not duplicated.
  const handleImportContacts = async (rows) => {
    let created = 0;
    let skipped = 0;
    for (const r of rows) {
      const result = await addLead({ name: r.name, phone: r.phone, city: r.city, source: "Impor Excel", notes: r.category ? `Label: ${r.category}` : undefined, status: "new" });
      if (result) created++;
      else skipped++;
    }
    await refreshLeads().catch(() => {});
    notify(skipped ? "error" : "success", `${created} kontak diimpor${skipped ? `, ${skipped} dilewati (nomor tidak valid atau sudah ada)` : ""}.`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Database Kontak dan Pelanggan</h1>
          <p className="text-body-sm text-fg-muted">Seluruh kontak yang pernah chat atau membeli, lengkap dengan total belanja dari pesanan yang sudah dibayar.</p>
        </div>
        <button type="button" onClick={() => setShowTransferModal(true)} className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-fg hover:text-emerald-700 border border-line rounded-xl text-body-sm font-bold flex items-center gap-2 cursor-pointer self-start">
          <UploadIcon className="w-4 h-4 text-emerald-600" />
          <span>Impor / Ekspor Excel</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ["Total Kontak", `${contacts.length}`],
          ["Pelanggan Repeat Order", `${repeatRate}%`],
          ["Rata-rata Belanja per Pembeli", `Rp ${avgLtv.toLocaleString("id-ID")}`],
        ].map(([k, v]) => (
          <div key={k} className="bg-white p-5 rounded-2xl border border-line">
            <div className="text-fg-subtle text-label font-bold uppercase mb-1">{k}</div>
            <div className="text-heading-md font-bold text-fg">{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-line flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <input type="text" placeholder="Cari nama, nomor, kota..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="text-body-sm bg-sunken border border-line rounded-xl px-3.5 py-2 text-fg outline-none w-full sm:w-[260px] focus:border-brand" />
          <div className="flex items-center gap-1.5 bg-sunken border border-line rounded-xl px-3 py-1.5">
            <TagIcon className="w-3.5 h-3.5 text-fg-subtle" />
            <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="bg-transparent text-label font-bold text-fg outline-none cursor-pointer">
              <option value="all">Semua label</option>
              <option value="VIP">VIP (belanja ≥ Rp 1 juta)</option>
              <option value="Repeat">Repeat order</option>
              <option value="New Lead">Lead baru</option>
              <option value="Belum Beli">Belum beli</option>
            </select>
          </div>
        </div>
        <div className="text-label font-bold text-fg-subtle">
          Menampilkan <span className="text-brand">{filtered.length}</span> kontak
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-line overflow-x-auto">
        <table className="w-full text-left border-collapse text-body-sm">
          <thead>
            <tr className="bg-canvas border-b border-line text-label font-bold uppercase text-fg-muted">
              <th className="py-3 px-4">Nama</th>
              <th className="py-3 px-4">WhatsApp</th>
              <th className="py-3 px-4">Kota</th>
              <th className="py-3 px-4">Total Belanja</th>
              <th className="py-3 px-4">Label</th>
              <th className="py-3 px-4">Aktivitas Terakhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-fg-muted">
                  <div className="flex flex-col items-center max-w-[340px] mx-auto">
                    <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center mb-2">
                      <UsersIcon className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-ink">{contacts.length ? "Tidak ada kontak yang cocok" : "Belum ada kontak"}</div>
                    {!contacts.length && <p className="text-label mt-1">Kontak muncul otomatis saat pelanggan chat ke WhatsApp atau Anda membuat pesanan.</p>}
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
                    <div className="text-caption text-fg-subtle">{c.totalOrders} pesanan dibayar</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span key={t} className={`text-micro font-bold px-2 py-0.5 rounded-full ${t === "VIP" ? "bg-amber-100 text-amber-800" : t === "Repeat" ? "bg-emerald-100 text-emerald-800" : "bg-blue-50 text-brand"}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-fg-muted text-label">{c.lastActive}</td>
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
