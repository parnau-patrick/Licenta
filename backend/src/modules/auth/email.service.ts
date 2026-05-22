import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const baseStyle = `
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #f8fafc;
  color: #1e293b;
`;

const btnStyle = `
  display: inline-block;
  background: linear-gradient(135deg, #0d9488, #059669);
  color: white !important;
  text-decoration: none;
  padding: 14px 32px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  margin: 24px 0;
`;

function makeButton(url: string, text: string): string {
  return `
    <table border="0" cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr>
        <td align="center" bgcolor="#0d9488" style="border-radius:12px;">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:14px 32px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;background-color:#0d9488;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}


function wrapHtml(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="${baseStyle} margin:0; padding:0;">
  <div style="max-width:560px; margin:40px auto; background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0d9488,#059669); padding:32px 40px;">
      <h1 style="color:white; margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px;">🪄 AI Studio</h1>
      <p style="color:rgba(255,255,255,0.8); margin:4px 0 0; font-size:13px;">Landing Page Builder</p>
    </div>
    <div style="padding:40px;">
      ${body}
      <hr style="border:none; border-top:1px solid #e2e8f0; margin:32px 0;">
      <p style="color:#94a3b8; font-size:12px; margin:0;">
        Ai primit acest email de la AI Studio. Dacă nu ai solicitat această acțiune, ignoră mesajul.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${env.FRONTEND_ORIGIN}/verify-email?token=${token}`;
  const html = wrapHtml("Confirmă-ți contul", `
    <h2 style="font-size:20px; font-weight:700; margin:0 0 8px;">Bun venit! 👋</h2>
    <p style="color:#64748b; line-height:1.6; margin:0 0 4px;">
      Contul tău pe <strong>AI Studio</strong> a fost creat cu succes.<br>
      Dă click pe butonul de mai jos pentru a-ți confirma adresa de email.
    </p>
    ${makeButton(url, '✓ Confirmă Email')}
    <p style="color:#94a3b8; font-size:13px; margin:0;">
      Link-ul expiră în <strong>24 de ore</strong>.<br>
      Dacă butonul nu funcționează, copiază: <a href="${url}" style="color:#0d9488;word-break:break-all;">${url}</a>
    </p>
  `);

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "✅ Confirmă-ți contul AI Studio",
    html,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${env.FRONTEND_ORIGIN}/reset-password?token=${token}`;
  const html = wrapHtml("Resetare parolă", `
    <h2 style="font-size:20px; font-weight:700; margin:0 0 8px;">Resetare parolă 🔑</h2>
    <p style="color:#64748b; line-height:1.6; margin:0 0 4px;">
      Ai solicitat resetarea parolei pentru contul asociat cu <strong>${email}</strong>.<br>
      Dă click pe butonul de mai jos pentru a seta o parolă nouă.
    </p>
    ${makeButton(url, '🔑 Resetează Parola')}
    <p style="color:#94a3b8; font-size:13px; margin:0;">
      Link-ul expiră în <strong>1 oră</strong>.<br>
      Dacă nu ai solicitat resetarea, ignoră acest mesaj.
    </p>
  `);

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "🔑 Resetare parolă AI Studio",
    html,
  });
}

export async function sendSupportEmail(userEmail: string, message: string) {
  // Trimite mesajul de suport către ADMIN
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: env.SMTP_USER,
    subject: `📩 Mesaj suport de la ${userEmail}`,
    html: wrapHtml("Mesaj suport", `
      <h2 style="font-size:18px; font-weight:700; margin:0 0 8px;">Mesaj nou de suport</h2>
      <p style="color:#64748b;"><strong>De la:</strong> ${userEmail}</p>
      <div style="background:#f8fafc; border-radius:12px; padding:20px; margin:16px 0; color:#334155; line-height:1.7;">
        ${message.replace(/\n/g, "<br>")}
      </div>
    `),
  });

  // Confirmăm userului că am primit mesajul
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: userEmail,
    subject: "📩 Am primit mesajul tău — AI Studio",
    html: wrapHtml("Confirmare suport", `
      <h2 style="font-size:20px; font-weight:700; margin:0 0 8px;">Am primit mesajul tău! 📬</h2>
      <p style="color:#64748b; line-height:1.6;">
        Îți mulțumim pentru că ne-ai contactat. Echipa noastră va analiza mesajul și îți va răspunde în cel mai scurt timp posibil.
      </p>
      <div style="background:#f0fdf4; border-left:4px solid #10b981; border-radius:8px; padding:16px; margin:20px 0; color:#065f46;">
        <strong>Mesajul tău:</strong><br>
        ${message.replace(/\n/g, "<br>")}
      </div>
    `),
  });
}
