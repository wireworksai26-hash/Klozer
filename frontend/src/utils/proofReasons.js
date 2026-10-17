// Why a payment proof went to a person instead of being approved. Keys are the codes the server stores.
export const PROOF_REASONS = {
  amount_mismatch: "Nominal tidak sama dengan pesanan",
  recipient_mismatch: "Rekening tujuan tidak cocok dengan rekening toko",
  recipient_unverified: "Rekening tujuan tidak terbaca",
  date_out_of_range: "Tanggal pada bukti tidak wajar",
  date_unreadable: "Waktu transfer tidak terbaca",
  transfer_not_success: "Status transfer belum berhasil",
  no_bank_mutation: "Belum ada mutasi bank dengan nominal yang sama",
  auto_approve_disabled: "Persetujuan otomatis dimatikan di paket ini",
  low_confidence: "AI kurang yakin membaca berkas",
  not_a_payment_proof: "Berkas tidak tampak seperti bukti pembayaran",
  amount_missing: "Nominal tidak terbaca",
  no_open_order: "Tidak ada pesanan yang menunggu pembayaran",
  multiple_candidates: "Ada beberapa pesanan dengan nominal sama",
  ai_unavailable: "AI tidak tersedia saat bukti dikirim",
  media_unavailable: "Berkas tidak dapat diunduh dari WhatsApp",
  mutation_already_claimed: "Mutasi bank sudah dipakai pesanan lain",
};
