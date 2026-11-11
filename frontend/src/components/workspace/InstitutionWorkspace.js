"use client";
import { useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Button, SelectField, Switch, TextField } from "@/components/ui";

const NEW = "new";

/**
 * The Workspace switch of one business, in the business's own edit screen. Turning it on puts the business in a workspace
 * (an existing one, or a new one named here) so its owner can switch between the businesses of that workspace. Turning it off
 * takes the business out again. Once on, the Workspace Assistant has its own switch and monthly token limit.
 */
export default function InstitutionWorkspace({ institution }) {
  const { t } = useDashboard();
  const { number } = useFormat();
  const { run, pending } = useAction();
  const query = useApi("/platform/workspaces");
  const [enabling, setEnabling] = useState(false);
  const [choice, setChoice] = useState("");
  const [newName, setNewName] = useState(institution.name);
  const [cap, setCap] = useState(null);

  const all = useMemo(() => query.data?.items ?? [], [query.data]);
  const mine = useMemo(() => all.find((w) => w.institutions.some((i) => i.id === institution.dbId)) ?? null, [all, institution.dbId]);
  const capShown = cap ?? mine?.assistantMonthlyTokenCap ?? "";

  const changed = () => query.reload();

  const turnOn = async () => {
    let workspaceId = Number(choice);
    if (choice === NEW) {
      const created = await run(() => api.post("/platform/workspaces", { name: newName.trim() }));
      if (!created.ok) return;
      workspaceId = created.data.id;
    }
    const result = await run(() => api.post(`/platform/workspaces/${workspaceId}/institutions`, { institutionId: institution.dbId }), { success: t("Workspace diaktifkan untuk instansi ini.") });
    if (result.ok) {
      setEnabling(false);
      setChoice("");
      changed();
    } else if (choice === NEW) changed();
  };

  const turnOff = async () => {
    const result = await run(() => api.delete(`/platform/workspaces/institutions/${institution.dbId}`), { success: t("Workspace dimatikan untuk instansi ini.") });
    if (result.ok) changed();
  };

  const update = (patch, success) => run(() => api.put(`/platform/workspaces/${mine.id}`, patch), { success }).then((r) => r.ok && changed());

  const capValue = capShown === "" ? null : Number(capShown);
  const capSame = capValue === (mine?.assistantMonthlyTokenCap ?? null);
  const options = [{ value: NEW, label: t("Buat workspace baru") }, ...all.map((w) => ({ value: String(w.id), label: `${w.name} (${t("{count} bisnis", { count: w.institutions.length })})` }))];
  const canAttach = choice !== "" && (choice !== NEW || newName.trim().length >= 2);

  return (
    <div className="pt-2">
      <div className="bg-soft p-3.5 rounded-xl border border-line flex flex-col gap-4">
        <Switch
          checked={Boolean(mine) || enabling}
          disabled={pending || query.loading}
          onChange={(on) => {
            if (on) setEnabling(true);
            else if (mine) turnOff();
            else setEnabling(false);
          }}
          label={t("Workspace")}
          description={t("Owner instansi ini bisa berpindah antar bisnisnya tanpa login ulang dan melihat ringkasan gabungan.")}
        />

        {!mine && enabling ? (
          <div className="flex flex-col gap-3 pl-0.5">
            <SelectField label={t("Masukkan ke workspace")} value={choice} onChange={(e) => setChoice(e.target.value)} placeholder={t("Pilih workspace")} options={options} />
            {choice === NEW ? <TextField label={t("Nama workspace")} maxLength={150} value={newName} onChange={(e) => setNewName(e.target.value)} hint={t("Biasanya nama pemilik atau grup usahanya")} /> : null}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEnabling(false)}>
                {t("Batal")}
              </Button>
              <Button size="sm" loading={pending} disabled={!canAttach} onClick={turnOn}>
                {t("Aktifkan workspace")}
              </Button>
            </div>
            <p className="m-0 text-caption text-fg-subtle">{t("Instansi harus punya akun owner yang aktif. Untuk menggabungkan beberapa bisnis satu owner, aktifkan di tiap instansinya dan pilih workspace yang sama.")}</p>
          </div>
        ) : null}

        {mine ? (
          <div className="flex flex-col gap-4 border-t border-line pt-4">
            <div>
              <div className="text-label font-semibold text-fg">{mine.name}</div>
              <div className="text-caption text-fg-muted">{mine.institutions.map((i) => i.name).join(", ")}</div>
            </div>
            <Switch
              checked={mine.assistantEnabled}
              disabled={pending}
              onChange={(on) => update({ assistantEnabled: on }, on ? t("Asisten diaktifkan.") : t("Asisten dimatikan."))}
              label={t("Asisten Workspace")}
              description={t("Owner bisa bertanya tentang data semua bisnis di workspace. Hanya membaca, memakai kuota token AI.")}
            />
            {mine.assistantEnabled ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-[220px]">
                    <TextField label={t("Batas token per bulan")} type="number" min={1000} value={capShown} onChange={(e) => setCap(e.target.value)} hint={t("Kosongkan untuk tanpa batas tambahan")} />
                  </div>
                  <Button size="sm" variant="secondary" disabled={pending || capSame || (capValue !== null && capValue < 1000)} onClick={() => update({ assistantMonthlyTokenCap: capValue }, t("Batas token disimpan.")).then(() => setCap(null))}>
                    {t("Simpan batas")}
                  </Button>
                </div>
                <p className="m-0 text-caption text-fg-muted tabular-nums">
                  {mine.assistantMonthlyTokenCap ? t("{used} dari {cap} token terpakai bulan ini", { used: number(mine.assistantTokensThisMonth), cap: number(mine.assistantMonthlyTokenCap) }) : t("{used} token terpakai bulan ini", { used: number(mine.assistantTokensThisMonth) })}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
