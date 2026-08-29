import { memoryStore } from "../config/db.js";

/**
 * Schedule Proactive Follow-up Job
 * @param {Object} params { leadId, institutionId, triggerReason, delayHours }
 * @returns {Promise<Object>} Job details
 */
export async function scheduleFollowupJob({ leadId, institutionId = 1, triggerReason = "abandoned_qris", delayHours = 2 }) {
  const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

  const job = {
    id: (memoryStore.proactive_followup_jobs?.length || 0) + 1,
    institution_id: institutionId,
    lead_id: leadId,
    step_number: 1,
    trigger_reason: triggerReason,
    scheduled_at: scheduledAt,
    executed_at: null,
    status: "pending",
  };

  if (!memoryStore.proactive_followup_jobs) memoryStore.proactive_followup_jobs = [];
  memoryStore.proactive_followup_jobs.push(job);

  return {
    success: true,
    jobId: job.id,
    scheduledAt,
    triggerReason,
  };
}

/**
 * Cancel Pending Follow-up when customer pays or replies
 */
export async function cancelFollowupJob(leadId, reason = "cancelled_by_payment") {
  const jobs = (memoryStore.proactive_followup_jobs || []).filter(
    (j) => j.lead_id === leadId && j.status === "pending"
  );

  jobs.forEach((j) => {
    j.status = reason;
  });

  return {
    success: true,
    cancelledCount: jobs.length,
  };
}
