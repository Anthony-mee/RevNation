const nodemailer = require("nodemailer");
const config = require("../config");

function getTransport() {
  const smtpUser = config.mailtrapUser || (config.mailtrapApiToken ? "api" : "");
  const smtpPass = config.mailtrapPass || config.mailtrapApiToken;

  if (!config.mailtrapHost || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.mailtrapHost,
    port: config.mailtrapPort,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

async function sendVerificationEmail({ to, name, verificationUrl }) {
  const transporter = getTransport();
  if (!transporter) {
    throw new Error("Mailtrap is not configured. Set MAILTRAP_HOST and either MAILTRAP_PASS or MAILTRAP_API_TOKEN (plus MAILTRAP_USER, or use default 'api').");
  }

  const recipientName = name || "there";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <h2 style="color: #2563eb;">Verify your RevNation account</h2>
      <p>Hi ${recipientName},</p>
      <p>Thanks for registering. Please verify your email by clicking the button below.</p>
      <p style="margin: 24px 0;">
        <a href="${verificationUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">Verify Email</a>
      </p>
      <p>If the button does not work, copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; color: #1d4ed8;">${verificationUrl}</p>
      <p>This link will expire in ${config.emailVerifyTtlHours} hours.</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject: "RevNation - Verify your email",
    html,
    text: `Verify your RevNation account: ${verificationUrl}`,
  });

  console.log(`[email] Verification email queued to ${to}. messageId=${info?.messageId || "n/a"}`);
  return info;
}

module.exports = {
  sendVerificationEmail,
};
