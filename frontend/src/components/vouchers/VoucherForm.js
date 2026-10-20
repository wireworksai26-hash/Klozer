"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Button, Modal, SelectField, Switch, TextField } from "@/components/ui";

/** An ISO time as the value of a datetime-local field (the browser's own time zone), and back. */
const toInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromInput = (value) => (value ? new Date(value).toISOString() : null);
const digits = (value) => value.replace(/\D/g, "");

/** Create or change a discount code for token top ups. The code itself cannot change once created. */
export default function VoucherForm({ voucher, onClose, onSaved }) {
  const { t, institutions } = useDashboard();
  const { run, pending } = useAction();
  const editing = Boolean(voucher);
  const [code, setCode] = useState(voucher?.code ?? "");
  const [description, setDescription] = useState(voucher?.description ?? "");
  const [type, setType] = useState(voucher?.discountType ?? "percent");
  const [value, setValue] = useState(voucher ? String(voucher.discountValue) : "");
  const [cap, setCap] = useState(voucher?.maxDiscountIdr ? String(voucher.maxDiscountIdr) : "");
  const [minTokens, setMinTokens] = useState(voucher?.minTokens ? String(voucher.minTokens) : "");
  const [shop, setShop] = useState(voucher?.institutionId ? String(voucher.institutionId) : "");
  const [maxUses, setMaxUses] = useState(voucher?.maxUses ? String(voucher.maxUses) : "");
  const [perShop, setPerShop] = useState(String(voucher?.perShopLimit ?? 1));
  const [from, setFrom] = useState(toInput(voucher?.validFrom));
  const [until, setUntil] = useState(toInput(voucher?.validUntil));
  const [active, setActive] = useState(voucher?.isActive ?? true);
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    const amount = Number(value);
    if (!editing && !/^[A-Za-z0-9_-]{3,30}$/.test(code.trim())) next.code = t("3 sampai 30 huruf, angka, strip atau garis bawah.");
    if (!(amount > 0)) next.value = t("Isi nilai potongan lebih dari 0.");
    else if (type === "percent" && amount > 100) next.value = t("Persen tidak boleh lebih dari 100.");
    else if (type === "fixed" && amount < 1000) next.value = t("Potongan tetap minimal Rp 1.000.");
    if (Number(perShop) < 1) next.perShop = t("Minimal 1.");
    if (from && until && new Date(until) <= new Date(from)) next.until = t("Harus setelah tanggal mulai.");
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = {
      description: description.trim() || null,
      discountType: type,
      discountValue: amount,
      maxDiscountIdr: type === "percent" && cap ? Number(cap) : null,
      minTokens: minTokens ? Number(minTokens) : null,
      institutionId: shop ? Number(shop) : null,
      maxUses: maxUses ? Number(maxUses) : null,
      perShopLimit: Number(perShop) || 1,
      validFrom: fromInput(from),
      validUntil: fromInput(until),
      isActive: active,
    };
    const result = await run(() => (editing ? api.put(`/platform/vouchers/${voucher.id}`, body) : api.post("/platform/vouchers", { code: code.trim(), ...body })), { success: editing ? t("Voucher disimpan.") : t("Voucher dibuat.") });
    if (result.ok) onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? t("Ubah voucher") : t("Buat voucher")}
      description={t("Kode ini dipakai klien saat membeli token. Potongan tercatat di tagihannya.")}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form="voucher-form" loading={pending}>
            {t("Simpan")}
          </Button>
        </>
      }
    >
      <form id="voucher-form" onSubmit={submit} className="flex flex-col gap-4">
        <TextField label={t("Kode voucher")} value={code} disabled={editing} maxLength={30} autoCapitalize="characters" onChange={(e) => setCode(e.target.value.toUpperCase())} error={errors.code} hint={editing ? t("Kode tidak bisa diubah setelah dibuat.") : undefined} data-autofocus />
        <TextField label={t("Keterangan (opsional)")} value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} hint={t("Untuk catatan tim, misalnya promo apa.")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label={t("Jenis potongan")}
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: "percent", label: t("Persen dari harga") },
              { value: "fixed", label: t("Nominal tetap (Rp)") },
            ]}
          />
          <TextField label={type === "percent" ? t("Besar potongan (%)") : t("Besar potongan (Rp)")} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} error={errors.value} />
        </div>
        {type === "percent" ? <TextField label={t("Batas potongan (Rp, opsional)")} inputMode="numeric" value={cap} onChange={(e) => setCap(digits(e.target.value))} hint={t("Potongan persen tidak lebih dari ini.")} /> : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={t("Minimal token (opsional)")} inputMode="numeric" value={minTokens} onChange={(e) => setMinTokens(digits(e.target.value))} />
          <SelectField label={t("Berlaku untuk")} value={shop} onChange={(e) => setShop(e.target.value)} options={[{ value: "", label: t("Semua toko") }, ...institutions.map((i) => ({ value: String(i.dbId), label: i.name }))]} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={t("Batas pemakaian total (opsional)")} inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(digits(e.target.value))} hint={t("Kosong berarti tanpa batas.")} />
          <TextField label={t("Batas pemakaian per toko")} inputMode="numeric" value={perShop} onChange={(e) => setPerShop(digits(e.target.value))} error={errors.perShop} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label={t("Mulai berlaku (opsional)")} type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <TextField label={t("Berakhir (opsional)")} type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} error={errors.until} />
        </div>
        <Switch checked={active} onChange={setActive} label={t("Aktif")} description={t("Voucher yang nonaktif ditolak saat dipakai.")} />
      </form>
    </Modal>
  );
}
