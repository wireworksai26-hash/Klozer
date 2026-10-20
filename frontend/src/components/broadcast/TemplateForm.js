"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { useAction } from "@/hooks/useApi";
import { Button, EmptyState, IconButton, Modal, SelectField, TextAreaField, TextField } from "@/components/ui";
import TemplatePreview from "./TemplatePreview";
import { LANGUAGES, placeholderNumbers, renderBody, templateProblems } from "./broadcastModel";

const cleanName = (value) => value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

/** Submit a new template to Meta. The rules Meta checks are checked here first, and the message is previewed live. */
export default function TemplateForm({ open, onClose, channels, onCreated }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [channelId, setChannelId] = useState(channels[0] ? String(channels[0].id) : "");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("id");
  const [category, setCategory] = useState("marketing");
  const [headerText, setHeaderText] = useState("");
  const [body, setBody] = useState("");
  const [examples, setExamples] = useState([]);
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState([]);
  const [showProblems, setShowProblems] = useState(false);
  const [apiError, setApiError] = useState(null);

  const numbers = placeholderNumbers(body);
  const input = { name, body, examples: numbers.map((_, i) => examples[i] || ""), headerText: headerText.trim(), buttons };
  const problems = templateProblems(input);
  const channel = channels.find((c) => String(c.id) === channelId);
  const missingWaba = channel && !channel.config?.wabaId;
  const values = numbers.map((_, i) => (examples[i] || "").trim());

  const addVariable = () => setBody((b) => `${b}${b && !/\s$/.test(b) ? " " : ""}{{${numbers.length ? Math.max(...numbers) + 1 : 1}}}`);
  const setButton = (i, patch) => setButtons(buttons.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  const submit = async (e) => {
    e.preventDefault();
    setApiError(null);
    if (problems.length) {
      setShowProblems(true);
      return;
    }
    const payload = {
      channelId: Number(channelId),
      name,
      language,
      category,
      body: body.trim(),
      ...(numbers.length ? { bodyExamples: values } : {}),
      ...(headerText.trim() ? { headerText: headerText.trim() } : {}),
      ...(footer.trim() ? { footer: footer.trim() } : {}),
      ...(buttons.length ? { buttons: buttons.map((b) => ({ type: b.type, text: b.text.trim(), ...(b.type === "url" ? { url: b.url.trim() } : {}) })) } : {}),
    };
    const out = await run(() => api.post("/broadcast/templates", payload), { success: t("Templat dikirim ke Meta untuk ditinjau.") });
    if (out.ok) onCreated();
    else setApiError(out.error);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t("Ajukan templat")}
      description={t("Templat dikirim ke Meta dan baru bisa dipakai setelah disetujui.")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form="template-form" loading={pending} disabled={!channels.length}>
            {t("Kirim ke Meta")}
          </Button>
        </>
      }
    >
      {!channels.length ? (
        <EmptyState
          icon="inbox"
          title={t("Belum ada nomor WhatsApp")}
          body={t("Templat dibuat untuk satu nomor WhatsApp. Hubungkan nomornya di Saluran Chat dulu.")}
          action={
            <Button href="/dashboard/channels" variant="secondary">
              {t("Buka Saluran Chat")}
            </Button>
          }
        />
      ) : (
        <form id="template-form" onSubmit={submit} className="grid grid-cols-1 md:grid-cols-[1fr_20rem] gap-6" noValidate>
          <div className="flex flex-col gap-4 min-w-0">
            <SelectField label={t("Nomor WhatsApp")} value={channelId} onChange={(e) => setChannelId(e.target.value)} options={channels.map((c) => ({ value: String(c.id), label: c.displayHandle ? `${c.name} (${c.displayHandle})` : c.name }))} />
            {missingWaba ? (
              <p role="alert" className="text-label text-warning-800 bg-warning-50 border border-warning-200 rounded-xl p-3">
                {t("Nomor ini belum punya ID WhatsApp Business Account (WABA). Isi dulu di pengaturan kanal, atau Meta tidak bisa menerima templat.")}{" "}
                <a href="/dashboard/channels" className="font-semibold underline">
                  {t("Buka Saluran Chat")}
                </a>
              </p>
            ) : null}
            <TextField label={t("Nama templat")} value={name} onChange={(e) => setName(cleanName(e.target.value))} maxLength={100} hint={t("Huruf kecil, angka, dan garis bawah. Contoh: promo_akhir_bulan")} className="font-mono" required data-autofocus />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label={t("Bahasa")} value={language} onChange={(e) => setLanguage(e.target.value)} options={LANGUAGES} />
              <SelectField
                label={t("Kategori")}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: "marketing", label: t("Promosi") },
                  { value: "utility", label: t("Info transaksi") },
                ]}
                hint={category === "marketing" ? t("Promosi hanya dikirim ke kontak yang setuju menerima promosi.") : t("Untuk info pesanan atau pembayaran, bukan untuk menawarkan produk.")}
              />
            </div>
            <TextField label={t("Judul (opsional)")} value={headerText} onChange={(e) => setHeaderText(e.target.value)} maxLength={60} hint={t("Teks saja, maksimal 60 karakter, tanpa variabel.")} />
            <TextAreaField label={t("Isi pesan")} value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={1024} hint={t("Tulis {{1}}, {{2}} untuk bagian yang berubah per kontak. Jangan diawali atau diakhiri variabel.")} required />
            <div>
              <Button variant="secondary" size="sm" icon="plus" onClick={addVariable}>
                {t("Tambah variabel")}
              </Button>
            </div>
            {numbers.length ? (
              <fieldset className="border border-line rounded-xl p-4 flex flex-col gap-3 min-w-0">
                <legend className="px-1 text-label font-semibold text-fg">{t("Contoh nilai variabel")}</legend>
                <p className="text-caption text-fg-subtle">{t("Meta meminta contoh nyata untuk tiap variabel.")}</p>
                {numbers.map((n, i) => (
                  <TextField key={n} label={t("Contoh untuk variabel {n}", { n })} value={examples[i] || ""} maxLength={100} onChange={(e) => setExamples(numbers.map((_, j) => (j === i ? e.target.value : examples[j] || "")))} />
                ))}
              </fieldset>
            ) : null}
            <TextField label={t("Catatan kaki (opsional)")} value={footer} onChange={(e) => setFooter(e.target.value)} maxLength={60} hint={t("Maksimal 60 karakter.")} />

            <fieldset className="border border-line rounded-xl p-4 flex flex-col gap-3 min-w-0">
              <legend className="px-1 text-label font-semibold text-fg">{t("Tombol (opsional, maksimal 3)")}</legend>
              {buttons.map((b, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[9rem_1fr_auto] gap-3 items-end">
                  <SelectField
                    label={t("Jenis tombol")}
                    value={b.type}
                    onChange={(e) => setButton(i, { type: e.target.value })}
                    options={[
                      { value: "quick_reply", label: t("Balasan cepat") },
                      { value: "url", label: t("Buka tautan") },
                    ]}
                  />
                  <div className="grid grid-cols-1 gap-3 min-w-0">
                    <TextField label={t("Teks tombol")} value={b.text} maxLength={25} onChange={(e) => setButton(i, { text: e.target.value })} />
                    {b.type === "url" ? <TextField label={t("Alamat tautan (https)")} type="url" value={b.url} onChange={(e) => setButton(i, { url: e.target.value })} /> : null}
                  </div>
                  <IconButton icon="trash" label={t("Hapus tombol {n}", { n: i + 1 })} onClick={() => setButtons(buttons.filter((_, j) => j !== i))} />
                </div>
              ))}
              {buttons.length < 3 ? (
                <div>
                  <Button variant="secondary" size="sm" icon="plus" onClick={() => setButtons([...buttons, { type: "quick_reply", text: "", url: "" }])}>
                    {t("Tambah tombol")}
                  </Button>
                </div>
              ) : null}
            </fieldset>

            {showProblems && problems.length ? (
              <ul role="alert" className="list-disc pl-5 m-0 text-label text-danger-700 flex flex-col gap-0.5">
                {problems.map((p) => (
                  <li key={p}>{t(p)}</li>
                ))}
              </ul>
            ) : null}
            {apiError ? (
              <p role="alert" className="text-label text-danger-700">
                {apiError.message}{" "}
                {apiError.code === "WABA_REQUIRED" || apiError.code === "TOKEN_REQUIRED" ? (
                  <a href="/dashboard/channels" className="font-semibold underline">
                    {t("Buka Saluran Chat")}
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="md:sticky md:top-0 flex flex-col gap-2">
              <div className="text-label font-semibold text-fg">{t("Pratinjau")}</div>
              <TemplatePreview header={headerText.trim()} body={renderBody(body, values)} footer={footer.trim()} buttons={buttons} />
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
