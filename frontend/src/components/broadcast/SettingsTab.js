"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Button, Card, Stat, TextField } from "@/components/ui";


function SettingsForm({ initial, onSaved }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [form, setForm] = useState({
    dailyLimit: String(initial.dailyLimit),
    frequencyCapDays: String(initial.frequencyCapDays),
    quietStartHour: String(initial.quietStartHour),
    quietEndHour: String(initial.quietEndHour),
  });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const number = (value, min, max) => {
    const n = Number(value);
    return value !== "" && Number.isInteger(n) && n >= min && n <= max ? n : null;
  };
  const values = {
    dailyLimit: number(form.dailyLimit, 1, 1_000_000),
    frequencyCapDays: number(form.frequencyCapDays, 0, 90),
    quietStartHour: number(form.quietStartHour, 0, 23),
    quietEndHour: number(form.quietEndHour, 0, 23),
  };
  const valid = Object.values(values).every((v) => v !== null);
  const changed = valid && Object.keys(values).some((k) => String(values[k]) !== String(initial[k]));

  const save = async (e) => {
    e.preventDefault();
    const out = await run(() => api.put("/broadcast/settings", values), { success: t("Pengaturan broadcast tersimpan.") });
    if (out.ok) onSaved();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <TextField label={t("Batas harian per nomor")} type="number" inputMode="numeric" min={1} max={1000000} value={form.dailyLimit} onChange={set("dailyLimit")} error={values.dailyLimit === null ? t("Isi angka 1 sampai 1.000.000.") : undefined} hint={t("Berapa orang berbeda yang boleh dihubungi satu nomor per 24 jam. Samakan dengan tingkat pesan akun Meta Anda, 250 sebelum bisnis diverifikasi.")} required />
      <TextField label={t("Jeda antar kampanye ke orang yang sama (hari)")} type="number" inputMode="numeric" min={0} max={90} value={form.frequencyCapDays} onChange={set("frequencyCapDays")} error={values.frequencyCapDays === null ? t("Isi angka 0 sampai 90.") : undefined} hint={t("Hanya untuk templat promosi. Isi 0 untuk tanpa jeda.")} required />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label={t("Jam tenang mulai (jam WIB)")} type="number" inputMode="numeric" min={0} max={23} value={form.quietStartHour} onChange={set("quietStartHour")} error={values.quietStartHour === null ? t("Isi jam 0 sampai 23.") : undefined} required />
        <TextField label={t("Jam tenang selesai (jam WIB)")} type="number" inputMode="numeric" min={0} max={23} value={form.quietEndHour} onChange={set("quietEndHour")} error={values.quietEndHour === null ? t("Isi jam 0 sampai 23.") : undefined} required />
      </div>
      <p className="text-caption text-fg-subtle">
        {valid ? t("Pesan tidak dikirim dari jam {start}.00 sampai {end}.00 WIB. Kampanye menunggu pagi lalu lanjut sendiri.", { start: String(values.quietStartHour).padStart(2, "0"), end: String(values.quietEndHour).padStart(2, "0") }) : ""}
      </p>
      <div>
        <Button type="submit" loading={pending} disabled={!changed}>
          {t("Simpan pengaturan")}
        </Button>
      </div>
    </form>
  );
}

/** Daily limit, frequency cap and quiet hours, plus the blast credit left. */
export default function SettingsTab() {
  const { t } = useDashboard();
  const f = useFormat();
  const settings = useApi("/broadcast/settings");
  return (
    <Async query={settings} loadingLabel={t("Memuat pengaturan...")}>
      {(res) => (
        <div className="flex flex-col gap-5 max-w-[40rem]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Stat label={t("Sisa kredit blast")} value={f.number(res.credits.remaining)} note={t("{used} terpakai dari {quota}", { used: f.number(res.credits.used), quota: f.number(res.credits.quota) })} />
            <div className="flex items-end">
              <Button variant="secondary" href="/dashboard/credits">
                {t("Buka halaman kredit")}
              </Button>
            </div>
          </div>
          <Card title={t("Batas pengiriman")} description={t("Berlaku untuk semua kampanye toko ini.")}>
            <SettingsForm key={JSON.stringify(res.data)} initial={res.data} onSaved={settings.reload} />
          </Card>
        </div>
      )}
    </Async>
  );
}
