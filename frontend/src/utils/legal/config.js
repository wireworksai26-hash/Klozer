// Single place for the facts the legal and contact pages quote. Update here, not in the page text.
export const LEGAL = {
  brand: "Klozer",
  site: "klozer.my.id",
  siteUrl: "https://klozer.my.id",
  // Name that appears as the service operator. Replace with the registered name of the person or
  // business that signs the payment-gateway contract once it is final.
  operator: "Pengelola Klozer",
  contactEmail: "wireworksai26@gmail.com",
  // Fill both before going live: the contact page, footer and FAQ only show what is set here.
  phone: "", // e.g. "+62 812-3456-7890"
  address: "", // full business address as it appears on the gateway application
  // Where customers pay for a subscription. The QRIS image is the static QR from the GoPay Merchant app,
  // saved as frontend/public/qris-gopay.png. Leave qrisImage empty to hide it.
  payment: {
    gopayName: "", // name shown in the GoPay Merchant app, e.g. "KLOZER"
    gopayNumber: "", // GoPay number, e.g. "0812-3456-7890"
    qrisImage: "/qris-gopay.png",
  },
  operatingHours: "Senin–Jumat, 09.00–17.00 WIB",
  effectiveDate: "17 Oktober 2026",
  lastUpdated: "17 Oktober 2026",
  refund: {
    requestWindowDays: 7, // days after payment in which a refund can be requested
    acknowledgeBusinessDays: 2,
    reviewBusinessDays: 7,
    payoutBusinessDays: 14,
  },
};

/** wa.me link built from `phone`, or null while no phone is configured. */
export function whatsappUrl() {
  let digits = LEGAL.phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}
