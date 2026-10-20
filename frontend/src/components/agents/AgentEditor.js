"use client";
import { useMemo, useState } from "react";
import { api } from "@/utils/api";
import { useDashboard } from "@/context/DashboardContext";
import { useApi } from "@/hooks/useApi";
import { Badge, Button, ChipPicker, ErrorState, LoadingState, Modal, SelectField, Switch, TagInput, TextAreaField, TextField } from "@/components/ui";
import { AGENT_TOOL_NAMES, LIMITS, useAgentText } from "./labels";

const tri = (v) => (v === true ? "yes" : v === false ? "no" : "any");
const fromTri = (v) => (v === "yes" ? true : v === "no" ? false : null);

function toForm(agent) {
  const triggers = agent?.triggers ?? {};
  return {
    name: agent?.name ?? "",
    description: agent?.description ?? "",
    instructions: agent?.instructions ?? "",
    botName: agent?.botName ?? "",
    tone: agent?.tone ?? "",
    greeting: agent?.greeting ?? "",
    commerce: agent?.capabilities?.commerce ?? "full",
    tools: agent?.capabilities?.tools ?? [],
    channels: triggers.channels ?? [],
    keywords: triggers.keywords ?? [],
    intents: triggers.intents ?? [],
    leadStatuses: triggers.leadStatuses ?? [],
    labelIds: triggers.labelIds ?? [],
    newContact: tri(triggers.newContact ?? null),
    hasOpenOrder: tri(triggers.hasOpenOrder ?? null),
    priority: String(agent?.priority ?? 100),
    knowledgeDocumentIds: agent?.knowledgeDocumentIds ?? [],
    isDefault: agent?.isDefault ?? false,
    isActive: agent?.isActive ?? true,
  };
}

const orNull = (v) => (v.trim() ? v.trim() : null);

/** Server field path ("triggers.keywords.2") to the key this form uses for that field. */
function fieldKey(path) {
  const [head, second] = String(path).split(".");
  if (head === "capabilities") return second === "tools" ? "tools" : "commerce";
  if (head === "triggers") return second ?? "triggers";
  return head;
}

function Section({ title, description, children }) {
  return (
    <section className="flex flex-col gap-4 pt-5 mt-5 border-t border-line first:pt-0 first:mt-0 first:border-t-0">
      <div>
        <h3 className="text-body-sm font-bold text-fg">{title}</h3>
        {description ? <p className="text-label text-fg-muted mt-0.5">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FieldError({ children }) {
  return children ? (
    <p role="alert" className="text-caption text-danger-700">
      {children}
    </p>
  ) : null;
}

/** Create or edit one agent. `agent` is null for a new one. */
export default function AgentEditor({ agent, agents, onClose, onSaved }) {
  const { t, notify, activeInstitution } = useDashboard();
  const text = useAgentText();
  const [form, setForm] = useState(() => toForm(agent));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const toolsOn = activeInstitution?.modules?.agentTools !== false;
  const knowledgeOn = activeInstitution?.modules?.knowledgeBase !== false;
  const tools = useApi("/ai/agents/tools", { enabled: toolsOn });
  const knowledge = useApi("/knowledge", { enabled: knowledgeOn });
  const knowledgeHidden = !knowledgeOn || knowledge.error?.status === 403;

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setField = (key) => (e) => set(key)(e.target.value);
  const count = (value, max) => t("{count} dari {max} karakter", { count: value.length, max });

  const toolList = useMemo(() => tools.data?.data ?? [], [tools.data]);
  const toolOptions = toolList.map((tool) => ({
    value: tool.name,
    label: tool.kind === "write" ? t("{tool} (mengubah data)", { tool: text.toolLabel(tool.name) }) : text.toolLabel(tool.name),
    hint: tool.summary,
  }));
  const selectedTools = toolList.filter((tool) => form.tools.includes(tool.name));
  const otherActive = agents.filter((a) => a.isActive && a.id !== agent?.id).length;
  const needsSecondAgent = form.tools.some((name) => AGENT_TOOL_NAMES.includes(name)) && otherActive === 0;
  const docOptions = (knowledge.data?.items ?? []).map((d) => ({ value: d.id, label: d.title }));

  const validate = () => {
    const e = {};
    const name = form.name.trim();
    if (!name) e.name = t("Nama agen wajib diisi.");
    else if (name.length > LIMITS.name) e.name = t("Maksimal {max} karakter.", { max: LIMITS.name });
    const description = form.description.trim();
    if (description.length < LIMITS.descriptionMin) e.description = t("Tulis minimal {min} karakter.", { min: LIMITS.descriptionMin });
    else if (description.length > LIMITS.description) e.description = t("Maksimal {max} karakter.", { max: LIMITS.description });
    const instructions = form.instructions.trim();
    if (instructions.length < LIMITS.instructionsMin) e.instructions = t("Tulis minimal {min} karakter.", { min: LIMITS.instructionsMin });
    else if (instructions.length > LIMITS.instructions) e.instructions = t("Maksimal {max} karakter.", { max: LIMITS.instructions });
    for (const key of ["botName", "tone", "greeting"]) if (form[key].trim().length > LIMITS[key]) e[key] = t("Maksimal {max} karakter.", { max: LIMITS[key] });
    if (form.keywords.some((k) => k.length > LIMITS.keyword)) e.keywords = t("Tiap kata kunci maksimal {max} karakter.", { max: LIMITS.keyword });
    const priority = Number(form.priority);
    if (form.priority.trim() === "" || !Number.isInteger(priority) || priority < LIMITS.priorityMin || priority > LIMITS.priorityMax) {
      e.priority = t("Isi bilangan bulat {min} sampai {max}.", { min: LIMITS.priorityMin, max: LIMITS.priorityMax });
    }
    return e;
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) {
      setFormError(t("Ada isian yang belum sesuai. Periksa kolom yang bertanda."));
      return;
    }

    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      instructions: form.instructions.trim(),
      botName: orNull(form.botName),
      tone: orNull(form.tone),
      greeting: orNull(form.greeting),
      capabilities: { commerce: form.commerce, tools: form.tools },
      triggers: {
        channels: form.channels,
        keywords: form.keywords,
        intents: form.intents,
        labelIds: form.labelIds,
        leadStatuses: form.leadStatuses,
        newContact: fromTri(form.newContact),
        hasOpenOrder: fromTri(form.hasOpenOrder),
      },
      priority: Number(form.priority),
      isDefault: form.isDefault,
      isActive: form.isActive,
      knowledgeDocumentIds: form.knowledgeDocumentIds,
    };

    setSaving(true);
    try {
      if (agent) await api.put(`/ai/agents/${agent.id}`, body);
      else await api.post("/ai/agents", body);
      notify("success", agent ? t("Perubahan agen disimpan.") : t("Agen dibuat."));
      onSaved();
    } catch (err) {
      if (err.code === "AGENT_NAME_TAKEN") setErrors({ name: t("Sudah ada agen dengan nama ini.") });
      else if (err.code === "UNKNOWN_DOCUMENT") setErrors({ knowledgeDocumentIds: t("Ada dokumen pengetahuan yang sudah tidak ada. Pilih ulang dokumennya.") });
      else if (err.code === "VALIDATION_ERROR" && Array.isArray(err.details) && err.details.length) {
        const next = {};
        for (const d of err.details) next[fieldKey(d.field)] ??= d.message;
        setErrors(next);
        setFormError(t("Ada isian yang belum sesuai. Periksa kolom yang bertanda."));
      } else setFormError(err.message || t("Terjadi kesalahan."));
    } finally {
      setSaving(false);
    }
  };

  const triOptions = [
    { value: "any", label: t("Semua") },
    { value: "yes", label: t("Ya") },
    { value: "no", label: t("Tidak") },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={agent ? t("Ubah agen {name}", { name: agent.name }) : t("Buat agen")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button type="submit" form="agent-form" loading={saving}>
            {t("Simpan agen")}
          </Button>
        </>
      }
    >
      <form id="agent-form" onSubmit={submit} noValidate>
        {formError ? (
          <p role="alert" className="mb-5 px-3.5 py-2.5 rounded-xl bg-danger-50 text-danger-700 text-label border border-danger-200">
            {formError}
          </p>
        ) : null}

        <Section title={t("Peran")}>
          <TextField label={t("Nama agen")} required value={form.name} onChange={setField("name")} maxLength={LIMITS.name} error={errors.name} data-autofocus />
          <TextAreaField label={t("Deskripsi")} required rows={2} value={form.description} onChange={setField("description")} maxLength={LIMITS.description} error={errors.description} hint={count(form.description, LIMITS.description)} />
          <TextAreaField label={t("Petunjuk peran")} required rows={6} value={form.instructions} onChange={setField("instructions")} maxLength={LIMITS.instructions} error={errors.instructions} hint={count(form.instructions, LIMITS.instructions)} />
        </Section>

        <Section title={t("Persona")} description={t("Kosongkan untuk memakai persona toko.")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label={t("Nama bot")} value={form.botName} onChange={setField("botName")} maxLength={LIMITS.botName} error={errors.botName} />
            <TextField label={t("Gaya bahasa")} value={form.tone} onChange={setField("tone")} maxLength={LIMITS.tone} error={errors.tone} />
          </div>
          <TextAreaField label={t("Sapaan pembuka")} rows={2} value={form.greeting} onChange={setField("greeting")} maxLength={LIMITS.greeting} error={errors.greeting} />
        </Section>

        <Section title={t("Kemampuan")}>
          <SelectField label={t("Pesanan")} value={form.commerce} onChange={setField("commerce")} options={text.commerceOptions} error={errors.commerce} hint={text.commerceDetail(form.commerce)} />
          {!toolsOn ? (
            <p className="text-label text-fg-muted">{t("Alat untuk agen dimatikan di paket toko ini.")}</p>
          ) : tools.error ? (
            <ErrorState error={tools.error} onRetry={tools.reload} />
          ) : !tools.data ? (
            <LoadingState label={t("Memuat daftar alat...")} />
          ) : (
            <div className="flex flex-col gap-3">
              <ChipPicker label={t("Alat yang boleh dipakai")} options={toolOptions} value={form.tools} onChange={set("tools")} hint={t("Tanpa alat terpilih, agen hanya menjawab. Alat bertanda mengubah data bisa membuat atau mengubah data toko.")} />
              <FieldError>{errors.tools}</FieldError>
              {selectedTools.length ? (
                <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
                  {selectedTools.map((tool) => (
                    <li key={tool.name} className="flex items-start gap-2 text-label text-fg-muted">
                      <Badge tone={tool.kind === "write" ? "warning" : "neutral"} className="flex-shrink-0">{tool.kind === "write" ? t("Mengubah data") : t("Hanya membaca")}</Badge>
                      <span className="min-w-0 break-words">
                        <span className="font-semibold text-fg">{text.toolLabel(tool.name)}</span>: {tool.summary}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className={`text-caption ${needsSecondAgent ? "text-warning-800" : "text-fg-subtle"}`}>{t("Tanya agen lain dan Pindahkan ke agen lain hanya berfungsi bila ada agen aktif kedua.")}</p>
            </div>
          )}
        </Section>

        <Section title={t("Pemicu")} description={t("Semua jenis syarat yang diisi harus cocok (dan). Beberapa pilihan dalam satu jenis cukup salah satu (atau). Tanpa syarat, agen tidak dipilih lewat aturan.")}>
          <ChipPicker label={t("Kanal")} options={text.channelOptions} value={form.channels} onChange={set("channels")} />
          <div className="flex flex-col gap-1.5">
            <TagInput label={t("Kata kunci")} value={form.keywords} onChange={set("keywords")} max={LIMITS.keywords} placeholder={t("Ketik kata lalu tekan Enter")} hint={t("Kata utuh atau frasa. Huruf besar, huruf kecil, dan tanda baca diabaikan.")} />
            <FieldError>{errors.keywords}</FieldError>
          </div>
          <ChipPicker label={t("Maksud pelanggan")} options={text.intentOptions} value={form.intents} onChange={set("intents")} />
          <ChipPicker label={t("Status kontak")} options={text.statusOptions} value={form.leadStatuses} onChange={set("leadStatuses")} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label={t("Kontak baru")} value={form.newContact} onChange={setField("newContact")} options={triOptions} />
            <SelectField label={t("Ada pesanan berjalan")} value={form.hasOpenOrder} onChange={setField("hasOpenOrder")} options={triOptions} />
          </div>
          {form.labelIds.length ? (
            <p className="text-label text-fg-muted">
              {t("Agen ini juga memakai {count} label kontak sebagai syarat. Label tidak diubah dari layar ini.", { count: form.labelIds.length })}{" "}
              <button type="button" onClick={() => set("labelIds")([])} className="bg-transparent border-none p-0 text-brand font-semibold cursor-pointer underline">
                {t("Lepas syarat label")}
              </button>
            </p>
          ) : null}
        </Section>

        <Section title={t("Prioritas")}>
          <TextField label={t("Angka prioritas")} type="number" inputMode="numeric" min={LIMITS.priorityMin} max={LIMITS.priorityMax} value={form.priority} onChange={setField("priority")} error={errors.priority} hint={t("Angka lebih besar menang bila dua agen sama-sama cocok dengan jumlah syarat yang sama.")} />
        </Section>

        {!knowledgeHidden ? (
          <Section title={t("Dokumen pengetahuan")} description={t("Batasi dokumen yang dibaca agen ini. Tanpa pilihan, agen membaca semua dokumen toko.")}>
            {knowledge.error ? (
              <ErrorState error={knowledge.error} onRetry={knowledge.reload} />
            ) : !knowledge.data ? (
              <LoadingState label={t("Memuat dokumen...")} />
            ) : docOptions.length ? (
              <>
                <ChipPicker options={docOptions} value={form.knowledgeDocumentIds} onChange={set("knowledgeDocumentIds")} />
                <FieldError>{errors.knowledgeDocumentIds}</FieldError>
              </>
            ) : (
              <p className="text-label text-fg-muted">{t("Belum ada dokumen pengetahuan di toko ini.")}</p>
            )}
          </Section>
        ) : null}

        <Section title={t("Status")}>
          <Switch label={t("Agen bawaan")} description={t("Dipakai saat tidak ada aturan yang cocok. Hanya satu agen yang bawaan: yang lain dilepas otomatis.")} checked={form.isDefault} onChange={set("isDefault")} />
          <Switch label={t("Aktif")} description={t("Agen yang tidak aktif tidak pernah dipilih.")} checked={form.isActive} onChange={set("isActive")} />
        </Section>
      </form>
    </Modal>
  );
}
