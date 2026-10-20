// How a top up request's state is shown, shared by the shop's screen and the team's queue.

/** Status in words and a tone for the Badge. "claimed" is a priced request the shop says it has paid, waiting for the team. */
export const TOPUP_STATUS = {
  requested: { label: "Menunggu harga", tone: "warning" },
  quoted: { label: "Menunggu pembayaran", tone: "brand" },
  claimed: { label: "Menunggu dicek tim", tone: "warning" },
  credited: { label: "Token ditambahkan", tone: "success" },
  cancelled: { label: "Dibatalkan", tone: "neutral" },
};

export const isOpenTopup = (status) => status === "requested" || status === "quoted";

/** The state the screens show: a quoted request the shop has paid reads as waiting for the team. */
export const displayStatus = (topup) => (topup.status === "quoted" && topup.paymentClaimedAt ? "claimed" : topup.status);

/** Whether the balance is low enough to say so: under a tenth of the quota left (or nothing at all). */
export const isRunningLow = (balance) => Boolean(balance) && (balance.remainingTokens <= 0 || (balance.totalQuota > 0 && balance.remainingTokens / balance.totalQuota < 0.1));
