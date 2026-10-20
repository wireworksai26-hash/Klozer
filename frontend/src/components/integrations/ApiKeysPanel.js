"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useFormat } from "@/hooks/useFormat";
import { useAction, useApi } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Async, Badge, Button, Card, ConfirmDialog, CopyButton, EmptyState, TableShell } from "@/components/ui";
import CreateKeyModal from "./CreateKeyModal";
import SecretDialog from "./SecretDialog";
import { useOpenApiBase, useScopeInfo } from "./shared";

function KeyStatus({ apiKey }) {
  const { t } = useDashboard();
  if (apiKey.revokedAt) return <Badge tone="neutral">{t("Dicabut")}</Badge>;
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) <= new Date()) return <Badge tone="warning">{t("Sudah kedaluwarsa")}</Badge>;
  return <Badge tone="success">{t("Aktif")}</Badge>;
}

function UsageCard() {
  const { t } = useDashboard();
  const base = useOpenApiBase();
  const header = "Authorization: Bearer <API key>";
  return (
    <Card title={t("Cara memakai")} description={t("Kirim key di header setiap permintaan. Batas 120 permintaan per menit per key.")}>
      <dl className="grid grid-cols-1 gap-4 m-0">
        {[
          [t("Alamat dasar"), base],
          [t("Header"), header],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1.5 min-w-0">
            <dt className="text-label font-semibold text-fg">{label}</dt>
            <dd className="m-0 flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
              <code className="min-w-0 flex-1 px-3 py-2 bg-sunken border border-line rounded-xl font-mono text-label text-fg break-all">{value}</code>
              <span className="flex-shrink-0">
                <CopyButton value={value} />
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default function ApiKeysPanel() {
  const { t } = useDashboard();
  const format = useFormat();
  const { labelOf } = useScopeInfo();
  const query = useApi("/integrations/api-keys");
  const { run, pending } = useAction();
  const [creating, setCreating] = useState(false);
  const [shown, setShown] = useState(null);
  const [revoking, setRevoking] = useState(null);

  const onCreated = (res) => {
    setCreating(false);
    setShown({ key: res.key, name: res.data?.name });
    query.reload();
  };

  const revoke = async () => {
    const { ok } = await run(() => api.delete(`/integrations/api-keys/${revoking.id}`), { success: t("API key dicabut.") });
    if (ok) {
      setRevoking(null);
      query.reload();
    }
  };

  const createButton = (
    <Button icon="plus" size="sm" onClick={() => setCreating(true)}>
      {t("Buat API key")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <UsageCard />
      <section className="flex flex-col gap-3" aria-labelledby="api-keys-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="api-keys-title" className="card-title">
            {t("API key")}
          </h2>
          {createButton}
        </div>
        <div>
          <Async query={query} loadingLabel={t("Memuat API key...")}>
            {(body) =>
              body.data.length === 0 ? (
                <div className="bg-white rounded-2xl border border-line">
                  <EmptyState icon="key" title={t("Belum ada API key")} body={t("Buat key untuk menghubungkan n8n, Make, Zapier, atau kode Anda ke data toko.")} action={createButton} />
                </div>
              ) : (
                <TableShell>
                  <thead>
                    <tr className="bg-canvas border-b border-line text-caption font-bold uppercase text-fg-muted">
                      <th className="py-3 px-4">{t("Nama")}</th>
                      <th className="py-3 px-4">{t("Cakupan")}</th>
                      <th className="py-3 px-4">{t("Dibuat")}</th>
                      <th className="py-3 px-4">{t("Terakhir dipakai")}</th>
                      <th className="py-3 px-4">{t("Kedaluwarsa")}</th>
                      <th className="py-3 px-4">{t("Status")}</th>
                      <th className="py-3 px-4">
                        <span className="sr-only">{t("Aksi")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {body.data.map((k) => (
                      <tr key={k.id} className="align-top">
                        <td className="py-3 px-4 min-w-[10rem]">
                          <div className="font-semibold text-fg break-words">{k.name}</div>
                          <div className="font-mono text-caption text-fg-subtle break-all" title={k.prefix}>
                            {k.prefix}...
                          </div>
                        </td>
                        <td className="py-3 px-4 min-w-[12rem]">
                          <div className="flex flex-wrap gap-1.5">
                            {k.scopes.map((s) => (
                              <span key={s} title={s}>
                                <Badge>{labelOf(s)}</Badge>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-fg-muted">{format.date(k.createdAt)}</td>
                        <td className="py-3 px-4 whitespace-nowrap text-fg-muted">{k.lastUsedAt ? format.dateTime(k.lastUsedAt) : t("Belum pernah")}</td>
                        <td className="py-3 px-4 whitespace-nowrap text-fg-muted">{k.expiresAt ? format.date(k.expiresAt) : t("Tanpa kedaluwarsa")}</td>
                        <td className="py-3 px-4">
                          <KeyStatus apiKey={k} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {k.revokedAt ? null : (
                            <Button variant="quietDanger" size="sm" icon="trash" onClick={() => setRevoking(k)} aria-label={t("Cabut key {name}", { name: k.name })}>
                              {t("Cabut")}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              )
            }
          </Async>
        </div>
      </section>

      <CreateKeyModal open={creating} onClose={() => setCreating(false)} onCreated={onCreated} />
      <SecretDialog
        open={Boolean(shown)}
        onClose={() => setShown(null)}
        title={t("API key dibuat")}
        statement={t("Salin key ini sekarang. Setelah dialog ditutup, key tidak bisa ditampilkan lagi.")}
        fieldLabel={t("API key {name}", { name: shown?.name || "" })}
        value={shown?.key || ""}
      />
      <ConfirmDialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        onConfirm={revoke}
        pending={pending}
        title={t("Cabut API key?")}
        body={t("Key {name} langsung berhenti berlaku dan tidak bisa diaktifkan lagi. Integrasi yang memakainya akan ditolak.", { name: revoking?.name || "" })}
        confirmLabel={t("Cabut key")}
      />
    </div>
  );
}
