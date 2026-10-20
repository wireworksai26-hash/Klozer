"use client";
import { useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { useAction } from "@/hooks/useApi";
import { Badge, Button, EmptyState, Modal, TextField } from "@/components/ui";
import AudienceFields, { AudienceCount, EMPTY_AUDIENCE, audienceLines, toAudience, useAudiencePreview } from "./AudienceFields";
import TemplatePreview from "./TemplatePreview";
import TestSendDialog from "./TestSendDialog";
import VariablesForm, { blankVariables, previewValues, toVariableSpec, variablesComplete } from "./VariablesForm";
import { TEMPLATE_CATEGORY, describeTemplate, isSendable, renderBody } from "./broadcastModel";

const STEPS = ["Templat", "Audiens", "Variabel", "Tinjau"];
const isHttps = (v) => /^https:\/\/\S+$/.test(v.trim());
const MEDIA_HEADERS = ["image", "video", "document"];

/** Four steps: pick an approved template, choose who gets it, fill the variables, review and save as a draft. */
export default function CampaignWizard({ open, onClose, templates, channels, onCreated, onGoTemplates }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(null);
  const [audienceState, setAudienceState] = useState(EMPTY_AUDIENCE);
  const [variables, setVariables] = useState([]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [testing, setTesting] = useState(false);

  const sendable = useMemo(() => templates.filter(isSendable), [templates]);
  const template = sendable.find((x) => x.id === templateId) || null;
  const view = template ? describeTemplate(template) : null;
  const needsMedia = view ? MEDIA_HEADERS.includes(view.headerFormat) : false;
  const audience = useMemo(() => toAudience(audienceState), [audienceState]);
  const marketing = template?.category === "marketing";
  const channel = channels.find((c) => c.id === template?.channelId);
  const preview = useAudiencePreview({ channelId: template?.channelId, templateId: template?.id, audience, enabled: open && step >= 1 && Boolean(template) });
  const examples = (template?.components || []).find((c) => c.type === "BODY")?.example?.body_text?.[0] || [];

  const pick = (id) => {
    const next = sendable.find((x) => x.id === id);
    setTemplateId(id);
    setVariables(blankVariables(next?.variableCount || 0));
    setMediaUrl("");
  };

  const stepError = () => {
    if (step === 0) {
      if (!template) return t("Pilih templat yang sudah disetujui.");
      if (!name.trim()) return t("Beri nama kampanye.");
    }
    if (step === 2) {
      if (!variablesComplete(variables)) return t("Isi teks untuk setiap variabel bertipe teks.");
      if (needsMedia && !isHttps(mediaUrl)) return t("Isi alamat berkas header (https).");
    }
    return null;
  };
  const blocker = stepError();
  const count = preview.data?.count;

  const save = async () => {
    const out = await run(
      () =>
        api.post("/broadcast/campaigns", {
          name: name.trim(),
          channelId: template.channelId,
          templateId: template.id,
          audience,
          variables: toVariableSpec(variables),
          ...(needsMedia ? { headerMediaUrl: mediaUrl.trim() } : {}),
        }),
      { success: t("Kampanye disimpan sebagai draf.") }
    );
    if (out.ok) onCreated(out.data.data);
  };

  const values = previewValues(variables, t);

  return (
    <>
      <Modal
        open={open && !testing}
        onClose={onClose}
        size="lg"
        title={t("Buat kampanye")}
        description={t("Langkah {step} dari {total}: {label}", { step: step + 1, total: STEPS.length, label: t(STEPS[step]) })}
        footer={
          <>
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                {t("Kembali")}
              </Button>
            ) : (
              <Button variant="secondary" onClick={onClose}>
                {t("Batal")}
              </Button>
            )}
            {step === 3 && template ? (
              <Button variant="secondary" icon="send" disabled={!variablesComplete(variables)} onClick={() => setTesting(true)}>
                {t("Kirim uji")}
              </Button>
            ) : null}
            {step < 3 ? (
              <Button disabled={Boolean(blocker)} onClick={() => setStep(step + 1)}>
                {t("Lanjut")}
              </Button>
            ) : (
              <Button loading={pending} disabled={count === 0} onClick={save}>
                {t("Simpan sebagai draf")}
              </Button>
            )}
          </>
        }
      >
        <ol className="flex flex-wrap gap-x-4 gap-y-1 mb-5 text-label" aria-label={t("Langkah")}>
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined} className={i === step ? "font-bold text-fg" : i < step ? "text-fg-muted" : "text-fg-subtle"}>
              {i + 1}. {t(label)}
            </li>
          ))}
        </ol>

        {step === 0 ? (
          sendable.length ? (
            <div className="flex flex-col gap-4">
              <TextField label={t("Nama kampanye")} value={name} maxLength={150} onChange={(e) => setName(e.target.value)} hint={t("Hanya untuk Anda, pelanggan tidak melihatnya.")} required data-autofocus />
              <fieldset className="flex flex-col gap-2 min-w-0">
                <legend className="text-label font-semibold text-fg mb-1.5">{t("Templat yang disetujui Meta")}</legend>
                {sendable.map((x) => {
                  const v = describeTemplate(x);
                  const on = x.id === templateId;
                  return (
                    <label key={x.id} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer ${on ? "border-brand bg-brand-soft" : "border-line-strong bg-white hover:bg-sunken"}`}>
                      <input type="radio" name="campaign-template" checked={on} onChange={() => pick(x.id)} className="mt-1 w-4 h-4 accent-brand" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-label font-semibold text-fg break-all">{x.name}</span>
                          <Badge>{t(TEMPLATE_CATEGORY[x.category] || x.category)}</Badge>
                        </span>
                        <span className="block text-label text-fg-muted mt-1 line-clamp-2 break-words">{v.body}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            </div>
          ) : (
            <EmptyState
              icon="template"
              title={t("Belum ada templat yang disetujui")}
              body={t("Kampanye hanya bisa memakai templat berstatus Disetujui. Ajukan templat, atau sinkronkan dari Meta bila sudah dibuat di sana.")}
              action={
                <Button
                  onClick={() => {
                    onClose();
                    onGoTemplates();
                  }}
                >
                  {t("Buka tab Templat")}
                </Button>
              }
            />
          )
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-5">
            <AudienceFields value={audienceState} onChange={setAudienceState} />
            <AudienceCount preview={preview} marketing={marketing} />
          </div>
        ) : null}

        {step === 2 && view ? (
          <div className="flex flex-col gap-5">
            {variables.length ? <VariablesForm value={variables} onChange={setVariables} examples={examples} /> : <p className="text-body-sm text-fg-muted">{t("Templat ini tidak punya variabel.")}</p>}
            {needsMedia ? <TextField label={t("Alamat berkas header (https)")} type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} hint={t("Templat ini berheader {format}. Isi alamat berkasnya.", { format: t(view.headerFormat === "image" ? "gambar" : view.headerFormat === "video" ? "video" : "dokumen") })} required /> : null}
            <TemplatePreview header={view.headerText} body={renderBody(view.body, values)} footer={view.footer} buttons={view.buttons} />
          </div>
        ) : null}

        {step === 3 && view ? (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-2.5 text-body-sm">
              <dt className="text-fg-muted">{t("Nama")}</dt>
              <dd className="text-fg font-semibold break-words">{name}</dd>
              <dt className="text-fg-muted">{t("Templat")}</dt>
              <dd className="text-fg font-mono break-all">{template.name}</dd>
              <dt className="text-fg-muted">{t("Nomor pengirim")}</dt>
              <dd className="text-fg break-words">{channel ? channel.displayHandle || channel.name : "-"}</dd>
              <dt className="text-fg-muted">{t("Audiens")}</dt>
              <dd className="text-fg">
                <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
                  {audienceLines(audience, t).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </dd>
            </dl>
            <AudienceCount preview={preview} marketing={marketing} />
            <TemplatePreview header={view.headerText} body={renderBody(view.body, values)} footer={view.footer} buttons={view.buttons} />
            <p className="text-label text-fg-muted">{t("Disimpan sebagai draf dulu. Anda menjalankannya dari daftar kampanye.")}</p>
          </div>
        ) : null}
      </Modal>
      {testing && template ? <TestSendDialog open onClose={() => setTesting(false)} template={template} variables={toVariableSpec(variables)} headerMediaUrl={needsMedia ? mediaUrl.trim() : undefined} /> : null}
    </>
  );
}
