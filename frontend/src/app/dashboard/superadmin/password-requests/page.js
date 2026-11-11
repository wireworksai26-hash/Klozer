"use client";
import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Async, Badge, Button, Card, ConfirmDialog, CopyButton, EmptyState, Modal, PageHeader, TableShell, Tabs } from "@/components/ui";

const ROLE_LABEL = { owner: "Owner", supervisor: "Supervisor", finance: "Finance", cs: "CS", pic_warehouse: "PIC Gudang", pic_delivery: "PIC Pengantaran", superadmin: "Superadmin" };

/** Forgotten-password requests from the login page. The team gives the person a new password and passes it on. */
export default function PasswordRequestsPage() {
  const { t, role, passwordRequestEvent, refreshPasswordRequests } = useDashboard();
  const { dateTime } = useFormat();
  const { run, pending } = useAction();
  const [status, setStatus] = useState("pending");
  const [resetting, setResetting] = useState(null);
  const [dismissing, setDismissing] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const query = useApi("/platform/password-requests", { query: { status, limit: 50 }, enabled: role === "superadmin" });
  const { reload } = query;

  // A request that arrives while this page is open shows up without a refresh.
  useEffect(() => {
    if (passwordRequestEvent) reload();
  }, [passwordRequestEvent, reload]);

  const tabs = useMemo(
    () => [
      { id: "pending", label: t("Menunggu") },
      { id: "handled", label: t("Sudah diproses") },
      { id: "dismissed", label: t("Ditutup") },
    ],
    [t]
  );

  const done = () => {
    reload();
    refreshPasswordRequests();
  };

  const reset = async () => {
    const result = await run(() => api.post(`/platform/password-requests/${resetting.id}/reset`));
    setResetting(null);
    if (result.ok) {
      setCredentials(result.data.credentials);
      done();
    } else done();
  };
  const dismiss = async () => {
    const result = await run(() => api.post(`/platform/password-requests/${dismissing.id}/dismiss`), { success: t("Permintaan ditutup.") });
    setDismissing(null);
    if (result.ok) done();
  };

  if (role !== "superadmin") return <EmptyState icon="lock" title={t("Hanya untuk tim Klozer")} />;

  const message = credentials
    ? t("Halo {name}, kata sandi baru Anda untuk Klozer:\nEmail: {email}\nKata sandi: {password}\nSetelah masuk, ganti di Pengaturan.", { name: credentials.name, email: credentials.email, password: credentials.password })
    : "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Permintaan Lupa Sandi")} description={t("Orang yang tidak bisa masuk mengirim permintaan dari halaman login. Buatkan kata sandi baru, lalu sampaikan kepadanya.")} />
      <Tabs label={t("Status permintaan")} tabs={tabs} value={status} onChange={setStatus} />
      <Async query={query} loadingLabel={t("Memuat permintaan...")}>
        {(data) =>
          data.items.length === 0 ? (
            <Card>
              <EmptyState icon="key" title={t("Tidak ada permintaan di status ini")} body={status === "pending" ? t("Permintaan baru muncul di sini dan di lonceng notifikasi.") : undefined} />
            </Card>
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <th>{t("Akun")}</th>
                  <th>{t("Toko")}</th>
                  <th>{t("Diminta")}</th>
                  <th>{t("Status")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-semibold text-fg">{r.user_name}</div>
                      <div className="text-caption text-fg-subtle">{r.email} | {ROLE_LABEL[r.user_role] || r.user_role}</div>
                    </td>
                    <td>{r.institution_name}</td>
                    <td className="whitespace-nowrap">{dateTime(r.created_at)}</td>
                    <td>
                      {r.status === "pending" ? <Badge tone="warning">{t("Menunggu")}</Badge> : r.status === "handled" ? <Badge tone="success">{t("Sudah diproses")}</Badge> : <Badge>{t("Ditutup")}</Badge>}
                      {r.handled_by_name ? <div className="text-caption text-fg-subtle mt-1">{r.handled_by_name}</div> : null}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {r.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setDismissing(r)}>
                            {t("Tutup")}
                          </Button>
                          <Button size="sm" icon="key" onClick={() => setResetting(r)}>
                            {t("Buat kata sandi baru")}
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )
        }
      </Async>

      <ConfirmDialog
        open={Boolean(resetting)}
        onClose={() => setResetting(null)}
        onConfirm={reset}
        pending={pending}
        tone="primary"
        title={t("Buat kata sandi baru?")}
        body={resetting ? t("Kata sandi {email} diganti dan semua perangkatnya keluar. Kata sandi baru hanya tampil sekali, jadi siapkan cara menyampaikannya.", { email: resetting.email }) : ""}
        confirmLabel={t("Buat kata sandi")}
      />
      <ConfirmDialog
        open={Boolean(dismissing)}
        onClose={() => setDismissing(null)}
        onConfirm={dismiss}
        pending={pending}
        tone="primary"
        title={t("Tutup permintaan ini?")}
        body={dismissing ? t("Kata sandi {email} tidak diubah.", { email: dismissing.email }) : ""}
        confirmLabel={t("Tutup permintaan")}
      />

      <Modal
        open={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        title={t("Kata sandi baru dibuat")}
        description={t("Tampil sekali ini saja. Salin dan sampaikan kepada pemiliknya.")}
        footer={<Button onClick={() => setCredentials(null)}>{t("Selesai")}</Button>}
      >
        {credentials ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-sunken border border-line p-4 text-body-sm">
              <div className="text-fg-muted">{credentials.email}</div>
              <div className="mt-1 font-mono text-body font-semibold text-ink select-all break-all">{credentials.password}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={credentials.password} label={t("Salin kata sandi")} />
              <CopyButton value={message} label={t("Salin pesan lengkap")} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
