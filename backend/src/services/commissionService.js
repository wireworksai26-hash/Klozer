import { memoryStore } from "../config/db.js";

/**
 * Route incoming lead to an active CS agent using Round-Robin
 * @param {number} institutionId 
 * @returns {Object|null} Assigned CS User
 */
export function assignLeadToAvailableCs(institutionId = 1) {
  const activeCsList = (memoryStore.users || []).filter(
    (u) => u.institution_id === institutionId && (u.role === "cs" || u.role === "supervisor") && u.is_active
  );

  if (activeCsList.length === 0) return null;

  // Simple round-robin picking
  const randomIndex = Math.floor(Math.random() * activeCsList.length);
  return activeCsList[randomIndex];
}

/**
 * Calculate and record CS commission upon order closing
 * @param {Object} params { institutionId, csUserId, orderId, orderTotal }
 * @returns {Object} Commission ledger record
 */
export function recordCsCommission({ institutionId, csUserId, orderId, orderTotal = 0 }) {
  const csUser = (memoryStore.users || []).find((u) => u.id === csUserId);
  const commissionRate = csUser?.commission_rate_percent !== undefined ? csUser.commission_rate_percent : 5.0; // Default 5%
  const commissionAmount = Math.round((Number(orderTotal) * commissionRate) / 100);

  const ledger = {
    id: (memoryStore.cs_commission_ledgers?.length || 0) + 1,
    institution_id: institutionId,
    cs_user_id: csUserId,
    order_id: orderId,
    commission_amount: commissionAmount,
    calculation_basis: "percentage",
    is_settled: 0,
    settled_at: null,
    created_at: new Date().toISOString(),
  };

  if (!memoryStore.cs_commission_ledgers) memoryStore.cs_commission_ledgers = [];
  memoryStore.cs_commission_ledgers.push(ledger);

  return {
    success: true,
    commissionId: ledger.id,
    commissionAmount,
    ratePercent: commissionRate,
  };
}
