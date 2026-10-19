import { audit } from "../services/auditService.js";
import {
  createFileDocument,
  createTextDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  searchPassages,
  updateDocument,
} from "../services/knowledge/knowledgeService.js";

const stripDataUrl = (value) => String(value).replace(/^data:[^;]+;base64,/, "");

/** GET /knowledge: documents and how much of the tenant's allowance they use. */
export async function list(req, res) {
  res.json({ success: true, ...(await listDocuments(req.tenantId)) });
}

/** POST /knowledge/text: a document the owner typed or pasted (an SOP, a policy, FAQs). */
export async function createText(req, res) {
  const document = await createTextDocument({ institutionId: req.tenantId, userId: req.user.id, title: req.body.title, text: req.body.content });
  await audit(req, "knowledge.create", { entityType: "knowledge_document", entityId: document.id, metadata: { source: "text", chars: document.charCount } });
  res.status(201).json({ success: true, message: "Dokumen ditambahkan. AI langsung bisa memakainya.", data: document });
}

/** POST /knowledge/file: a PDF (with a text layer) or a TXT/MD file, sent as base64. */
export async function createFile(req, res) {
  const buffer = Buffer.from(stripDataUrl(req.body.contentBase64), "base64");
  const document = await createFileDocument({ institutionId: req.tenantId, userId: req.user.id, title: req.body.title, fileName: req.body.fileName, buffer });
  await audit(req, "knowledge.create", { entityType: "knowledge_document", entityId: document.id, metadata: { source: "file", mime: document.mimeType, bytes: document.byteSize } });
  res.status(201).json({ success: true, message: "Berkas dibaca dan ditambahkan. AI langsung bisa memakainya.", data: document });
}

/** GET /knowledge/:id: the document with its full text, for editing. */
export async function get(req, res) {
  res.json({ success: true, data: await getDocument(req.tenantId, req.params.id) });
}

/** PUT /knowledge/:id */
export async function update(req, res) {
  const { title, content, isActive } = req.body;
  const data = await updateDocument({ institutionId: req.tenantId, id: req.params.id, title, text: content, isActive });
  await audit(req, "knowledge.update", { entityType: "knowledge_document", entityId: req.params.id, metadata: Object.keys(req.body) });
  res.json({ success: true, message: "Dokumen diperbarui.", data });
}

/** DELETE /knowledge/:id */
export async function remove(req, res) {
  await deleteDocument(req.tenantId, req.params.id);
  await audit(req, "knowledge.delete", { entityType: "knowledge_document", entityId: req.params.id });
  res.json({ success: true, message: "Dokumen dihapus." });
}

/** POST /knowledge/search: shows which passages the AI would find for a customer question (for testing). */
export async function search(req, res) {
  const items = await searchPassages({ institutionId: req.tenantId, text: req.body.query, limit: 5 });
  res.json({ success: true, items });
}
