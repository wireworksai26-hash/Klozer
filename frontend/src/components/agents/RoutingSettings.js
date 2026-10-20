"use client";
import { useState } from "react";
import { api } from "@/utils/api";
import { useDashboard } from "@/context/DashboardContext";
import { useAction, useApi } from "@/hooks/useApi";
import { Async, Button, Card, Switch } from "@/components/ui";
import { LIMITS } from "./labels";

function ModeOption({ value, current, onChange, disabled, title, detail }) {
  const checked = current === value;
  return (
    <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${checked ? "border-brand bg-brand-soft" : "border-line-strong bg-white hover:bg-sunken"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
      <input type="radio" name="routerMode" value={value} checked={checked} disabled={disabled} onChange={() => onChange(value)} className="mt-1 w-4 h-4 accent-brand" />
      <span className="min-w-0">
        <span className="block text-body-sm font-semibold text-fg">{title}</span>
        <span className="block text-label text-fg-muted mt-0.5">{detail}</span>
      </span>
    </label>
  );
}

function SettingsForm({ initial, canEdit, onSaved }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [form, setForm] = useState(initial);
  const dirty = form.routerMode !== initial.routerMode || form.switchConfidence !== initial.switchConfidence || form.announceSwitch !== initial.announceSwitch;
  const smart = form.routerMode === "smart";

  const save = async (e) => {
    e.preventDefault();
    const res = await run(() => api.put("/ai/agents/settings", form), { success: t("Pengaturan pemilihan disimpan.") });
    if (res.ok) onSaved();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3 border-0 p-0 m-0 min-w-0">
        <legend className="text-label font-semibold text-fg mb-1.5">{t("Cara memilih agen")}</legend>
        <ModeOption value="rules" current={form.routerMode} disabled={!canEdit} onChange={(v) => setForm((f) => ({ ...f, routerMode: v }))} title={t("Hanya aturan")} detail={t("Agen dipilih dari pemicu yang Anda atur. Tanpa aturan yang cocok, chat tetap di agen sekarang atau pindah ke agen bawaan.")} />
        <ModeOption value="smart" current={form.routerMode} disabled={!canEdit} onChange={(v) => setForm((f) => ({ ...f, routerMode: v }))} title={t("Aturan, lalu pilihan model")} detail={t("Model diminta memilih hanya bila tidak ada aturan yang memutuskan. Ini memakai token tambahan.")} />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="switch-confidence" className="text-label font-semibold text-fg">
          {t("Keyakinan minimal untuk pindah agen")}: <span className="tabular-nums">{form.switchConfidence}</span>
        </label>
        <input
          id="switch-confidence"
          type="range"
          min={LIMITS.confidenceMin}
          max={LIMITS.confidenceMax}
          step={1}
          value={form.switchConfidence}
          disabled={!canEdit || !smart}
          onChange={(e) => setForm((f) => ({ ...f, switchConfidence: Number(e.target.value) }))}
          className="w-full accent-brand disabled:opacity-50"
        />
        <p className="text-caption text-fg-subtle">{smart ? t("Chat yang sudah punya agen hanya dipindah bila model yakin sedikitnya sebesar angka ini (50 sampai 95).") : t("Hanya dipakai saat memilih lewat model.")}</p>
      </div>

      <Switch label={t("Umumkan pergantian agen di chat")} description={t("Staf melihat catatan sistem di chat saat agen berganti. Pelanggan tidak melihatnya.")} checked={form.announceSwitch} disabled={!canEdit} onChange={(v) => setForm((f) => ({ ...f, announceSwitch: v }))} />

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" loading={pending} disabled={!dirty}>
            {t("Simpan pengaturan")}
          </Button>
        </div>
      ) : (
        <p className="text-label text-fg-muted">{t("Hanya owner dan supervisor yang bisa mengubah pengaturan ini.")}</p>
      )}
    </form>
  );
}

/** Router mode, confidence and the switch notice. Readable by everyone on the team, editable by managers. */
export default function RoutingSettings({ canEdit }) {
  const { t } = useDashboard();
  const query = useApi("/ai/agents/settings");
  return (
    <Card title={t("Pemilihan agen")} description={t("Urutan: chat yang dikunci staf, pesanan sedang disusun, aturan pemicu, pilihan model, agen sekarang, agen bawaan.")}>
      <Async query={query}>{(res) => <SettingsForm key={JSON.stringify(res.data)} initial={res.data} canEdit={canEdit} onSaved={query.reload} />}</Async>
    </Card>
  );
}
