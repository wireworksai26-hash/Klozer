// Wording and rules for tasks that several task components share. Labels take `t` so they follow the dashboard language.

export const isOpenStatus = (status) => status === "open" || status === "in_progress";

// The same moves the server allows (backend/src/services/tasks/taskModel.js).
const TRANSITIONS = {
  open: ["in_progress", "done", "cancelled"],
  in_progress: ["open", "done", "cancelled"],
  done: ["open"],
  cancelled: ["open"],
};
export const nextStatuses = (status) => TRANSITIONS[status] ?? [];

export const statusLabel = (t, status) =>
  ({ open: t("Terbuka"), in_progress: t("Dikerjakan"), done: t("Selesai"), cancelled: t("Dibatalkan") })[status] ?? status;

export const STATUS_TONE = { open: "neutral", in_progress: "accent", done: "success", cancelled: "neutral" };

export const typeOptions = (t) => [
  { value: "follow_up", label: t("Hubungi lagi") },
  { value: "check_stock", label: t("Cek stok") },
  { value: "call_customer", label: t("Telepon pelanggan") },
  { value: "check_payment", label: t("Periksa pembayaran") },
  { value: "handle_chat", label: t("Tangani chat") },
  { value: "other", label: t("Tugas") },
];
export const typeLabel = (t, type) => typeOptions(t).find((o) => o.value === type)?.label ?? type;

export const priorityOptions = (t) => [
  { value: "low", label: t("Rendah") },
  { value: "normal", label: t("Biasa") },
  { value: "high", label: t("Tinggi") },
];
export const priorityLabel = (t, priority) => priorityOptions(t).find((o) => o.value === priority)?.label ?? priority;
export const PRIORITY_TONE = { low: "neutral", normal: "neutral", high: "warning" };

/** Who made the task: a person, an AI agent (with its name), or a rule. */
export function sourceLabel(t, task) {
  if (task.source === "ai_agent") return task.agentName ? t("Agen AI: {name}", { name: task.agentName }) : t("Agen AI||singular");
  if (task.source === "rule") return t("Aturan");
  if (task.source === "api") return t("API");
  return t("Staf");
}

/** The button text for moving a task from one status to another. */
export function actionLabel(t, from, to) {
  if (to === "in_progress") return t("Mulai kerjakan");
  if (to === "done") return t("Tandai selesai");
  if (to === "cancelled") return t("Batalkan tugas");
  return from === "in_progress" ? t("Kembalikan ke terbuka") : t("Buka lagi");
}

/** Server validation errors ({ field, message }[]) as { field: message }, for showing under the right input. */
export function fieldErrors(error) {
  const out = {};
  for (const d of error?.details ?? []) if (d?.field && !out[d.field]) out[d.field] = d.message;
  return out;
}
