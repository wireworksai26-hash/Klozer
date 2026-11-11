"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Button, CheckboxField, EmptyState, PageHeader, SearchInput, TableShell } from "@/components/ui";

const PAGE = 30;

/** People joined by phone number across the businesses of the workspace. Read only: it opens nothing and sends nothing. */
export default function ContactsTab() {
  const { t } = useDashboard();
  const { rupiah, number } = useFormat();
  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");
  const [shared, setShared] = useState(false);
  const [page, setPage] = useState(0);

  // wait for a pause in typing before asking the server
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(typed.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(id);
  }, [typed]);

  const query = useApi("/workspace/contacts", { query: { search, shared: shared ? "1" : "0", limit: PAGE, offset: page * PAGE } });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("Pelanggan")} description={t("Orang yang sama di beberapa bisnis tampil sebagai satu, lengkap dengan belanjanya di tiap bisnis.")} />
      <div className="flex flex-wrap items-end gap-4">
        <SearchInput value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("Cari nama atau nomor")} aria-label={t("Cari nama atau nomor")} className="w-full sm:w-[320px]" />
        <CheckboxField
          checked={shared}
          onChange={(v) => {
            setShared(v);
            setPage(0);
          }}
          label={t("Hanya yang membeli di lebih dari satu bisnis")}
        />
      </div>
      <p className="text-label text-fg-muted m-0">{t("Digabung lewat nomor telepon. Hanya untuk dilihat: persetujuan promosi tetap per bisnis, dan isi chat tidak ikut.")}</p>

      <Async query={query} loadingLabel={t("Memuat kontak...")}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState icon="user" title={shared ? t("Belum ada pelanggan yang sama di dua bisnis") : t("Tidak ada kontak yang cocok")} body={shared ? t("Orang dengan nomor yang sama di dua bisnis akan muncul di sini.") : undefined} />
          ) : (
            <>
              <p className="m-0 text-label text-fg-muted tabular-nums">{t("{people} orang di semua bisnis, {shared} di antaranya di lebih dari satu bisnis", { people: number(data.people), shared: number(data.shared) })}</p>
              <TableShell>
                <thead>
                  <tr>
                    <th>{t("Kontak")}</th>
                    <th>{t("Bisnis")}</th>
                    <th className="text-right">{t("Total belanja")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.phone}>
                      <td>
                        <div className="font-semibold text-fg">{p.name || t("Tanpa nama")}</div>
                        <div className="text-caption text-fg-subtle tabular-nums">+{p.phone}</div>
                      </td>
                      <td>
                        <ul className="list-none m-0 p-0 flex flex-col gap-1">
                          {p.businesses.map((b) => (
                            <li key={b.leadId} className="text-label text-fg-muted">
                              <span className="font-medium text-fg">{b.institutionName}</span>
                              {b.isVip ? ` | VIP` : ""} | {t("{count} pesanan", { count: b.orders })}, {rupiah(b.spent)}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="text-right tabular-nums font-semibold">{rupiah(p.spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
              <div className="flex items-center justify-between text-label text-fg-muted">
                <span>{t("{count} orang", { count: number(data.total) })}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    {t("Sebelumnya")}
                  </Button>
                  <Button size="sm" variant="secondary" disabled={(page + 1) * PAGE >= data.total} onClick={() => setPage((p) => p + 1)}>
                    {t("Berikutnya")}
                  </Button>
                </div>
              </div>
            </>
          )
        }
      </Async>
    </div>
  );
}
