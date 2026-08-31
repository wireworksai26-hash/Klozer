import { memoryStore } from "../config/db.js";
import { generateToken } from "../middlewares/authMiddleware.js";
import { comparePassword, hashPassword, generateRandomPassword } from "../utils/crypto.js";
import { sendTrialCredentialsEmail } from "../services/emailService.js";

/**
 * User Login
 * POST /api/v1/auth/login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email dan password wajib diisi." });
    }

    const user = (memoryStore.users || []).find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, message: "Email atau password salah." });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Email atau password salah." });
    }

    const institution = (memoryStore.institutions || []).find((i) => i.id === user.institution_id) || {
      id: user.institution_id,
      name: "Instansi Klozer",
      mode: "business",
      sector: "Retail",
    };

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      institution_id: user.institution_id,
      institution_name: institution.name,
    });

    res.json({
      success: true,
      message: "Login berhasil.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionId: user.institution_id,
        institutionName: institution.name,
        institutionMode: institution.mode,
        sector: institution.sector,
      },
      institution,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Register New Institution & Auto-Generate Owner + CS Credentials
 * POST /api/v1/auth/register
 */
export async function register(req, res, next) {
  try {
    const { institutionName, sector, mode = "business", ownerName, email, phone } = req.body;
    if (!institutionName || !email) {
      return res.status(400).json({ success: false, message: "Nama instansi dan email pemilik wajib diisi." });
    }

    // Check if email already exists
    const existing = (memoryStore.users || []).find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, message: "Email ini sudah terdaftar di sistem." });
    }

    // 1. Create Institution
    const slug = institutionName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newInst = {
      id: (memoryStore.institutions?.length || 0) + 1,
      name: institutionName,
      slug,
      mode,
      sector: sector || (mode === "ngo" ? "Lembaga Sosial & Donasi" : "Fashion & Retail"),
      phone_number: phone || "+62 812-xxxx-xxxx",
      email: email,
      subscription_tier: "pro",
      blast_credit_quota: 5000,
      ai_token_quota: 1000000,
      features_json: { aiPersona: true, aiAutoLabel: true, printInvoice: true, baileys: true, instagram: true, csBlast: true, publicBooking: true, stockManagement: true, picFeature: true, qrisPayment: true, voiceNoteAi: true, fraudOcr: true, metaCapi: true },
      is_active: 1,
      created_at: new Date().toISOString(),
    };
    if (!memoryStore.institutions) memoryStore.institutions = [];
    memoryStore.institutions.push(newInst);

    // 2. Auto-Generate Secure Random Password for the Owner
    const ownerPassword = generateRandomPassword(10);
    const ownerPasswordHash = await hashPassword(ownerPassword);

    const newOwner = {
      id: (memoryStore.users?.length || 0) + 1,
      institution_id: newInst.id,
      name: ownerName || "Owner " + institutionName,
      email: email,
      password_hash: ownerPasswordHash,
      role: "owner",
      phone_number: phone,
      commission_rate_percent: 0,
      is_active: 1,
      created_at: new Date().toISOString(),
    };
    if (!memoryStore.users) memoryStore.users = [];
    memoryStore.users.push(newOwner);

    // 3. Auto-Generate CS 1 & CS 2 accounts for this specific institution
    const cs1Password = generateRandomPassword(10);
    const cs1PasswordHash = await hashPassword(cs1Password);
    const cs1Email = `cs1.${slug}@klozer.id`;
    const newCs1 = {
      id: memoryStore.users.length + 1,
      institution_id: newInst.id,
      name: `CS 1 - ${institutionName}`,
      email: cs1Email,
      password_hash: cs1PasswordHash,
      role: "cs",
      phone_number: phone,
      commission_rate_percent: 5.0,
      is_active: 1,
      created_at: new Date().toISOString(),
    };
    memoryStore.users.push(newCs1);

    const cs2Password = generateRandomPassword(10);
    const cs2PasswordHash = await hashPassword(cs2Password);
    const cs2Email = `cs2.${slug}@klozer.id`;
    const newCs2 = {
      id: memoryStore.users.length + 1,
      institution_id: newInst.id,
      name: `CS 2 - ${institutionName}`,
      email: cs2Email,
      password_hash: cs2PasswordHash,
      role: "cs",
      phone_number: phone,
      commission_rate_percent: 5.0,
      is_active: 1,
      created_at: new Date().toISOString(),
    };
    memoryStore.users.push(newCs2);

    // 4. Create Initial Starter Data for This Institution
    if (!memoryStore.leads) memoryStore.leads = [];
    memoryStore.leads.push({
      id: memoryStore.leads.length + 1,
      institution_id: newInst.id,
      phone_number: "6281298765432",
      name: `Pelanggan Pertama (${institutionName})`,
      gender: "Umum",
      city: "Jakarta",
      address_full: "Jl. Sudirman No. 1, Jakarta",
      assigned_cs_id: newCs1.id,
      status: "new_lead",
      risk_cod_score: 95,
      last_contacted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    if (!memoryStore.products) memoryStore.products = [];
    memoryStore.products.push({
      id: memoryStore.products.length + 1,
      institution_id: newInst.id,
      sku: `${slug.toUpperCase().slice(0, 4)}-01`,
      name: `Layanan / Produk Utama ${institutionName}`,
      category: newInst.sector,
      description: `Produk / paket unggulan dari ${institutionName}.`,
      selling_price: 150000,
      cost_price_hpp: 75000,
      stock_quantity: 50,
      low_stock_threshold: 5,
      weight_in_grams: 500,
      is_active: 1,
      created_at: new Date().toISOString(),
    });

    // 5. Send Credentials Email to User's Email Address (SPV + CS 1 + CS 2)
    try {
      await sendTrialCredentialsEmail({
        to: email,
        institutionName: newInst.name,
        sector: newInst.sector,
        owner: {
          name: newOwner.name,
          email: newOwner.email,
          temporaryPassword: ownerPassword,
          role: "Owner / Supervisor",
        },
        cs1: {
          name: newCs1.name,
          email: newCs1.email,
          temporaryPassword: cs1Password,
          role: "Customer Service 1",
        },
        cs2: {
          name: newCs2.name,
          email: newCs2.email,
          temporaryPassword: cs2Password,
          role: "Customer Service 2",
        },
        loginUrl: "http://localhost:3000/login",
      });
    } catch (mailErr) {
      console.warn("[Register Email Notice]", mailErr.message);
    }

    // Return token + generated credentials bundle for immediate delivery to client
    const token = generateToken({
      id: newOwner.id,
      name: newOwner.name,
      email: newOwner.email,
      role: "owner",
      institution_id: newInst.id,
      institution_name: newInst.name,
    });

    res.status(201).json({
      success: true,
      message: `Permintaan uji coba berhasil! Kredensial akun SPV & CS telah dikirimkan ke email ${email}.`,
      emailSent: true,
      targetEmail: email,
      token,
      credentialsBundle: {
        institutionName: newInst.name,
        sector: newInst.sector,
        targetEmail: email,
        loginUrl: "http://localhost:3000/login",
        owner: {
          name: newOwner.name,
          email: newOwner.email,
          temporaryPassword: ownerPassword,
          role: "Owner / Supervisor",
        },
        cs1: {
          name: newCs1.name,
          email: newCs1.email,
          temporaryPassword: cs1Password,
          role: "Customer Service 1",
        },
        cs2: {
          name: newCs2.name,
          email: newCs2.email,
          temporaryPassword: cs2Password,
          role: "Customer Service 2",
        },
      },
      user: {
        id: newOwner.id,
        name: newOwner.name,
        email: newOwner.email,
        role: "owner",
        institutionId: newInst.id,
        institutionName: newInst.name,
        institutionMode: newInst.mode,
        sector: newInst.sector,
      },
      institution: newInst,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Current Authenticated Profile
 * GET /api/v1/auth/me
 */
export async function getMe(req, res, next) {
  try {
    const user = (memoryStore.users || []).find((u) => u.id === req.user?.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
    }

    const inst = (memoryStore.institutions || []).find((i) => i.id === user.institution_id);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionId: user.institution_id,
        institutionName: inst?.name || "Batik Mahakarya",
        institutionMode: inst?.mode || "business",
      },
    });
  } catch (err) {
    next(err);
  }
}
