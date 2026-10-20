"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { useFormat } from "@/hooks/useFormat";
import { api } from "@/utils/api";
import { Button, Card, TextAreaField, TextField } from "@/components/ui";

/** Pick a pack (or another amount), see the price, and create the bill. The price comes from the server's price list. */
export default function TopupPacks({ packs, rules, onCreated }) {
  const { t } = useDashboard();
  const { number, rupiah } = useFormat();
  const { run, pending } = useAction();
  const [chosen, setChosen] = useState(packs[1]?.tokens ?? packs[0]?.tokens);
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [voucher, setVoucher] = useState("");
  const [asked, setAsked] = useState(null); // the server's answer for one amount and code: { key, priceIdr, discountIdr, chargeIdr } or { key, error, code }

  const customTokens = custom ? Number(custom) : null;
  const tokens = customTokens ?? chosen;
  const pack = packs.find((p) => p.tokens === tokens);
  const code = voucher.trim();
  const key = `${tokens}|${code}`;

  // another amount, or a voucher code: ask the server what it costs, so the price shown is the price charged
  useEffect(() => {
    if (!customTokens && !code) return undefined;
    let live = true;
    const timer = setTimeout(() => {
      api
        .get("/ai/topups/price", { query: { tokens, voucher: code } })
        .then((res) => live && setAsked({ key, ...res.data }))
        .catch((err) => live && setAsked({ key, error: err.message, code: err.code }));
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [tokens, customTokens, code, key]);

  const answer = asked?.key === key ? asked : null;
  const quote = !customTokens && !code ? (pack ? { priceIdr: pack.priceIdr, discountIdr: 0, chargeIdr: pack.priceIdr } : null) : answer;
  const voucherError = answer?.error && String(answer.code || "").startsWith("VOUCHER_") ? answer.error : undefined;
  const amountError = answer?.error && !voucherError ? answer.error : undefined;
  const canCreate = Boolean(quote && !quote.error);

  const create = async (e) => {
    e.preventDefault();
    if (!canCreate) return;
    const result = await run(() => api.post("/ai/topups", { tokens, voucher: code || undefined, note: note.trim() || undefined }));
    if (result.ok) {
      setNote("");
      setCustom("");
      setVoucher("");
      setAsked(null);
      onCreated(result.data.data);
    }
  };

  return (
    <Card title={t("Pilih paket token")} description={t("Makin besar paketnya, makin murah per token. Harga sudah final, tidak perlu menunggu tim.")}>
      <form onSubmit={create} className="flex flex-col gap-5">
        <div role="radiogroup" aria-label={t("Paket token")} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {packs.map((p) => {
            const on = !customTokens && chosen === p.tokens;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setChosen(p.tokens);
                  setCustom("");
                }}
                className={`text-left min-h-11 px-4 py-3.5 rounded-xl border cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${on ? "bg-brand-soft border-brand/40" : "bg-white border-line-strong hover:bg-sunken"}`}
              >
                <div className="text-body font-bold text-fg tabular-nums">{t("{tokens} token", { tokens: number(p.tokens) })}</div>
                <div className="text-heading-sm font-bold text-ink tabular-nums mt-0.5">{rupiah(p.priceIdr)}</div>
                <div className="text-caption text-fg-muted tabular-nums">{t("{price} per 1.000 token", { price: rupiah(Math.round((p.priceIdr / p.tokens) * 1000)) })}</div>
              </button>
            );
          })}
        </div>

        <TextField
          label={t("Jumlah lain (token)")}
          hint={customTokens ? undefined : t("Kelipatan {step}. Kosongkan untuk memakai paket di atas.", { step: number(rules.step) })}
          inputMode="numeric"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value.replace(/\D/g, ""));
          }}
          error={amountError}
        />
        <TextField label={t("Kode voucher (opsional)")} value={voucher} maxLength={30} autoCapitalize="characters" onChange={(e) => setVoucher(e.target.value.toUpperCase())} error={voucherError} />
        {quote && !quote.error && (customTokens || code) ? (
          <div className="text-body-sm tabular-nums -mt-2 flex flex-col gap-0.5">
            {quote.discountIdr > 0 ? (
              <>
                <span className="text-fg-muted">{t("Harga normal: {price}", { price: rupiah(quote.priceIdr) })}</span>
                <span className="text-success-700 font-semibold">{t("Potongan voucher: {price}", { price: rupiah(quote.discountIdr) })}</span>
              </>
            ) : null}
            <span className="font-semibold text-fg">{t("Harga: {price}", { price: rupiah(quote.chargeIdr) })}</span>
          </div>
        ) : null}

        <TextAreaField label={t("Catatan (opsional)")} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        <div>
          <Button type="submit" icon="coins" loading={pending} disabled={!canCreate}>
            {canCreate ? t("Buat tagihan {price}", { price: rupiah(quote.chargeIdr) }) : t("Buat tagihan")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
