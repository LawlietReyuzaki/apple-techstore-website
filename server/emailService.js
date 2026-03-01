import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();   // must run before reading process.env — ES module imports are hoisted

const GMAIL_USER         = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
// Always notify both admins — merge env var with hardcoded list
const ADMIN_EMAILS_HARDCODED = ['email.hassan.cs@gmail.com', 'mdcreationz22@gmail.com'];
const ADMIN_EMAIL = [
  ...ADMIN_EMAILS_HARDCODED,
  ...(process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(',').map(e => e.trim()) : []),
].filter((e, i, arr) => e && arr.indexOf(e) === i).join(', ');
const SHOP_ADDRESS       = 'Shop G15, China Center 2, Wallayat Complex, Bahria Town Phase 7, Rawalpindi';
const SHOP_PHONE         = '+92 334 2228141';

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
}

function formatPKR(amount) {
  return `Rs ${Number(amount).toLocaleString('en-PK')}`;
}

function formatDate(isoString) {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Shared layout ─────────────────────────────────────────────
function baseLayout(bannerHtml, bodyHtml) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:28px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Dilbar Mobiles</h1>
            <p style="margin:4px 0 0;color:#a0b4d0;font-size:12px;">${SHOP_ADDRESS}</p>
          </td>
        </tr>

        <!-- Banner -->
        ${bannerHtml}

        <!-- Body -->
        <tr><td style="padding:28px 40px;">${bodyHtml}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #eee;padding:16px 40px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">© 2026 Dilbar Mobiles · ${SHOP_ADDRESS}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function banner(bgColor, emoji, text) {
  return `<tr><td style="background:${bgColor};padding:14px 40px;text-align:center;">
    <p style="margin:0;color:#fff;font-size:16px;font-weight:600;">${emoji} ${text}</p>
  </td></tr>`;
}

function infoBox(rows) {
  const rowsHtml = rows.map(([label, value]) =>
    `<tr>
      <td style="color:#666;font-size:13px;padding:5px 0;width:150px;vertical-align:top;">${label}</td>
      <td style="color:#111;font-size:13px;padding:5px 0;">${value}</td>
    </tr>`
  ).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;margin-bottom:20px;">
    <tr><td style="padding:14px 18px;">
      <table width="100%">${rowsHtml}</table>
    </td></tr>
  </table>`;
}

function statusBadge(status) {
  const map = {
    pending:          ['#fef3c7','#92400e','Pending'],
    processing:       ['#dbeafe','#1e40af','Processing'],
    shipped:          ['#ede9fe','#5b21b6','Shipped'],
    delivered:        ['#d1fae5','#065f46','Delivered'],
    cancelled:        ['#fee2e2','#991b1b','Cancelled'],
    payment_rejected: ['#ffedd5','#9a3412','Payment Issue'],
    created:          ['#fef3c7','#92400e','Request Received'],
    in_progress:      ['#dbeafe','#1e40af','In Progress'],
    declined:         ['#fee2e2','#991b1b','Declined'],
    paid:             ['#d1fae5','#065f46','Verified'],
  };
  const [bg, text, label] = map[status] || ['#f3f4f6','#374151', status];
  return `<span style="background:${bg};color:${text};padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;">${label}</span>`;
}

function itemsTable(items) {
  if (!items || !items.length) return '';
  const rows = items.map(item =>
    `<tr>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;">${item.product_name || item.name}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatPKR(item.product_price || item.price)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${formatPKR(item.subtotal || (item.product_price || item.price) * item.quantity)}</td>
    </tr>`
  ).join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;">
    <thead><tr style="background:#f8f8f8;">
      <th style="padding:9px 12px;text-align:left;color:#555;font-weight:600;">Product</th>
      <th style="padding:9px 12px;text-align:center;color:#555;font-weight:600;">Qty</th>
      <th style="padding:9px 12px;text-align:right;color:#555;font-weight:600;">Price</th>
      <th style="padding:9px 12px;text-align:right;color:#555;font-weight:600;">Subtotal</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function totalRow(amount) {
  return `<div style="text-align:right;font-size:18px;font-weight:700;color:#111;padding:10px 12px;border-top:2px solid #111;margin-bottom:20px;">
    Total: ${formatPKR(amount)}
  </div>`;
}

function contactFooter() {
  return `<p style="margin:20px 0 0;color:#555;font-size:13px;line-height:1.7;">
    Questions? Contact us:<br>
    📞 <strong>${SHOP_PHONE}</strong><br>
    📍 ${SHOP_ADDRESS}
  </p>`;
}

function reasonBox(reason) {
  return `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
    <p style="margin:0;color:#991b1b;font-size:13px;font-weight:600;">Reason:</p>
    <p style="margin:6px 0 0;color:#7f1d1d;font-size:13px;">${reason || 'No reason provided.'}</p>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// ORDER EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

function orderStatusUpdateHtml(order, newStatus) {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const messages = {
    processing:       'Great news! Your order is being prepared and will be shipped soon.',
    shipped:          'Your order is on its way! Expect delivery within 1–3 business days.',
    delivered:        'Your order has been delivered. We hope you love it!',
    cancelled:        'Your order has been cancelled. Contact us if you have questions.',
    payment_rejected: 'There is an issue with your payment. Please resubmit your payment proof.',
  };
  const msg = messages[newStatus] || 'Your order status has been updated.';
  const isPositive = ['processing', 'shipped', 'delivered'].includes(newStatus);

  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">Hi <strong>${order.customer_name}</strong>,</p>
    <p style="margin:0 0 20px;color:#333;font-size:15px;">${msg}</p>
    ${infoBox([
      ['Order ID', `<span style="font-family:monospace;">#${shortId}</span>`],
      ['Date', formatDate(order.created_at)],
      ['New Status', statusBadge(newStatus)],
      ['Total', `<strong>${formatPKR(order.total_amount)}</strong>`],
    ])}
    ${contactFooter()}
  `;
  return baseLayout(
    banner(isPositive ? '#3b82f6' : '#ef4444', '📦', `Order #${shortId} — Status Updated`),
    body
  );
}

function orderApprovedHtml(order, items) {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">Hi <strong>${order.customer_name}</strong>, great news! Your order has been approved and is now being processed.</p>
    ${infoBox([
      ['Order ID', `<span style="font-family:monospace;">#${shortId}</span>`],
      ['Date', formatDate(order.created_at)],
      ['Status', statusBadge('processing')],
      ['Payment', (order.payment_method || 'COD').toUpperCase()],
    ])}
    ${items.length ? `<h3 style="margin:0 0 10px;color:#111;font-size:14px;font-weight:600;">Order Summary</h3>${itemsTable(items)}${totalRow(order.total_amount)}` : ''}
    ${infoBox([
      ['Deliver to', order.customer_name],
      ['Phone', order.customer_phone],
      ['Address', order.delivery_address],
    ])}
    ${contactFooter()}
  `;
  return baseLayout(banner('#22c55e', '✓', `Order #${shortId} Approved — We Are Processing It!`), body);
}

function orderDeclinedHtml(order, reason) {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">Hi <strong>${order.customer_name}</strong>, unfortunately we could not process order #${shortId}.</p>
    ${infoBox([
      ['Order ID', `<span style="font-family:monospace;">#${shortId}</span>`],
      ['Date', formatDate(order.created_at)],
      ['Status', statusBadge('cancelled')],
      ['Total', formatPKR(order.total_amount)],
    ])}
    ${reasonBox(reason)}
    <p style="margin:0 0 20px;color:#555;font-size:13px;">Please contact us if you believe this is an error or to place a new order.</p>
    ${contactFooter()}
  `;
  return baseLayout(banner('#ef4444', '✗', `Order #${shortId} — Order Declined`), body);
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

function paymentApprovedHtml(order, items) {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">Hi <strong>${order.customer_name}</strong>, your payment has been verified! Your order is now being processed.</p>
    ${infoBox([
      ['Order ID', `<span style="font-family:monospace;">#${shortId}</span>`],
      ['Payment', statusBadge('paid')],
      ['Order Status', statusBadge('processing')],
      ['Total Paid', `<strong>${formatPKR(order.total_amount)}</strong>`],
    ])}
    ${items.length ? `<h3 style="margin:0 0 10px;color:#111;font-size:14px;font-weight:600;">Order Summary</h3>${itemsTable(items)}${totalRow(order.total_amount)}` : ''}
    ${contactFooter()}
  `;
  return baseLayout(banner('#22c55e', '✓', `Payment Verified — Order #${shortId} Is Now Processing`), body);
}

function paymentDeclinedHtml(order, reason) {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">Hi <strong>${order.customer_name}</strong>, we could not verify your payment for order #${shortId}.</p>
    ${reasonBox(reason)}
    ${infoBox([
      ['Order ID', `<span style="font-family:monospace;">#${shortId}</span>`],
      ['Order Total', `<strong>${formatPKR(order.total_amount)}</strong>`],
      ['Action Needed', 'Resubmit payment proof'],
    ])}
    <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
      Please log in to your account and resubmit your payment proof, or contact us directly for assistance.
    </p>
    ${contactFooter()}
  `;
  return baseLayout(banner('#f97316', '⚠️', `Payment Issue — Order #${shortId} — Action Required`), body);
}

function paymentRefundedHtml(order, walletNumber, notes) {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const refundRows = [
    ['Order ID', `<span style="font-family:monospace;">#${shortId}</span>`],
    ['Refund Amount', `<strong>${formatPKR(order.total_amount)}</strong>`],
  ];
  if (walletNumber) refundRows.push(['Refund Account', `<strong>${walletNumber}</strong>`]);
  if (notes) refundRows.push(['Notes', notes]);

  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">Hi <strong>${order.customer_name}</strong>, your refund for order #${shortId} has been processed.</p>
    ${infoBox(refundRows)}
    <p style="margin:0 0 20px;color:#555;font-size:13px;line-height:1.6;">
      The refund will be credited to your account within 1–3 business days depending on your payment method. If you haven't received it after 3 days, please contact us.
    </p>
    ${contactFooter()}
  `;
  return baseLayout(banner('#6366f1', '↩', `Refund Processed — Order #${shortId}`), body);
}

// ═══════════════════════════════════════════════════════════════
// REPAIR EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

function repairBookingCustomerHtml(repair) {
  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">Hi <strong>${repair.customer_name}</strong>, your repair request has been received! Please save your tracking code.</p>

    <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
      <p style="margin:0;color:#666;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your Tracking Code</p>
      <p style="margin:8px 0 0;color:#166534;font-size:28px;font-weight:800;font-family:monospace;letter-spacing:3px;">${repair.tracking_code}</p>
      <p style="margin:6px 0 0;color:#4ade80;font-size:12px;">Use this code to track your repair at any time</p>
    </div>

    ${infoBox([
      ['Device', `${repair.device_make} ${repair.device_model}`],
      ['Issue', repair.issue],
      ['Submitted', formatDate(repair.created_at)],
      ['Status', statusBadge('created')],
    ])}

    <h3 style="margin:0 0 12px;color:#111;font-size:14px;font-weight:600;">What Happens Next?</h3>
    <div style="font-size:13px;color:#444;line-height:2;">
      <p style="margin:0;">① Our team will review your request within 24 hours.</p>
      <p style="margin:0;">② You'll receive an approval email with a visit date/time.</p>
      <p style="margin:0;">③ Visit our shop or arrange a pickup — we'll diagnose and quote before proceeding.</p>
    </div>
    ${contactFooter()}
  `;
  return baseLayout(banner('#22c55e', '🔧', 'Repair Request Confirmed!'), body);
}

function repairBookingAdminHtml(repair) {
  const rows = [
    ['Customer', `<strong>${repair.customer_name}</strong>`],
    ['Email', repair.customer_email || 'Not provided'],
    ['Phone', repair.customer_phone],
    ['Device', `<strong>${repair.device_make} ${repair.device_model}</strong>`],
    ['Issue', repair.issue],
    ['Tracking', `<span style="font-family:monospace;">${repair.tracking_code}</span>`],
    ['Submitted', formatDate(repair.created_at)],
  ];

  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">A new repair request has been submitted. Review it in the admin panel.</p>
    ${infoBox(rows)}
    ${repair.description ? `
      <div style="background:#f9f9f9;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#666;font-weight:600;">Customer Description:</p>
        <p style="margin:8px 0 0;font-size:13px;color:#111;">${repair.description}</p>
      </div>` : ''}
    <p style="margin:0;color:#555;font-size:13px;">Log in to the <strong>Admin Panel → Repairs</strong> to approve or decline this request.</p>
  `;
  return baseLayout(banner('#f97316', '🔧', `New Repair — ${repair.device_make} ${repair.device_model} — ${repair.customer_name}`), body);
}

function repairApprovedHtml(repair, visitDate, note) {
  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">Hi <strong>${repair.customer_name}</strong>, your repair request has been approved!</p>
    ${infoBox([
      ['Tracking', `<span style="font-family:monospace;">${repair.tracking_code}</span>`],
      ['Device', `${repair.device_make} ${repair.device_model}`],
      ['Issue', repair.issue],
      ['Status', statusBadge('in_progress')],
      ['Visit Date/Time', visitDate ? `<strong>${visitDate}</strong>` : 'Our team will call you to schedule'],
    ])}
    ${note ? `
      <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;color:#1e40af;font-size:13px;font-weight:600;">Note from our team:</p>
        <p style="margin:6px 0 0;color:#1e3a8a;font-size:13px;">${note}</p>
      </div>` : ''}
    <h3 style="margin:0 0 10px;color:#111;font-size:14px;font-weight:600;">Shop Location</h3>
    <p style="margin:0 0 6px;color:#555;font-size:13px;">📍 ${SHOP_ADDRESS}</p>
    <p style="margin:0 0 20px;color:#555;font-size:13px;">🕐 Mon–Sat, 10 AM – 10 PM</p>
    ${contactFooter()}
  `;
  return baseLayout(banner('#22c55e', '✓', 'Repair Approved — Visit Scheduled'), body);
}

function repairDeclinedHtml(repair, reason) {
  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">Hi <strong>${repair.customer_name}</strong>, unfortunately we cannot process your repair request at this time.</p>
    ${infoBox([
      ['Tracking', `<span style="font-family:monospace;">${repair.tracking_code}</span>`],
      ['Device', `${repair.device_make} ${repair.device_model}`],
      ['Issue', repair.issue],
      ['Status', statusBadge('declined')],
    ])}
    ${reasonBox(reason)}
    <p style="margin:0 0 20px;color:#555;font-size:13px;">Feel free to contact us to discuss alternatives, or submit a new repair request for a different issue.</p>
    ${contactFooter()}
  `;
  return baseLayout(banner('#ef4444', '✗', 'Repair Request Declined'), body);
}

function repairCompletedHtml(repair) {
  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">Hi <strong>${repair.customer_name}</strong>, your device is repaired and ready for pickup! 🎉</p>
    ${infoBox([
      ['Tracking', `<span style="font-family:monospace;">${repair.tracking_code}</span>`],
      ['Device', `${repair.device_make} ${repair.device_model}`],
      ['Repair', repair.issue],
      ['Status', statusBadge('delivered')],
    ])}
    <h3 style="margin:0 0 10px;color:#111;font-size:14px;font-weight:600;">Pickup Details</h3>
    <p style="margin:0 0 4px;color:#555;font-size:13px;">📍 ${SHOP_ADDRESS}</p>
    <p style="margin:0 0 20px;color:#555;font-size:13px;">🕐 Mon–Sat, 10 AM – 10 PM</p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;color:#166534;font-size:13px;font-weight:600;">🛡️ 90-Day Warranty Included</p>
      <p style="margin:6px 0 0;color:#166534;font-size:13px;">If the same issue recurs within 90 days, bring it back — we will fix it free of charge.</p>
    </div>
    <p style="margin:0 0 20px;color:#555;font-size:13px;">Please bring this email or your tracking code when collecting your device.</p>
    ${contactFooter()}
  `;
  return baseLayout(banner('#22c55e', '✅', 'Your Device is Ready for Pickup!'), body);
}

// ═══════════════════════════════════════════════════════════════
// PART REQUEST EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

function partRequestNewCustomerHtml(req) {
  const shortId = req.id ? `#${req.id.slice(0, 8).toUpperCase()}` : '';
  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">Hi <strong>${req.name}</strong>, we have received your part request. Our team will review it and get back to you within 24 hours.</p>
    ${infoBox([
      ['Request ID',  `<span style="font-family:monospace;">${shortId}</span>`],
      ['Part Name',   `<strong>${req.part_name}</strong>`],
      ['Category',    req.category],
      ['Submitted',   formatDate(req.created_at || new Date().toISOString())],
      ['Status',      statusBadge('pending')],
    ])}
    ${req.part_details ? `
      <div style="background:#f9f9f9;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#666;font-weight:600;">Your Description:</p>
        <p style="margin:8px 0 0;font-size:13px;color:#111;">${req.part_details}</p>
      </div>` : ''}
    <h3 style="margin:0 0 10px;color:#111;font-size:14px;font-weight:600;">What Happens Next?</h3>
    <div style="font-size:13px;color:#444;line-height:2;">
      <p style="margin:0;">① Our team reviews your request and checks supplier availability.</p>
      <p style="margin:0;">② You'll receive an email with pricing and availability within 24 hours.</p>
      <p style="margin:0;">③ If approved, we'll arrange delivery or pickup at your convenience.</p>
    </div>
    ${contactFooter()}
  `;
  return baseLayout(banner('#22c55e', '📦', 'Part Request Received!'), body);
}

function partRequestNewAdminHtml(req) {
  const shortId = req.id ? `#${req.id.slice(0, 8).toUpperCase()}` : '';
  const rows = [
    ['Customer',    `<strong>${req.name}</strong>`],
    ['Email',       req.email],
    ['Phone',       req.phone],
    ['Category',    `<strong>${req.category}</strong>`],
    ['Part Name',   `<strong>${req.part_name}</strong>`],
    ['Submitted',   formatDate(req.created_at || new Date().toISOString())],
    ['Request ID',  `<span style="font-family:monospace;">${shortId}</span>`],
  ];
  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">A new part request has been submitted. Review it in the admin panel.</p>
    ${infoBox(rows)}
    ${req.part_details ? `
      <div style="background:#f9f9f9;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#666;font-weight:600;">Customer Description:</p>
        <p style="margin:8px 0 0;font-size:13px;color:#111;">${req.part_details}</p>
      </div>` : ''}
    ${req.image_url ? `
      <p style="margin:0 0 8px;font-size:13px;color:#666;font-weight:600;">Reference Image:</p>
      <a href="${req.image_url}" target="_blank">
        <img src="${req.image_url}" alt="Part reference" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid #eee;object-fit:contain;">
      </a>` : ''}
    <p style="margin:20px 0 0;color:#555;font-size:13px;">Log in to <strong>Admin Panel → Part Requests</strong> to approve or reject.</p>
  `;
  return baseLayout(banner('#f97316', '📦', `New Part Request — ${req.part_name} — ${req.name}`), body);
}

function partRequestStatusUpdateHtml(req, newStatus, adminNotes) {
  const shortId = req.id ? `#${req.id.slice(0, 8).toUpperCase()}` : '';
  const isApproved = newStatus === 'approved';
  const bannerColor = isApproved ? '#22c55e' : '#ef4444';
  const bannerText = isApproved ? `Part Request ${shortId} Approved!` : `Part Request ${shortId} Update`;
  const intro = isApproved
    ? `Great news! We have reviewed your part request and we can source it for you.`
    : `We have reviewed your part request and unfortunately we are unable to fulfill it at this time.`;

  const body = `
    <p style="margin:0 0 20px;color:#333;font-size:15px;">Hi <strong>${req.name}</strong>, ${intro}</p>
    ${infoBox([
      ['Request ID',  `<span style="font-family:monospace;">${shortId}</span>`],
      ['Part Name',   `<strong>${req.part_name}</strong>`],
      ['Category',    req.category],
      ['Status',      statusBadge(isApproved ? 'processing' : 'cancelled')],
    ])}
    ${adminNotes ? `
      <div style="background:${isApproved ? '#eff6ff' : '#fef2f2'};border:1px solid ${isApproved ? '#93c5fd' : '#fca5a5'};border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;color:${isApproved ? '#1e40af' : '#991b1b'};font-size:13px;font-weight:600;">Message from our team:</p>
        <p style="margin:6px 0 0;color:${isApproved ? '#1e3a8a' : '#7f1d1d'};font-size:13px;">${adminNotes}</p>
      </div>` : ''}
    ${isApproved ? `
      <p style="margin:0 0 20px;color:#555;font-size:13px;line-height:1.6;">
        Please contact us to confirm your order and arrange payment and delivery.
      </p>` : `
      <p style="margin:0 0 20px;color:#555;font-size:13px;line-height:1.6;">
        Feel free to submit a new request for a different part or contact us directly for assistance.
      </p>`}
    ${contactFooter()}
  `;
  return baseLayout(banner(bannerColor, isApproved ? '✓' : '✗', bannerText), body);
}

// ═══════════════════════════════════════════════════════════════
// ORIGINAL: Order creation email (customer + admin)
// ═══════════════════════════════════════════════════════════════

function customerEmailHtml(order, items) {
  const shortId = order.id.substring(0, 8).toUpperCase();
  const rows = items.map(item =>
    `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${item.product_name || item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatPKR(item.product_price || item.price)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${formatPKR(item.subtotal || (item.product_price || item.price) * item.quantity)}</td>
    </tr>`).join('');

  const itemsTableHtml = `<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:14px;">
    <thead><tr style="background:#f8f8f8;">
      <th style="padding:10px 12px;text-align:left;font-weight:600;color:#555;">Product</th>
      <th style="padding:10px 12px;text-align:center;font-weight:600;color:#555;">Qty</th>
      <th style="padding:10px 12px;text-align:right;font-weight:600;color:#555;">Price</th>
      <th style="padding:10px 12px;text-align:right;font-weight:600;color:#555;">Subtotal</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;

  const body = `
    <p style="margin:0 0 24px;color:#333;font-size:15px;">
      Hi <strong>${order.customer_name}</strong>, thank you for your order! We have received it and will process it shortly.
    </p>
    ${infoBox([
      ['Order ID', `<span style="font-family:monospace;">#${shortId}</span>`],
      ['Date', formatDate(order.created_at)],
      ['Payment', (order.payment_method || 'Cash on Delivery').toUpperCase()],
      ['Status', statusBadge('pending')],
    ])}
    <h3 style="margin:0 0 12px;color:#111;font-size:15px;font-weight:600;">Order Summary</h3>
    ${itemsTableHtml}
    ${totalRow(order.total_amount)}
    ${infoBox([
      ['Name', order.customer_name],
      ['Phone', order.customer_phone],
      ['Address', order.delivery_address],
      ...(order.notes ? [['Notes', order.notes]] : []),
    ])}
    ${contactFooter()}
  `;
  return baseLayout(banner('#22c55e', '✓', 'Order Placed Successfully!'), body);
}

function adminEmailHtml(order, items) {
  const shortId = order.id.substring(0, 8).toUpperCase();
  const itemsList = items.map(item =>
    `• ${item.product_name || item.name} × ${item.quantity} — ${formatPKR(item.subtotal || (item.product_price || item.price) * item.quantity)}`
  ).join('<br>');

  const body = `
    ${infoBox([
      ['Customer', `<strong>${order.customer_name}</strong>`],
      ['Email', order.customer_email || 'Not provided'],
      ['Phone', order.customer_phone],
      ['Address', order.delivery_address],
      ...(order.notes ? [['Notes', order.notes]] : []),
    ])}
    ${infoBox([
      ['Order ID', `<span style="font-family:monospace;">${order.id}</span>`],
      ['Date', formatDate(order.created_at)],
      ['Total', `<strong style="font-size:16px;">${formatPKR(order.total_amount)}</strong>`],
      ['Payment', (order.payment_method || 'cod').toUpperCase()],
      ['Pay Status', statusBadge('pending')],
    ])}
    <h3 style="margin:0 0 12px;color:#111;font-size:14px;font-weight:600;">Items Ordered</h3>
    <div style="background:#f9f9f9;border-radius:8px;padding:16px 20px;line-height:2;font-size:14px;color:#333;">
      ${itemsList}
    </div>
  `;
  return baseLayout(banner('#f97316', '🛍️', `New Order #${shortId} — ${order.customer_name} — ${formatPKR(order.total_amount)}`), body);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * Send order confirmation to customer + notification to admin.
 * Called by create-order endpoint. Silently skips if credentials not set.
 */
export async function sendOrderEmails(order, items) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log('[email] GMAIL credentials not set — skipping order emails');
    return;
  }
  const transporter = createTransporter();
  const shortId = order.id.substring(0, 8).toUpperCase();
  const from = `"Dilbar Mobiles" <${GMAIL_USER}>`;
  const promises = [];

  if (order.customer_email) {
    promises.push(
      transporter.sendMail({
        from,
        to: order.customer_email,
        subject: `Order Confirmation #${shortId} — Dilbar Mobiles`,
        html: customerEmailHtml(order, items),
      })
        .then(() => console.log(`[email] Order confirmation → ${order.customer_email}`))
        .catch(err => console.error('[email] Customer email failed:', err.message))
    );
  }

  promises.push(
    transporter.sendMail({
      from,
      to: ADMIN_EMAIL,
      subject: `New Order #${shortId} — ${order.customer_name} — ${formatPKR(order.total_amount)}`,
      html: adminEmailHtml(order, items),
    })
      .then(() => console.log(`[email] Admin notification → ${ADMIN_EMAIL}`))
      .catch(err => console.error('[email] Admin email failed:', err.message))
  );

  await Promise.all(promises);
}

/**
 * Unified dispatcher for all other notification types.
 * Called by the POST /functions/v1/send-order-email endpoint.
 *
 * @param {string} type - Email type (see switch cases below)
 * @param {object} payload - Relevant data for the email
 */
export async function sendEmailForType(type, {
  order     = null,
  items     = [],
  payment   = null,
  repair    = null,
  newStatus = null,
  declineReason = null,
  visitDate = null,
  customNote = null,
} = {}) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log(`[email] credentials not set — skipping ${type}`);
    return;
  }

  const transporter = createTransporter();
  const from = `"Dilbar Mobiles" <${GMAIL_USER}>`;

  // Helper — send one email and log result
  const send = (to, subject, html) =>
    transporter.sendMail({ from, to, subject, html })
      .then(() => console.log(`[email] ${type} → ${to} ✓`))
      .catch(err => { throw new Error(`Failed to send to ${to}: ${err.message}`); });

  switch (type) {

    // ── Order status changed (generic dropdown in admin) ──────
    case 'order_status_update': {
      if (!order?.customer_email) { console.log('[email] order_status_update: no customer email'); return; }
      const shortId = order.id.slice(0, 8).toUpperCase();
      await send(
        order.customer_email,
        `Order #${shortId} Status Updated — Dilbar Mobiles`,
        orderStatusUpdateHtml(order, newStatus)
      );
      break;
    }

    // ── Admin clicked "Approve Order" ─────────────────────────
    case 'order_approved': {
      if (!order?.customer_email) { console.log('[email] order_approved: no customer email'); return; }
      const shortId = order.id.slice(0, 8).toUpperCase();
      await send(
        order.customer_email,
        `✓ Order #${shortId} Approved — Dilbar Mobiles`,
        orderApprovedHtml(order, items)
      );
      break;
    }

    // ── Admin clicked "Decline Order" ─────────────────────────
    case 'order_declined': {
      if (!order?.customer_email) { console.log('[email] order_declined: no customer email'); return; }
      const shortId = order.id.slice(0, 8).toUpperCase();
      await send(
        order.customer_email,
        `Order #${shortId} Update — Dilbar Mobiles`,
        orderDeclinedHtml(order, declineReason)
      );
      break;
    }

    // ── Admin approved payment proof ──────────────────────────
    case 'payment_approved': {
      if (!order?.customer_email) { console.log('[email] payment_approved: no customer email'); return; }
      const shortId = order.id.slice(0, 8).toUpperCase();
      await send(
        order.customer_email,
        `✓ Payment Verified — Order #${shortId} Processing — Dilbar Mobiles`,
        paymentApprovedHtml(order, items)
      );
      break;
    }

    // ── Admin rejected payment proof ──────────────────────────
    case 'payment_declined': {
      if (!order?.customer_email) { console.log('[email] payment_declined: no customer email'); return; }
      const shortId = order.id.slice(0, 8).toUpperCase();
      await send(
        order.customer_email,
        `⚠️ Payment Issue — Order #${shortId} — Action Required — Dilbar Mobiles`,
        paymentDeclinedHtml(order, declineReason)
      );
      break;
    }

    // ── Admin processed refund ────────────────────────────────
    case 'payment_refunded': {
      if (!order?.customer_email) { console.log('[email] payment_refunded: no customer email'); return; }
      const shortId = order.id.slice(0, 8).toUpperCase();
      const walletNumber = payment?.refund_wallet_number || '';
      await send(
        order.customer_email,
        `Refund Processed — Order #${shortId} — Dilbar Mobiles`,
        paymentRefundedHtml(order, walletNumber, customNote)
      );
      break;
    }

    // ── Customer booked a repair ──────────────────────────────
    case 'repair_booked': {
      if (!repair) { console.log('[email] repair_booked: no repair data'); return; }
      const promises = [];
      if (repair.customer_email) {
        promises.push(send(
          repair.customer_email,
          `Repair Confirmed — ${repair.tracking_code} — Dilbar Mobiles`,
          repairBookingCustomerHtml(repair)
        ));
      }
      promises.push(send(
        ADMIN_EMAIL,
        `🔧 New Repair — ${repair.device_make} ${repair.device_model} — ${repair.customer_name}`,
        repairBookingAdminHtml(repair)
      ));
      await Promise.all(promises);
      break;
    }

    // ── Admin approved repair ─────────────────────────────────
    case 'repair_approved': {
      if (!repair?.customer_email) { console.log('[email] repair_approved: no customer email'); return; }
      await send(
        repair.customer_email,
        `✓ Repair Approved — ${repair.tracking_code} — Dilbar Mobiles`,
        repairApprovedHtml(repair, visitDate, customNote)
      );
      break;
    }

    // ── Admin declined repair ─────────────────────────────────
    case 'repair_declined': {
      if (!repair?.customer_email) { console.log('[email] repair_declined: no customer email'); return; }
      await send(
        repair.customer_email,
        `Repair Request Update — ${repair.tracking_code} — Dilbar Mobiles`,
        repairDeclinedHtml(repair, declineReason)
      );
      break;
    }

    // ── Admin marked repair as complete / delivered ───────────
    case 'repair_completed': {
      if (!repair?.customer_email) { console.log('[email] repair_completed: no customer email'); return; }
      await send(
        repair.customer_email,
        `✅ Your Device is Ready for Pickup! — ${repair.tracking_code} — Dilbar Mobiles`,
        repairCompletedHtml(repair)
      );
      break;
    }

    default:
      console.log(`[email] Unknown type: "${type}" — no email sent`);
  }
}

/**
 * Part request emails — new submission (customer + admin) and status update (customer).
 * Called by POST /functions/v1/send-part-request-email
 */
export async function sendPartRequestEmail(type, { request, newStatus, adminNotes } = {}) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log(`[email] credentials not set — skipping part-request ${type}`);
    return;
  }
  if (!request) { console.log('[email] sendPartRequestEmail: no request data'); return; }

  const transporter = createTransporter();
  const from = `"Dilbar Mobiles" <${GMAIL_USER}>`;
  const send = (to, subject, html) =>
    transporter.sendMail({ from, to, subject, html })
      .then(() => console.log(`[email] part-request ${type} → ${to} ✓`))
      .catch(err => { throw new Error(`Failed to send to ${to}: ${err.message}`); });

  if (type === 'new') {
    const promises = [];
    if (request.email) {
      promises.push(send(
        request.email,
        `Part Request Received — ${request.part_name} — Dilbar Mobiles`,
        partRequestNewCustomerHtml(request)
      ));
    }
    promises.push(send(
      ADMIN_EMAIL,
      `📦 New Part Request — ${request.part_name} — ${request.name}`,
      partRequestNewAdminHtml(request)
    ));
    await Promise.all(promises);

  } else if (type === 'status_update') {
    if (!request.email) { console.log('[email] part-request status_update: no customer email'); return; }
    const isApproved = newStatus === 'approved';
    await send(
      request.email,
      `${isApproved ? '✓ Part Request Approved' : 'Part Request Update'} — ${request.part_name} — Dilbar Mobiles`,
      partRequestStatusUpdateHtml(request, newStatus, adminNotes)
    );

  } else {
    console.log(`[email] sendPartRequestEmail: unknown type "${type}"`);
  }
}
