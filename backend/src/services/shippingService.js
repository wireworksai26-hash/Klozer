import { memoryStore } from "../config/db.js";

/**
 * Calculate Multi-Courier Shipping Rates
 * @param {Object} params { originCity, destinationCity, weightGrams }
 * @returns {Promise<Array>} Available courier options
 */
export async function calculateShippingRates({ originCity = "Surakarta", destinationCity = "Jakarta Selatan", weightGrams = 500 }) {
  const baseWeightKg = Math.ceil(weightGrams / 1000);
  
  return [
    {
      courier: "J&T Express",
      service: "EZ Reguler",
      etd: "1-2 Hari",
      cost: 18000 * baseWeightKg,
      cashback: 1800 * baseWeightKg,
      codSupported: true,
    },
    {
      courier: "SiCepat",
      service: "SIUNT (Untung)",
      etd: "1-2 Hari",
      cost: 17000 * baseWeightKg,
      cashback: 1700 * baseWeightKg,
      codSupported: true,
    },
    {
      courier: "JNE",
      service: "REG",
      etd: "2-3 Hari",
      cost: 20000 * baseWeightKg,
      cashback: 1000 * baseWeightKg,
      codSupported: false,
    },
    {
      courier: "SAP Express",
      service: "UDR (Reguler COD)",
      etd: "1-3 Hari",
      cost: 16500 * baseWeightKg,
      cashback: 2500 * baseWeightKg,
      codSupported: true,
    },
  ];
}

/**
 * Calculate Anti-RTS COD Risk Score & Micro-Deposit Recommendation
 * Evaluates buyer address quality, past return risk, and suggests risk mitigation
 * @param {Object} params { phone, address, pastReturnRate }
 * @returns {Object} Score details, risk level, and mitigation strategies
 */
export function calculateCodRiskScore({ phone = "", address = "", pastReturnRate = 0 }) {
  let score = 100;
  const addressFlags = [];

  const rawAddr = String(address || "").toLowerCase().trim();

  // 1. Length check
  if (!rawAddr || rawAddr.length < 15) {
    score -= 35;
    addressFlags.push("Alamat terlalu pendek / tidak lengkap");
  }

  // 2. Street / Road indicator
  const hasStreet = /(jl\.|jalan|gang|gg\.|dusun|desa|komp|komplek|perum|perumahan|kp\.|kampung)/i.test(rawAddr);
  if (!hasStreet) {
    score -= 15;
    addressFlags.push("Nama jalan / dusun / perumahan belum terdeteksi");
  }

  // 3. House Number / RT RW indicator
  const hasHouseOrRtRw = /(no\.|nomor|\brt\b|\brw\b|\bblok\b)/i.test(rawAddr);
  if (!hasHouseOrRtRw) {
    score -= 15;
    addressFlags.push("Nomor rumah atau RT/RW tidak tercantum");
  }

  // 4. Postal Code indicator (5 digits)
  const hasPostalCode = /\b\d{5}\b/.test(rawAddr);
  if (!hasPostalCode) {
    score -= 10;
    addressFlags.push("Kode pos 5 digit tidak disertakan");
  }

  // 5. Landmark indicator (dekat, samping, depan, seberang)
  const hasLandmark = /(dekat|samping|depan|seberang|belakang|patokan|sebelah)/i.test(rawAddr);
  if (hasLandmark) {
    score += 5; // Bonus for clear landmark
  }

  // 6. Past return rate penalty
  if (pastReturnRate > 25) {
    score -= 40;
    addressFlags.push(`Riwayat paket retur pelanggan tinggi (${pastReturnRate}%)`);
  } else if (pastReturnRate > 10) {
    score -= 20;
    addressFlags.push(`Ada riwayat retur pembeli (${pastReturnRate}%)`);
  }

  score = Math.max(10, Math.min(100, score));

  const riskLevel = score >= 75 ? "LOW_RISK" : score >= 50 ? "MEDIUM_RISK" : "HIGH_RISK_RTS";
  
  // Recommendation and Micro-Deposit mitigation
  let recommendation = "APPROVE_COD";
  let requiresMicroDeposit = false;
  let microDepositAmount = 0;
  let microDepositReason = "";

  if (riskLevel === "HIGH_RISK_RTS") {
    recommendation = "REQUIRE_MICRO_DEPOSIT_OR_QRIS";
    requiresMicroDeposit = true;
    microDepositAmount = 20000;
    microDepositReason = "Risiko retur tinggi: Pembeli wajib bayar deposit ongkir Rp 20.000 via QRIS. Sisa harga barang dibayar COD.";
  } else if (riskLevel === "MEDIUM_RISK") {
    recommendation = "RECOMMEND_MICRO_DEPOSIT";
    requiresMicroDeposit = true;
    microDepositAmount = 15000;
    microDepositReason = "Alamat kurang spesifik: Sarankan bayar DP ongkir Rp 15.000 via QRIS demi keamanan pengiriman.";
  }

  return {
    score,
    riskLevel,
    recommendation,
    addressFlags,
    requiresMicroDeposit,
    microDepositAmount,
    microDepositReason,
    suggestedMessage: requiresMicroDeposit
      ? `Halo Kak! Untuk memastikan kurir lancar mengantar ke alamat Kakak, pesanan COD ini memerlukan komitmen ongkir sebesar Rp ${microDepositAmount.toLocaleString("id-ID")} via Dynamic QRIS. Sisa tagihan barang dibayar ke kurir saat paket sampai. Mau kami buatkan link QRIS-nya sekarang?`
      : null,
  };
}

/**
 * Generate AWB Shipping Booking
 */
export async function bookCourierPickup({ orderId, courierCode = "jnt", isCod = false, codAmount = 0 }) {
  const awbNumber = `${courierCode.toUpperCase()}${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;

  const shipment = {
    id: (memoryStore.shipping_shipments?.length || 0) + 1,
    order_id: orderId,
    courier_code: courierCode,
    service_name: "REG",
    awb_number: awbNumber,
    shipping_fee_customer: 18000,
    shipping_fee_real: 15500,
    cashback_amount: 2500,
    is_cod: isCod ? 1 : 0,
    cod_amount: isCod ? Number(codAmount) : 0,
    cod_status: isCod ? "pending_courier" : "none",
    shipping_status: "pickup_requested",
    label_pdf_url: `https://storage.klozer.id/labels/awb-${awbNumber}.pdf`,
    created_at: new Date().toISOString(),
  };

  if (!memoryStore.shipping_shipments) memoryStore.shipping_shipments = [];
  memoryStore.shipping_shipments.push(shipment);

  return {
    success: true,
    awbNumber,
    courier: courierCode.toUpperCase(),
    labelPdfUrl: shipment.label_pdf_url,
    status: "pickup_requested",
  };
}
