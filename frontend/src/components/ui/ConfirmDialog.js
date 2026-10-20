"use client";
import { useDashboard } from "@/context/DashboardContext";
import Button from "./Button";
import Modal from "./Modal";

/** Ask before something that cannot be undone. `body` says exactly what will happen. */
export default function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel, tone = "danger", pending = false }) {
  const { t } = useDashboard();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={pending} onClick={onConfirm}>
            {confirmLabel || t("Ya")}
          </Button>
        </>
      }
    >
      <p className="text-body-sm text-fg-muted">{body}</p>
    </Modal>
  );
}
