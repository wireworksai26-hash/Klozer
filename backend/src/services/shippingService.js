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
 * Calculate Anti-RTS COD Risk Score
 * @param {Object} params { phone, address, pastReturnRate }
 * @returns {Object} Score details
 */
export function calculateCodRiskScore({ phone = "", address = "", pastReturnRate = 0 }) {
  let score = 100;

  // Address completeness check
  if (!address || address.length < 20) score -= 30;
  if (!address.includes("RT") && !address.includes("No") && !address.includes("Jalan") && !address.includes("Jl")) score -= 15;
  
  // Past return rate penalty
  if (pastReturnRate > 20) score -= 40;
  else if (pastReturnRate > 10) score -= 20;

  score = Math.max(10, Math.min(100, score));

  return {
    score,
    riskLevel: score >= 75 ? "LOW_RISK" : score >= 50 ? "MEDIUM_RISK" : "HIGH_RISK_RTS",
    recommendation: score >= 75 ? "APPROVE_COD" : score >= 50 ? "REQUIRE_PHONE_OTP" : "SUGGEST_NON_COD_QRIS",
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
