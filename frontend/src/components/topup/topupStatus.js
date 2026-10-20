// How a top up request's state is shown, shared by the shop's screen and the team's queue.

/** Status as the API returns it, in words and a tone for the Badge. */
export const TOPUP_STATUS = {
  requested: { label: "Menunggu harga", tone: "warning" },
  quoted: { label: "Menunggu pembayaran", tone: "brand" },
  credited: { label: "Token ditambahkan", tone: "success" },
  cancelled: { label: "Dibatalkan", tone: "neutral" },
};

export const isOpenTopup = (status) => status === "requested" || status === "quoted";

/** Token amounts offered as shortcuts. They are amounts, not prices: the price is agreed with the team per request. */
export const TOPUP_PRESETS = [500000, 1000000, 2500000, 5000000];

/** Whether the balance is low enough to say so: under a tenth of the quota left (or nothing at all). */
export const isRunningLow = (balance) => Boolean(balance) && (balance.remainingTokens <= 0 || (balance.totalQuota > 0 && balance.remainingTokens / balance.totalQuota < 0.1));
