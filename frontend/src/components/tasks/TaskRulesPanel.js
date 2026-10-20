"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Async, Button, Card, Switch, TextField } from "@/components/ui";
import { fieldErrors } from "./taskMeta";

function RulesForm({ saved, onSaved }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [form, setForm] = useState({ ...saved, defaultDueMinutes: String(saved.defaultDueMinutes) });
  const [errors, setErrors] = useState({});

  const toggle = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const minutes = Number(form.defaultDueMinutes);
  const minutesValid = Number.isInteger(minutes) && minutes >= 5 && minutes <= 10080;
  const dirty = Object.keys(saved).some((key) => (key === "defaultDueMinutes" ? minutes !== saved[key] : form[key] !== saved[key]));

  const save = async (e) => {
    e.preventDefault();
    setErrors({});
    const body = { ...form, defaultDueMinutes: minutes };
    const result = await run(() => api.put("/tasks/settings", body), { success: t("Aturan tugas disimpan.") });
    if (result.ok) onSaved();
    else setErrors(fieldErrors(result.error));
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <Card title={t("Tugas yang dibuat otomatis")} description={t("Aturan ini membuat tugas sendiri saat ada kejadian di chat.")}>
        <div className="flex flex-col gap-5">
          <Switch checked={form.autoOnHandoff} onChange={toggle("autoOnHandoff")} label={t("Buat tugas saat chat dialihkan ke tim")} description={t("Chat yang diserahkan AI ke tim langsung jadi tugas, supaya tidak menunggu tanpa dilihat.")} />
          <Switch checked={form.autoOnPaymentProof} onChange={toggle("autoOnPaymentProof")} label={t("Buat tugas saat pelanggan kirim bukti bayar")} description={t("Tugas Periksa pembayaran dengan prioritas tinggi dibuat untuk bukti bayar yang perlu dicek.")} />
          <Switch checked={form.assignToChatOwner} onChange={toggle("assignToChatOwner")} label={t("Berikan ke CS yang memegang chat")} description={t("Tugas otomatis diberikan ke CS pemilik chat. Jika dimatikan, tugas menunggu diambil.")} />
          <div className="max-w-[18rem]">
            <TextField
              label={t("Tenggat tugas otomatis (menit)")}
              type="number"
              inputMode="numeric"
              min={5}
              max={10080}
              step={1}
              value={form.defaultDueMinutes}
              onChange={(e) => setForm((f) => ({ ...f, defaultDueMinutes: e.target.value }))}
              error={errors.defaultDueMinutes || (!minutesValid ? t("Isi 5 sampai 10080 menit.") : undefined)}
              hint={t("Waktu sejak tugas dibuat sampai tenggatnya.")}
            />
          </div>
        </div>
      </Card>
      <Card title={t("Pengingat")}>
        <Switch checked={form.notifyOverdue} onChange={toggle("notifyOverdue")} label={t("Beri tahu tim saat tugas melewati tenggat")} description={t("Satu pemberitahuan dikirim per tugas, ke penanggung jawabnya dan ke dashboard.")} />
      </Card>
      <div>
        <Button type="submit" loading={pending} disabled={!dirty || !minutesValid}>
          {t("Simpan aturan tugas")}
        </Button>
      </div>
    </form>
  );
}

/** Managers: when tasks are made without anyone writing them. */
export default function TaskRulesPanel() {
  const query = useApi("/tasks/settings");
  return (
    <Async query={query}>
      {(body) => <RulesForm key={JSON.stringify(body.data)} saved={body.data} onSaved={query.reload} />}
    </Async>
  );
}
