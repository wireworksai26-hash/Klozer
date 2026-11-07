"use client";
import { useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Button } from "@/components/ui";
import { GOAL_OPTIONS, PERSONA_TEMPLATES, TONE_STYLE_OPTIONS, applyPersonaTemplate } from "@/utils/personaTemplates";

const card = "bg-white p-6 rounded-2xl border border-line shadow-soft";
const input = "w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium focus:border-brand";
const label = "font-bold text-ink block mb-1";

/** A titled group of fields, in the order the client intake form asks them. */
function Section({ title, children }) {
  return (
    <fieldset className="flex flex-col gap-3.5 border-0 p-0 m-0 min-w-0">
      <legend className="text-body font-bold text-fg p-0 mb-1">{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * The persona the AI answers with, tuned like the client intake form: who it is and what it is for, how it speaks, the
 * words it prefers and never uses, the topics it must not discuss, and when an order goes to a person. It can start from
 * a ready-made example or be drafted by the AI; either one only fills the form, and nothing is saved until the owner saves.
 */
export default function PersonaForm() {
  const { aiConfig, updateSpvAiPersona, t } = useDashboard();
  const { run, pending: drafting } = useAction();
  const [form, setForm] = useState(aiConfig.spvPersona);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState("");
  const [note, setNote] = useState("");
  const [pickedTemplate, setPickedTemplate] = useState(null);

  // The persona arrives asynchronously after sign-in; adopt it unless the user has started typing.
  const [touched, setTouched] = useState(false);
  const view = touched ? form : aiConfig.spvPersona;
  const change = (patch) => {
    setTouched(true);
    setForm({ ...view, ...patch });
  };
  const text = (key) => (e) => change({ [key]: e.target.value });
  const styles = Array.isArray(view.toneStyles) ? view.toneStyles : [];

  const pickTemplate = (template) => {
    change(applyPersonaTemplate(template));
    setPickedTemplate(template.id);
    setNote(template.summary);
  };

  const draftWithAi = async () => {
    const result = await run(() => api.post("/ai/persona/generate", { hint: hint.trim() || undefined }));
    if (!result.ok) return;
    const draft = result.data.data;
    // the owner's own assistant name stays; the AI only suggests one when there is none yet
    change({ ...draft, botName: view.botName?.trim() ? view.botName : draft.botName || view.botName });
    setPickedTemplate(null);
    setNote(t("AI sudah mengisi form. Periksa dan ubah seperlunya, lalu klik Simpan Persona. Token terpakai: {tokens}.", { tokens: result.data.usedTokens ?? "-" }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const digits = String(view.bigOrderAmount ?? "").replace(/\D/g, "");
    await updateSpvAiPersona({ ...view, bigOrderAmount: digits ? Number(digits) : undefined });
    setSaving(false);
  };

  return (
    <form onSubmit={save} className={`${card} max-w-[760px] flex flex-col gap-6 text-body-sm`}>
      <div>
        <h3 className="card-title">{t("Persona dan Script AI")}</h3>
        <p className="text-label text-fg-muted">{t("Dipakai langsung saat AI membalas pelanggan di WhatsApp.")}</p>
      </div>

      <div className="rounded-xl border border-brand/30 bg-brand-soft p-4 flex flex-col gap-3">
        <div>
          <div className="font-bold text-fg">{t("Buat otomatis dengan AI")}</div>
          <p className="text-caption text-fg-muted mt-0.5">{t("AI menyusun persona dari profil toko dan produk Anda, ditambah arahan singkat dari Anda. Hasilnya mengisi form di bawah untuk Anda periksa. Belum tersimpan sebelum Anda klik Simpan Persona.")}</p>
        </div>
        <div>
          <label className={label} htmlFor="persona-hint">{t("Arahan untuk AI (opsional)")}</label>
          <textarea id="persona-hint" className={input} rows={2} maxLength={400} value={hint} onChange={(e) => setHint(e.target.value)} placeholder={t("Contoh: jualan skincare untuk ibu muda, ingin terdengar seperti teman yang perhatian")} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button icon="refresh" loading={drafting} onClick={draftWithAi}>
            {drafting ? t("AI sedang menyusun...") : t("Buat dengan AI")}
          </Button>
          <span className="text-caption text-fg-muted">{t("Memakai sekitar 1.000 token AI toko Anda.")}</span>
        </div>
        {note ? <p role="status" className="text-caption text-fg m-0">{note}</p> : null}
      </div>

      <div>
        <div className={label}>{t("Mulai dari contoh")}</div>
        <p className="text-caption text-fg-muted mb-2">{t("Pilih salah satu, isinya mengisi kolom di bawah. Ubah seperlunya, lalu klik Simpan Persona. Nama admin tidak berubah.")}</p>
        <div className="flex flex-wrap gap-2">
          {PERSONA_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => pickTemplate(template)}
              title={template.summary}
              aria-pressed={pickedTemplate === template.id}
              className={`px-3 py-1.5 rounded-full text-label font-bold border cursor-pointer transition-colors ${pickedTemplate === template.id ? "bg-brand text-white border-brand" : "bg-white text-fg border-line hover:border-brand"}`}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      <Section title={t("Identitas dan tujuan")}>
        <div>
          <label className={label} htmlFor="persona-name">{t("Nama Admin Chat")}</label>
          <input id="persona-name" className={input} value={view.botName || ""} maxLength={80} onChange={text("botName")} placeholder={t("Contoh: Siti, Admin Toko Batik")} />
        </div>
        <div role="radiogroup" aria-label={t("Tujuan utama")}>
          <div className={label}>{t("Tujuan utama")}</div>
          <div className="flex flex-col gap-2">
            {GOAL_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-start gap-2.5 cursor-pointer">
                <input type="radio" name="persona-goal" className="mt-1 accent-brand" checked={view.goal === option.value} onChange={() => change({ goal: option.value })} />
                <span>
                  <span className="font-semibold text-fg">{t(option.label)}</span>
                  <span className="block text-caption text-fg-muted">{t(option.hint)}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t("Gaya bicara")}>
        <div>
          <div className={label}>{t("Gaya bahasa (boleh pilih lebih dari satu)")}</div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {TONE_STYLE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={styles.includes(option.value)}
                  onChange={(e) => change({ toneStyles: e.target.checked ? [...styles, option.value] : styles.filter((s) => s !== option.value) })}
                />
                <span className="text-fg">{t(option.label)}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={label} htmlFor="persona-tone">{t("Gaya Bahasa")}</label>
          <input id="persona-tone" className={input} value={view.tone || ""} maxLength={300} onChange={text("tone")} placeholder={t("Santai, ramah, dan to the point seperti admin toko di WhatsApp")} />
        </div>
        <div>
          <label className={label} htmlFor="persona-values">{t("Karakter dan nilai brand")}</label>
          <input id="persona-values" className={input} value={view.brandValues || ""} maxLength={200} onChange={text("brandValues")} placeholder={t("Cepat, Solutif, Empatis")} />
          <p className="text-caption text-fg-muted mt-1">{t("Sebutkan 3 sampai 5 kata kunci karakter brand, dipisah koma.")}</p>
        </div>
      </Section>

      <Section title={t("Sapaan dan pesan")}>
        <div>
          <label className={label} htmlFor="persona-greeting">{t("Sapaan Pembuka")}</label>
          <textarea id="persona-greeting" className={input} rows={3} maxLength={500} value={view.greetingMessage || ""} onChange={text("greetingMessage")} placeholder={t("Halo kak! Terima kasih sudah menghubungi kami.")} />
        </div>
        <div>
          <label className={label} htmlFor="persona-abandoned">{t("Pesan Follow-up Keranjang Ditinggalkan")}</label>
          <textarea id="persona-abandoned" className={input} rows={2} maxLength={500} value={view.abandonedMessage || ""} onChange={text("abandonedMessage")} />
        </div>
        <div>
          <label className={label} htmlFor="persona-faq">{t("Topik yang Sering Ditanyakan")}</label>
          <input id="persona-faq" className={input} maxLength={500} value={view.customFaqKeywords || ""} onChange={text("customFaqKeywords")} placeholder={t("ongkir, transfer, cod, ukuran, resi")} />
        </div>
      </Section>

      <Section title={t("Kosakata dan batasan")}>
        <div>
          <label className={label} htmlFor="persona-preferred">{t("Kata yang dianjurkan")}</label>
          <input id="persona-preferred" className={input} maxLength={300} value={view.preferredWords || ""} onChange={text("preferredWords")} placeholder={t("siap kak, dengan senang hati")} />
          <p className="text-caption text-fg-muted mt-1">{t("Dipisah koma. AI memakainya bila pas.")}</p>
        </div>
        <div>
          <label className={label} htmlFor="persona-forbidden">{t("Kata yang dilarang")}</label>
          <input id="persona-forbidden" className={input} maxLength={300} value={view.forbiddenWords || ""} onChange={text("forbiddenWords")} placeholder={t("kata kasar, istilah yang tidak cocok dengan brand")} />
          <p className="text-caption text-fg-muted mt-1">{t("Dipisah koma. Balasan yang memuat kata ini ditulis ulang satu kali. Kalau masih memuatnya, percakapan diserahkan ke tim.")}</p>
        </div>
        <div>
          <label className={label} htmlFor="persona-offlimit">{t("Topik terlarang")}</label>
          <input id="persona-offlimit" className={input} maxLength={400} value={view.offLimitTopics || ""} onChange={text("offLimitTopics")} placeholder={t("politik, SARA")} />
          <p className="text-caption text-fg-muted mt-1">{t("Dipisah koma. Tulis kata yang mungkin dipakai pelanggan. Pesan pelanggan yang memuatnya dijawab dengan penolakan sopan tanpa memakai AI, jadi tidak memakai token.")}</p>
        </div>
      </Section>

      <Section title={t("Kapan diserahkan ke tim")}>
        <ul className="list-none p-0 m-0 flex flex-col gap-1.5 text-fg">
          <li>{t("Komplain sensitif atau klaim hukum: otomatis, lewat kata kunci seperti komplain, somasi, dan lapor polisi.")}</li>
          <li>{t("Pelanggan minta bicara dengan manusia: otomatis.")}</li>
          <li>{t("AI tidak paham atau tidak yakin: otomatis, AI meneruskan ke tim dan tidak menebak.")}</li>
        </ul>
        <p className="text-caption text-fg-muted m-0">
          {t("Kata kuncinya bisa Anda ubah di")}{" "}
          <Link href="/dashboard/channels" className="text-brand font-semibold hover:underline">
            {t("Saluran Chat, bagian Pembagian chat")}
          </Link>
          .
        </p>
        <div>
          <label className={label} htmlFor="persona-big">{t("Transaksi nilai besar mulai (Rp)")}</label>
          <input id="persona-big" className={input} inputMode="numeric" value={view.bigOrderAmount ?? ""} onChange={(e) => change({ bigOrderAmount: e.target.value.replace(/\D/g, "") })} placeholder="5000000" />
          <p className="text-caption text-fg-muted mt-1">{t("Pesanan dari chat dengan total sebesar ini atau lebih tetap dibuat, lalu percakapan diserahkan ke tim untuk dicek. Kosongkan untuk mematikan.")}</p>
        </div>
      </Section>

      <label className="flex items-start gap-3 rounded-xl border border-line bg-canvas p-3.5 cursor-pointer">
        <input type="checkbox" className="mt-1 w-4 h-4 accent-brand" checked={view.adaptiveStyle !== false} onChange={(e) => change({ adaptiveStyle: e.target.checked })} />
        <span>
          <span className="block font-bold text-fg">{t("Sesuaikan gaya dengan tiap pelanggan")}</span>
          <span className="block text-caption text-fg-muted">{t("AI membaca cara tiap pelanggan menulis, lalu menjawab dengan gaya yang sama: formal dengan yang formal, santai dengan yang santai, singkat dengan yang singkat. Ini per nomor pelanggan, dihitung dari chat mereka sendiri.")}</span>
        </span>
      </label>

      <div className="flex justify-end pt-2 border-t border-line">
        <button type="submit" disabled={saving} className="btn-primary !py-2 !px-5 font-bold disabled:opacity-60">
          {saving ? t("Menyimpan...") : t("Simpan Persona")}
        </button>
      </div>
    </form>
  );
}
