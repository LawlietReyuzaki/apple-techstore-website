const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = "appletwch2228@gmail.com";

interface PartRequestEmailPayload {
  type?: string;
  requestId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  category?: string;
  partName: string;
  partDetails?: string;
  imageUrl?: string;
  submittedDate?: string;
  newStatus?: string;
  adminNotes?: string;
}

async function sendEmailViaSMTP(
  to: string,
  from: string,
  subject: string,
  textBody: string,
  htmlBody: string,
  username: string,
  password: string
) {
  const hostname = 'smtp.gmail.com';
  const port = 465;

  // Connect to SMTP server with TLS
  const conn = await Deno.connectTls({ hostname, port });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    return decoder.decode(buffer.subarray(0, n || 0));
  }

  async function sendCommand(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + '\r\n'));
    return await readResponse();
  }

  try {
    // Read greeting
    await readResponse();

    // EHLO
    await sendCommand(`EHLO ${hostname}`);

    // AUTH LOGIN
    await sendCommand('AUTH LOGIN');
    await sendCommand(btoa(username));
    await sendCommand(btoa(password));

    // MAIL FROM
    await sendCommand(`MAIL FROM:<${from}>`);

    // RCPT TO
    await sendCommand(`RCPT TO:<${to}>`);

    // DATA
    await sendCommand('DATA');

    // Email content
    const boundary = '----=_Part_0_' + Date.now();
    const emailContent = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      textBody,
      '',
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      htmlBody,
      '',
      `--${boundary}--`,
      '.',
    ].join('\r\n');

    await conn.write(encoder.encode(emailContent + '\r\n'));
    await readResponse();

    // QUIT
    await sendCommand('QUIT');

    conn.close();
    console.log(`Email sent successfully to ${to}`);
    return 'Email sent successfully';
  } catch (error) {
    conn.close();
    console.error('SMTP Error:', error);
    throw error;
  }
}

function getNewRequestCustomerEmail(data: PartRequestEmailPayload): { subject: string; html: string; text: string } {
  const requestIdShort = data.requestId.slice(0, 8).toUpperCase();
  const subject = `Part Request Received - #${requestIdShort}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Part Request Received</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px;">Dear <strong>${data.customerName}</strong>,</p>
        
        <p>Thank you for submitting your part request. We have received your request and our team will review it shortly.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="margin-top: 0; color: #667eea;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Request ID:</td>
              <td style="padding: 8px 0; font-weight: bold;">#${requestIdShort}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Part Name:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.partName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Category:</td>
              <td style="padding: 8px 0;">${data.category || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Submitted Date:</td>
              <td style="padding: 8px 0;">${new Date(data.submittedDate || Date.now()).toLocaleDateString('en-US', { dateStyle: 'long' })}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                  Pending
                </span>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">
            <strong>What happens next?</strong><br>
            Our team will review your request and check availability with our suppliers. You'll receive an email notification once we have an update.
          </p>
        </div>
        
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666;">
          If you have any questions, feel free to contact us via WhatsApp: <strong>+92 334 2228141</strong>
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          <strong>AppleT Shop Team</strong><br>
          Shop No G15, China Center 2, Wallayat Complex, Bahria Town Phase 7, Rawalpindi
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Part Request Received

Dear ${data.customerName},

Thank you for submitting your part request. We have received your request and our team will review it shortly.

Request Details:
━━━━━━━━━━━━━━━━━━━━━
Request ID: #${requestIdShort}
Part Name: ${data.partName}
Category: ${data.category || 'N/A'}
Status: Pending

What happens next?
Our team will review your request and check availability with our suppliers. You'll receive an email notification once we have an update.

If you have any questions, feel free to contact us via WhatsApp: +92 334 2228141

Best regards,
AppleT Shop Team
Shop No G15, China Center 2, Wallayat Complex, Bahria Town Phase 7, Rawalpindi
`;

  return { subject, html, text };
}

function getNewRequestAdminEmail(data: PartRequestEmailPayload): { subject: string; html: string; text: string } {
  const requestIdShort = data.requestId.slice(0, 8).toUpperCase();
  const subject = `New Part Request - ${data.partName} from ${data.customerName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Part Request Received</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; color: #dc2626; font-weight: bold;">A new part request has been submitted and requires your attention.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ddd;">
          <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Customer Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 40%;">Name:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email:</td>
              <td style="padding: 8px 0;"><a href="mailto:${data.customerEmail}">${data.customerEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Phone:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.customerPhone || 'N/A'}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ddd;">
          <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Part Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 40%;">Request ID:</td>
              <td style="padding: 8px 0; font-family: monospace; font-weight: bold;">#${requestIdShort}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Category:</td>
              <td style="padding: 8px 0;">${data.category || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Part Name:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.partName}</td>
            </tr>
          </table>
          
          ${data.partDetails ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
            <p style="color: #666; margin-bottom: 5px;">Description:</p>
            <p style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 0;">${data.partDetails}</p>
          </div>
          ` : ''}
          
          ${data.imageUrl ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
            <p style="color: #666; margin-bottom: 10px;">Reference Image:</p>
            <img src="${data.imageUrl}" alt="Part reference" style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 1px solid #ddd;">
          </div>
          ` : ''}
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-weight: bold; color: #92400e;">
            Action Required: Please review this request in the Admin Panel
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `New Part Request Received

A new part request has been submitted and requires your attention.

Customer Information:
━━━━━━━━━━━━━━━━━━━━━
Name: ${data.customerName}
Email: ${data.customerEmail}
Phone: ${data.customerPhone || 'N/A'}

Part Details:
━━━━━━━━━━━━━━━━━━━━━
Request ID: #${requestIdShort}
Category: ${data.category || 'N/A'}
Part Name: ${data.partName}
${data.partDetails ? `Description: ${data.partDetails}` : ''}

Action Required: Please review this request in the Admin Panel
`;

  return { subject, html, text };
}

function getStatusUpdateEmail(data: PartRequestEmailPayload): { subject: string; html: string; text: string } {
  const requestIdShort = data.requestId.slice(0, 8).toUpperCase();
  const isApproved = data.newStatus === 'approved';
  const statusColor = isApproved ? '#22c55e' : '#dc2626';
  const statusBg = isApproved ? '#dcfce7' : '#fee2e2';
  const statusText = isApproved ? 'Approved' : 'Rejected';
  
  const subject = `Part Request #${requestIdShort} - Status Updated`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${statusColor}; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Part Request Update</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px;">Dear <strong>${data.customerName}</strong>,</p>
        
        <p>Your part request status has been updated.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Request ID:</td>
              <td style="padding: 8px 0; font-weight: bold;">#${requestIdShort}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Part Name:</td>
              <td style="padding: 8px 0; font-weight: bold;">${data.partName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">New Status:</td>
              <td style="padding: 8px 0;">
                <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                  ${statusText}
                </span>
              </td>
            </tr>
          </table>
        </div>
        
        ${data.adminNotes ? `
        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e40af;">Message from our team:</p>
          <p style="margin: 0; font-size: 14px;">${data.adminNotes}</p>
        </div>
        ` : ''}
        
        ${isApproved ? `
        <div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">
            <strong>Next Steps:</strong><br>
            Our team will contact you shortly with pricing and availability details. You can also reach out to us directly via WhatsApp.
          </p>
        </div>
        ` : `
        <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">
            We apologize that we couldn't fulfill your request at this time. Please feel free to submit another request or contact us for alternatives.
          </p>
        </div>
        `}
        
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666;">
          If you have any questions, feel free to contact us via WhatsApp: <strong>+92 334 2228141</strong>
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          <strong>AppleT Shop Team</strong><br>
          Shop No G15, China Center 2, Wallayat Complex, Bahria Town Phase 7, Rawalpindi
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Part Request Update

Dear ${data.customerName},

Your part request status has been updated.

Request Details:
━━━━━━━━━━━━━━━━━━━━━
Request ID: #${requestIdShort}
Part Name: ${data.partName}
New Status: ${statusText}

${data.adminNotes ? `Message from our team:\n${data.adminNotes}\n` : ''}

${isApproved 
  ? 'Next Steps:\nOur team will contact you shortly with pricing and availability details. You can also reach out to us directly via WhatsApp.'
  : 'We apologize that we couldn\'t fulfill your request at this time. Please feel free to submit another request or contact us for alternatives.'}

If you have any questions, feel free to contact us via WhatsApp: +92 334 2228141

Best regards,
AppleT Shop Team
Shop No G15, China Center 2, Wallayat Complex, Bahria Town Phase 7, Rawalpindi
`;

  return { subject, html, text };
}

Deno.serve(async (req) => {
  console.log("Part request email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: PartRequestEmailPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload, null, 2));

    // Get Gmail credentials from environment
    const senderEmail = Deno.env.get('GMAIL_SENDER_EMAIL');
    const appPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!senderEmail || !appPassword) {
      console.error('Missing Gmail credentials');
      return new Response(
        JSON.stringify({ error: 'Email configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanPassword = appPassword.replace(/\s+/g, '');
    const { type } = payload;

    if (type === 'status_update') {
      // Send status update email to customer
      const { subject, html, text } = getStatusUpdateEmail(payload);
      
      console.log(`Sending status update email to customer: ${payload.customerEmail}`);
      await sendEmailViaSMTP(
        payload.customerEmail,
        senderEmail,
        subject,
        text,
        html,
        senderEmail,
        cleanPassword
      );
      console.log("Status update email sent successfully");
    } else {
      // New request - send emails to both customer and admin
      const customerEmail = getNewRequestCustomerEmail(payload);
      console.log(`Sending confirmation email to customer: ${payload.customerEmail}`);
      await sendEmailViaSMTP(
        payload.customerEmail,
        senderEmail,
        customerEmail.subject,
        customerEmail.text,
        customerEmail.html,
        senderEmail,
        cleanPassword
      );
      console.log("Customer confirmation email sent");

      const adminNotification = getNewRequestAdminEmail(payload);
      console.log(`Sending notification email to admin: ${ADMIN_EMAIL}`);
      await sendEmailViaSMTP(
        ADMIN_EMAIL,
        senderEmail,
        adminNotification.subject,
        adminNotification.text,
        adminNotification.html,
        senderEmail,
        cleanPassword
      );
      console.log("Admin notification email sent");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Emails sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-part-request-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
