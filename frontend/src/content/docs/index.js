import { startGuides } from "./start.js";
import { aiGuides } from "./ai.js";
import { salesGuides } from "./sales.js";
import { planGuides } from "./plan.js";
import { settingsGuides } from "./settings.js";
import { adminGuides } from "./admin.js";
import { helpGuides } from "./help.js";
import { blockTexts } from "./blocks.js";

/**
 * The documentation: sections in reading order, each with its guides. Written in plain Indonesian for the people who use
 * the dashboard. A guide says who it is for (`for`: owner, spv, cs, superadmin), may point to the page it describes
 * (`open`), and is made of blocks (see blocks.js). The checks in test/docs.test.mjs keep the ids, links and wording honest.
 */
export const DOC_SECTIONS = [
  { id: "start", title: "Mulai di sini", guides: startGuides },
  { id: "ai", title: "Chat dan AI", guides: aiGuides },
  { id: "sales", title: "Penjualan dan pemasaran", guides: salesGuides },
  { id: "plan", title: "Paket dan token", guides: planGuides },
  { id: "settings", title: "Pengaturan dan integrasi", guides: settingsGuides },
  { id: "admin", title: "Untuk admin Klozer", guides: adminGuides },
  { id: "help", title: "Bantuan", guides: helpGuides },
];

export const ALL_GUIDES = DOC_SECTIONS.flatMap((section) => section.guides.map((guide) => ({ ...guide, sectionId: section.id })));

export const guideById = (id) => ALL_GUIDES.find((guide) => guide.id === id) ?? null;

/** The guides a role should read, in order. `everything` shows every guide regardless of role. */
export function guidesForRole(role, { everything = false } = {}) {
  return ALL_GUIDES.filter((guide) => everything || guide.for.includes(role));
}

/** All the words of a guide in one lower-case string, for searching. */
export function searchText(guide) {
  return [guide.title, guide.summary, guide.keywords ?? "", ...guide.blocks.flatMap(blockTexts)].join(" ").toLowerCase();
}
