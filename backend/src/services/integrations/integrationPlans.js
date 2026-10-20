/** How many API keys and webhook endpoints each package may have. */
export const INTEGRATION_LIMITS = Object.freeze({
  starter: { apiKeys: 2, webhooks: 2 },
  pro: { apiKeys: 10, webhooks: 10 },
  enterprise: { apiKeys: 50, webhooks: 50 },
});

export const integrationLimitsFor = (tier) => INTEGRATION_LIMITS[String(tier || "").toLowerCase()] ?? INTEGRATION_LIMITS.starter;
