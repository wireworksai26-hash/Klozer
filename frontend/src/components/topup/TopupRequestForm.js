"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { whatsappUrl } from "@/utils/legal/config";
import { Button, Card, TextAreaField, TextField } from "@/components/ui";
import { TOPUP_PRESETS } from "./topupStatus";

/** Pick how many tokens and send the request. The price is not set here: the team answers with it. */
export default function TopupRequestForm({ rules, onCreated }) {
  const { t } = useDashboard();
  const { number } = useFormat();
  const { run, pending } = useAction();
  const [tokens, setTokens] = useState(TOPUP_PRESETS[1]);
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const chosen = custom.trim() ? Number(custom.replace(/\D/g, "")) : tokens;
  const wa = whatsappUrl();

  const submit = async (e) => {
    e.preventDefault();
    if (!Number.isInteger(chosen) || chosen < rules.min || chosen > rules.max || chosen % rules.step !== 0) {
      setError(t("Jumlah harus kelipatan {step}, antara {min} dan {max}.", { step: number(rules.step), min: number(rules.min), max: number(rules.max) }));
      return;
    }
    setError("");
    const result = await run(() => api.post("/ai/topups", { tokens: chosen, note: note.trim() || undefined }), { success: t("Permintaan terkirim. Tim Klozer akan menghubungi Anda dengan harga dan cara bayar.") });
    if (result.ok) {
      setNote("");
      setCustom("");
      onCreated();
    }
  };

  return (
    <Card title={t("Ajukan top up")} description={t("Pilih jumlah token. Harga dan cara bayar dikirim tim Klozer setelah Anda mengajukan.")}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div role="radiogroup" aria-label={t("Jumlah token")} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TOPUP_PRESETS.map((amount) => {
            const on = !custom.trim() && tokens === amount;
            return (
              <button
                key={amount}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setTokens(amount);
                  setCustom("");
                }}
                className={`min-h-11 px-3 py-2.5 rounded-xl border text-body-sm font-bold tabular-nums cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  on ? "bg-brand-soft text-ink border-brand/40" : "bg-white text-fg border-line-strong hover:bg-sunken"
                }`}
              >
                {number(amount)}
              </button>
            );
          })}
        </div>
        <TextField
          label={t("Jumlah lain (token)")}
          hint={t("Kelipatan {step}. Kosongkan untuk memakai pilihan di atas.", { step: number(rules.step) })}
          inputMode="numeric"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ""))}
          error={error}
        />
        <TextAreaField label={t("Catatan untuk tim (opsional)")} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" icon="coins" loading={pending}>
            {t("Ajukan top up {amount} token", { amount: Number.isFinite(chosen) ? number(chosen) : "" })}
          </Button>
          {wa ? (
            <Button variant="secondary" href={`${wa}?text=${encodeURIComponent(t("Halo tim Klozer, saya ingin konsultasi soal top up token AI."))}`} target="_blank" rel="noopener noreferrer" icon="whatsapp">
              {t("Konsultasi dengan tim")}
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
