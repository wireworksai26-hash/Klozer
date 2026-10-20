"use client";
import { useState } from "react";
import { api } from "@/utils/api";
import { useAction, useApi } from "@/hooks/useApi";
import { useDashboard } from "@/context/DashboardContext";
import { Async, Button, Card, IconButton, Input, SelectField, Switch, TextField } from "@/components/ui";
import Icon from "@/components/icons/Icon";
import { fieldErrors } from "./formErrors";

const MAX_STEPS = 3;
const MIN_DELAY = 5;
const MAX_DELAY = 23 * 60;

const hourOptions = () => Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}.00` }));

function SettingsForm({ settings, readiness, capabilities, canEdit, onSaved }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [v, setV] = useState({
    ...settings,
    shippingFlatFee: String(settings.shippingFlatFee),
    originPostalCode: settings.originPostalCode || "",
    followupDelays: settings.followupDelays.map(String),
    quietStartHour: String(settings.quietStartHour),
    quietEndHour: String(settings.quietEndHour),
    unpaidCancelHours: String(settings.unpaidCancelHours),
  });
  const [errors, setErrors] = useState({});
  const set = (name) => (value) => setV((s) => ({ ...s, [name]: value }));
  const onText = (name) => (e) => set(name)(e.target.value);

  const modes = [
    { value: "ask_team", label: t("Tim yang mengisi ongkir") },
    { value: "flat", label: t("Ongkir tetap") },
    { value: "free", label: t("Gratis ongkir") },
    { value: "provider", label: t("Hitung otomatis lewat Biteship") },
  ];
  const modeHint = {
    ask_team: t("Setelah alamat diterima, pesanan berhenti di tim dan tidak ada ongkir yang dikarang."),
    flat: t("Semua pesanan memakai ongkir yang sama."),
    free: t("Pelanggan tidak membayar ongkir."),
    provider: t("Pelanggan memberi kode pos tujuan, lalu memilih dari maksimal 4 opsi termurah."),
  }[v.shippingMode];

  const setDelay = (index, value) => setV((s) => ({ ...s, followupDelays: s.followupDelays.map((d, i) => (i === index ? value : d)) }));

  const buildBody = () => {
    const e = {};
    const fee = Number(v.shippingFlatFee);
    if (v.shippingFlatFee === "" || Number.isNaN(fee) || fee < 0 || fee > 1_000_000) e.shippingFlatFee = t("Isi 0 sampai 1.000.000.");
    const postal = v.originPostalCode.trim();
    if (postal && !/^\d{5}$/.test(postal)) e.originPostalCode = t("Kode pos terdiri dari 5 angka.");
    const delays = v.followupDelays.map(Number);
    if (!delays.length) e.followupDelays = t("Isi minimal satu pengingat.");
    else if (delays.some((d) => !Number.isInteger(d) || d < MIN_DELAY)) e.followupDelays = t("Tiap pengingat minimal {min} menit.", { min: MIN_DELAY });
    else if (delays.some((d) => d > MAX_DELAY)) e.followupDelays = t("Maksimal 23 jam (1380 menit), karena jendela chat 24 jam.");
    else if (delays.some((d, i) => i > 0 && d <= delays[i - 1])) e.followupDelays = t("Urutkan dari yang tercepat.");
    const cancel = Number(v.unpaidCancelHours);
    if (v.unpaidCancelHours === "" || !Number.isInteger(cancel) || cancel < 0 || cancel > 720) e.unpaidCancelHours = t("Isi jam bulat 0 sampai 720.");
    if (Object.keys(e).length) return { errors: e };
    return {
      body: {
        enabled: v.enabled,
        shippingMode: v.shippingMode,
        shippingFlatFee: fee,
        originPostalCode: postal || null,
        allowPickup: v.allowPickup,
        payQris: v.payQris,
        payTransfer: v.payTransfer,
        payCod: v.payCod,
        followupEnabled: v.followupEnabled,
        followupDelays: delays,
        quietStartHour: Number(v.quietStartHour),
        quietEndHour: Number(v.quietEndHour),
        unpaidCancelHours: cancel,
        notifyCustomer: v.notifyCustomer,
      },
    };
  };

  const save = async (event) => {
    event.preventDefault();
    const built = buildBody();
    setErrors(built.errors || {});
    if (!built.body) return;
    const res = await run(() => api.put("/commerce/settings", built.body), { success: t("Pengaturan pesanan di chat tersimpan.") });
    if (res.ok) onSaved();
    else setErrors(fieldErrors(res.error));
  };

  const off = !canEdit;

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-5">
      {!canEdit ? <p className="text-label text-fg-muted">{t("Hanya pemilik atau supervisor yang bisa mengubah pengaturan ini.")}</p> : null}

      <Card title={t("Pesanan di chat")}>
        <div className="flex flex-col gap-4">
          <Switch label={t("AI mengambil pesanan di chat")} description={t("Mati sampai Anda menyalakannya. AI menyusun pesanan sampai pelanggan mengonfirmasi.")} checked={v.enabled} onChange={set("enabled")} disabled={off} />
          <Switch label={t("Beri tahu pelanggan di chat")} description={t("Pelanggan dikabari saat pembayaran diterima dan saat nomor resi diisi.")} checked={v.notifyCustomer} onChange={set("notifyCustomer")} disabled={off} />
          {readiness.length ? (
            <div className="bg-warning-50 border border-warning-200 rounded-xl px-4 py-3">
              <p className="text-label font-semibold text-warning-800 flex items-center gap-1.5">
                <Icon name="alert" className="w-4 h-4" />
                {t("Yang masih perlu dibereskan")}
              </p>
              <ul className="mt-1.5 mb-0 pl-5 text-label text-warning-800 list-disc">
                {readiness.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Card>

      <Card title={t("Ongkir")}>
        <div className="flex flex-col gap-4">
          <SelectField label={t("Cara menentukan ongkir")} hint={modeHint} value={v.shippingMode} onChange={onText("shippingMode")} options={modes} disabled={off} />
          {v.shippingMode === "flat" ? (
            <TextField label={t("Ongkir tetap (Rp)")} type="number" inputMode="numeric" min={0} max={1000000} value={v.shippingFlatFee} onChange={onText("shippingFlatFee")} error={errors.shippingFlatFee} disabled={off} className="tabular-nums" />
          ) : null}
          {v.shippingMode === "provider" ? (
            <>
              <TextField label={t("Kode pos asal pengiriman")} hint={t("Kode pos tempat barang dikirim dari toko Anda.")} inputMode="numeric" maxLength={5} value={v.originPostalCode} onChange={onText("originPostalCode")} error={errors.originPostalCode} disabled={off} className="tabular-nums" />
              <p className="text-label text-fg-muted">
                {capabilities.shippingProvider ? t("Kunci API pengiriman sudah terpasang di server.") : t("Perlu kunci API pengiriman (BITESHIP_API_KEY) di server. Tanpa kunci, ongkir diserahkan ke tim.")}
              </p>
            </>
          ) : null}
          <Switch label={t("Pelanggan boleh ambil sendiri")} description={t("Pesanan ambil di toko tidak dikenai ongkir.")} checked={v.allowPickup} onChange={set("allowPickup")} disabled={off} />
        </div>
      </Card>

      <Card title={t("Cara bayar")}>
        <div className="flex flex-col gap-4">
          <Switch label="QRIS" description={capabilities.qrisGateway ? t("QRIS dibuat otomatis dan berlaku 5 menit.") : t("QRIS belum dikonfigurasi di server, jadi belum bisa dipakai.")} checked={v.payQris} onChange={set("payQris")} disabled={off} />
          <Switch label={t("Transfer bank")} description={t("Memakai rekening aktif di menu Rekening Bank. Bukti transfer foto dibaca otomatis.")} checked={v.payTransfer} onChange={set("payTransfer")} disabled={off} />
          <Switch label={t("Bayar di tempat (COD)")} description={t("Hanya ditawarkan bila alamat tidak berisiko tinggi.")} checked={v.payCod} onChange={set("payCod")} disabled={off} />
          <TextField label={t("Batalkan pesanan chat yang belum dibayar setelah (jam)")} hint={t("0 berarti tidak dibatalkan otomatis. Stok dikembalikan saat dibatalkan.")} type="number" inputMode="numeric" min={0} max={720} value={v.unpaidCancelHours} onChange={onText("unpaidCancelHours")} error={errors.unpaidCancelHours} disabled={off} className="tabular-nums" />
        </div>
      </Card>

      <Card title={t("Pengingat")} description={t("Pengingat hanya dikirim dalam 24 jam setelah pesan terakhir pelanggan, dan menunggu pagi bila jatuh di jam tenang.")}>
        <div className="flex flex-col gap-4">
          <Switch label={t("Kirim pengingat pesanan yang belum selesai")} description={t("Untuk pesanan belum dibayar dan keranjang yang berhenti di tengah.")} checked={v.followupEnabled} onChange={set("followupEnabled")} disabled={off} />
          {v.followupEnabled ? (
            <>
              <fieldset className="border-0 p-0 m-0 flex flex-col gap-2 min-w-0">
                <legend className="text-label font-semibold text-fg mb-1.5">{t("Pengingat dikirim setelah pesan terakhir pelanggan (menit)")}</legend>
                {v.followupDelays.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-24 text-label text-fg-muted flex-shrink-0">{t("Pengingat {n}", { n: i + 1 })}</span>
                    <Input type="number" inputMode="numeric" min={MIN_DELAY} max={MAX_DELAY} aria-label={t("Menit untuk pengingat {n}", { n: i + 1 })} value={d} onChange={(e) => setDelay(i, e.target.value)} disabled={off} className="max-w-40 tabular-nums" />
                    {canEdit && v.followupDelays.length > 1 ? <IconButton icon="close" label={t("Hapus pengingat {n}", { n: i + 1 })} onClick={() => setV((s) => ({ ...s, followupDelays: s.followupDelays.filter((_, idx) => idx !== i) }))} /> : null}
                  </div>
                ))}
                {errors.followupDelays ? (
                  <p role="alert" className="text-caption text-danger-700">
                    {errors.followupDelays}
                  </p>
                ) : (
                  <p className="text-caption text-fg-subtle">{t("Urut dari yang tercepat. Paling lama 1380 menit (23 jam).")}</p>
                )}
                {canEdit && v.followupDelays.length < MAX_STEPS ? (
                  <div>
                    <Button variant="secondary" size="sm" icon="plus" onClick={() => setV((s) => ({ ...s, followupDelays: [...s.followupDelays, ""] }))}>
                      {t("Tambah pengingat")}
                    </Button>
                  </div>
                ) : null}
              </fieldset>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField label={t("Jam tenang mulai (WIB)")} value={v.quietStartHour} onChange={onText("quietStartHour")} options={hourOptions()} disabled={off} />
                <SelectField label={t("Jam tenang selesai (WIB)")} value={v.quietEndHour} onChange={onText("quietEndHour")} options={hourOptions()} disabled={off} />
              </div>
            </>
          ) : null}
        </div>
      </Card>

      {canEdit ? (
        <div>
          <Button type="submit" loading={pending}>
            {t("Simpan pengaturan")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export default function SettingsTab() {
  const { t, isManager } = useDashboard();
  const query = useApi("/commerce/settings");
  return (
    <Async query={query} loadingLabel={t("Memuat pengaturan...")}>
      {(body) => <SettingsForm key={JSON.stringify(body.data)} settings={body.data} readiness={body.readiness || []} capabilities={body.capabilities || {}} canEdit={isManager} onSaved={query.reload} />}
    </Async>
  );
}
