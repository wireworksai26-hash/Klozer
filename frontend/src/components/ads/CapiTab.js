"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Badge, Button, Card, EmptyState, Stat, TableShell, TextField } from "@/components/ui";

const MODE = {
  business_messaging: "Pelanggan dari iklan Click-to-WhatsApp",
  chat: "Dicocokkan lewat nomor telepon",
};

const SKIPPED = {
  not_configured: "Pixel dan token belum diisi.",
  feature_disabled: "Conversions API tidak aktif di paket toko ini.",
  already_sent: "Event pembelian ini sudah terkirim sebelumnya.",
  order_not_found: "Pesanan tidak ditemukan.",
  lead_not_found: "Kontak pesanan ini tidak ditemukan.",
};

function DatasetForm({ configured, onSaved }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [pixelId, setPixelId] = useState("");
  const [token, setToken] = useState("");
  const pixelOk = pixelId.trim().length >= 5 && pixelId.trim().length <= 40;
  const tokenOk = token.trim().length >= 10;

  const save = async (e) => {
    e.preventDefault();
    const out = await run(() => api.put("/integrations/meta-capi", { pixel_id: pixelId.trim(), access_token: token.trim() }), { success: t("Conversions API tersimpan.") });
    if (!out.ok) return;
    setPixelId("");
    setToken("");
    onSaved();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4" autoComplete="off">
      <TextField label={t("ID dataset (pixel)")} value={pixelId} onChange={(e) => setPixelId(e.target.value)} className="font-mono" hint={t("Ada di Events Manager Meta.")} required />
      <TextField label={t("Token akses")} type="password" autoComplete="new-password" value={token} onChange={(e) => setToken(e.target.value)} className="font-mono" hint={t("Dibuat di Events Manager. Disimpan terenkripsi dan tidak pernah ditampilkan lagi.")} required />
      <div>
        <Button type="submit" loading={pending} disabled={!pixelOk || !tokenOk}>
          {configured ? t("Ganti dataset atau token") : t("Simpan dataset")}
        </Button>
      </div>
    </form>
  );
}

/** Purchase events sent to Meta so it can credit sales to ads, with a retry for the ones that failed. */
export default function CapiTab({ canEdit }) {
  const { t, notify } = useDashboard();
  const f = useFormat();
  const { run, pending } = useAction();
  const capi = useApi("/ads/capi");
  const [retrying, setRetrying] = useState(null);

  const retry = async (event) => {
    setRetrying(event.orderId);
    const out = await run(() => api.post(`/ads/capi/orders/${event.orderId}/send`, {}));
    setRetrying(null);
    if (!out.ok) return;
    const result = out.data.data || {};
    if (out.data.success) notify("success", t("Event pembelian pesanan {number} terkirim ke Meta.", { number: event.orderNumber }));
    else if (result.skipped) notify("error", t(SKIPPED[result.reason] || "Event tidak dikirim."));
    else notify("error", result.status ? t("Meta menolak event (kode {status}). Akan dicoba lagi otomatis.", { status: result.status }) : t("Event belum terkirim: Meta tidak bisa dihubungi. Akan dicoba lagi otomatis."));
    capi.reload();
  };

  return (
    <Async query={capi} loadingLabel={t("Memuat Conversions API...")}>
      {(res) => {
        const d = res.data;
        return (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Stat label={t("Dataset")} value={d.configured ? t("Terhubung") : t("Belum diisi")} note={d.pixelId ? d.pixelId : undefined} />
              <Stat label={t("Event terkirim")} value={f.number(d.sent)} />
              <Stat label={t("Event gagal")} value={f.number(d.failed)} note={d.failed ? t("Dicoba lagi otomatis sampai 4 kali") : undefined} />
            </div>

            {d.recent.length ? (
              <TableShell>
                <thead>
                  <tr className="bg-canvas border-b border-line text-caption font-semibold text-fg-muted">
                    <th scope="col" className="py-3 px-4">{t("Pesanan")}</th>
                    <th scope="col" className="py-3 px-4">{t("Dicocokkan")}</th>
                    <th scope="col" className="py-3 px-4">{t("Status")}</th>
                    <th scope="col" className="py-3 px-4">{t("Waktu")}</th>
                    <th scope="col" className="py-3 px-4">
                      <span className="sr-only">{t("Aksi")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.recent.map((e) => (
                    <tr key={e.id} className="hover:bg-soft align-top">
                      <td className="py-3 px-4 font-mono text-label font-semibold text-fg">{e.orderNumber}</td>
                      <td className="py-3 px-4 text-label text-fg-muted min-w-[12rem]">{e.mode ? t(MODE[e.mode] || e.mode) : "-"}</td>
                      <td className="py-3 px-4 min-w-[10rem]">
                        <Badge tone={e.success ? "success" : "danger"}>{e.success ? t("Terkirim") : t("Gagal")}</Badge>
                        {!e.success ? (
                          <div className="text-caption text-fg-muted mt-1">
                            {e.status ? t("Kode {status}", { status: e.status }) : t("Tidak terhubung")}, {t("{count} percobaan", { count: e.attempts })}
                            {e.nextRetryAt ? `, ${t("coba lagi {time}", { time: f.dateTime(e.nextRetryAt) })}` : `, ${t("tidak dicoba lagi")}`}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-label text-fg-muted whitespace-nowrap">{f.dateTime(e.sentAt)}</td>
                      <td className="py-3 px-4 text-right">
                        {!e.success ? (
                          <Button variant="secondary" size="sm" icon="refresh" loading={pending && retrying === e.orderId} disabled={pending} onClick={() => retry(e)} aria-label={t("Kirim ulang event pesanan {number}", { number: e.orderNumber })}>
                            {t("Kirim ulang")}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            ) : (
              <div className="bg-white rounded-2xl border border-line">
                <EmptyState
                  icon="transfer"
                  title={t("Belum ada event terkirim")}
                  body={d.configured ? t("Event pembelian dikirim otomatis saat pesanan dibayar. Belum ada pesanan dibayar sejak dataset diisi.") : t("Isi dataset dan token di bawah. Setelah itu tiap pesanan yang dibayar dikirim ke Meta sebagai pembelian.")}
                />
              </div>
            )}

            {canEdit ? (
              <div className="max-w-[40rem]">
                <Card title={d.configured ? t("Ganti dataset atau token") : t("Hubungkan dataset")} description={t("Pembelian dikirim dengan nomor pesanan sebagai ID event, jadi pengiriman ulang tidak dihitung dua kali oleh Meta.")}>
                  <DatasetForm configured={d.configured} onSaved={capi.reload} />
                </Card>
              </div>
            ) : null}
          </div>
        );
      }}
    </Async>
  );
}
