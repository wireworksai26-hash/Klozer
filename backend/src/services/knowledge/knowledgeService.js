import { query, queryOne, transaction } from "../../config/db.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { MAX_CHUNKS_PER_DOCUMENT, splitIntoChunks } from "./chunker.js";
import { MAX_TEXT_CHARS, extractDocumentText } from "./textExtractor.js";
import { toFulltextQuery } from "./queryTerms.js";

/** Per-tenant ceilings. Generous for a small shop, small enough that one tenant cannot fill the database. */
export const KNOWLEDGE_LIMITS = Object.freeze({ maxDocuments: 50, maxTotalChars: 1_500_000 });

const INSERT_BATCH = 200;
const num = (v) => Number(v ?? 0);

function documentFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    sourceType: row.source_type,
    fileName: row.file_name,
    mimeType: row.mime_type,
    byteSize: num(row.byte_size),
    charCount: num(row.char_count),
    chunkCount: num(row.chunk_count),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Throws when adding `addChars` characters (or one more document) would pass the tenant's ceilings. */
async function assertCapacity(tx, institutionId, { addChars, addDocument, excludeDocumentId = null }) {
  const usage = await tx.queryOne(
    "SELECT COUNT(*) AS documents, COALESCE(SUM(char_count), 0) AS chars FROM knowledge_documents WHERE institution_id = ? AND id <> ?",
    [institutionId, excludeDocumentId ?? 0]
  );
  if (addDocument && num(usage.documents) >= KNOWLEDGE_LIMITS.maxDocuments) {
    throw conflict(`Batas ${KNOWLEDGE_LIMITS.maxDocuments} dokumen tercapai. Hapus dokumen lama atau gabungkan beberapa dokumen.`, { code: "KNOWLEDGE_DOCUMENT_LIMIT" });
  }
  if (num(usage.chars) + addChars > KNOWLEDGE_LIMITS.maxTotalChars) {
    throw conflict("Total isi basis pengetahuan melebihi batas. Hapus dokumen yang tidak dipakai.", { code: "KNOWLEDGE_SIZE_LIMIT" });
  }
}

async function writeChunks(tx, { documentId, institutionId, chunks }) {
  await tx.query("DELETE FROM knowledge_chunks WHERE document_id = ?", [documentId]);
  for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
    const rows = chunks.slice(i, i + INSERT_BATCH).map((content, offset) => [documentId, institutionId, i + offset, content]);
    await tx.query("INSERT INTO knowledge_chunks (document_id, institution_id, position, content) VALUES ?", [rows]);
  }
}

function chunksOrThrow(text) {
  const chunks = splitIntoChunks(text);
  if (chunks.length === 0) throw badRequest("Dokumen kosong.", { code: "EMPTY_DOCUMENT" });
  if (chunks.length > MAX_CHUNKS_PER_DOCUMENT) {
    throw badRequest("Dokumen terlalu panjang. Pecah menjadi beberapa dokumen yang lebih pendek.", { code: "DOCUMENT_TOO_LONG" });
  }
  return chunks;
}

// ---------------------------------------------------------------- reading
export async function listDocuments(institutionId) {
  const rows = await query(
    `SELECT id, title, source_type, file_name, mime_type, byte_size, char_count, chunk_count, is_active, created_at, updated_at
       FROM knowledge_documents WHERE institution_id = ? ORDER BY id DESC`,
    [institutionId]
  );
  const usage = rows.reduce((acc, r) => ({ documents: acc.documents + 1, chars: acc.chars + num(r.char_count) }), { documents: 0, chars: 0 });
  return { items: rows.map(documentFromRow), usage: { ...usage, ...KNOWLEDGE_LIMITS } };
}

export async function getDocument(institutionId, id) {
  const row = await queryOne("SELECT * FROM knowledge_documents WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!row) throw notFound("Dokumen tidak ditemukan.");
  return { ...documentFromRow(row), text: row.source_text };
}

// ---------------------------------------------------------------- writing
/**
 * Add a document from text the owner typed or pasted.
 * @returns {Promise<object>} the stored document (without its text)
 */
export async function createTextDocument({ institutionId, userId, title, text }) {
  const clean = String(text ?? "").trim();
  if (clean.length > MAX_TEXT_CHARS) throw badRequest(`Isi terlalu panjang (maksimal ${MAX_TEXT_CHARS.toLocaleString("id-ID")} karakter).`, { code: "TEXT_TOO_LONG" });
  return insertDocument({ institutionId, userId, title, text: clean, sourceType: "text", fileName: null, mimeType: "text/plain", byteSize: Buffer.byteLength(clean) });
}

/** Add a document from an uploaded PDF or text file. */
export async function createFileDocument({ institutionId, userId, title, fileName, buffer }) {
  const { text, mimeType } = await extractDocumentText({ buffer, fileName });
  const fallbackTitle = String(fileName || "Dokumen").replace(/\.[^.]+$/, "").slice(0, 200) || "Dokumen";
  return insertDocument({ institutionId, userId, title: title || fallbackTitle, text, sourceType: "file", fileName: fileName || null, mimeType, byteSize: buffer.length });
}

async function insertDocument({ institutionId, userId, title, text, sourceType, fileName, mimeType, byteSize }) {
  const chunks = chunksOrThrow(text);
  const id = await transaction(async (tx) => {
    await assertCapacity(tx, institutionId, { addChars: text.length, addDocument: true });
    const result = await tx.query(
      `INSERT INTO knowledge_documents (institution_id, title, source_type, file_name, mime_type, byte_size, source_text, char_count, chunk_count, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [institutionId, title, sourceType, fileName, mimeType, byteSize, text, text.length, chunks.length, userId ?? null]
    );
    await writeChunks(tx, { documentId: result.insertId, institutionId, chunks });
    return result.insertId;
  });
  return documentFromRow(await queryOne("SELECT * FROM knowledge_documents WHERE id = ?", [id]));
}

/** Rename, switch on/off, or replace the text (which re-splits the document). */
export async function updateDocument({ institutionId, id, title, text, isActive }) {
  const existing = await queryOne("SELECT id FROM knowledge_documents WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!existing) throw notFound("Dokumen tidak ditemukan.");

  await transaction(async (tx) => {
    const sets = [];
    const values = [];
    if (title !== undefined) {
      sets.push("title = ?");
      values.push(title);
    }
    if (isActive !== undefined) {
      sets.push("is_active = ?");
      values.push(isActive ? 1 : 0);
    }
    if (text !== undefined) {
      const clean = String(text).trim();
      if (clean.length > MAX_TEXT_CHARS) throw badRequest(`Isi terlalu panjang (maksimal ${MAX_TEXT_CHARS.toLocaleString("id-ID")} karakter).`, { code: "TEXT_TOO_LONG" });
      const chunks = chunksOrThrow(clean);
      await assertCapacity(tx, institutionId, { addChars: clean.length, addDocument: false, excludeDocumentId: id });
      sets.push("source_text = ?", "char_count = ?", "chunk_count = ?", "byte_size = ?");
      values.push(clean, clean.length, chunks.length, Buffer.byteLength(clean));
      await writeChunks(tx, { documentId: id, institutionId, chunks });
    }
    if (sets.length) await tx.query(`UPDATE knowledge_documents SET ${sets.join(", ")} WHERE id = ? AND institution_id = ?`, [...values, id, institutionId]);
  });
  return getDocument(institutionId, id);
}

export async function deleteDocument(institutionId, id) {
  const result = await query("DELETE FROM knowledge_documents WHERE id = ? AND institution_id = ?", [id, institutionId]);
  if (!result.affectedRows) throw notFound("Dokumen tidak ditemukan.");
}

// ---------------------------------------------------------------- retrieval
/**
 * Passages of this tenant's active documents that best match `text`, best first.
 * MySQL FULLTEXT does the ranking; the interface (text in, scored passages out) is what the rest of the
 * code depends on, so a vector index can replace it later without touching callers.
 */
export async function searchPassages({ institutionId, text, limit = 4, documentIds = null }) {
  const terms = toFulltextQuery(text);
  if (!terms) return [];
  const scoped = Array.isArray(documentIds) && documentIds.length > 0; // an agent limited to some documents
  const rows = await query(
    `SELECT c.id, c.document_id, d.title, c.content, MATCH(c.content) AGAINST(? IN NATURAL LANGUAGE MODE) AS score
       FROM knowledge_chunks c
       JOIN knowledge_documents d ON d.id = c.document_id
      WHERE c.institution_id = ? AND d.is_active = 1 AND MATCH(c.content) AGAINST(? IN NATURAL LANGUAGE MODE) ${scoped ? "AND c.document_id IN (?)" : ""}
      ORDER BY score DESC, c.id ASC
      LIMIT ?`,
    scoped ? [terms, institutionId, terms, documentIds, limit] : [terms, institutionId, terms, limit]
  );
  return rows.map((r) => ({ id: r.id, documentId: r.document_id, title: r.title, content: r.content, score: Number(r.score) }));
}

/** Passages for an AI reply plus the list of documents they came from (kept with the reply for review). */
export async function retrieveKnowledge({ institutionId, text, limit = 4, documentIds = null }) {
  const chunks = await searchPassages({ institutionId, text, limit, documentIds });
  const sources = [...new Map(chunks.map((c) => [c.documentId, { documentId: c.documentId, title: c.title }])).values()];
  return { chunks, sources };
}
