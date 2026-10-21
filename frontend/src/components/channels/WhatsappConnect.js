"use client";
import { useState } from "react";
import { api } from "@/utils/api";
import { useApi } from "@/hooks/useApi";
import { useDashboard } from "@/context/DashboardContext";
import { runEmbeddedSignup } from "@/utils/facebookSdk";
import { Button, Card } from "@/components/ui";

/**
 * Connect a WhatsApp number without making a token: Meta's own window asks the client to log in and give its number, and
 * Klozer finishes the rest. Shown only when the Klozer team has set Embedded Signup up (the server says so).
 */
export default function WhatsappConnect({ disabled, onConnected }) {
  const { t, notify } = useDashboard();
  const query = useApi("/channels/whatsapp/signup-config");
  const [step, setStep] = useState("idle"); // idle | opening | finishing
  const [problem, setProblem] = useState("");

  const cfg = query.data?.data;
  if (!cfg?.enabled) return null;

  const start = async () => {
    setProblem("");
    setStep("opening");
    try {
      const result = await runEmbeddedSignup({ appId: cfg.appId, configId: cfg.configId, graphVersion: cfg.graphVersion });
      if (result.cancelled) {
        setStep("idle");
        return;
      }
      if (result.incomplete) {
        setProblem(t("Meta belum mengirim data nomor Anda. Ulangi dan selesaikan semua langkah di jendela Meta."));
        setStep("idle");
        return;
      }
      setStep("finishing");
      const res = await api.post("/channels/whatsapp/signup", { code: result.code, wabaId: result.wabaId, phoneNumberId: result.phoneNumberId });
      notify("success", t("WhatsApp {name} terhubung.", { name: res.data.name }));
      onConnected();
    } catch (err) {
      setProblem(err?.message || t("Gagal menghubungkan WhatsApp."));
    } finally {
      setStep("idle");
    }
  };

  const busy = step !== "idle";
  return (
    <Card title={t("Hubungkan WhatsApp Anda")} description={t("Klik tombolnya, login Facebook, lalu masukkan nomor WhatsApp bisnis Anda di jendela Meta. Tidak perlu membuat token atau aplikasi sendiri.")}>
      <div className="flex flex-col gap-3">
        <div>
          <Button icon="whatsapp" loading={busy} disabled={disabled || busy} onClick={start}>
            {step === "finishing" ? t("Menyelesaikan penyambungan...") : step === "opening" ? t("Menunggu jendela Meta...") : t("Hubungkan WhatsApp")}
          </Button>
        </div>
        {disabled ? <p className="text-label text-warning-800">{t("Batas paket tercapai. Hapus saluran yang tidak dipakai atau naikkan paket.")}</p> : null}
        {problem ? (
          <p role="alert" className="text-label rounded-xl px-3.5 py-2.5 border bg-danger-50 text-danger-700 border-danger-200">
            {problem}
          </p>
        ) : null}
        <p className="text-label text-fg-muted">{t("Nomor yang dipakai tidak boleh sedang aktif di aplikasi WhatsApp biasa. Bila perlu, hapus akun WhatsApp-nya dari aplikasi dulu.")}</p>
      </div>
    </Card>
  );
}
