/**
 * Transactional email templates.
 * All templates return { subject, html, text } for use with sendEmail().
 * Uses inline styles for maximum email client compatibility.
 */

// ─── Colors & Constants ─────────────────────────────────────────────────────

const COLORS = {
  primary: "#1a1a2e",
  accent: "#16213e",
  text: "#333333",
  textLight: "#666666",
  border: "#e5e7eb",
  background: "#f9fafb",
  white: "#ffffff",
  success: "#059669",
  warning: "#d97706",
  error: "#dc2626",
};

// ─── Base Layout ─────────────────────────────────────────────────────────────

function layout(content: string, storeName = "Store"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${storeName}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.background};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:${COLORS.primary};padding:24px 32px;border-radius:8px 8px 0 0;text-align:center;">
              <h1 style="margin:0;color:${COLORS.white};font-size:22px;font-weight:700;letter-spacing:0.5px;">${storeName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:${COLORS.white};padding:32px;border-left:1px solid ${COLORS.border};border-right:1px solid ${COLORS.border};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${COLORS.background};padding:24px 32px;border:1px solid ${COLORS.border};border-top:none;border-radius:0 0 8px 8px;text-align:center;">
              <p style="margin:0 0 8px 0;color:${COLORS.textLight};font-size:13px;">
                &copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.
              </p>
              <p style="margin:0;color:${COLORS.textLight};font-size:12px;">
                <a href="#" style="color:${COLORS.textLight};text-decoration:underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="#" style="color:${COLORS.textLight};text-decoration:underline;">Contact Us</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:${COLORS.primary};border-radius:6px;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:12px 28px;color:${COLORS.white};text-decoration:none;font-size:15px;font-weight:600;">${text}</a>
    </td>
  </tr>
</table>`;
}

// ─── Order Confirmation ──────────────────────────────────────────────────────

export function orderConfirmationEmail(data: {
  orderNumber: string;
  customerName: string;
  items: Array<{ title: string; quantity: number; price: string }>;
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
  shippingAddress?: { address1: string; city: string; country: string; zip: string };
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Order confirmed — #${data.orderNumber}`;

  let itemsHtml = "";
  for (const item of data.items) {
    itemsHtml += `<tr>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};font-size:14px;">${item.title}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};color:${COLORS.textLight};font-size:14px;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};font-size:14px;text-align:right;">$${item.price}</td>
    </tr>`;
  }

  const addressHtml = data.shippingAddress
    ? `<div style="margin-top:24px;padding:16px;background-color:${COLORS.background};border-radius:6px;">
        <p style="margin:0 0 8px 0;font-weight:600;color:${COLORS.text};font-size:14px;">Shipping Address</p>
        <p style="margin:0;color:${COLORS.textLight};font-size:14px;line-height:1.5;">
          ${data.shippingAddress.address1}<br/>
          ${data.shippingAddress.city}, ${data.shippingAddress.zip}<br/>
          ${data.shippingAddress.country}
        </p>
      </div>`
    : "";

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Thank you for your order!</h2>
    <p style="margin:0 0 24px 0;color:${COLORS.textLight};font-size:15px;">
      Hi ${data.customerName}, we've received your order <strong>#${data.orderNumber}</strong> and it's being processed.
    </p>
    ${
      data.items.length > 0
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <th style="padding:10px 0;border-bottom:2px solid ${COLORS.border};text-align:left;color:${COLORS.textLight};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Item</th>
          <th style="padding:10px 0;border-bottom:2px solid ${COLORS.border};text-align:center;color:${COLORS.textLight};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
          <th style="padding:10px 0;border-bottom:2px solid ${COLORS.border};text-align:right;color:${COLORS.textLight};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
        </tr>
        ${itemsHtml}
      </table>`
        : ""
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:6px 0;color:${COLORS.textLight};font-size:14px;">Subtotal</td>
        <td style="padding:6px 0;color:${COLORS.text};font-size:14px;text-align:right;">$${data.subtotal}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:${COLORS.textLight};font-size:14px;">Shipping</td>
        <td style="padding:6px 0;color:${COLORS.text};font-size:14px;text-align:right;">$${data.shipping}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:${COLORS.textLight};font-size:14px;">Tax</td>
        <td style="padding:6px 0;color:${COLORS.text};font-size:14px;text-align:right;">$${data.tax}</td>
      </tr>
      <tr>
        <td style="padding:12px 0 0 0;border-top:2px solid ${COLORS.border};color:${COLORS.text};font-size:16px;font-weight:700;">Total</td>
        <td style="padding:12px 0 0 0;border-top:2px solid ${COLORS.border};color:${COLORS.text};font-size:16px;font-weight:700;text-align:right;">$${data.total}</td>
      </tr>
    </table>
    ${addressHtml}`;

  const html = layout(content, data.storeName);

  const itemsText = data.items.map((i) => `  - ${i.title} x${i.quantity} — $${i.price}`).join("\n");
  const text = `Order Confirmed — #${data.orderNumber}

Hi ${data.customerName},

Thank you for your order! Here's a summary:

${itemsText || "  (See your account for item details)"}

Subtotal: $${data.subtotal}
Shipping: $${data.shipping}
Tax: $${data.tax}
Total: $${data.total}
${data.shippingAddress ? `\nShipping to: ${data.shippingAddress.address1}, ${data.shippingAddress.city}, ${data.shippingAddress.zip}, ${data.shippingAddress.country}` : ""}`;

  return { subject, html, text };
}

// ─── Welcome Email ───────────────────────────────────────────────────────────

export function welcomeEmail(data: {
  customerName: string;
  storeName?: string;
  loginUrl?: string;
}): { subject: string; html: string; text: string } {
  const storeName = data.storeName ?? "Store";
  const subject = `Welcome to ${storeName}!`;
  const loginUrl = data.loginUrl ?? "#";

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Welcome aboard!</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.customerName}, thanks for creating an account with ${storeName}. You now have access to:
    </p>
    <ul style="margin:0 0 16px 0;padding-left:20px;color:${COLORS.textLight};font-size:14px;line-height:1.8;">
      <li>Faster checkout with saved addresses</li>
      <li>Order tracking and history</li>
      <li>Wishlists and personalized recommendations</li>
      <li>Exclusive member-only offers</li>
    </ul>
    ${button("Start Shopping", loginUrl)}
    <p style="margin:0;color:${COLORS.textLight};font-size:14px;">
      If you have any questions, feel free to reach out to our support team.
    </p>`;

  const html = layout(content, storeName);

  const text = `Welcome to ${storeName}!

Hi ${data.customerName},

Thanks for creating an account. You now have access to faster checkout, order tracking, wishlists, and exclusive offers.

Start shopping: ${loginUrl}`;

  return { subject, html, text };
}

// ─── Password Reset ──────────────────────────────────────────────────────────

export function passwordResetEmail(data: {
  customerName: string;
  resetUrl: string;
  expiresInMinutes?: number;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const storeName = data.storeName ?? "Store";
  const subject = `Reset your password — ${storeName}`;
  const expires = data.expiresInMinutes ?? 60;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Password Reset</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.customerName}, we received a request to reset your password. Click the button below to choose a new one:
    </p>
    ${button("Reset Password", data.resetUrl)}
    <p style="margin:0 0 8px 0;color:${COLORS.textLight};font-size:13px;">
      This link will expire in ${expires} minutes. If you didn't request a password reset, you can safely ignore this email.
    </p>
    <p style="margin:0;color:${COLORS.textLight};font-size:13px;">
      If the button doesn't work, copy and paste this URL into your browser:<br/>
      <a href="${data.resetUrl}" style="color:${COLORS.accent};word-break:break-all;font-size:12px;">${data.resetUrl}</a>
    </p>`;

  const html = layout(content, storeName);

  const text = `Password Reset — ${storeName}

Hi ${data.customerName},

We received a request to reset your password. Visit the link below to choose a new one:

${data.resetUrl}

This link expires in ${expires} minutes. If you didn't request this, ignore this email.`;

  return { subject, html, text };
}

// ─── Order Shipped ───────────────────────────────────────────────────────────

export function orderShippedEmail(data: {
  orderNumber: string;
  customerName: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your order #${data.orderNumber} has shipped!`;

  let trackingHtml = "";
  if (data.trackingNumber) {
    trackingHtml = `
      <div style="margin:20px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;">
        <p style="margin:0 0 6px 0;color:${COLORS.textLight};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Tracking Details</p>
        ${data.carrier ? `<p style="margin:0 0 4px 0;color:${COLORS.text};font-size:14px;"><strong>Carrier:</strong> ${data.carrier}</p>` : ""}
        <p style="margin:0;color:${COLORS.text};font-size:14px;"><strong>Tracking #:</strong> ${data.trackingNumber}</p>
      </div>`;
  }

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Your order is on its way!</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.customerName}, great news! Your order <strong>#${data.orderNumber}</strong> has been shipped.
    </p>
    ${trackingHtml}
    ${data.trackingUrl ? button("Track Your Order", data.trackingUrl) : ""}`;

  const html = layout(content, data.storeName);

  let text = `Your order #${data.orderNumber} has shipped!

Hi ${data.customerName},

Your order #${data.orderNumber} is on its way.`;
  if (data.trackingNumber) {
    text += `\n\nTracking #: ${data.trackingNumber}`;
    if (data.carrier) text += `\nCarrier: ${data.carrier}`;
    if (data.trackingUrl) text += `\nTrack here: ${data.trackingUrl}`;
  }

  return { subject, html, text };
}

// ─── Order Cancelled ─────────────────────────────────────────────────────────

export function orderCancelledEmail(data: {
  orderNumber: string;
  customerName: string;
  reason?: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Order #${data.orderNumber} has been cancelled`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Order Cancelled</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.customerName}, your order <strong>#${data.orderNumber}</strong> has been cancelled.
    </p>
    ${
      data.reason
        ? `<div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;border-left:4px solid ${COLORS.warning};">
            <p style="margin:0;color:${COLORS.text};font-size:14px;"><strong>Reason:</strong> ${data.reason}</p>
          </div>`
        : ""
    }
    <p style="margin:0;color:${COLORS.textLight};font-size:14px;line-height:1.6;">
      If a payment was made, a refund will be issued to your original payment method. Please allow a few business days for processing.
    </p>
    <p style="margin:16px 0 0 0;color:${COLORS.textLight};font-size:14px;">
      If you have any questions, please don't hesitate to contact our support team.
    </p>`;

  const html = layout(content, data.storeName);

  let text = `Order #${data.orderNumber} Cancelled

Hi ${data.customerName},

Your order #${data.orderNumber} has been cancelled.`;
  if (data.reason) text += `\nReason: ${data.reason}`;
  text += `\n\nIf a payment was made, a refund will be issued to your original payment method.`;

  return { subject, html, text };
}

// ─── Draft Order Invoice ─────────────────────────────────────────────────────

export function draftOrderInvoiceEmail(data: {
  orderNumber: string;
  customerName: string;
  items: Array<{ title: string; quantity: number; price: string }>;
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
  currency: string;
  invoiceUrl: string;
  note?: string | null;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your order is ready — #${data.orderNumber}`;

  let itemsHtml = "";
  for (const item of data.items) {
    itemsHtml += `<tr>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};font-size:14px;">${item.title}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};color:${COLORS.textLight};font-size:14px;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};font-size:14px;text-align:right;">${data.currency} ${item.price}</td>
    </tr>`;
  }

  const noteHtml = data.note
    ? `<div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;border-left:4px solid ${COLORS.accent};">
        <p style="margin:0 0 4px 0;font-weight:600;color:${COLORS.text};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Note from us</p>
        <p style="margin:0;color:${COLORS.text};font-size:14px;line-height:1.5;">${data.note}</p>
      </div>`
    : "";

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Your order is ready to review</h2>
    <p style="margin:0 0 24px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.customerName}, we've prepared order <strong>#${data.orderNumber}</strong> for you. Review the details below and pay when you're ready — we'll get started on it once payment is received.
    </p>
    ${
      data.items.length > 0
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <th style="padding:10px 0;border-bottom:2px solid ${COLORS.border};text-align:left;color:${COLORS.textLight};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Item</th>
          <th style="padding:10px 0;border-bottom:2px solid ${COLORS.border};text-align:center;color:${COLORS.textLight};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
          <th style="padding:10px 0;border-bottom:2px solid ${COLORS.border};text-align:right;color:${COLORS.textLight};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
        </tr>
        ${itemsHtml}
      </table>`
        : ""
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:6px 0;color:${COLORS.textLight};font-size:14px;">Subtotal</td>
        <td style="padding:6px 0;color:${COLORS.text};font-size:14px;text-align:right;">${data.currency} ${data.subtotal}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:${COLORS.textLight};font-size:14px;">Shipping</td>
        <td style="padding:6px 0;color:${COLORS.text};font-size:14px;text-align:right;">${data.currency} ${data.shipping}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:${COLORS.textLight};font-size:14px;">Tax</td>
        <td style="padding:6px 0;color:${COLORS.text};font-size:14px;text-align:right;">${data.currency} ${data.tax}</td>
      </tr>
      <tr>
        <td style="padding:12px 0 0 0;border-top:2px solid ${COLORS.border};color:${COLORS.text};font-size:16px;font-weight:700;">Total</td>
        <td style="padding:12px 0 0 0;border-top:2px solid ${COLORS.border};color:${COLORS.text};font-size:16px;font-weight:700;text-align:right;">${data.currency} ${data.total}</td>
      </tr>
    </table>
    ${noteHtml}
    ${button("View & pay invoice", data.invoiceUrl)}
    <p style="margin:0;color:${COLORS.textLight};font-size:13px;line-height:1.6;">
      If you have questions about this order, reply to this email or contact our support team.
    </p>`;

  const html = layout(content, data.storeName);

  const itemsText = data.items
    .map((i) => `  - ${i.title} x${i.quantity} — ${data.currency} ${i.price}`)
    .join("\n");
  const text = `Your order is ready — #${data.orderNumber}

Hi ${data.customerName},

We've prepared this order for you. Review the details and pay when ready.

${itemsText || "  (See your account for item details)"}

Subtotal: ${data.currency} ${data.subtotal}
Shipping: ${data.currency} ${data.shipping}
Tax: ${data.currency} ${data.tax}
Total: ${data.currency} ${data.total}
${data.note ? `\nNote: ${data.note}\n` : ""}
View & pay: ${data.invoiceUrl}`;

  return { subject, html, text };
}

// ─── Refund Confirmation ─────────────────────────────────────────────────────

// ─── Abandoned Cart Recovery ─────────────────────────────────────────────────

export function abandonedCartEmail(data: {
  customerName: string;
  itemCount: number;
  totalPrice: string;
  currency: string;
  items: Array<{ title: string; quantity: number; price: string; imageUrl?: string | null }>;
  recoveryUrl: string;
  stage: 1 | 2 | 3;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  // Subject tuned per stage — early reminders are gentle, the last one is more
  // direct about urgency.
  const subject =
    data.stage === 1
      ? `You left ${data.itemCount} item${data.itemCount === 1 ? "" : "s"} in your cart`
      : data.stage === 2
        ? `Still thinking? Your cart is waiting`
        : `Last chance — your cart expires soon`;

  const heading =
    data.stage === 1
      ? "Did you forget something?"
      : data.stage === 2
        ? "Your cart is still here"
        : "Last chance to grab your cart";

  const intro =
    data.stage === 1
      ? `Hi ${data.customerName}, you left ${data.itemCount} item${data.itemCount === 1 ? "" : "s"} in your cart. We saved them for you.`
      : data.stage === 2
        ? `Hi ${data.customerName}, your cart is still waiting. Complete your order before items sell out.`
        : `Hi ${data.customerName}, this is the final reminder — your cart will expire soon. Don't miss out.`;

  let itemsHtml = "";
  for (const item of data.items.slice(0, 5)) {
    const img = item.imageUrl
      ? `<td style="padding:10px 0;width:64px;"><img src="${item.imageUrl}" alt="" width="56" height="56" style="border-radius:6px;object-fit:cover;display:block;" /></td>`
      : "";
    itemsHtml += `<tr>
      ${img}
      <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};font-size:14px;">
        <div style="font-weight:600;">${item.title}</div>
        <div style="color:${COLORS.textLight};font-size:12px;">Qty ${item.quantity}</div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};font-size:14px;text-align:right;white-space:nowrap;">${data.currency} ${item.price}</td>
    </tr>`;
  }
  if (data.items.length > 5) {
    itemsHtml += `<tr><td colspan="3" style="padding:8px 0;color:${COLORS.textLight};font-size:12px;text-align:center;">…and ${data.items.length - 5} more</td></tr>`;
  }

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">${heading}</h2>
    <p style="margin:0 0 20px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">${intro}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemsHtml}
    </table>
    <div style="margin-top:16px;padding:16px;background-color:${COLORS.background};border-radius:6px;display:flex;justify-content:space-between;">
      <span style="color:${COLORS.text};font-size:14px;font-weight:600;">Total</span>
      <span style="color:${COLORS.text};font-size:16px;font-weight:700;">${data.currency} ${data.totalPrice}</span>
    </div>
    ${button("Finish your purchase", data.recoveryUrl)}
    <p style="margin:0;color:${COLORS.textLight};font-size:13px;line-height:1.6;">
      Questions about your order? Reply to this email and we'll help.
    </p>`;

  const html = layout(content, data.storeName);

  const itemsText = data.items
    .slice(0, 5)
    .map((i) => `  - ${i.title} (qty ${i.quantity}) — ${data.currency} ${i.price}`)
    .join("\n");
  const text = `${heading}

${intro}

${itemsText}
${data.items.length > 5 ? `…and ${data.items.length - 5} more\n` : ""}
Total: ${data.currency} ${data.totalPrice}

Finish your purchase: ${data.recoveryUrl}`;

  return { subject, html, text };
}

// ─── Back-in-Stock Notification ──────────────────────────────────────────────

export function backInStockEmail(data: {
  customerName?: string | null;
  productTitle: string;
  variantTitle?: string | null;
  productUrl: string;
  imageUrl?: string | null;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `${data.productTitle} is back in stock`;
  const variantLine = data.variantTitle
    ? `<p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:14px;">${data.variantTitle}</p>`
    : "";

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Good news — it's back!</h2>
    <p style="margin:0 0 20px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.customerName ?? "there"}, the item you wanted is available again. Stock is limited, so grab it before it sells out.
    </p>
    ${
      data.imageUrl
        ? `<div style="margin:0 0 16px 0;text-align:center;">
            <img src="${data.imageUrl}" alt="${data.productTitle}" style="max-width:240px;border-radius:8px;" />
          </div>`
        : ""
    }
    <h3 style="margin:0 0 4px 0;color:${COLORS.text};font-size:16px;">${data.productTitle}</h3>
    ${variantLine}
    ${button("Shop now", data.productUrl)}`;

  const html = layout(content, data.storeName);

  const text = `Good news — ${data.productTitle} is back in stock!

${data.variantTitle ? data.variantTitle + "\n" : ""}
Shop now: ${data.productUrl}`;

  return { subject, html, text };
}

export function refundConfirmationEmail(data: {
  orderNumber: string;
  customerName: string;
  refundAmount: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Refund issued for order #${data.orderNumber}`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Refund Issued</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.customerName}, a refund has been issued for your order <strong>#${data.orderNumber}</strong>.
    </p>
    <div style="margin:16px 0;padding:20px;background-color:${COLORS.background};border-radius:6px;text-align:center;">
      <p style="margin:0 0 4px 0;color:${COLORS.textLight};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Refund Amount</p>
      <p style="margin:0;color:${COLORS.success};font-size:28px;font-weight:700;">$${data.refundAmount}</p>
    </div>
    <p style="margin:0;color:${COLORS.textLight};font-size:14px;line-height:1.6;">
      The refund will be credited to your original payment method. Please allow 5-10 business days for the refund to appear on your statement.
    </p>`;

  const html = layout(content, data.storeName);

  const text = `Refund Issued — Order #${data.orderNumber}

Hi ${data.customerName},

A refund of $${data.refundAmount} has been issued for your order #${data.orderNumber}.

The refund will be credited to your original payment method. Please allow 5-10 business days for processing.`;

  return { subject, html, text };
}

// ─── Vendor Approved ─────────────────────────────────────────────────────────

export function vendorApprovedEmail(data: {
  vendorName: string;
  loginUrl?: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const storeName = data.storeName ?? "Store";
  const subject = `Your vendor application has been approved!`;
  const loginUrl = data.loginUrl ?? "#";

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.success};font-size:20px;">Congratulations!</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.vendorName}, your vendor application on ${storeName} has been <strong>approved</strong>. You can now start listing products and selling on our marketplace.
    </p>
    <div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;">
      <p style="margin:0 0 8px 0;color:${COLORS.text};font-size:14px;font-weight:600;">Getting Started:</p>
      <ol style="margin:0;padding-left:20px;color:${COLORS.textLight};font-size:14px;line-height:1.8;">
        <li>Log in to your vendor dashboard</li>
        <li>Complete your store profile and settings</li>
        <li>Add your first products</li>
        <li>Set up your payout preferences</li>
      </ol>
    </div>
    ${button("Go to Dashboard", loginUrl)}`;

  const html = layout(content, storeName);

  const text = `Vendor Application Approved!

Hi ${data.vendorName},

Your vendor application on ${storeName} has been approved! You can now start listing products.

Getting started:
1. Log in to your vendor dashboard
2. Complete your store profile
3. Add your first products
4. Set up payout preferences

Dashboard: ${loginUrl}`;

  return { subject, html, text };
}

// ─── Vendor Rejected ─────────────────────────────────────────────────────────

export function vendorRejectedEmail(data: {
  vendorName: string;
  reason?: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const storeName = data.storeName ?? "Store";
  const subject = `Update on your vendor application — ${storeName}`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Application Update</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.vendorName}, after reviewing your vendor application for ${storeName}, we're unable to approve it at this time.
    </p>
    ${
      data.reason
        ? `<div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;border-left:4px solid ${COLORS.warning};">
            <p style="margin:0;color:${COLORS.text};font-size:14px;"><strong>Reason:</strong> ${data.reason}</p>
          </div>`
        : ""
    }
    <p style="margin:0;color:${COLORS.textLight};font-size:14px;line-height:1.6;">
      If you believe this was in error or you'd like to address the concerns raised, please contact our support team to discuss next steps. We'd love to work with you to get your store up and running.
    </p>`;

  const html = layout(content, storeName);

  let text = `Vendor Application Update — ${storeName}

Hi ${data.vendorName},

After reviewing your vendor application, we're unable to approve it at this time.`;
  if (data.reason) text += `\n\nReason: ${data.reason}`;
  text += `\n\nPlease contact our support team if you have questions or would like to reapply.`;

  return { subject, html, text };
}

// ─── Vendor Registration Welcome ────────────────────────────────────────────

export function vendorWelcomeEmail(data: {
  vendorName: string;
  loginUrl?: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const storeName = data.storeName ?? "Store";
  const subject = `Welcome to ${storeName} — Vendor Registration Received`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Welcome, ${data.vendorName}!</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Thank you for registering as a vendor on ${storeName}. Your application is currently <strong>pending review</strong>.
    </p>
    <div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;">
      <p style="margin:0 0 8px 0;color:${COLORS.text};font-size:14px;font-weight:600;">What happens next?</p>
      <ol style="margin:0;padding-left:20px;color:${COLORS.textLight};font-size:14px;line-height:1.8;">
        <li>Our team will review your application</li>
        <li>You'll receive an email once you're approved</li>
        <li>In the meantime, log in to complete your profile and KYC</li>
      </ol>
    </div>
    ${button("Go to Dashboard", data.loginUrl ?? "#")}`;

  const html = layout(content, storeName);

  const text = `Welcome to ${storeName}!

Hi ${data.vendorName},

Thank you for registering as a vendor. Your application is pending review. We'll notify you once it's approved.

In the meantime, you can log in to complete your profile and KYC documentation.

Dashboard: ${data.loginUrl ?? "#"}`;

  return { subject, html, text };
}

// ─── Return Approved ────────────────────────────────────────────────────────

export function returnApprovedEmail(data: {
  orderNumber: string;
  customerName: string;
  returnId: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Return approved for order #${data.orderNumber}`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Return Approved</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.customerName}, your return request for order <strong>#${data.orderNumber}</strong> has been approved.
    </p>
    <div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;border-left:4px solid ${COLORS.success};">
      <p style="margin:0;color:${COLORS.text};font-size:14px;">
        Please ship the item(s) back to us. Once we receive and inspect them, your refund will be processed.
      </p>
    </div>
    <p style="margin:16px 0 0 0;color:${COLORS.textLight};font-size:14px;">
      If you have questions about the return process, please contact our support team.
    </p>`;

  const html = layout(content, data.storeName);

  const text = `Return Approved — Order #${data.orderNumber}

Hi ${data.customerName},

Your return request for order #${data.orderNumber} has been approved.

Please ship the item(s) back to us. Once received and inspected, your refund will be processed.`;

  return { subject, html, text };
}

// ─── Return Rejected ────────────────────────────────────────────────────────

export function returnRejectedEmail(data: {
  orderNumber: string;
  customerName: string;
  reason?: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Return request update for order #${data.orderNumber}`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Return Request Update</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.customerName}, we've reviewed your return request for order <strong>#${data.orderNumber}</strong> and unfortunately we're unable to approve it at this time.
    </p>
    ${data.reason ? `<div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;border-left:4px solid ${COLORS.warning};">
      <p style="margin:0;color:${COLORS.text};font-size:14px;"><strong>Reason:</strong> ${data.reason}</p>
    </div>` : ""}
    <p style="margin:16px 0 0 0;color:${COLORS.textLight};font-size:14px;">
      If you have questions, please contact our support team.
    </p>`;

  const html = layout(content, data.storeName);

  let text = `Return Request Update — Order #${data.orderNumber}

Hi ${data.customerName},

We've reviewed your return request for order #${data.orderNumber} and are unable to approve it at this time.`;
  if (data.reason) text += `\nReason: ${data.reason}`;

  return { subject, html, text };
}

// ─── Payout Completed ───────────────────────────────────────────────────────

export function payoutCompletedEmail(data: {
  vendorName: string;
  payoutReference: string;
  amount: string;
  currency?: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const currency = data.currency ?? "USD";
  const subject = `Payout processed — ${data.payoutReference}`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Payout Processed</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.vendorName}, a payout has been processed for your account.
    </p>
    <div style="margin:16px 0;padding:20px;background-color:${COLORS.background};border-radius:6px;text-align:center;">
      <p style="margin:0 0 4px 0;color:${COLORS.textLight};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Amount Paid</p>
      <p style="margin:0;color:${COLORS.success};font-size:28px;font-weight:700;">$${data.amount} ${currency}</p>
      <p style="margin:8px 0 0 0;color:${COLORS.textLight};font-size:13px;">Reference: ${data.payoutReference}</p>
    </div>
    <p style="margin:0;color:${COLORS.textLight};font-size:14px;line-height:1.6;">
      Please allow 1-3 business days for the funds to appear in your bank account.
    </p>`;

  const html = layout(content, data.storeName);

  const text = `Payout Processed — ${data.payoutReference}

Hi ${data.vendorName},

A payout of $${data.amount} ${currency} has been processed.
Reference: ${data.payoutReference}

Please allow 1-3 business days for funds to appear in your bank account.`;

  return { subject, html, text };
}

// ─── New Order Notification (Vendor) ────────────────────────────────────────

export function vendorNewOrderEmail(data: {
  vendorName: string;
  orderNumber: string;
  itemCount: number;
  total: string;
  dashboardUrl?: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `New order received — #${data.orderNumber}`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">New Order!</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.vendorName}, you have a new order to fulfill.
    </p>
    <div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;color:${COLORS.textLight};font-size:14px;">Order Number</td>
          <td style="padding:6px 0;color:${COLORS.text};font-size:14px;text-align:right;font-weight:600;">#${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:${COLORS.textLight};font-size:14px;">Items</td>
          <td style="padding:6px 0;color:${COLORS.text};font-size:14px;text-align:right;">${data.itemCount}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;border-top:1px solid ${COLORS.border};color:${COLORS.text};font-size:16px;font-weight:700;">Total</td>
          <td style="padding:6px 0;border-top:1px solid ${COLORS.border};color:${COLORS.text};font-size:16px;font-weight:700;text-align:right;">$${data.total}</td>
        </tr>
      </table>
    </div>
    ${button("View Order", data.dashboardUrl ?? "#")}
    <p style="margin:0;color:${COLORS.textLight};font-size:13px;">
      Please fulfill this order promptly to maintain a great customer experience.
    </p>`;

  const html = layout(content, data.storeName);

  const text = `New Order — #${data.orderNumber}

Hi ${data.vendorName},

You have a new order to fulfill!

Order: #${data.orderNumber}
Items: ${data.itemCount}
Total: $${data.total}

View in dashboard: ${data.dashboardUrl ?? "#"}`;

  return { subject, html, text };
}

// ─── KYC Status Update ──────────────────────────────────────────────────────

export function kycStatusEmail(data: {
  vendorName: string;
  status: "approved" | "rejected";
  reason?: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const storeName = data.storeName ?? "Store";
  const isApproved = data.status === "approved";
  const subject = `KYC verification ${isApproved ? "approved" : "requires attention"} — ${storeName}`;

  const statusHtml = isApproved
    ? `<div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;border-left:4px solid ${COLORS.success};">
        <p style="margin:0;color:${COLORS.success};font-size:14px;font-weight:600;">Verified</p>
        <p style="margin:4px 0 0 0;color:${COLORS.textLight};font-size:14px;">Your identity documents have been verified successfully.</p>
      </div>`
    : `<div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;border-left:4px solid ${COLORS.error};">
        <p style="margin:0;color:${COLORS.error};font-size:14px;font-weight:600;">Verification Failed</p>
        ${data.reason ? `<p style="margin:4px 0 0 0;color:${COLORS.textLight};font-size:14px;"><strong>Reason:</strong> ${data.reason}</p>` : ""}
        <p style="margin:4px 0 0 0;color:${COLORS.textLight};font-size:14px;">Please update your documents and resubmit for review.</p>
      </div>`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">KYC Verification Update</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.vendorName}, here's an update on your KYC verification.
    </p>
    ${statusHtml}`;

  const html = layout(content, storeName);

  let text = `KYC Verification Update — ${storeName}

Hi ${data.vendorName},

Your KYC verification has been ${isApproved ? "approved" : "rejected"}.`;
  if (!isApproved && data.reason) text += `\nReason: ${data.reason}`;
  if (!isApproved) text += `\n\nPlease update your documents and resubmit.`;

  return { subject, html, text };
}

// ─── Account Deactivation Notice ────────────────────────────────────────────

export function accountDeactivatedEmail(data: {
  name: string;
  accountType: "customer" | "admin" | "vendor";
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const storeName = data.storeName ?? "Store";
  const subject = `Your ${storeName} account has been deactivated`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Account Deactivated</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.name}, your ${data.accountType} account on ${storeName} has been deactivated by an administrator.
    </p>
    <p style="margin:0;color:${COLORS.textLight};font-size:14px;line-height:1.6;">
      If you believe this was done in error, please contact our support team for assistance.
    </p>`;

  const html = layout(content, storeName);

  const text = `Account Deactivated — ${storeName}

Hi ${data.name},

Your ${data.accountType} account on ${storeName} has been deactivated.

If you believe this was in error, please contact support.`;

  return { subject, html, text };
}

// ─── 2FA Enabled / Disabled Confirmation ────────────────────────────────────

export function twoFactorStatusEmail(data: {
  name: string;
  enabled: boolean;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const storeName = data.storeName ?? "Store";
  const action = data.enabled ? "enabled" : "disabled";
  const subject = `Two-factor authentication ${action} — ${storeName}`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">2FA ${data.enabled ? "Enabled" : "Disabled"}</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.name}, two-factor authentication has been <strong>${action}</strong> on your ${storeName} account.
    </p>
    ${data.enabled
      ? `<div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;border-left:4px solid ${COLORS.success};">
          <p style="margin:0;color:${COLORS.text};font-size:14px;">Your account is now more secure. You'll need to enter a verification code from your authenticator app each time you log in.</p>
        </div>`
      : `<div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;border-left:4px solid ${COLORS.warning};">
          <p style="margin:0;color:${COLORS.text};font-size:14px;">Your account is now less secure. We strongly recommend re-enabling 2FA to protect your account.</p>
        </div>`
    }
    <p style="margin:16px 0 0 0;color:${COLORS.textLight};font-size:13px;">
      If you did not make this change, contact support immediately.
    </p>`;

  const html = layout(content, storeName);

  const text = `2FA ${data.enabled ? "Enabled" : "Disabled"} — ${storeName}

Hi ${data.name},

Two-factor authentication has been ${action} on your ${storeName} account.

${data.enabled ? "You'll need a verification code from your authenticator app at each login." : "We recommend re-enabling 2FA to keep your account secure."}

If you didn't make this change, contact support immediately.`;

  return { subject, html, text };
}

// ─── Vendor Suspended ───────────────────────────────────────────────────────

export function vendorSuspendedEmail(data: {
  vendorName: string;
  reason?: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const storeName = data.storeName ?? "Store";
  const subject = `Your vendor account has been suspended — ${storeName}`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.error};font-size:20px;">Account Suspended</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.vendorName}, your vendor account on ${storeName} has been suspended.
    </p>
    ${data.reason ? `<div style="margin:16px 0;padding:16px;background-color:${COLORS.background};border-radius:6px;border-left:4px solid ${COLORS.error};">
      <p style="margin:0;color:${COLORS.text};font-size:14px;"><strong>Reason:</strong> ${data.reason}</p>
    </div>` : ""}
    <p style="margin:0;color:${COLORS.textLight};font-size:14px;line-height:1.6;">
      Your product listings have been hidden from the marketplace. Pending orders will still need to be fulfilled.
      Please contact our support team to resolve this matter.
    </p>`;

  const html = layout(content, storeName);

  let text = `Account Suspended — ${storeName}

Hi ${data.vendorName},

Your vendor account has been suspended.`;
  if (data.reason) text += `\nReason: ${data.reason}`;
  text += `\n\nYour product listings have been hidden. Contact support to resolve this matter.`;

  return { subject, html, text };
}

// ─── Payment Receipt ────────────────────────────────────────────────────────

export function paymentReceiptEmail(data: {
  orderNumber: string;
  customerName: string;
  amount: string;
  paymentMethod?: string;
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Payment receipt for order #${data.orderNumber}`;

  const content = `
    <h2 style="margin:0 0 8px 0;color:${COLORS.text};font-size:20px;">Payment Received</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.textLight};font-size:15px;line-height:1.6;">
      Hi ${data.customerName}, we've received your payment for order <strong>#${data.orderNumber}</strong>.
    </p>
    <div style="margin:16px 0;padding:20px;background-color:${COLORS.background};border-radius:6px;text-align:center;">
      <p style="margin:0 0 4px 0;color:${COLORS.textLight};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Amount Paid</p>
      <p style="margin:0;color:${COLORS.success};font-size:28px;font-weight:700;">$${data.amount}</p>
      ${data.paymentMethod ? `<p style="margin:8px 0 0 0;color:${COLORS.textLight};font-size:13px;">via ${data.paymentMethod}</p>` : ""}
    </div>
    <p style="margin:0;color:${COLORS.textLight};font-size:14px;">
      This is your payment confirmation. Your order is being processed and you'll receive a shipping notification soon.
    </p>`;

  const html = layout(content, data.storeName);

  let text = `Payment Receipt — Order #${data.orderNumber}

Hi ${data.customerName},

We've received your payment of $${data.amount} for order #${data.orderNumber}.`;
  if (data.paymentMethod) text += `\nPayment method: ${data.paymentMethod}`;
  text += `\n\nYour order is being processed.`;

  return { subject, html, text };
}

// ─── Newsletter welcome ──────────────────────────────────────────────────────

export function newsletterWelcomeEmail(data: {
  email: string;
  storeName?: string;
  unsubscribeUrl?: string;
}) {
  const subject = `You're subscribed — welcome to ${data.storeName ?? "our newsletter"}`;
  const content = `
    <h2 style="margin:0 0 12px 0;color:${COLORS.primary};font-size:22px;">Thanks for subscribing 👋</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.text};font-size:15px;line-height:1.6;">
      You'll get the occasional email with new arrivals, behind-the-scenes from our weavers, and the rare sale — never spam.
    </p>
    <p style="margin:0;color:${COLORS.textLight};font-size:13px;">
      Subscribed as <strong>${data.email}</strong>.${data.unsubscribeUrl ? ` Changed your mind? <a href="${data.unsubscribeUrl}" style="color:${COLORS.textLight};">Unsubscribe</a>.` : ""}
    </p>`;
  const html = layout(content, data.storeName);
  const text = `Thanks for subscribing.

You'll receive the occasional update from ${data.storeName ?? "us"} — new arrivals, stories from the weavers, the rare sale.

Subscribed as ${data.email}.${data.unsubscribeUrl ? `\nUnsubscribe: ${data.unsubscribeUrl}` : ""}`;
  return { subject, html, text };
}

// ─── Vendor membership invitation ───────────────────────────────────────────

export function vendorMembershipInviteEmail(data: {
  inviteeEmail: string;
  vendorName: string;
  inviterName?: string;
  role: string;
  acceptUrl?: string;
  storeName?: string;
}) {
  const roleLabel = data.role.replace(/_/g, " ");
  const subject = `${data.inviterName ?? "Your team"} invited you to ${data.vendorName}`;
  const content = `
    <h2 style="margin:0 0 12px 0;color:${COLORS.primary};font-size:22px;">You've been invited to join ${data.vendorName}</h2>
    <p style="margin:0 0 16px 0;color:${COLORS.text};font-size:15px;line-height:1.6;">
      ${data.inviterName ? `<strong>${data.inviterName}</strong> ` : "Someone "}invited you to join <strong>${data.vendorName}</strong> as a <strong style="text-transform:capitalize;">${roleLabel}</strong>.
    </p>
    <p style="margin:0 0 16px 0;color:${COLORS.text};font-size:15px;line-height:1.6;">
      Accept the invitation to start managing this vendor's catalog, orders, or content based on your role.
    </p>
    ${data.acceptUrl ? button("Accept invitation", data.acceptUrl) : ""}
    <p style="margin:16px 0 0 0;color:${COLORS.textLight};font-size:13px;">
      If you weren't expecting this, you can ignore this email — no account is created until you accept.
    </p>`;
  const html = layout(content, data.storeName);
  const text = `You've been invited to join ${data.vendorName}.

${data.inviterName ? `${data.inviterName} ` : "Someone "}invited you to join ${data.vendorName} as a ${roleLabel}.

${data.acceptUrl ? `Accept: ${data.acceptUrl}` : ""}

If you weren't expecting this, you can ignore this email.`;
  return { subject, html, text };
}
