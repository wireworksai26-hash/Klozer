// What each channel type needs to be connected, in the words a shop owner uses.
// Field names match backend/src/validation/channelSchemas.js (createChannelBody).

export const TYPE_ORDER = ["whatsapp", "instagram", "messenger", "telegram", "webchat"];

/** Types whose connection depends on a token the owner pastes. */
export const TOKEN_TYPES = ["whatsapp", "instagram", "messenger", "telegram"];

/**
 * @param {(key: string, vars?: object) => string} t
 * @returns {Record<string, { label: string, about: string, fields: { name: string, label: string, hint: string, required?: boolean, secret?: boolean }[] }>}
 */
export function channelTypes(t) {
  return {
    whatsapp: {
      label: "WhatsApp",
      about: t("Nomor WhatsApp Business lewat Cloud API Meta."),
      fields: [
        { name: "externalId", label: t("ID nomor telepon (Phone number ID)"), hint: t("Di Meta for Developers: aplikasi Anda, WhatsApp, API Setup. Ini bukan nomor teleponnya."), required: true },
        { name: "wabaId", label: t("ID akun WhatsApp Business (WABA)"), hint: t("Ada di halaman yang sama. Perlu untuk templat broadcast.") },
        { name: "accessToken", label: t("Access token"), hint: t("Token permanen dari System User di Meta Business. Disimpan terenkripsi dan tidak pernah ditampilkan lagi."), required: true, secret: true },
        { name: "displayHandle", label: t("Nomor yang ditampilkan"), hint: t("Opsional. Membantu tim mengenali nomor ini di daftar.") },
      ],
    },
    instagram: {
      label: "Instagram",
      about: t("Pesan langsung (DM) akun Instagram Business."),
      fields: [
        { name: "pageId", label: t("ID Halaman Facebook"), hint: t("Halaman yang tertaut ke akun Instagram Business Anda. Ada di Pengaturan Halaman, bagian Tentang."), required: true },
        { name: "accessToken", label: t("Token Halaman"), hint: t("Token akses Halaman tersebut. Disimpan terenkripsi dan tidak pernah ditampilkan lagi."), required: true, secret: true },
      ],
    },
    messenger: {
      label: "Messenger",
      about: t("Pesan masuk ke Halaman Facebook Anda."),
      fields: [
        { name: "pageId", label: t("ID Halaman Facebook"), hint: t("Ada di Pengaturan Halaman, bagian Tentang."), required: true },
        { name: "accessToken", label: t("Token Halaman"), hint: t("Token akses Halaman tersebut. Disimpan terenkripsi dan tidak pernah ditampilkan lagi."), required: true, secret: true },
      ],
    },
    telegram: {
      label: "Telegram",
      about: t("Bot Telegram milik toko Anda."),
      fields: [{ name: "accessToken", label: t("Token bot"), hint: t("Dari @BotFather: kirim /newbot, lalu salin token utuhnya. Disimpan terenkripsi dan tidak pernah ditampilkan lagi."), required: true, secret: true }],
    },
    webchat: {
      label: t("Chat website"),
      about: t("Kotak chat yang Anda pasang di situs sendiri."),
      fields: [],
    },
  };
}
