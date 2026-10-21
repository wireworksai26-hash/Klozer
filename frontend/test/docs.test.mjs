import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_GUIDES, DOC_SECTIONS, guidesForRole, searchText } from "../src/content/docs/index.js";
import { blockTexts } from "../src/content/docs/blocks.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROLES = ["owner", "spv", "cs", "superadmin"];
const BLOCKS = new Set(["h", "p", "steps", "list", "tip", "warn", "terms", "faq"]);
// an em dash, or a character from the emoji and pictograph ranges
const BANNED = /[—☀-➿\u{1F300}-\u{1FAFF}]/u;

const everyText = (guide) => [guide.title, guide.summary, ...guide.blocks.flatMap(blockTexts)];

test("every guide has a unique id, a title, a summary, real roles, and well formed blocks", () => {
  const seen = new Set();
  for (const guide of ALL_GUIDES) {
    assert.match(guide.id, /^[a-z0-9-]+$/, `id ${guide.id}`);
    assert.ok(!seen.has(guide.id), `duplicate id ${guide.id}`);
    seen.add(guide.id);
    assert.ok(guide.title.length >= 5 && guide.summary.length >= 20, `${guide.id} title and summary`);
    assert.ok(guide.for.length > 0 && guide.for.every((r) => ROLES.includes(r)), `${guide.id} roles`);
    assert.ok(guide.blocks.length >= 2, `${guide.id} has content`);
    for (const block of guide.blocks) {
      assert.ok(BLOCKS.has(block.type), `${guide.id}: block type ${block.type}`);
      for (const text of blockTexts(block)) assert.ok(typeof text === "string" && text.trim().length > 0, `${guide.id}: empty text`);
      if (block.type === "steps") assert.ok(block.items.length >= 2, `${guide.id}: a list of steps needs two or more`);
    }
  }
  assert.ok(DOC_SECTIONS.every((s) => s.guides.length > 0));
});

test("the pages the guides point to exist", () => {
  for (const guide of ALL_GUIDES.filter((g) => g.open)) {
    const dir = path.join(root, "src", "app", guide.open.split("?")[0].replace(/^\//, ""));
    assert.ok(fs.existsSync(path.join(dir, "page.js")), `${guide.id} opens ${guide.open}, which has no page`);
  }
});

test("the writing follows the house rules: no em dash, no emoji, no placeholder text", () => {
  for (const guide of ALL_GUIDES) {
    for (const text of everyText(guide)) {
      assert.ok(!BANNED.test(text), `${guide.id}: banned character in "${text.slice(0, 60)}"`);
      assert.ok(!/lorem|TODO|segera hadir|coming soon/i.test(text), `${guide.id}: placeholder wording in "${text.slice(0, 60)}"`);
    }
  }
});

test("bold menu names mentioned in the guides are menu names that exist", () => {
  const nav = fs.readFileSync(path.join(root, "src", "components", "dashboard", "DashboardNav.js"), "utf8");
  const settings = fs.readFileSync(path.join(root, "src", "app", "dashboard", "settings", "page.js"), "utf8");
  const known = nav + settings;
  // names that must appear exactly as the sidebar or a settings tab shows them
  const MENUS = ["Live Chat WhatsApp", "Jalur Cepat", "Basis Pengetahuan", "Evaluasi AI", "Saluran Chat", "Smart Broadcast", "Iklan dan ROAS", "Top Up Token AI", "Persona dan Script AI", "Hak Akses Tim", "Profil Usaha dan WhatsApp", "Test CS AI", "Pesanan di Chat", "Agen AI", "Tugas"];
  for (const name of MENUS) assert.ok(known.includes(`"${name}"`) || known.includes(name), `menu "${name}" is not in the sidebar or settings`);
  const mentioned = new Set();
  for (const guide of ALL_GUIDES) for (const text of everyText(guide)) for (const m of text.matchAll(/\*\*([^*]+)\*\*/g)) mentioned.add(m[1]);
  assert.ok(mentioned.size > 40, "the guides name the menus they talk about");
});

test("every role has guides to read, and the admin guides are for the admin only", () => {
  for (const role of ROLES) assert.ok(guidesForRole(role).length >= 5, `${role} has guides`);
  assert.ok(guidesForRole("cs").every((g) => !g.id.startsWith("admin-")));
  assert.ok(guidesForRole("owner").every((g) => !g.id.startsWith("admin-")));
  assert.ok(guidesForRole("superadmin").some((g) => g.id.startsWith("admin-")));
  assert.equal(guidesForRole("cs", { everything: true }).length, ALL_GUIDES.length);
});

test("search finds a guide by a word inside it, not only by its title", () => {
  const hit = ALL_GUIDES.filter((g) => searchText(g).includes("kode unik"));
  assert.ok(hit.some((g) => g.id === "paket-langganan"));
  assert.equal(ALL_GUIDES.filter((g) => searchText(g).includes("zzzzzz-tidak-ada")).length, 0);
});

test("every guide has the parts a reader needs: what it is for, and how to do it", () => {
  const needsHow = ["live-chat", "jalur-cepat", "persona-ai", "paket-langganan", "top-up-token", "admin-metode-pembayaran", "admin-voucher"];
  for (const id of needsHow) {
    const guide = ALL_GUIDES.find((g) => g.id === id);
    assert.ok(guide.blocks.some((b) => b.type === "steps"), `${id} has steps`);
    assert.ok(guide.blocks.some((b) => b.type === "h" && /fungsi|cara|membuat|memasang|membeli/i.test(b.text)), `${id} has headings`);
  }
});
