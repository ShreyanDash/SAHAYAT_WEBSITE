import { createTransport } from "nodemailer";
import { existsSync } from "node:fs";
import path from "node:path";

const SENDER = "sahayatcare@gmail.com";
const BAND_CID = "sahayat-band@sahayat";

type DeliveryResult = {
  confirmationSent: boolean;
  adminNotified: boolean;
  errors: string[];
};

function getBandAssetPath() {
  const candidates = [
    path.resolve(process.cwd(), "dist/public/sahayat-band-cutout.png"),
    path.resolve(process.cwd(), "client/public/sahayat-band-cutout.png"),
  ];
  const assetPath = candidates.find(candidate => existsSync(candidate));
  if (!assetPath) throw new Error("SAHAYAT band email asset is unavailable");
  return assetPath;
}

function createTransporter() {
  const password = process.env.GMAIL_APP_PASSWORD;
  if (!password) throw new Error("Gmail email service is not configured");

  return createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: SENDER, pass: password },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function confirmationHtml() {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#080a08;color:#eef0e8;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#101410;border:1px solid #293128"><tr><td style="height:4px;background:#d9f36a;font-size:0">&nbsp;</td></tr><tr><td style="padding:26px 40px;border-bottom:1px solid #293128"><div style="font-size:14px;font-weight:700;letter-spacing:3px"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border:1px solid #d9f36a;border-radius:50%;color:#d9f36a;margin-right:9px">S</span>SAHAYAT</div></td></tr><tr><td style="padding:56px 40px 48px;background:radial-gradient(circle at 72% 42%,rgba(217,243,106,.13),transparent 25%),linear-gradient(135deg,#121812,#0b0e0b)"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="55%" valign="top"><div style="color:#d9f36a;font:10px monospace;letter-spacing:2px;text-transform:uppercase">Your place is reserved</div><h1 style="margin:22px 0 20px;font:500 52px/0.96 Georgia,serif;letter-spacing:-3px">Ready when<br><span style="color:#d9f36a">you can't.</span></h1><p style="margin:0;color:#aeb6aa;font-size:15px;line-height:1.65">Thanks for registering your interest in SAHAYAT, the safety wearable designed to act when you can't.</p></td><td width="45%" valign="middle" align="center"><img src="cid:${BAND_CID}" width="220" alt="SAHAYAT black woven safety band" style="display:block;width:220px;max-width:100%;height:auto"></td></tr></table></td></tr><tr><td style="padding:42px 40px;background:#eef0e8;color:#111510"><div style="color:#5f705f;font:10px monospace;letter-spacing:2px;text-transform:uppercase">Welcome to the first circle</div><h2 style="margin:18px 0 15px;font:500 36px/1 Georgia,serif;letter-spacing:-2px">You're on the list.</h2><p style="margin:0;color:#536052;font-size:15px;line-height:1.7">We'll keep you posted as SAHAYAT moves closer to launch. Expect thoughtful updates, early access news, and the moments that matter next.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:30px 0"><tr><td width="33%" style="padding:16px 12px;border:1px solid #ccd3c7"><strong style="display:block;margin-bottom:6px;font:10px monospace;letter-spacing:1px;text-transform:uppercase">Screenless</strong><span style="color:#637061;font-size:12px;line-height:1.45">Quiet on the wrist. Ready when needed.</span></td><td width="2%">&nbsp;</td><td width="33%" style="padding:16px 12px;border:1px solid #ccd3c7"><strong style="display:block;margin-bottom:6px;font:10px monospace;letter-spacing:1px;text-transform:uppercase">Intelligent</strong><span style="color:#637061;font-size:12px;line-height:1.45">Motion and vital signals in context.</span></td><td width="2%">&nbsp;</td><td width="33%" style="padding:16px 12px;border:1px solid #ccd3c7"><strong style="display:block;margin-bottom:6px;font:10px monospace;letter-spacing:1px;text-transform:uppercase">Connected</strong><span style="color:#637061;font-size:12px;line-height:1.45">Caregivers get the right alert, sooner.</span></td></tr></table></td></tr><tr><td style="padding:27px 40px 31px;border-top:1px solid #293128;color:#7e897c;font:10px/1.7 monospace;letter-spacing:1px"><strong style="color:#d9f36a">Every fitband monitors you, but SAHAYAT acts when you can't.</strong><br>This message was sent because you registered your interest in SAHAYAT.</td></tr></table></body></html>`;
}

function adminHtml(email: string) {
  return `<div style="margin:0;background:#080a08;color:#eef0e8;padding:32px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:0 auto;padding:32px;background:#101410;border:1px solid #293128;border-top:4px solid #d9f36a"><p style="color:#d9f36a;font:11px monospace;letter-spacing:2px">SAHAYAT / NEW REGISTRATION</p><h1 style="font:500 34px Georgia,serif">A new person joined the first circle.</h1><p style="color:#aeb6aa;font-size:16px;line-height:1.6">Registered email:</p><p style="color:#d9f36a;font:18px monospace">${escapeHtml(email)}</p><p style="color:#7e897c;font:11px monospace">The confirmation email was sent from sahayatcare@gmail.com.</p></div></div>`;
}

export async function sendRegistrationEmails(email: string, isNewRegistration: boolean): Promise<DeliveryResult> {
  const transporter = createTransporter();
  const assetPath = getBandAssetPath();
  const result: DeliveryResult = { confirmationSent: false, adminNotified: false, errors: [] };

  try {
    await transporter.sendMail({
      from: `SAHAYAT <${SENDER}>`,
      to: email,
      replyTo: SENDER,
      subject: "You're on the SAHAYAT early-access list",
      html: confirmationHtml(),
      attachments: [{ filename: "sahayat-band.png", path: assetPath, cid: BAND_CID }],
    });
    result.confirmationSent = true;
  } catch (error) {
    console.error("[Email] Confirmation delivery failed:", error);
    result.errors.push("confirmation");
  }

  if (isNewRegistration) {
    try {
      await transporter.sendMail({
        from: `SAHAYAT <${SENDER}>`,
        to: SENDER,
        replyTo: email,
        subject: "New SAHAYAT early-access registration",
        html: adminHtml(email),
        text: `New SAHAYAT early-access registration: ${email}`,
      });
      result.adminNotified = true;
    } catch (error) {
      console.error("[Email] Admin notification failed:", error);
      result.errors.push("admin");
    }
  } else {
    result.adminNotified = true;
  }

  return result;
}
