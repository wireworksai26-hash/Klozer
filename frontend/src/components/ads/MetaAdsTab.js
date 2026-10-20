"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Badge, Button, Card, ConfirmDialog, SelectField, TextField } from "@/components/ui";

function ConnectForm({ configured, onSaved }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [adAccountId, setAdAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const idOk = /^(act_)?\d{5,25}$/.test(adAccountId.trim());
  const tokenOk = accessToken.trim().length >= 10;

  const save = async (e) => {
    e.preventDefault();
    const out = await run(() => api.put("/ads/settings", { adAccountId: adAccountId.trim(), accessToken: accessToken.trim() }), { success: t("Akun iklan tersimpan. Jalankan sinkronisasi untuk mengambil biaya.") });
    if (!out.ok) return;
    setAccessToken("");
    setAdAccountId("");
    onSaved();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4" autoComplete="off">
      <TextField label={t("ID akun iklan")} value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} className="font-mono" placeholder="act_1234567890" error={adAccountId && !idOk ? t("ID akun iklan berupa angka, boleh diawali act_.") : undefined} hint={t("Ada di Ads Manager Meta. Hanya akun iklan bermata uang rupiah yang diterima.")} required />
      <TextField label={t("Token akses")} type="password" autoComplete="new-password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="font-mono" hint={t("Perlu izin ads_read. Disimpan terenkripsi dan tidak pernah ditampilkan lagi.")} required />
      <div>
        <Button type="submit" loading={pending} disabled={!idOk || !tokenOk}>
          {configured ? t("Ganti akun atau token") : t("Hubungkan akun iklan")}
        </Button>
      </div>
    </form>
  );
}

/** The connected Meta ad account, the cost sync, and (for managers) connecting or disconnecting the account. */
export default function MetaAdsTab({ canEdit, onSynced }) {
  const { t } = useDashboard();
  const f = useFormat();
  const { run, pending } = useAction();
  const settings = useApi("/ads/settings");
  const [days, setDays] = useState("30");
  const [result, setResult] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const sync = async () => {
    setResult(null);
    const out = await run(() => api.post("/ads/sync", { days: Number(days) }));
    if (!out.ok) {
      settings.reload();
      return;
    }
    setResult(out.data.data);
    settings.reload();
    onSynced();
  };

  const disconnect = async () => {
    const out = await run(() => api.delete("/ads/settings"), { success: t("Akun iklan diputus.") });
    if (out.ok) {
      setDisconnecting(false);
      setResult(null);
      settings.reload();
    }
  };

  return (
    <Async query={settings} loadingLabel={t("Memuat akun iklan...")}>
      {(res) => {
        const s = res.data;
        return (
          <div className="flex flex-col gap-5 max-w-[40rem]">
            <Card
              title={t("Akun iklan Meta")}
              description={t("Biaya iklan ditarik dari Meta otomatis tiap 6 jam (7 hari terakhir), atau kapan saja dengan tombol di bawah.")}
              action={<Badge tone={s.configured ? "success" : "neutral"}>{s.configured ? t("Terhubung") : t("Belum terhubung")}</Badge>}
            >
              {s.configured ? (
                <div className="flex flex-col gap-4">
                  <dl className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-body-sm m-0">
                    <dt className="text-fg-muted">{t("ID akun iklan")}</dt>
                    <dd className="m-0 font-mono text-fg break-all">{s.adAccountId}</dd>
                    <dt className="text-fg-muted">{t("Sinkronisasi terakhir")}</dt>
                    <dd className="m-0 text-fg">{s.lastSyncedAt ? f.dateTime(s.lastSyncedAt) : t("Belum pernah")}</dd>
                    <dt className="text-fg-muted">{t("Token akses")}</dt>
                    <dd className="m-0 text-fg">{t("Tersimpan, tidak ditampilkan")}</dd>
                  </dl>
                  {s.lastSyncError ? (
                    <p role="alert" className="text-label text-danger-700 bg-danger-50 border border-danger-200 rounded-xl p-3 break-words">
                      {t("Sinkronisasi terakhir gagal: {error}", { error: s.lastSyncError })}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-end gap-3">
                    <SelectField
                      label={t("Ambil biaya")}
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      options={[
                        { value: "7", label: t("7 hari terakhir") },
                        { value: "30", label: t("30 hari terakhir") },
                        { value: "90", label: t("90 hari terakhir") },
                      ]}
                    />
                    <Button icon="refresh" loading={pending} onClick={sync}>
                      {t("Sinkronkan biaya")}
                    </Button>
                    {canEdit ? (
                      <Button variant="quietDanger" onClick={() => setDisconnecting(true)}>
                        {t("Putuskan akun")}
                      </Button>
                    ) : null}
                  </div>
                  {result ? (
                    <p role="status" className="text-label text-success-800 bg-success-50 border border-success-200 rounded-xl p-3">
                      {t("{count} baris biaya diperbarui untuk {from} sampai {to}.", { count: result.rows, from: f.date(result.from), to: f.date(result.to) })}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-body-sm text-fg-muted">{canEdit ? t("Hubungkan akun iklan agar biaya ditarik otomatis, tanpa mengetik tiap hari.") : t("Belum ada akun iklan yang terhubung. Owner atau supervisor bisa menghubungkannya.")}</p>
              )}
            </Card>
            {canEdit ? (
              <Card title={s.configured ? t("Ganti akun atau token") : t("Hubungkan akun iklan")}>
                <ConnectForm configured={s.configured} onSaved={settings.reload} />
              </Card>
            ) : null}
            <ConfirmDialog
              open={disconnecting}
              onClose={() => setDisconnecting(false)}
              pending={pending}
              title={t("Putuskan akun iklan?")}
              body={t("Token akses dihapus dari Klozer dan biaya tidak lagi ditarik otomatis. Biaya yang sudah tercatat tetap ada.")}
              confirmLabel={t("Putuskan akun")}
              onConfirm={disconnect}
            />
          </div>
        );
      }}
    </Async>
  );
}
