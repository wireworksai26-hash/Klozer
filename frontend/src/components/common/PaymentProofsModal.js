"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { PROOF_REASONS } from "@/utils/proofReasons";
import { XIcon } from "@/components/icons";

export default function PaymentProofsModal({ order, onClose }) {
  const { t } = useDashboard();
  const [state, setState] = useState({ loading: true, items: [], error: "" });

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/orders/${order.dbId}/proofs`)
      .then((res) => !cancelled && setState({ loading: false, items: res.items, error: "" }))
      .catch((err) => !cancelled && setState({ loading: false, items: [], error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [order.dbId]);

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[560px] max-h-[88vh] overflow-y-auto p-6 shadow-2xl border border-line flex flex-col gap-4 text-body-sm">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h3 className="card-title">{t("Bukti Pembayaran")}</h3>
            <div className="text-caption text-fg-muted">
              {order.id} · Rp {order.total.toLocaleString("id-ID")}
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-canvas flex items-center justify-center border-none cursor-pointer" aria-label={t("Tutup")}>
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {state.loading && <div className="text-fg-muted">{t("Memuat...")}</div>}
        {state.error && <div className="text-danger-700">{state.error}</div>}
        {!state.loading && !state.error && state.items.length === 0 && <div className="text-fg-muted">{t("Belum ada bukti untuk pesanan ini.")}</div>}

        {state.items.map((p) => (
          <div key={p.id} className="rounded-xl border border-line p-4 flex flex-col gap-2.5">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt={t("Bukti Pembayaran")} className="w-20 h-20 object-cover rounded-lg border border-line bg-canvas" onError={(e) => (e.currentTarget.style.display = "none")} />
              <div className="flex-1 min-w-0">
                <div className="text-caption font-bold text-fg-muted uppercase">{t("Dibaca oleh AI")}</div>
                <div className="font-bold text-ink">{p.amount === null ? t("Nominal tidak terbaca") : `Rp ${p.amount.toLocaleString("id-ID")}`}</div>
                <div className="text-caption text-fg-muted">
                  {[p.bank, p.paidAt ? new Date(p.paidAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : null].filter(Boolean).join(" · ") || "-"}
                </div>
                <div className="text-caption text-fg-muted">
                  {t("Keyakinan AI")}: {p.confidence}%
                </div>
              </div>
              {p.suspicious && <span className="px-2 py-0.5 rounded-full text-caption font-bold bg-danger-100 text-danger-800 whitespace-nowrap">{t("Mencurigakan")}</span>}
            </div>
            {p.reasons.length > 0 && (
              <ul className="list-disc pl-5 text-caption text-fg-muted flex flex-col gap-0.5">
                {p.reasons.map((r) => (
                  <li key={r}>{PROOF_REASONS[r] ? t(PROOF_REASONS[r]) : r}</li>
                ))}
              </ul>
            )}
            <a href={p.imageUrl} target="_blank" rel="noopener noreferrer" className="text-caption font-bold text-brand no-underline">
              {t("Buka berkas")}
            </a>
          </div>
        ))}

        <p className="text-caption text-fg-subtle">{t("AI hanya membaca berkas. Cocokkan dengan mutasi rekening, lalu setujui lewat tombol Set Lunas.")}</p>
      </div>
    </div>
  );
}
