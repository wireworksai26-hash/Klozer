"use client";
import { useState } from "react";
import { api } from "@/utils/api";
import { useAction } from "@/hooks/useApi";
import { useDashboard } from "@/context/DashboardContext";
import { Button, Modal, Switch, TagInput, TextAreaField, TextField } from "@/components/ui";
import EmbedCode from "./EmbedCode";
import TypeIcon from "./TypeIcon";
import { TOKEN_TYPES, channelTypes } from "./channelTypes";
import { fieldErrors } from "./formErrors";

const EMPTY = {
  name: "",
  externalId: "",
  pageId: "",
  wabaId: "",
  displayHandle: "",
  accessToken: "",
  aiEnabled: true,
  title: "",
  welcomeMessage: "",
  color: "",
  allowedOrigins: [],
  isActive: true,
  isDefault: false,
};

const ID = /^[A-Za-z0-9_.-]{3,100}$/;
const DIGITS = /^\d{5,30}$/;
const ORIGIN = /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/;
const COLOR = /^[0-9a-fA-F]{6}$/;

function fromChannel(channel) {
  const c = channel.config || {};
  return {
    ...EMPTY,
    name: channel.name,
    displayHandle: channel.displayHandle || "",
    wabaId: c.wabaId || "",
    title: c.title || "",
    welcomeMessage: c.welcomeMessage || "",
    color: String(c.color || "").replace("#", ""),
    allowedOrigins: Array.isArray(c.allowedOrigins) ? c.allowedOrigins : [],
    aiEnabled: channel.aiEnabled,
    isActive: channel.isActive,
    isDefault: channel.isDefault,
  };
}

/**
 * Connect a channel (pick the type, then fill only what that type needs) or edit one.
 * Secrets are write-only: when editing, an empty token field keeps the stored one.
 * @param {{ mode: "create" | "edit", channel?: object, types: string[], limit?: number, onClose: () => void, onSaved: () => void }} props
 */
export default function ChannelFormModal({ mode, channel, types, limit, onClose, onSaved }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const catalog = channelTypes(t);
  const editing = mode === "edit";

  const [type, setType] = useState(editing ? channel.type : null);
  const [values, setValues] = useState(editing ? fromChannel(channel) : EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState(null);

  const info = type ? catalog[type] : null;
  const set = (name) => (value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const onText = (name) => (e) => set(name)(e.target.value);

  const validate = () => {
    const e = {};
    const v = values;
    if (!v.name.trim()) e.name = t("Isi nama saluran.");
    else if (v.name.trim().length > 80) e.name = t("Maksimal {max} karakter.", { max: 80 });
    if (!editing) {
      for (const f of info.fields) {
        if (f.required && !v[f.name].trim()) e[f.name] = t("Wajib diisi.");
      }
      if (v.externalId.trim() && !ID.test(v.externalId.trim())) e.externalId = t("ID tidak valid. Pakai huruf, angka, titik, garis bawah atau tanda hubung (3 sampai 100 karakter).");
      if (v.pageId.trim() && !DIGITS.test(v.pageId.trim())) e.pageId = t("ID Halaman harus berupa angka.");
    }
    if (v.wabaId.trim() && !DIGITS.test(v.wabaId.trim())) e.wabaId = t("ID akun harus berupa angka.");
    if (v.accessToken.trim() && v.accessToken.trim().length < 10) e.accessToken = t("Token terlalu pendek.");
    if (v.accessToken.length > 2000) e.accessToken = t("Maksimal {max} karakter.", { max: 2000 });
    if (type === "webchat") {
      if (v.title.length > 60) e.title = t("Maksimal {max} karakter.", { max: 60 });
      if (v.welcomeMessage.length > 300) e.welcomeMessage = t("Maksimal {max} karakter.", { max: 300 });
      if (v.color && !COLOR.test(v.color)) e.color = t("Isi 6 karakter heksadesimal, mis. 0A7B5C.");
      if (v.allowedOrigins.some((o) => !ORIGIN.test(o))) e.allowedOrigins = t("Isi alamat situs lengkap, mis. https://tokoanda.com");
    }
    return e;
  };

  const webchatConfig = () => {
    const v = values;
    const config = {};
    if (v.title.trim()) config.title = v.title.trim();
    if (v.welcomeMessage.trim()) config.welcomeMessage = v.welcomeMessage.trim();
    if (v.color) config.color = `#${v.color}`;
    config.allowedOrigins = v.allowedOrigins;
    return config;
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;

    const v = values;
    let request;
    if (editing) {
      const body = { name: v.name.trim(), isActive: v.isActive, aiEnabled: v.aiEnabled };
      if (v.accessToken.trim()) body.accessToken = v.accessToken.trim();
      if (type === "whatsapp") {
        if (v.wabaId.trim() && v.wabaId.trim() !== (channel.config?.wabaId || "")) body.wabaId = v.wabaId.trim();
        if (v.displayHandle.trim() !== (channel.displayHandle || "")) body.displayHandle = v.displayHandle.trim() || null;
      }
      if (type === "webchat") body.config = webchatConfig();
      if (v.isDefault && !channel.isDefault) body.isDefault = true;
      request = () => api.put(`/channels/${channel.id}`, body);
    } else {
      const body = { type, name: v.name.trim(), aiEnabled: v.aiEnabled };
      for (const f of info.fields) if (v[f.name].trim()) body[f.name] = v[f.name].trim();
      if (type === "webchat") body.config = webchatConfig();
      request = () => api.post("/channels", body);
    }

    const result = await run(request, { success: editing ? t("Saluran diperbarui.") : t("Saluran terhubung.") });
    if (!result.ok) {
      const err = result.error;
      setErrors((e) => ({ ...e, ...fieldErrors(err) }));
      setFormError(err?.code === "CHANNEL_LIMIT" ? t("Paket Anda dibatasi {limit} saluran. Hapus saluran yang tidak dipakai atau naikkan paket.", { limit: err.details?.limit ?? limit ?? 0 }) : err?.message || t("Terjadi kesalahan."));
      return;
    }
    onSaved();
    if (!editing && type === "webchat") setCreated(result.data.data);
    else onClose();
  };

  // ---- step 3: the new web chat widget's embed code
  if (created) {
    return (
      <Modal
        open
        onClose={onClose}
        title={t("Pasang chat di situs Anda")}
        footer={<Button onClick={onClose}>{t("Selesai")}</Button>}
      >
        <EmbedCode snippet={created.embedSnippet} />
      </Modal>
    );
  }

  // ---- step 1: pick the type
  if (!type) {
    return (
      <Modal open onClose={onClose} title={t("Tambah saluran")} description={t("Pilih jenis saluran yang mau dihubungkan.")} footer={<Button variant="secondary" onClick={onClose}>{t("Batal")}</Button>}>
        <ul className="grid grid-cols-1 gap-2.5 list-none p-0 m-0">
          {types.map((id) => (
            <li key={id}>
              <button
                type="button"
                data-autofocus={id === types[0] ? "" : undefined}
                onClick={() => setType(id)}
                className="w-full flex items-center gap-3.5 text-left p-3.5 min-h-14 bg-white border border-line-strong rounded-xl cursor-pointer hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="w-10 h-10 flex-shrink-0 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
                  <TypeIcon type={id} />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-fg">{catalog[id].label}</span>
                  <span className="block text-label text-fg-muted">{catalog[id].about}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    );
  }

  // ---- step 2 (or edit): the fields this type needs
  const tokenSaved = editing && channel.hasToken;
  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? t("Ubah saluran {name}", { name: channel.name }) : t("Hubungkan {type}", { type: info.label })}
      description={editing ? undefined : info.about}
      footer={
        <>
          {!editing ? (
            <Button variant="ghost" icon="arrowLeft" onClick={() => setType(null)} className="mr-auto">
              {t("Ganti jenis")}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form="channel-form" loading={pending}>
            {editing ? t("Simpan perubahan") : t("Hubungkan saluran")}
          </Button>
        </>
      }
    >
      <form id="channel-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {formError ? (
          <p role="alert" className="text-label text-danger-700 bg-danger-50 border border-danger-200 rounded-xl px-3.5 py-2.5">
            {formError}
          </p>
        ) : null}

        <TextField label={t("Nama saluran")} hint={t("Nama untuk tim Anda, mis. Toko Solo atau Admin Instagram.")} required value={values.name} onChange={onText("name")} error={errors.name} maxLength={80} data-autofocus="" />

        {editing && type !== "webchat" ? (
          <p className="text-label text-fg-muted">
            {t("ID akun")}: <span className="font-mono text-fg">{channel.externalId}</span>
          </p>
        ) : null}

        {info.fields
          .filter((f) => !f.secret && (!editing || f.name === "wabaId" || f.name === "displayHandle"))
          .map((f) => (
            <TextField key={f.name} label={f.label} hint={f.hint} required={f.required && !editing} value={values[f.name]} onChange={onText(f.name)} error={errors[f.name]} autoComplete="off" />
          ))}

        {TOKEN_TYPES.includes(type) ? (
          <TextField
            label={editing ? t("Ganti token") : info.fields.find((f) => f.name === "accessToken").label}
            hint={tokenSaved ? t("Token tersimpan. Isi hanya bila ingin menggantinya.") : editing ? t("Belum ada token tersimpan.") : info.fields.find((f) => f.name === "accessToken").hint}
            required={!editing}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={values.accessToken}
            onChange={onText("accessToken")}
            error={errors.accessToken}
          />
        ) : null}

        {type === "webchat" ? (
          <>
            <TextField label={t("Judul kotak chat")} hint={t("Kosongkan untuk memakai judul bawaan.")} value={values.title} onChange={onText("title")} error={errors.title} maxLength={60} />
            <TextAreaField label={t("Sapaan pembuka")} hint={t("Kosongkan untuk memakai sapaan bawaan.")} rows={2} value={values.welcomeMessage} onChange={onText("welcomeMessage")} error={errors.welcomeMessage} maxLength={300} />
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0">
                <TextField label={t("Warna kotak chat")} hint={t("6 karakter heksadesimal tanpa tanda pagar. Kosong untuk warna bawaan.")} value={values.color} onChange={(e) => set("color")(e.target.value.replace("#", "").trim())} error={errors.color} maxLength={6} className="font-mono" />
              </div>
              {COLOR.test(values.color) ? <span aria-hidden="true" className="w-11 h-11 mb-6 flex-shrink-0 rounded-xl border border-line-strong" style={{ backgroundColor: `#${values.color}` }} /> : null}
            </div>
            <TagInput label={t("Situs yang boleh memasang")} hint={errors.allowedOrigins || t("Contoh: https://tokoanda.com. Kosong berarti semua situs boleh.")} value={values.allowedOrigins} onChange={set("allowedOrigins")} max={20} />
          </>
        ) : null}

        <Switch label={t("AI menjawab di saluran ini")} description={t("Bila mati, pesan masuk menunggu dibalas tim.")} checked={values.aiEnabled} onChange={set("aiEnabled")} />

        {editing ? (
          <>
            <Switch label={t("Saluran aktif")} description={t("Saluran nonaktif tidak menerima dan tidak mengirim pesan.")} checked={values.isActive} onChange={set("isActive")} />
            {!channel.isDefault ? <Switch label={t("Jadikan saluran utama")} description={t("Dipakai untuk pesan keluar yang tidak terikat ke satu percakapan.")} checked={values.isDefault} onChange={set("isDefault")} /> : null}
          </>
        ) : null}
      </form>
    </Modal>
  );
}
