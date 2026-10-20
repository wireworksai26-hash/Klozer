"use client";
import { useMemo } from "react";
import { useDashboard } from "@/context/DashboardContext";

// Limits copied from backend/src/validation/agentSchemas.js so a mistake shows before the request is sent.
export const LIMITS = {
  name: 80,
  descriptionMin: 10,
  description: 300,
  instructionsMin: 10,
  instructions: 2000,
  botName: 60,
  tone: 200,
  greeting: 300,
  keyword: 60,
  keywords: 50,
  priorityMin: 0,
  priorityMax: 1000,
  confidenceMin: 50,
  confidenceMax: 95,
  previewText: 1000,
  knowledgeDocuments: 50,
};

export const CHANNEL_VALUES = ["whatsapp", "messenger", "instagram", "telegram", "webchat"];
export const INTENT_VALUES = ["buy", "order_status", "payment"];
export const LEAD_STATUS_VALUES = ["new", "in_progress", "closing", "repeat", "idle", "closed_lost"];
export const COMMERCE_VALUES = ["full", "service", "off"];
export const AGENT_TOOL_NAMES = ["consult_agent", "transfer_to_agent"];

/** Every Indonesian word of this screen that depends on a code from the API, in one place. */
export function useAgentText() {
  const { t } = useDashboard();
  return useMemo(() => {
    const channelLabels = { whatsapp: "WhatsApp", messenger: "Messenger", instagram: "Instagram", telegram: "Telegram", webchat: t("Chat di situs web") };
    const intentLabels = { buy: t("Ingin membeli"), order_status: t("Menanyakan status pesanan"), payment: t("Soal pembayaran") };
    const statusLabels = {
      new: t("Kontak baru masuk"),
      in_progress: t("Sedang ditindaklanjuti"),
      closing: t("Hampir membeli"),
      repeat: t("Pelanggan berulang"),
      idle: t("Lama tidak aktif"),
      closed_lost: t("Batal membeli"),
    };
    const commerce = {
      full: { label: t("Menerima pesanan"), detail: t("Boleh menerima pesanan baru di chat dan menjawab soal pesanan yang sudah ada.") },
      service: { label: t("Hanya layanan pesanan"), detail: t("Menjawab status, cara bayar, dan QRIS baru untuk pesanan yang sudah ada. Tidak membuat pesanan baru.") },
      off: { label: t("Tanpa pesanan"), detail: t("Tidak menyentuh pesanan sama sekali. Pesanan ditangani agen lain.") },
    };
    const methods = {
      rule: t("Aturan pemicu"),
      smart: t("Pilihan model"),
      sticky: t("Tetap di agen sekarang"),
      default: t("Agen bawaan"),
      pinned: t("Dikunci oleh staf"),
      order: t("Pesanan sedang disusun"),
      tool: t("Dipindah oleh agen"),
      none: t("Belum ada agen aktif"),
    };
    const tools = {
      check_stock: t("Cek harga dan stok"),
      lookup_order: t("Lihat status pesanan"),
      create_task: t("Buat tugas"),
      handoff_to_human: t("Serahkan ke tim"),
      consult_agent: t("Tanya agen lain"),
      transfer_to_agent: t("Pindahkan ke agen lain"),
    };
    const opts = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));
    return {
      channelOptions: opts(channelLabels),
      intentOptions: opts(intentLabels),
      statusOptions: opts(statusLabels),
      commerceOptions: COMMERCE_VALUES.map((value) => ({ value, label: commerce[value].label })),
      commerceDetail: (mode) => commerce[mode]?.detail ?? "",
      commerceLabel: (mode) => commerce[mode]?.label ?? mode,
      channelLabel: (v) => channelLabels[v] ?? v,
      intentLabel: (v) => intentLabels[v] ?? v,
      statusLabel: (v) => statusLabels[v] ?? v,
      methodLabel: (v) => methods[v] ?? v,
      toolLabel: (v) => tools[v] ?? v,
    };
  }, [t]);
}
