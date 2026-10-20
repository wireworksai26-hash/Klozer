"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/utils/api";
import { useAction, useApi } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { useDashboard } from "@/context/DashboardContext";
import { Async, Badge, Button, Card, EmptyState, ErrorState, IconButton, LoadingState, SelectField, Switch, TableShell, TagInput, TextField } from "@/components/ui";
import TypeIcon from "./TypeIcon";
import { channelTypes } from "./channelTypes";
import { fieldErrors } from "./formErrors";

const hintKey = (id) => `klozer_available_${id}`;

/** "Saya siap menerima chat" for the signed-in CS. The API cannot be asked for the current value, so the last choice is remembered in this browser. */
function AvailabilityCard() {
  const { t, currentUser } = useDashboard();
  const { run, pending } = useAction();
  const [available, setAvailable] = useState(() => {
    try {
      return window.localStorage.getItem(hintKey(currentUser?.id)) !== "0";
    } catch {
      return true;
    }
  });

  const change = async (next) => {
    const res = await run(() => api.put("/users/me/availability", { available: next }), { success: next ? t("Anda siap menerima chat.") : t("Chat baru tidak dibagikan ke Anda.") });
    if (!res.ok) return;
    setAvailable(next);
    try {
      window.localStorage.setItem(hintKey(currentUser?.id), next ? "1" : "0");
    } catch {
      // storage blocked: the switch still works for this visit
    }
  };

  return (
    <Card title={t("Ketersediaan Anda")}>
      <Switch label={t("Saya siap menerima chat")} description={t("Matikan saat istirahat. Selama mati, chat baru tidak dibagikan ke Anda.")} checked={available} disabled={pending} onChange={change} />
    </Card>
  );
}

function Option({ title, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-label font-semibold text-fg">{title}</div>
      {children}
    </div>
  );
}

function RoutingForm({ settings, canEdit, onSaved }) {
  const { t } = useDashboard();
  const { run, pending } = useAction();
  const [mode, setMode] = useState(settings.mode);
  const [onlineOnly, setOnlineOnly] = useState(settings.onlineOnly);
  const [maxOpen, setMaxOpen] = useState(String(settings.maxOpenChats));
  const [hold, setHold] = useState(String(settings.humanHoldMinutes));
  const [keywords, setKeywords] = useState(settings.handoffKeywords);
  const [errors, setErrors] = useState({});

  const modes = [
    { value: "least_busy", label: t("Yang chat terbukanya paling sedikit") },
    { value: "round_robin", label: t("Bergiliran") },
    { value: "manual", label: t("Dibagi manual oleh pemilik atau supervisor") },
  ];
  const modeHint = {
    least_busy: t("Chat baru ke CS dengan beban paling ringan."),
    round_robin: t("Chat baru ke CS yang paling lama tidak mendapat chat."),
    manual: t("Tidak ada pembagian otomatis. Chat menunggu sampai ada yang menugaskan atau mengambilnya."),
  }[mode];

  const save = async (event) => {
    event.preventDefault();
    const e = {};
    const maxN = Number(maxOpen);
    const holdN = Number(hold);
    if (!Number.isInteger(maxN) || maxN < 1 || maxN > 500) e.maxOpenChats = t("Isi angka bulat 1 sampai 500.");
    if (!Number.isInteger(holdN) || holdN < 1 || holdN > 1440) e.humanHoldMinutes = t("Isi menit 1 sampai 1440.");
    if (keywords.some((k) => k.length < 2 || k.length > 60)) e.handoffKeywords = t("Tiap kata 2 sampai 60 karakter.");
    if (keywords.length > 100) e.handoffKeywords = t("Maksimal 100 kata.");
    setErrors(e);
    if (Object.keys(e).length) return;

    const body = { mode, onlineOnly, maxOpenChats: maxN, humanHoldMinutes: holdN };
    if (JSON.stringify(keywords) !== JSON.stringify(settings.handoffKeywords)) body.handoffKeywords = keywords;
    const res = await run(() => api.put("/routing/settings", body), { success: t("Pengaturan pembagian chat tersimpan.") });
    if (res.ok) onSaved();
    else setErrors(fieldErrors(res.error));
  };

  const resetKeywords = async () => {
    const res = await run(() => api.put("/routing/settings", { handoffKeywords: null }), { success: t("Kata kunci kembali ke daftar bawaan.") });
    if (res.ok) onSaved();
  };

  const changed =
    mode !== settings.mode ||
    onlineOnly !== settings.onlineOnly ||
    maxOpen !== String(settings.maxOpenChats) ||
    hold !== String(settings.humanHoldMinutes) ||
    JSON.stringify(keywords) !== JSON.stringify(settings.handoffKeywords);

  return (
    <Card title={t("Aturan pembagian chat")} description={canEdit ? undefined : t("Hanya pemilik atau supervisor yang bisa mengubah aturan ini.")}>
      <form onSubmit={save} noValidate className="flex flex-col gap-5">
        <SelectField label={t("Cara membagi chat baru")} hint={modeHint} value={mode} onChange={(e) => setMode(e.target.value)} options={modes} disabled={!canEdit} />
        <Switch label={t("Hanya CS yang sedang online")} description={t("CS yang tidak membuka dashboard tidak mendapat chat baru.")} checked={onlineOnly} onChange={setOnlineOnly} disabled={!canEdit} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label={t("Batas chat terbuka per CS")} hint={t("CS yang sudah mencapai batas dilewati.")} type="number" inputMode="numeric" min={1} max={500} value={maxOpen} onChange={(e) => setMaxOpen(e.target.value)} error={errors.maxOpenChats} disabled={!canEdit} className="tabular-nums" />
          <TextField label={t("AI menunggu setelah CS membalas (menit)")} hint={t("Bila tidak ada balasan manusia selama waktu ini, AI menjawab lagi.")} type="number" inputMode="numeric" min={1} max={1440} value={hold} onChange={(e) => setHold(e.target.value)} error={errors.humanHoldMinutes} disabled={!canEdit} className="tabular-nums" />
        </div>

        <Option title={t("Kata yang menyerahkan chat ke manusia")}>
          {canEdit ? (
            <TagInput hint={errors.handoffKeywords || t("Bila pelanggan menulis salah satu kata ini, AI berhenti membalas dan chat menunggu CS.")} value={keywords} onChange={setKeywords} placeholder={t("Ketik kata lalu tekan Enter")} max={100} />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((k) => (
                <Badge key={k}>{k}</Badge>
              ))}
            </div>
          )}
          <p className="text-caption text-fg-subtle">{settings.handoffKeywordsCustom ? t("Memakai daftar buatan toko ini.") : t("Memakai daftar bawaan.")}</p>
        </Option>

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" loading={pending} disabled={!changed}>
              {t("Simpan pembagian chat")}
            </Button>
            {settings.handoffKeywordsCustom ? (
              <Button variant="secondary" onClick={resetKeywords} disabled={pending}>
                {t("Pakai daftar kata bawaan")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </form>
    </Card>
  );
}

function Overview({ query }) {
  const { t, chatEvent } = useDashboard();
  const { relative } = useFormat();
  const types = channelTypes(t);

  const firstEvent = useRef(true);
  const { reload } = query;
  useEffect(() => {
    if (firstEvent.current) {
      firstEvent.current = false;
      return;
    }
    reload();
  }, [chatEvent, reload]);

  return (
    <Card
      title={t("Beban tim")}
      description={t("Hanya CS yang dibagi chat otomatis.")}
      action={<IconButton icon="refresh" label={t("Muat ulang beban tim")} onClick={query.reload} />}
      padded={false}
    >
      <div className="p-5 pt-4 flex flex-col gap-4">
        {query.error && !query.data ? <ErrorState error={query.error} onRetry={query.reload} /> : null}
        {!query.data && !query.error ? <LoadingState label={t("Memuat beban tim...")} /> : null}
        {query.data ? (
          <>
            {query.data.data.agents.length === 0 ? (
              <EmptyState icon="user" title={t("Belum ada CS aktif")} body={t("Tambahkan akun dengan peran CS di menu Hak Akses dan Tim supaya chat bisa dibagi.")} action={<Button href="/dashboard/settings?tab=team" variant="secondary">{t("Buka Hak Akses dan Tim")}</Button>} />
            ) : (
              <TableShell>
                <thead>
                  <tr className="bg-canvas border-b border-line text-label font-bold text-fg-muted">
                    <th scope="col" className="py-3 px-4">{t("Nama")}</th>
                    <th scope="col" className="py-3 px-4">{t("Online")}</th>
                    <th scope="col" className="py-3 px-4">{t("Ketersediaan")}</th>
                    <th scope="col" className="py-3 px-4 text-right">{t("Chat terbuka")}</th>
                    <th scope="col" className="py-3 px-4">{t("Menerima chat baru")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {query.data.data.agents.map((a) => (
                    <tr key={a.id}>
                      <th scope="row" className="py-3 px-4 font-bold text-fg text-left">{a.name}</th>
                      <td className="py-3 px-4">
                        <Badge tone={a.isOnline ? "success" : "neutral"}>{a.isOnline ? t("Online") : t("Offline")}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge tone={a.isAvailable ? "success" : "warning"}>{a.isAvailable ? t("Siap") : t("Istirahat")}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-fg">{a.openChats}</td>
                      <td className="py-3 px-4">
                        {a.eligible && !a.atCapacity ? <Badge tone="success">{t("Ya")}</Badge> : <Badge tone="neutral">{a.atCapacity ? t("Tidak, sudah penuh") : t("Tidak")}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}

            <div>
              <h3 className="text-body-sm font-bold text-fg">{t("Menunggu CS")}</h3>
              {query.data.data.queue.length === 0 ? (
                <p className="text-label text-fg-muted mt-1">{t("Tidak ada chat yang menunggu dibagikan.")}</p>
              ) : (
                <ul className="list-none p-0 mt-2 mb-0 divide-y divide-line border border-line rounded-xl">
                  {query.data.data.queue.map((q) => (
                    <li key={q.leadId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                      <TypeIcon type={q.channelType} className="w-4 h-4 text-fg-muted" />
                      <span className="font-semibold text-fg">{q.name}</span>
                      <span className="text-label text-fg-muted tabular-nums">{types[q.channelType]?.label}</span>
                      <span className="text-label text-fg-muted ml-auto">{t("Menunggu sejak {time}", { time: relative(q.waitingSince) })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}

export default function RoutingTab() {
  const { isManager, serverRole, t } = useDashboard();
  const settings = useApi("/routing/settings");
  const overview = useApi("/routing/overview", { enabled: isManager });

  return (
    <div className="flex flex-col gap-5">
      {serverRole === "cs" ? <AvailabilityCard /> : null}
      <Async query={settings} loadingLabel={t("Memuat pengaturan...")}>
        {(body) => (
          <RoutingForm
            key={JSON.stringify(body.data)}
            settings={body.data}
            canEdit={isManager}
            onSaved={() => {
              settings.reload();
              if (isManager) overview.reload();
            }}
          />
        )}
      </Async>
      {isManager ? <Overview query={overview} /> : null}
    </div>
  );
}
