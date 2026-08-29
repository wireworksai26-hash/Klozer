import { memoryStore } from "../config/db.js";
import { paginate, normalizePhone } from "../utils/helpers.js";

/**
 * Get Paginated Leads List
 * GET /api/v1/leads
 */
export async function getLeads(req, res, next) {
  try {
    const institutionId = Number(req.tenantId || req.user?.institution_id || req.user?.institutionId || 1);
    const { page = 1, limit = 10, search = "", status = "", cs_id = "" } = req.query;

    let list = (memoryStore.leads || []).filter((l) => Number(l.institution_id) === institutionId);

    if (search) {
      const s = search.toLowerCase();
      list = list.filter((l) => (l.name && l.name.toLowerCase().includes(s)) || l.phone_number.includes(s));
    }

    if (status) {
      list = list.filter((l) => l.status === status);
    }

    if (cs_id) {
      list = list.filter((l) => Number(l.assigned_cs_id) === parseInt(cs_id, 10));
    }

    const result = paginate(list, page, limit);
    res.json({ success: true, ...result, data: result.items, leads: result.items });
  } catch (err) {
    next(err);
  }
}

/**
 * Create Lead
 * POST /api/v1/leads
 */
export async function createLead(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const { name, phone_number, gender, address_full, city, assigned_cs_id, status = "new" } = req.body;

    if (!phone_number) {
      return res.status(400).json({ success: false, message: "Nomor telepon/WhatsApp wajib diisi." });
    }

    const normalizedPhone = normalizePhone(phone_number);

    // Check duplicate
    let lead = (memoryStore.leads || []).find((l) => l.institution_id === institutionId && l.phone_number === normalizedPhone);
    if (lead) {
      return res.status(200).json({ success: true, message: "Kontak sudah ada.", data: lead });
    }

    lead = {
      id: (memoryStore.leads?.length || 0) + 1,
      institution_id: institutionId,
      name: name || "Pelanggan Baru",
      phone_number: normalizedPhone,
      gender: gender || null,
      address_full: address_full || "",
      city: city || "",
      assigned_cs_id: assigned_cs_id || null,
      status,
      risk_cod_score: 95,
      last_contacted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!memoryStore.leads) memoryStore.leads = [];
    memoryStore.leads.push(lead);

    res.status(201).json({ success: true, message: "Kontak berhasil ditambahkan.", data: lead });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Lead
 * PUT /api/v1/leads/:id
 */
export async function updateLead(req, res, next) {
  try {
    const institutionId = req.tenantId || 1;
    const leadId = parseInt(req.params.id, 10);
    const lead = (memoryStore.leads || []).find((l) => l.id === leadId && l.institution_id === institutionId);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Kontak tidak ditemukan." });
    }

    Object.assign(lead, req.body, { updated_at: new Date().toISOString() });
    res.json({ success: true, message: "Kontak berhasil diperbarui.", data: lead });
  } catch (err) {
    next(err);
  }
}
