import { query, queryOne } from "../../config/db.js";
import { parseJsonColumn } from "../../utils/jsonColumn.js";
import { getFastPathSettings } from "./fastPathSettings.js";
import { loadCatalog } from "../commerce/catalog.js";
import { getCommerceSettings } from "../commerce/commerceSettings.js";
import { isGatewayConfigured } from "../ipaymuService.js";
import { MAX_WORDS, ambiguousText, catalogText, detectTopic, greetingText, infoText, matchProducts, paymentText, productText, thanksText } from "./fastPathModel.js";

/**
 * Answers repetitive questions from the shop's own data without the language model. The shop can switch the whole thing
 * or single topics off, and states its opening hours here (they are used for the "jam buka" question and given to the
 * assistant as well). Every fast answer is stored with `reply_path = "fast:<topic>"` so the saving can be counted.
 */

/**
 * @returns {Promise<{ replyText: string, path: string }|null>} null when the message is not a fast question, the shop
 * switched the topic off, or the shop's data cannot answer it (then the normal flow takes over)
 */
export async function tryFastPath({ institutionId, text }) {
  const settings = await getFastPathSettings(institutionId);
  if (!settings.enabled) return null;

  // the catalog is read only when the message could be about a product
  let hit = detectTopic(text, { topics: settings.topics });
  let catalog = null;
  if (!hit && /\S/.test(text) && String(text).split(/\s+/).length <= MAX_WORDS) {
    catalog = [...(await loadCatalog(institutionId)).values()];
    hit = detectTopic(text, { products: catalog, topics: settings.topics });
  }
  if (!hit) return null;

  const reply = async () => {
    switch (hit.topic) {
      case "greeting": {
        const inst = await queryOne("SELECT name, ai_persona_json FROM institutions WHERE id = ?", [institutionId]);
        const persona = parseJsonColumn(inst?.ai_persona_json);
        return greetingText({ botName: persona.botName, shopName: inst?.name, greeting: persona.greetingMessage });
      }
      case "thanks":
        return thanksText();
      case "payment": {
        const accounts = await query("SELECT bank_code AS bank, account_number AS accountNumber, account_holder AS holder FROM bank_accounts WHERE institution_id = ? AND is_active = 1", [institutionId]);
        const commerce = await getCommerceSettings(institutionId);
        const qris = Boolean(commerce.enabled && commerce.payQris && isGatewayConfigured());
        return accounts.length || qris ? paymentText({ accounts, qris }) : null;
      }
      case "catalog": {
        catalog ??= [...(await loadCatalog(institutionId)).values()];
        return catalog.length ? catalogText({ products: catalog, total: catalog.length }) : null;
      }
      case "product": {
        const candidates = hit.products ?? matchProducts(text, catalog ?? []);
        const full = candidates.map((c) => catalog?.find((p) => p.id === c.id) ?? c);
        if (!full.length) return null;
        return full.length === 1 ? productText({ product: full[0] }) : ambiguousText({ products: full });
      }
      case "info": {
        const inst = await queryOne("SELECT address FROM institutions WHERE id = ?", [institutionId]);
        return infoText({ kind: hit.info, address: inst?.address?.trim(), hours: settings.storeHours });
      }
      default:
        return null;
    }
  };

  const replyText = await reply();
  return replyText ? { replyText, path: `fast:${hit.topic}` } : null;
}

/** How many replies the fast path made against the order rules and the assistant, and a rough count of tokens that saved. */
export async function fastPathStats(institutionId, days = 30) {
  const rows = await query(
    `SELECT reply_path, COUNT(*) AS n FROM chat_messages
      WHERE institution_id = ? AND sender_type = 'ai_agent' AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY) GROUP BY reply_path`,
    [institutionId, days]
  );
  const byTopic = {};
  let fast = 0;
  let model = 0;
  let rules = 0;
  for (const r of rows) {
    if (r.reply_path?.startsWith("fast:")) {
      byTopic[r.reply_path.slice(5)] = Number(r.n);
      fast += Number(r.n);
    } else if (r.reply_path === "rules") rules += Number(r.n);
    else if (r.reply_path === null) model += Number(r.n);
  }
  const avg = await queryOne("SELECT AVG(tokens_used) AS t FROM chat_messages WHERE institution_id = ? AND sender_type = 'ai_agent' AND reply_path IS NULL AND tokens_used > 0 AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)", [institutionId, days]);
  const perReply = Math.round(Number(avg?.t) || 0);
  return { days, fast, rules, model, byTopic, averageTokensPerAiReply: perReply, estimatedTokensSaved: fast * perReply };
}
