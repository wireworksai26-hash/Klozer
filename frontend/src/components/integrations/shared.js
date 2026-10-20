"use client";
import { useSyncExternalStore } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { API_BASE_URL } from "@/utils/apiConfig";

/** Scope names in the order the API documents them, with a short label and one plain line of meaning. */
export function useScopeInfo() {
  const { t } = useDashboard();
  const list = [
    { value: "contacts:read", label: t("Baca kontak"), meaning: t("Melihat daftar dan data kontak.") },
    { value: "contacts:write", label: t("Ubah kontak"), meaning: t("Membuat dan mengubah kontak, mencatat persetujuan promosi.") },
    { value: "messages:read", label: t("Baca chat"), meaning: t("Membaca riwayat chat sebuah kontak.") },
    { value: "messages:send", label: t("Kirim pesan"), meaning: t("Mengirim pesan dan templat ke kontak.") },
    { value: "orders:read", label: t("Baca pesanan"), meaning: t("Melihat daftar dan isi pesanan.") },
    { value: "orders:write", label: t("Buat pesanan"), meaning: t("Membuat pesanan baru.") },
    { value: "products:read", label: t("Baca produk"), meaning: t("Melihat produk dan stok.") },
  ];
  const labelOf = (scope) => list.find((s) => s.value === scope)?.label || scope;
  return { list, labelOf };
}

const GROUP_ORDER = ["message", "contact", "conversation", "order", "shipment", "broadcast", "template", "task"];

/** The heading of an event group ("order.paid" belongs to "order"). */
export function useGroupLabel() {
  const { t } = useDashboard();
  return (prefix) => {
    switch (prefix) {
      case "message":
        return t("Pesan chat");
      case "contact":
        return t("Kontak");
      case "conversation":
        return t("Percakapan");
      case "order":
        return t("Pesanan");
      case "shipment":
        return t("Pengiriman barang");
      case "broadcast":
        return t("Broadcast");
      case "template":
        return t("Templat");
      case "task":
        return t("Tugas");
      default:
        return prefix;
    }
  };
}

/** Events grouped by the part of the name before the dot, in a fixed order, unknown prefixes last. */
export function groupEvents(events) {
  const byPrefix = new Map();
  for (const event of events) {
    const prefix = event.name.split(".")[0];
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push(event);
  }
  const rank = (p) => (GROUP_ORDER.includes(p) ? GROUP_ORDER.indexOf(p) : GROUP_ORDER.length);
  return [...byPrefix.entries()].sort((a, b) => rank(a[0]) - rank(b[0])).map(([prefix, items]) => ({ prefix, events: items }));
}

const subscribe = () => () => {};
const serverOrigin = () => "";
/** The address the public API is reached at from this browser: the site's own origin plus the API path. */
export function useOpenApiBase() {
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, serverOrigin);
  const base = API_BASE_URL.startsWith("http") ? API_BASE_URL : `${origin}${API_BASE_URL}`;
  return `${base}/open`;
}

/** A form error from the server: field messages when it sent them, the plain message otherwise. */
export function readFormError(err) {
  const fields = {};
  if (Array.isArray(err?.details)) {
    for (const d of err.details) if (d?.field && !fields[d.field]) fields[d.field] = d.message;
  }
  return { fields, message: Object.keys(fields).length ? "" : err?.message || "" };
}
