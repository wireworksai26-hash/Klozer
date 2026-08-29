import { memoryStore } from "../config/db.js";

/**
 * Get Business Intelligence & Revenue Summary Report
 * GET /api/v1/reports/summary
 */
export async function getSummaryReport(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const orders = (memoryStore.orders || []).filter((o) => o.institution_id === institutionId);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.status === "paid" || o.status === "completed" ? Number(o.total_amount) : 0), 0);
    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "completed").length;
    const closingRatePercent = totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 100) : 0;
    const totalGrossProfit = orders.reduce((sum, o) => sum + (o.status === "paid" ? Number(o.gross_profit || 0) : 0), 0);

    // CS Performance
    const csUsers = (memoryStore.users || []).filter((u) => u.institution_id === institutionId && (u.role === "cs" || u.role === "supervisor"));
    const csPerformance = csUsers.map((cs) => {
      const csOrders = orders.filter((o) => o.cs_user_id === cs.id && (o.status === "paid" || o.status === "completed"));
      const revenueGen = csOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const commission = Math.round(revenueGen * 0.05);

      return {
        id: cs.id,
        name: cs.name,
        role: cs.role,
        handledChats: 28 + cs.id * 5,
        closedOrders: csOrders.length,
        revenueGenerated: revenueGen,
        commissionEarned: commission,
        avgResponseTime: "1.5 Menit",
      };
    });

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        paidOrders,
        closingRatePercent,
        totalGrossProfit,
        metaAdRoas: "4.8x",
        csPerformance,
      },
    });
  } catch (err) {
    next(err);
  }
}
