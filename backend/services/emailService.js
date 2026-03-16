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

function formatCurrency(amount) {
  return `P${Number(amount || 0).toFixed(2)}`;
}

function formatDate(dateValue) {
  const date = new Date(dateValue || Date.now());
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendOrderReceiptEmail({ to, name, order }) {
  const transporter = getTransport();
  if (!transporter) {
    throw new Error("Mailtrap is not configured. Set MAILTRAP_HOST and either MAILTRAP_PASS or MAILTRAP_API_TOKEN (plus MAILTRAP_USER, or use default 'api').");
  }

  const recipientName = escapeHtml(name || "Customer");
  const orderId = escapeHtml(order?.id || order?._id || "");
  const orderDate = formatDate(order?.dateOrdered);
  const paymentLabel = escapeHtml(order?.paymentMethodLabel || "Cash on Delivery");
  const shippingAddress = [
    order?.shippingAddress1,
    order?.shippingAddress2,
    [order?.city, order?.zip].filter(Boolean).join(", "),
    order?.country,
    order?.phone ? `Phone: ${order.phone}` : "",
  ].filter(Boolean).map(escapeHtml);

  const itemsHtml = (order?.orderItems || []).map((item) => {
    const quantity = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    return `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ece7e2;">
          <div style="font-weight: 700; color: #111827;">${escapeHtml(item.name || "Product")}</div>
          <div style="font-size: 12px; color: #6b7280;">Qty ${quantity}</div>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ece7e2; text-align: right; color: #111827; font-weight: 600;">
          ${formatCurrency(price * quantity)}
        </td>
      </tr>
    `;
  }).join("");

  const html = `
    <div style="background:#f3ebe2; padding:32px 16px; font-family: Arial, sans-serif; color:#111827;">
      <div style="max-width:860px; margin:0 auto; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 12px 30px rgba(15,23,42,0.12);">
        <div style="display:block; font-size:0;">
          <div style="display:inline-block; vertical-align:top; width:100%; max-width:320px; padding:40px 32px; box-sizing:border-box; background:#fffaf5;">
            <div style="font-size:32px; line-height:1.1; font-weight:800; color:#131927; margin-bottom:14px;">Thank you for your purchase!</div>
            <div style="font-size:14px; line-height:1.7; color:#475569; margin-bottom:24px;">
              Hi ${recipientName}, your RevNation order has been placed successfully. This email is your receipt and order summary.
            </div>
            <div style="font-size:12px; font-weight:800; letter-spacing:1.2px; text-transform:uppercase; color:#ea580c; margin-bottom:10px;">Shipping Address</div>
            <div style="font-size:14px; line-height:1.7; color:#1f2937; margin-bottom:24px;">
              ${shippingAddress.join("<br />")}
            </div>
            <div style="margin-top:8px; display:inline-block; background:#ea580c; color:#ffffff; border-radius:999px; padding:12px 18px; font-size:13px; font-weight:700;">
              Order #${orderId}
            </div>
          </div>
          <div style="display:inline-block; vertical-align:top; width:100%; max-width:540px; padding:32px; box-sizing:border-box; background:#ffffff;">
            <div style="border-top:4px solid #ece7e2; border-radius:10px 10px 0 0; padding-top:10px;">
              <div style="font-size:18px; font-weight:800; color:#131927; margin-bottom:18px;">Order Summary</div>
              <table style="width:100%; border-collapse:collapse; font-size:14px;">
                <tr>
                  <td style="padding:0 0 14px 0; color:#6b7280;">Date</td>
                  <td style="padding:0 0 14px 0; text-align:right; color:#111827; font-weight:600;">${orderDate}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 14px 0; color:#6b7280;">Payment Method</td>
                  <td style="padding:0 0 14px 0; text-align:right; color:#111827; font-weight:600;">${paymentLabel}</td>
                </tr>
              </table>
              <table style="width:100%; border-collapse:collapse; margin-top:4px;">
                ${itemsHtml}
              </table>
              <table style="width:100%; border-collapse:collapse; margin-top:16px; font-size:14px;">
                <tr>
                  <td style="padding:6px 0; color:#6b7280;">Subtotal</td>
                  <td style="padding:6px 0; text-align:right; color:#111827; font-weight:600;">${formatCurrency(order?.subtotalPrice)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; color:#6b7280;">Shipping</td>
                  <td style="padding:6px 0; text-align:right; color:#111827; font-weight:600;">${formatCurrency(order?.shippingPrice)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0 0; border-top:1px dashed #d6d3d1; font-size:18px; font-weight:800; color:#131927;">Order Total</td>
                  <td style="padding:14px 0 0 0; border-top:1px dashed #d6d3d1; text-align:right; font-size:18px; font-weight:800; color:#131927;">${formatCurrency(order?.totalPrice)}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const textLines = [
    `Thank you for your purchase, ${name || "Customer"}.`,
    `Order #${order?.id || order?._id || ""}`,
    `Date: ${orderDate}`,
    `Payment: ${order?.paymentMethodLabel || "Cash on Delivery"}`,
    "",
    "Items:",
    ...(order?.orderItems || []).map((item) => `- ${item.name} x${item.quantity}: ${formatCurrency(Number(item.price || 0) * Number(item.quantity || 1))}`),
    "",
    `Subtotal: ${formatCurrency(order?.subtotalPrice)}`,
    `Shipping: ${formatCurrency(order?.shippingPrice)}`,
    `Total: ${formatCurrency(order?.totalPrice)}`,
  ];

  const info = await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject: `RevNation Receipt - Order #${order?.id || order?._id || ""}`,
    html,
    text: textLines.join("\n"),
  });

  console.log(`[email] Receipt email queued to ${to}. messageId=${info?.messageId || "n/a"}`);
  return info;
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

async function sendOrderStatusUpdateEmail({ to, name, order, previousStatus, nextStatus }) {
  const transporter = getTransport();
  if (!transporter) {
    throw new Error("Mailtrap is not configured. Set MAILTRAP_HOST and either MAILTRAP_PASS or MAILTRAP_API_TOKEN (plus MAILTRAP_USER, or use default 'api').");
  }

  const recipientName = escapeHtml(name || "Customer");
  const orderId = escapeHtml(order?.id || order?._id || "");
  const fromStatus = escapeHtml(String(previousStatus || "").toUpperCase());
  const toStatus = escapeHtml(String(nextStatus || "").toUpperCase());
  const orderDate = formatDate(order?.dateOrdered);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:16px; padding:20px;">
        <h2 style="margin:0 0 10px 0; color:#9a3412;">Order Status Updated</h2>
        <p style="margin:0 0 14px 0; color:#334155;">Hi ${recipientName}, your order status has changed.</p>
        <p style="margin:0 0 8px 0;"><strong>Order:</strong> #${orderId}</p>
        <p style="margin:0 0 8px 0;"><strong>Date Ordered:</strong> ${orderDate}</p>
        <p style="margin:0 0 8px 0;"><strong>Previous Status:</strong> ${fromStatus || "N/A"}</p>
        <p style="margin:0 0 0 0;"><strong>Current Status:</strong> ${toStatus || "N/A"}</p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject: `RevNation Order Update - #${order?.id || order?._id || ""}`,
    html,
    text: [
      `Hi ${name || "Customer"},`,
      "",
      `Your order #${order?.id || order?._id || ""} status has been updated.`,
      `Previous: ${String(previousStatus || "").toUpperCase() || "N/A"}`,
      `Current: ${String(nextStatus || "").toUpperCase() || "N/A"}`,
      `Date Ordered: ${orderDate}`,
    ].join("\n"),
  });

  console.log(`[email] Status update email queued to ${to}. messageId=${info?.messageId || "n/a"}`);
  return info;
}

module.exports = {
  sendVerificationEmail,
  sendOrderReceiptEmail,
  sendOrderStatusUpdateEmail,
};
