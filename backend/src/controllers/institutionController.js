import { memoryStore } from "../config/db.js";
import { paginate } from "../utils/helpers.js";
import { hashPassword, generateRandomPassword } from "../utils/crypto.js";

/**
 * Get Paginated Institutions List
 * GET /api/v1/institutions
 */
export async function getAllInstitutions(req, res, next) {
  try {
    const { page = 1, limit = 10, search = "", mode = "" } = req.query;
    let list = memoryStore.institutions || [];

    if (search) {
      const s = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(s) || (i.sector && i.sector.toLowerCase().includes(s)));
    }

    if (mode) {
      list = list.filter((i) => i.mode === mode);
    }

    const result = paginate(list, page, limit);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * Create Institution & Auto-Generate Owner Account Credentials Bundle
 * POST /api/v1/institutions
 */
export async function createInstitution(req, res, next) {
  try {
    const { name, mode = "business", sector, email, phone_number, address, features = {} } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Nama instansi dan email pemilik wajib diisi." });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newInst = {
      id: (memoryStore.institutions?.length || 0) + 1,
      name,
      slug,
      mode,
      sector: sector || (mode === "ngo" ? "Lembaga Sosial & Donasi" : "Fashion & Retail"),
      phone_number: phone_number || "+62 812-3344-5566",
      email,
      address: address || "Surakarta, Jawa Tengah",
      subscription_tier: "pro",
      blast_credit_quota: 10000,
      ai_token_quota: 2000000,
      features_json: {
        aiPersona: true,
        aiAutoLabel: true,
        printInvoice: true,
        baileys: true,
        instagram: true,
        csBlast: true,
        publicBooking: true,
        stockManagement: true,
        picFeature: true,
        qrisPayment: true,
        voiceNoteAi: true,
        fraudOcr: true,
        metaCapi: true,
        ...features,
      },
      is_active: 1,
      created_at: new Date().toISOString(),
    };

    if (!memoryStore.institutions) memoryStore.institutions = [];
    memoryStore.institutions.push(newInst);

    // Auto-generate Owner Account Credentials
    const generatedPassword = generateRandomPassword(10);
    const passwordHash = await hashPassword(generatedPassword);

    const ownerUser = {
      id: (memoryStore.users?.length || 0) + 1,
      institution_id: newInst.id,
      name: `Owner ${name}`,
      email: email,
      password_hash: passwordHash,
      role: "owner",
      phone_number: phone_number,
      commission_rate_percent: 0,
      is_active: 1,
      created_at: new Date().toISOString(),
    };
    if (!memoryStore.users) memoryStore.users = [];
    memoryStore.users.push(ownerUser);

    res.status(201).json({
      success: true,
      message: "Instansi berhasil dibuat dan akun Owner telah di-generate otomatis!",
      data: newInst,
      credentialsBundle: {
        institutionName: newInst.name,
        loginUrl: "http://localhost:3000/login",
        email: ownerUser.email,
        temporaryPassword: generatedPassword,
        role: "Owner / Supervisor",
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Institution Profile & 14 Feature Toggles
 * PUT /api/v1/institutions/:id
 */
export async function updateInstitution(req, res, next) {
  try {
    const instId = parseInt(req.params.id, 10);
    const inst = (memoryStore.institutions || []).find((i) => i.id === instId);
    if (!inst) {
      return res.status(404).json({ success: false, message: "Instansi tidak ditemukan." });
    }

    const { name, mode, sector, phone_number, email, address, is_active, features } = req.body;
    if (name) inst.name = name;
    if (mode) inst.mode = mode;
    if (sector) inst.sector = sector;
    if (phone_number) inst.phone_number = phone_number;
    if (email) inst.email = email;
    if (address) inst.address = address;
    if (is_active !== undefined) inst.is_active = is_active;
    if (features) inst.features_json = { ...inst.features_json, ...features };
    inst.updated_at = new Date().toISOString();

    res.json({ success: true, message: "Instansi berhasil diperbarui.", data: inst });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete Institution
 * DELETE /api/v1/institutions/:id
 */
export async function deleteInstitution(req, res, next) {
  try {
    const instId = parseInt(req.params.id, 10);
    memoryStore.institutions = (memoryStore.institutions || []).filter((i) => i.id !== instId);
    res.json({ success: true, message: "Instansi berhasil dihapus." });
  } catch (err) {
    next(err);
  }
}
