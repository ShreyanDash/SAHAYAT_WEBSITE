import { createTransport } from "nodemailer";
import { existsSync } from "node:fs";
import path from "node:path";

const SENDER = "sahayatcare@gmail.com";
export const WATCH_CID = "sahayat-watch";

type DeliveryResult = {
  confirmationSent: boolean;
  adminNotified: boolean;
  errors: string[];
};

let _testAssetPath: string | null | undefined = undefined;

// Allows testing asset-missing fallback scenarios in automated unit tests
export function setBandAssetPathForTesting(assetPath: string | null | undefined) {
  _testAssetPath = assetPath;
}

function getBandAssetPath(): string | null {
  try {
    if (_testAssetPath !== undefined) return _testAssetPath;
    const candidates = [
      path.resolve(process.cwd(), "dist/public/sahayat-band-cutout.png"),
      path.resolve(process.cwd(), "client/public/sahayat-band-cutout.png"),
    ];
    return (
      candidates.find(candidate => {
        try {
          return existsSync(candidate);
        } catch {
          return false;
        }
      }) ?? null
    );
  } catch (error) {
    console.warn("[Email] Unexpected error checking asset path:", error);
    return null;
  }
}

let _testTransporter: ReturnType<typeof createTransport> | null = null;

// Allows injecting a mock transporter for automated unit testing without real SMTP connections
export function setTransporterForTesting(mockTransporter: ReturnType<typeof createTransport> | null) {
  _testTransporter = mockTransporter;
}

function createTransporter() {
  if (_testTransporter) return _testTransporter;
  const rawPassword = process.env.GMAIL_APP_PASSWORD;
  if (!rawPassword) {
    return null;
  }
  const password = rawPassword.replace(/\s+/g, "");

  return createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: SENDER, pass: password },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function confirmationHtml() {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#080a08;color:#eef0e8;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#101410;border:1px solid #293128"><tr><td style="height:4px;background:#d9f36a;font-size:0">&nbsp;</td></tr><tr><td style="padding:26px 40px;border-bottom:1px solid #293128"><div style="font-size:14px;font-weight:700;letter-spacing:3px"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border:1px solid #d9f36a;border-radius:50%;color:#d9f36a;margin-right:9px">S</span>SAHAYAT</div></td></tr><tr><td style="padding:56px 40px 48px;background:radial-gradient(circle at 72% 42%,rgba(217,243,106,.13),transparent 25%),linear-gradient(135deg,#121812,#0b0e0b)"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="55%" valign="top"><div style="color:#d9f36a;font:10px monospace;letter-spacing:2px;text-transform:uppercase">Your place is reserved</div><h1 style="margin:22px 0 20px;font:500 52px/0.96 Georgia,serif;letter-spacing:-3px">Ready when<br><span style="color:#d9f36a">you can't.</span></h1><p style="margin:0;color:#aeb6aa;font-size:15px;line-height:1.65">Thanks for registering your interest in SAHAYAT, the safety wearable designed to act when you can't.</p></td><td width="45%" valign="middle" align="center" style="padding:10px 0;text-align:center;"><img src="cid:${WATCH_CID}" width="220" height="330" alt="SAHAYAT safety wearable" style="display:block;width:220px;max-width:100%;height:auto;margin:0 auto;border:0;outline:none;-ms-interpolation-mode:bicubic;"></td></tr></table></td></tr><tr><td style="padding:42px 40px;background:#eef0e8;color:#111510"><div style="color:#5f705f;font:10px monospace;letter-spacing:2px;text-transform:uppercase">Welcome to the first circle</div><h2 style="margin:18px 0 15px;font:500 36px/1 Georgia,serif;letter-spacing:-2px">You're on the list.</h2><p style="margin:0;color:#536052;font-size:15px;line-height:1.7">We'll keep you posted as SAHAYAT moves closer to launch. Expect thoughtful updates, early access news, and the moments that matter next.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:30px 0"><tr><td width="33%" style="padding:16px 12px;border:1px solid #ccd3c7"><strong style="display:block;margin-bottom:6px;font:10px monospace;letter-spacing:1px;text-transform:uppercase">Screenless</strong><span style="color:#637061;font-size:12px;line-height:1.45">Quiet on the wrist. Ready when needed.</span></td><td width="2%">&nbsp;</td><td width="33%" style="padding:16px 12px;border:1px solid #ccd3c7"><strong style="display:block;margin-bottom:6px;font:10px monospace;letter-spacing:1px;text-transform:uppercase">Intelligent</strong><span style="color:#637061;font-size:12px;line-height:1.45">Motion and vital signals in context.</span></td><td width="2%">&nbsp;</td><td width="33%" style="padding:16px 12px;border:1px solid #ccd3c7"><strong style="display:block;margin-bottom:6px;font:10px monospace;letter-spacing:1px;text-transform:uppercase">Connected</strong><span style="color:#637061;font-size:12px;line-height:1.45">Caregivers get the right alert, sooner.</span></td></tr></table></td></tr><tr><td style="padding:27px 40px 31px;border-top:1px solid #293128;color:#7e897c;font:10px/1.7 monospace;letter-spacing:1px"><strong style="color:#d9f36a">Every fitband monitors you, but SAHAYAT acts when you can't.</strong><br>This message was sent because you registered your interest in SAHAYAT.</td></tr></table></body></html>`;
}

export function adminHtml(email: string, confirmationSent?: boolean) {
  const confirmationStatus = confirmationSent
    ? "The visitor confirmation email was successfully dispatched from sahayatcare@gmail.com."
    : "The visitor confirmation email could not be sent (check server logs for details).";

  return `<div style="margin:0;background:#080a08;color:#eef0e8;padding:32px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:0 auto;padding:32px;background:#101410;border:1px solid #293128;border-top:4px solid #d9f36a"><p style="color:#d9f36a;font:11px monospace;letter-spacing:2px">SAHAYAT / NEW REGISTRATION</p><h1 style="font:500 34px Georgia,serif">A new person joined the first circle.</h1><div style="text-align:center;margin:24px 0 20px;"><img src="cid:${WATCH_CID}" width="160" height="240" alt="SAHAYAT safety wearable" style="display:inline-block;width:160px;max-width:100%;height:auto;border:0;outline:none;"></div><p style="color:#aeb6aa;font-size:16px;line-height:1.6">Registered email:</p><p style="color:#d9f36a;font:18px monospace">${escapeHtml(email)}</p><p style="color:#7e897c;font:11px monospace">${confirmationStatus}</p></div></div>`;
}

export async function sendRegistrationEmails(email: string, isNewRegistration: boolean): Promise<DeliveryResult> {
  const result: DeliveryResult = { confirmationSent: false, adminNotified: false, errors: [] };

  let transporter: ReturnType<typeof createTransport>;
  try {
    const instance = createTransporter();
    if (!instance) {
      console.warn("[Email] Gmail SMTP is not configured (missing GMAIL_APP_PASSWORD)");
      result.errors.push("not_configured");
      return result;
    }
    transporter = instance;
  } catch (error) {
    console.error("[Email] Transporter initialization failed:", error);
    result.errors.push("transporter_init");
    return result;
  }

  let assetPath: string | null = null;
  try {
    assetPath = getBandAssetPath();
  } catch (error) {
    console.warn("[Email] Failed to resolve band asset path:", error);
  }

  const attachments = assetPath
    ? [
        {
          filename: "sahayat-watch.png",
          path: assetPath,
          cid: WATCH_CID,
          contentType: "image/png",
          contentDisposition: "inline" as const,
        },
      ]
    : [];

  if (!assetPath) {
    console.warn("[Email] SAHAYAT band email asset not found; sending confirmation without inline attachment");
  }

  try {
    await transporter.sendMail({
      from: `SAHAYAT <${SENDER}>`,
      to: email,
      replyTo: SENDER,
      subject: "You're on the SAHAYAT early-access list",
      html: confirmationHtml(),
      attachments,
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
        html: adminHtml(email, result.confirmationSent),
        text: `New SAHAYAT early-access registration: ${email}\nVisitor confirmation sent: ${result.confirmationSent ? "yes" : "no"}`,
        attachments,
      });
      result.adminNotified = true;
    } catch (error) {
      console.error("[Email] Admin notification failed:", error);
      result.errors.push("admin");
    }
  } else {
    // For repeat submissions, admin was already notified upon initial registration.
    result.adminNotified = false;
  }

  return result;
}
