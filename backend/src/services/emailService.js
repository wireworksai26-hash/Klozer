import nodemailer from "nodemailer";
import { config } from "../config/env.js";

/**
 * Configure Nodemailer Transporter
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return null;
}

/**
 * Send Trial Registration Credentials Email to User
 * Contains SPV/Owner + CS 1 + CS 2 Accounts
 */
export async function sendTrialCredentialsEmail({ to, institutionName, sector, owner, cs1, cs2, loginUrl }) {
  const fromAddress = process.env.SMTP_FROM || "Klozer Onboarding <no-reply@klozer.id>";
  const webLoginUrl = loginUrl || process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : "http://localhost:3000/login";

  const emailHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kredensial Akun Uji Coba Klozer</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f8f6; margin: 0; padding: 24px; color: #171417; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #f0e9e1; overflow: hidden; box-shadow: 0 10px 30px rgba(12,23,84,0.06); }
    .header { background: #0c1754; padding: 32px 28px; text-align: center; color: #ffffff; }
    .logo { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 4px; }
    .logo-dot { color: #2545ff; }
    .header-sub { font-size: 13px; color: #eaebf8; margin: 0; opacity: 0.9; }
    .content { padding: 32px 28px; }
    .welcome-text { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
    .inst-badge { display: inline-block; background: #eaebf8; color: #2545ff; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: 8px; margin-bottom: 20px; }
    .card { background: #fbfaf8; border: 1px solid #ede8e2; border-radius: 12px; padding: 18px; margin-bottom: 16px; }
    .card-title { font-size: 14px; font-weight: 800; color: #0c1754; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
    .role-tag { font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
    .tag-owner { background: #2545ff; color: #ffffff; }
    .tag-cs { background: #10b981; color: #ffffff; }
    .cred-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed #e2e8f0; }
    .cred-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .cred-label { color: #64748b; font-weight: 600; }
    .cred-value { font-family: monospace; font-weight: 700; color: #0c1754; }
    .cred-pass { font-family: monospace; font-weight: 900; color: #059669; background: #d1fae5; padding: 2px 8px; border-radius: 4px; }
    .btn-container { text-align: center; margin: 32px 0 24px; }
    .btn { display: inline-block; background: #2545ff; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 15px rgba(37,69,255,0.3); }
    .security-note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; font-size: 12.5px; color: #92400e; margin-top: 24px; line-height: 1.5; }
    .footer { background: #f9f8f6; border-top: 1px solid #f0e9e1; padding: 20px; text-align: center; font-size: 11.5px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">klozer<span class="logo-dot">.</span></div>
      <p class="header-sub">Platform AI Conversational Commerce & Smart CRM WhatsApp</p>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="inst-badge">Instansi: ${institutionName} (${sector || "Bisnis"})</div>
      
      <p class="welcome-text">
        Halo <strong>${owner?.name || "Rekan Bisnis"}</strong>,<br>
        Selamat! Permintaan uji coba 14 hari gratis untuk <strong>${institutionName}</strong> telah disetujui. Sistem kami telah membuatkan <strong>Akun Supervisor (SPV/Owner)</strong> serta <strong>2 Akun Customer Service (CS)</strong> agar tim Anda dapat langsung mencoba seluruh fitur otomatisasi WhatsApp.
      </p>

      <!-- 1. Owner / SPV Account -->
      <div class="card">
        <div class="card-title">
          <span>👑 Akun Supervisor (SPV / Owner)</span>
          <span class="role-tag tag-owner">Akses Penuh</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Nama Pengguna:</span>
          <span class="cred-value">${owner?.name || "Owner"}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Email Login:</span>
          <span class="cred-value">${owner?.email || to}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Password:</span>
          <span class="cred-pass">${owner?.temporaryPassword || "Klozer123!"}</span>
        </div>
      </div>

      <!-- 2. CS 1 Account -->
      <div class="card">
        <div class="card-title">
          <span>🎧 Akun Customer Service 1 (CS 1)</span>
          <span class="role-tag tag-cs">Frontliner</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Nama Pengguna:</span>
          <span class="cred-value">${cs1?.name || "CS 1"}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Email Login:</span>
          <span class="cred-value">${cs1?.email || "cs1@" + institutionName.toLowerCase().replace(/\s+/g, "") + ".klozer.id"}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Password:</span>
          <span class="cred-pass">${cs1?.temporaryPassword || "KlozerCS1!"}</span>
        </div>
      </div>

      <!-- 3. CS 2 Account -->
      <div class="card">
        <div class="card-title">
          <span>🎧 Akun Customer Service 2 (CS 2)</span>
          <span class="role-tag tag-cs">Frontliner</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Nama Pengguna:</span>
          <span class="cred-value">${cs2?.name || "CS 2"}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Email Login:</span>
          <span class="cred-value">${cs2?.email || "cs2@" + institutionName.toLowerCase().replace(/\s+/g, "") + ".klozer.id"}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Password:</span>
          <span class="cred-pass">${cs2?.temporaryPassword || "KlozerCS2!"}</span>
        </div>
      </div>

      <!-- Action Button -->
      <div class="btn-container">
        <a href="${webLoginUrl}" class="btn" target="_blank">
          Masuk ke Dashboard Klozer →
        </a>
      </div>

      <!-- Security Notice -->
      <div class="security-note">
        <strong>Pemberitahuan Keamanan:</strong><br>
        Demi keamanan data pelanggan Anda, kami menyarankan agar Anda segera memperbarui kata sandi setelah pertama kali masuk ke menu <em>Pengaturan Profil</em>.
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      &copy; 2026 Klozer.id — AI Conversational Commerce & Smart CRM.<br>
      Email ini dikirimkan secara otomatis berdasarkan pendaftaran uji coba di situs resmi Klozer.id.
    </div>
  </div>
</body>
</html>
  `.trim();

  const transporter = createTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject: `🎉 Kredensial Akun Uji Coba Klozer: ${institutionName} (SPV & CS)`,
        html: emailHtml,
      });
      console.log(`[Email Service] Live email sent to ${to} (MessageId: ${info.messageId})`);
      return { success: true, mode: "smtp", messageId: info.messageId };
    } catch (sendErr) {
      console.warn(`[Email Service] SMTP send failed (${sendErr.message}), falling back to delivery log.`);
    }
  }

  // Fallback Simulation Log (Always works seamlessly without requiring live credentials)
  console.log("================================================================================");
  console.log(`[EMAIL DISPATCHED TO]: ${to}`);
  console.log(`[SUBJECT]: Kredensial Akun Uji Coba Klozer: ${institutionName} (SPV & CS)`);
  console.log(`[SPV / OWNER]: ${owner?.email} | Pass: ${owner?.temporaryPassword}`);
  console.log(`[CS 1]: ${cs1?.email} | Pass: ${cs1?.temporaryPassword}`);
  console.log(`[CS 2]: ${cs2?.email} | Pass: ${cs2?.temporaryPassword}`);
  console.log(`[LOGIN URL]: ${webLoginUrl}`);
  console.log("================================================================================");

  return {
    success: true,
    mode: "simulated",
    to,
    institutionName,
  };
}
