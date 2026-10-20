"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { Button, CopyButton, Modal } from "@/components/ui";

/**
 * Shows a key or a secret exactly once. Escape, the backdrop and the x do not close it (a stray keypress must not lose
 * the only copy); the explicit button does.
 */
export default function SecretDialog({ open, onClose, title, statement, fieldLabel, value, children }) {
  const { t } = useDashboard();
  const [warn, setWarn] = useState(false);

  const finish = () => {
    setWarn(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => setWarn(true)}
      title={title}
      footer={
        <>
          <CopyButton value={value} label={t("Salin")} />
          <Button onClick={finish}>{t("Sudah saya simpan")}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body-sm text-fg">{statement}</p>
        <div className="flex flex-col gap-1.5">
          <span className="text-label font-semibold text-fg">{fieldLabel}</span>
          <code data-autofocus tabIndex={0} className="block p-3 bg-sunken border border-line rounded-xl font-mono text-label text-fg break-all select-all">
            {value}
          </code>
        </div>
        {warn ? (
          <p role="alert" className="text-caption text-danger-700">
            {t("Dialog ini hanya bisa ditutup dengan tombol Sudah saya simpan, supaya nilainya tidak hilang.")}
          </p>
        ) : null}
        {children}
      </div>
    </Modal>
  );
}
