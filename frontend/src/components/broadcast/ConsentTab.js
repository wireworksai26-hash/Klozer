"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { Async, Button, Card, CheckboxField, SelectField, Stat, TableShell, TextAreaField, TextField } from "@/components/ui";
import { MAX_PHONES, extractPhones, textToRows } from "./consentParse.mjs";

const PREVIEW_ROWS = 8;

/** Read the first sheet of a spreadsheet, or a CSV as plain text so leading zeros survive. */
async function readFile(file) {
  if (/\.(csv|txt)$/i.test(file.name)) return textToRows(await file.text());
  const XLSX = await import("xlsx");
  const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = book.Sheets[book.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, blankrows: false }).map((row) => row.map((cell) => (typeof cell === "number" ? String(cell) : String(cell ?? ""))));
}

function ImportForm({ onDone }) {
  const { t } = useDashboard();
  const f = useFormat();
  const { run, pending } = useAction();
  const [text, setText] = useState("");
  const [fileRows, setFileRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [state, setState] = useState("opted_in");
  const [source, setSource] = useState("");
  const [attested, setAttested] = useState(false);
  const [result, setResult] = useState(null);

  const parsed = extractPhones(fileRows || textToRows(text));
  const optIn = state === "opted_in";
  const ready = parsed.phones.length > 0 && !parsed.tooMany && source.trim() && (!optIn || attested);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileError("");
    try {
      setFileRows(await readFile(file));
      setFileName(file.name);
      setText("");
    } catch {
      setFileRows(null);
      setFileName("");
      setFileError(t("File tidak bisa dibaca. Pakai berkas .xlsx atau .csv."));
    }
  };

  const clearFile = () => {
    setFileRows(null);
    setFileName("");
  };

  const submit = async (e) => {
    e.preventDefault();
    const out = await run(() => api.post("/broadcast/consent/import", { phones: parsed.phones, state, source: source.trim(), ...(optIn ? { attested: true } : {}) }), { success: t("Persetujuan dicatat.") });
    if (!out.ok) return;
    setResult(out.data.data);
    setText("");
    clearFile();
    setAttested(false);
    onDone();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextAreaField label={t("Tempel daftar nomor")} value={text} rows={5} disabled={Boolean(fileRows)} onChange={(e) => setText(e.target.value)} placeholder={"081234567890\n+62 812 3456 7891"} hint={t("Satu nomor per baris. Boleh dengan kolom lain dipisah koma atau tab, nomornya dikenali otomatis.")} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="consent-file" className="text-label font-semibold text-fg">
          {t("Atau pilih berkas Excel atau CSV")}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input id="consent-file" type="file" accept=".xlsx,.xls,.csv,.txt" onChange={onFile} className="text-body-sm text-fg-muted max-w-full" />
          {fileName ? (
            <Button variant="ghost" size="sm" onClick={clearFile}>
              {t("Lepas {name}", { name: fileName })}
            </Button>
          ) : null}
        </div>
        <p className="text-caption text-fg-subtle">{t("Kolom dengan nomor terbanyak dipakai. Format kolom nomor sebagai teks agar angka 0 di depan tidak hilang.")}</p>
        {fileError ? <p role="alert" className="text-caption text-danger-700">{fileError}</p> : null}
      </div>

      {parsed.phones.length || parsed.ignored || parsed.duplicates ? (
        <div className="flex flex-col gap-2" role="status">
          <p className="text-body-sm text-fg">
            {t("{count} nomor siap diimpor.", { count: f.number(parsed.phones.length) })}{" "}
            <span className="text-fg-muted">
              {parsed.duplicates ? t("{count} duplikat dibuang.", { count: parsed.duplicates }) : ""} {parsed.ignored ? t("{count} baris bukan nomor diabaikan.", { count: parsed.ignored }) : ""}
            </span>
          </p>
          {parsed.tooMany ? <p role="alert" className="text-label text-danger-700">{t("Maksimal {max} nomor per impor. Bagi daftarnya.", { max: f.number(MAX_PHONES) })}</p> : null}
          {parsed.phones.length ? (
            <TableShell>
              <thead>
                <tr className="bg-canvas border-b border-line text-caption font-semibold text-fg-muted">
                  <th scope="col" className="py-2 px-3 w-12">#</th>
                  <th scope="col" className="py-2 px-3">{t("Nomor")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {parsed.phones.slice(0, PREVIEW_ROWS).map((p, i) => (
                  <tr key={`${p}-${i}`}>
                    <td className="py-2 px-3 text-fg-subtle tabular-nums">{i + 1}</td>
                    <td className="py-2 px-3 tabular-nums">{p}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          ) : null}
          {parsed.phones.length > PREVIEW_ROWS ? <p className="text-caption text-fg-subtle">{t("Menampilkan {shown} dari {count} nomor.", { shown: PREVIEW_ROWS, count: f.number(parsed.phones.length) })}</p> : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label={t("Catat sebagai")}
          value={state}
          onChange={(e) => setState(e.target.value)}
          options={[
            { value: "opted_in", label: t("Setuju menerima promosi") },
            { value: "opted_out", label: t("Berhenti menerima pesan") },
          ]}
        />
        <TextField label={t("Sumber persetujuan")} value={source} maxLength={160} onChange={(e) => setSource(e.target.value)} placeholder={t("Formulir pendaftaran Oktober")} hint={t("Dicatat pada tiap kontak.")} required />
      </div>
      {optIn ? <CheckboxField checked={attested} onChange={setAttested} label={t("Saya menyatakan kontak ini sudah menyetujui menerima promosi dari toko saya.")} description={t("Nomor yang belum ada akan ditambahkan sebagai kontak baru.")} /> : null}
      {result ? (
        <p role="status" className="text-label text-success-800 bg-success-50 border border-success-200 rounded-xl p-3">
          {t("{updated} kontak diperbarui, {created} kontak baru, {invalid} nomor tidak valid.", { updated: result.updated, created: result.created, invalid: result.invalid })}
        </p>
      ) : null}
      <div>
        <Button type="submit" icon="upload" loading={pending} disabled={!ready}>
          {optIn ? t("Catat persetujuan") : t("Catat sebagai berhenti")}
        </Button>
      </div>
    </form>
  );
}

/** Counts per consent state, and the import of a list of numbers whose owners said yes (or stop). */
export default function ConsentTab() {
  const { t } = useDashboard();
  const f = useFormat();
  const summary = useApi("/broadcast/consent/summary");
  return (
    <div className="flex flex-col gap-5">
      <p className="text-body-sm text-fg-muted max-w-[68ch]">{t("Hanya kontak yang sudah setuju menerima promosi yang dikirimi templat promosi. Pelanggan yang cuma pernah chat belum dianggap setuju.")}</p>
      <Async query={summary} loadingLabel={t("Memuat persetujuan...")}>
        {(res) => (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label={t("Setuju menerima promosi")} value={f.number(res.data.opted_in)} />
            <Stat label={t("Belum menyatakan")} value={f.number(res.data.unknown)} note={t("Pernah chat, belum ditanya")} />
            <Stat label={t("Berhenti menerima pesan")} value={f.number(res.data.opted_out)} />
          </div>
        )}
      </Async>
      <Card title={t("Impor persetujuan")} description={t("Untuk daftar yang Anda kumpulkan sendiri, misalnya dari formulir pendaftaran.")}>
        <ImportForm onDone={summary.reload} />
      </Card>
    </div>
  );
}
