-- Per-tenant AI persona (bot name, tone, greeting, FAQ hints) used when building the CS prompt.
ALTER TABLE `institutions`
  ADD COLUMN `ai_persona_json` JSON NULL AFTER `encrypted_meta_capi_token`;
