import { query } from "../config/db.js";

/**
 * GET /reports/summary — all figures are aggregated from the database for the
 * caller's tenant. Metrics that need data we do not collect (ad spend, response
 * time) are returned as null rather than invented.
 */
export async function getSummaryReport(req, res) {
  const tenantId = req.tenantId;

  const [totals] = await query(
    `SELECT COUNT(*) AS totalOrders,
            COALESCE(SUM(status IN ('paid','processing','shipped','delivered','completed')), 0) AS paidOrders,
            COALESCE(SUM(CASE WHEN status IN ('paid','processing','shipped','delivered','completed') THEN total_amount END), 0) AS totalRevenue,
            COALESCE(SUM(CASE WHEN status IN ('paid','processing','shipped','delivered','completed') THEN gross_profit END), 0) AS totalGrossProfit
       FROM orders WHERE institution_id = ? AND status <> 'cancelled'`,
    [tenantId]
  );

  const PAID = "('paid','processing','shipped','delivered','completed')";
  const csPerformance = await query(
    `SELECT u.id, u.name, u.role,
            (SELECT COUNT(DISTINCT c.lead_id) FROM chat_messages c
               WHERE c.sender_user_id = u.id AND c.institution_id = u.institution_id) AS handledChats,
            (SELECT COUNT(*) FROM orders o
               WHERE o.cs_user_id = u.id AND o.institution_id = u.institution_id AND o.status IN ${PAID}) AS closedOrders,
            (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o
               WHERE o.cs_user_id = u.id AND o.institution_id = u.institution_id AND o.status IN ${PAID}) AS revenueGenerated,
            (SELECT COALESCE(SUM(l.commission_amount), 0) FROM cs_commission_ledgers l
               WHERE l.cs_user_id = u.id) AS commissionEarned
       FROM users u
      WHERE u.institution_id = ? AND u.role IN ('cs', 'supervisor') AND u.is_active = 1
      ORDER BY revenueGenerated DESC`,
    [tenantId]
  );

  const totalOrders = Number(totals.totalOrders);
  const paidOrders = Number(totals.paidOrders);

  res.json({
    success: true,
    data: {
      totalRevenue: Number(totals.totalRevenue),
      totalOrders,
      paidOrders,
      closingRatePercent: totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100) : 0,
      totalGrossProfit: Number(totals.totalGrossProfit),
      metaAdRoas: null,
      csPerformance: csPerformance.map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        handledChats: Number(r.handledChats),
        closedOrders: Number(r.closedOrders),
        revenueGenerated: Number(r.revenueGenerated),
        commissionEarned: Number(r.commissionEarned),
        avgResponseTime: null,
      })),
    },
  });
}

/** GET /reports/my-performance: the caller's own closing and commission figures (any sales role). */
export async function getMyPerformance(req, res) {
  const PAID = "('paid','processing','shipped','delivered','completed')";
  const [row] = await query(
    `SELECT
       (SELECT COUNT(*) FROM orders o WHERE o.cs_user_id = ? AND o.institution_id = ? AND o.status IN ${PAID}) AS closedOrders,
       (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.cs_user_id = ? AND o.institution_id = ? AND o.status IN ${PAID}) AS revenueGenerated,
       (SELECT COALESCE(SUM(l.commission_amount), 0) FROM cs_commission_ledgers l WHERE l.cs_user_id = ?) AS commissionEarned`,
    [req.user.id, req.tenantId, req.user.id, req.tenantId, req.user.id]
  );
  res.json({
    success: true,
    data: { closedOrders: Number(row.closedOrders), revenueGenerated: Number(row.revenueGenerated), commissionEarned: Number(row.commissionEarned) },
  });
}
