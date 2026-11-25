"use server";

import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { Resend } from "resend";


export interface SendPackageEmailParams {
  projectId: string;
  packageId?: string;
  recipient: {
    name: string;
    email: string;
    company?: string;
    role?: string;
  };
  subject: string;
  greeting: string;
  body: string;
  ctaName?: string;
  ctaUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  reportFileName?: string;
  reportStorageUrl?: string;
}

export interface SendPackageEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
  warning?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendPackageEmailAction(
  params: SendPackageEmailParams
): Promise<SendPackageEmailResult> {
  const recipientEmail = params.recipient.email?.trim();
  if (!recipientEmail) {
    return {
      success: false,
      error: "Recipient email address is required.",
    };
  }
  const recipientName = params.recipient.name || "Valued Recipient";
  const emailProvider = (
    process.env.EMAIL_PROVIDER || (process.env.SMTP_USER ? "smtp" : "resend")
  ).toLowerCase();



  // 1. Prepare attachments if report PDF is present
  const attachments: Array<{ filename: string; content: Buffer }> = [];

  if (params.reportStorageUrl) {
    try {
      const cleanUrl = params.reportStorageUrl.replace(/^\//, "");
      const possibleLocalPaths = [
        path.resolve(process.cwd(), cleanUrl),
        path.resolve(process.cwd(), "server", cleanUrl),
        path.resolve(process.cwd(), "server", "uploads", cleanUrl.replace(/^uploads[\\/]/, "")),
      ];

      let fileBuffer: Buffer | null = null;
      for (const p of possibleLocalPaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          fileBuffer = fs.readFileSync(p);
          break;
        }
      }

      // If not on disk, try fetching from backend
      if (!fileBuffer) {
        const backendBase =
          process.env.BACKEND_URL || "http://localhost:8001";
        const fetchUrl = `${backendBase}/${cleanUrl}`;
        const resp = await fetch(fetchUrl);
        if (resp.ok) {
          const ab = await resp.arrayBuffer();
          fileBuffer = Buffer.from(ab);
        }
      }

      if (fileBuffer) {
        attachments.push({
          filename: params.reportFileName || "Strategic_Report.pdf",
          content: fileBuffer,
        });
      }
    } catch (err) {
      console.warn("Could not load report attachment for email:", err);
    }
  }

  // 2. Prepare Video & CTA links
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  let resolvedVideoUrl = params.videoUrl || `${frontendUrl}/projects/${params.projectId}/review`;
  if (resolvedVideoUrl.startsWith("/")) {
    resolvedVideoUrl = `${frontendUrl}${resolvedVideoUrl}`;
  }

  const ctaName = params.ctaName || "Book a Meeting";
  const ctaUrl = params.ctaUrl || resolvedVideoUrl;

  // 3. Format HTML paragraphs
  const paragraphsHtml = params.body
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #334155;">${escapeHtml(
          p
        )}</p>`
    )
    .join("");

  // 4. Build clickable Video Preview Card
  const posterTag = params.posterUrl
    ? `<img src="${escapeHtml(
        params.posterUrl.startsWith("/")
          ? `${frontendUrl}${params.posterUrl}`
          : params.posterUrl
      )}" alt="Video Briefing Preview" style="width: 100%; height: 260px; object-fit: cover; display: block;" />`
    : "";

  const videoCardHtml = `
    <div style="margin: 28px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #0b0f19; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);">
      <a href="${resolvedVideoUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: block; color: inherit;">
        <div style="position: relative; width: 100%; min-height: 220px; background: linear-gradient(135deg, #090d16 0%, #1e1b4b 100%); text-align: center;">
          ${posterTag}
          <div style="padding: 32px 20px; background: rgba(9, 13, 22, 0.7); display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #06b6d4, #6366f1); margin: 0 auto 14px auto; line-height: 60px; text-align: center; box-shadow: 0 0 25px rgba(6, 182, 212, 0.65);">
              <span style="font-size: 24px; color: #ffffff; margin-left: 4px;">▶</span>
            </div>
            <div style="color: #ffffff; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">
              Play Personalized Video Walkthrough
            </div>
            <div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">
              Tailored specifically for ${escapeHtml(recipientName)}
            </div>
          </div>
        </div>
        <div style="padding: 14px 20px; background-color: #0f172a; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between;">
          <span style="color: #f1f5f9; font-size: 13px; font-weight: 600;">
            Signet AI Synthesis Engine &bull; Lip-Synced Briefing
          </span>
          <span style="background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.4); font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase;">
            HD Video
          </span>
        </div>
      </a>
    </div>
  `;

  const attachmentPill = params.reportFileName
    ? `
    <div style="margin: 20px 0; padding: 12px 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: inline-flex; align-items: center;">
      <span style="font-size: 16px; margin-right: 8px;">📎</span>
      <span style="font-size: 13px; color: #475569;">
        Document attached: <strong style="color: #0f172a;">${escapeHtml(
          params.reportFileName
        )}</strong>
      </span>
    </div>
  `
    : "";

  // 5. Assemble complete HTML email document
  const htmlDocument = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 620px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 25px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Header -->
    <div style="background: linear-gradient(135deg, #090d16 0%, #0f172a 100%); padding: 22px 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <span style="font-size: 16px; font-weight: 800; letter-spacing: 1px; color: #ffffff; text-transform: uppercase;">
              SIGNET <span style="color: #06b6d4;">AI</span>
            </span>
          </td>
          <td align="right">
            <span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
              Executive Briefing
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Email Content -->
    <div style="padding: 32px 30px;">
      <h1 style="margin: 0 0 18px 0; font-size: 19px; font-weight: 700; color: #0f172a; line-height: 1.4;">
        ${escapeHtml(params.subject)}
      </h1>

      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">
        ${escapeHtml(params.greeting)}
      </p>

      ${paragraphsHtml}

      <!-- Video Preview Card -->
      ${videoCardHtml}

      <!-- CTA Action Button -->
      <div style="margin: 28px 0; text-align: left;">
        <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 9999px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);">
          ${escapeHtml(ctaName)} &rarr;
        </a>
      </div>

      <!-- Attached Report Pill -->
      ${attachmentPill}

      <!-- Signoff -->
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 13px; line-height: 1.5;">
        <p style="margin: 0 0 4px 0;">Warm regards,</p>
        <p style="margin: 0; font-weight: 600; color: #0f172a;">Signet AI Executive Intelligence</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 18px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.6;">
      This personalized intelligence package was delivered via Signet AI.<br />
      Confidential &bull; Sent to ${escapeHtml(recipientEmail)}
    </div>

  </div>
</body>
</html>`;

  // 6. Send email via SMTP (Gmail) or Resend
  let emailId: string | undefined;
  let deliveryWarning: string | undefined;

  if (emailProvider === "smtp" || process.env.SMTP_USER) {
    const smtpUser = process.env.SMTP_USER || "";
    const smtpPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "").replace(/\s+/g, "");
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT) || 465;

    if (!smtpUser || !smtpPass) {
      return {
        success: false,
        error: "SMTP_USER or SMTP_PASS environment variable is not configured.",
      };
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    try {
      const info = await transporter.sendMail({
        from: `"Signet AI" <${smtpUser}>`,
        to: recipientEmail,
        subject: params.subject,
        html: htmlDocument,
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
        })),
      });
      emailId = info.messageId;
    } catch (err: any) {
      console.error("[SMTP Send Error]:", err);
      return {
        success: false,
        error: `Failed to deliver email via Gmail SMTP: ${err?.message || err}`,
      };
    }
  } else {
    const apiKey = process.env.RESEND_API_KEY || "";
    if (!apiKey) {
      return {
        success: false,
        error: "RESEND_API_KEY environment variable is not configured.",
      };
    }
    const resend = new Resend(apiKey);
    const emailFrom =
      process.env.EMAIL_FROM || "Signet AI <onboarding@resend.dev>";

    try {
      const resendResponse = await resend.emails.send({
        from: emailFrom,
        to: [recipientEmail],
        subject: params.subject,
        html: htmlDocument,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (resendResponse.error) {
        console.error("[Resend Error]:", resendResponse.error);
        const msg = resendResponse.error.message || "Failed to deliver email via Resend";

        if (
          msg.toLowerCase().includes("only send to your own email") ||
          msg.toLowerCase().includes("verify a domain")
        ) {
          deliveryWarning = `Resend Test Sandbox Notice: On unverified domains (onboarding@resend.dev), Resend permits delivery strictly to your account's registered email address. To deliver freely to ${recipientEmail}, verify your custom domain in the Resend dashboard.`;
        } else {
          return {
            success: false,
            error: msg,
          };
        }
      } else if (resendResponse.data?.id) {
        emailId = resendResponse.data.id;
      }
    } catch (err: any) {
      console.error("[Resend Exception]:", err);
      return {
        success: false,
        error: err?.message || "Failed to send email with Resend.",
      };
    }
  }


  // 7. Update database: mark project and package status as "sent"
  try {
    const backendBase =
      process.env.BACKEND_URL || "http://localhost:8001";
    await fetch(`${backendBase}/api/v1/projects/${params.projectId}/mark-sent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (dbErr) {
    console.warn("Failed to update project status via mark-sent endpoint:", dbErr);
  }

  return {
    success: true,
    emailId,
    warning: deliveryWarning,
  };
}
