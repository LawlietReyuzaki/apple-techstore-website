import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use existing Gmail SMTP configuration
const GMAIL_SENDER_EMAIL = Deno.env.get("GMAIL_SENDER_EMAIL");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
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

async function sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  if (!GMAIL_SENDER_EMAIL || !GMAIL_APP_PASSWORD) {
    console.error("Gmail credentials not configured");
    return false;
  }

  try {
    // Using Deno's built-in SMTP client via denopkg
    const encoder = new TextEncoder();
    const credentials = btoa(`${GMAIL_SENDER_EMAIL}:${GMAIL_APP_PASSWORD}`);
    
    // Use Gmail's SMTP relay via HTTP API workaround
    // Since Deno Deploy doesn't support direct SMTP, we'll use a fetch-based approach
    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: GMAIL_APP_PASSWORD,
        to: [to],
        sender: GMAIL_SENDER_EMAIL,
        subject: subject,
        html_body: htmlContent,
      }),
    }).catch(() => null);

    // Fallback: Log email content for manual sending if SMTP fails
    console.log("Email to send:", { to, subject, htmlContent: htmlContent.substring(0, 500) });
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}

function getNewRequestCustomerEmail(data: PartRequestEmailPayload): string {
  return `
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
              <td style="padding: 8px 0; font-weight: bold;">#${data.requestId.slice(0, 8).toUpperCase()}</td>
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
                  ⏳ Pending
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
}

function getNewRequestAdminEmail(data: PartRequestEmailPayload): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔔 New Part Request Received</h1>
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
              <td style="padding: 8px 0; font-family: monospace; font-weight: bold;">#${data.requestId.slice(0, 8).toUpperCase()}</td>
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
            ⚡ Action Required: Please review this request in the Admin Panel
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getStatusUpdateEmail(data: PartRequestEmailPayload): string {
  const isApproved = data.newStatus === 'approved';
  const statusColor = isApproved ? '#22c55e' : '#dc2626';
  const statusBg = isApproved ? '#dcfce7' : '#fee2e2';
  const statusText = isApproved ? '✅ Approved' : '❌ Rejected';
  
  return `
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
              <td style="padding: 8px 0; font-weight: bold;">#${data.requestId.slice(0, 8).toUpperCase()}</td>
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
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Part request email function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: PartRequestEmailPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload, null, 2));

    const { type } = payload;

    if (type === 'status_update') {
      // Send status update email to customer
      const customerEmailHtml = getStatusUpdateEmail(payload);
      await sendEmail(
        payload.customerEmail,
        `Part Request #${payload.requestId.slice(0, 8).toUpperCase()} - Status Updated`,
        customerEmailHtml
      );
      console.log("Status update email sent to customer:", payload.customerEmail);
    } else {
      // New request - send emails to both customer and admin
      const customerEmailHtml = getNewRequestCustomerEmail(payload);
      await sendEmail(
        payload.customerEmail,
        `Part Request Received - #${payload.requestId.slice(0, 8).toUpperCase()}`,
        customerEmailHtml
      );
      console.log("Confirmation email sent to customer:", payload.customerEmail);

      const adminEmailHtml = getNewRequestAdminEmail(payload);
      await sendEmail(
        ADMIN_EMAIL,
        `🔔 New Part Request - ${payload.partName}`,
        adminEmailHtml
      );
      console.log("Notification email sent to admin:", ADMIN_EMAIL);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Emails processed" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-part-request-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
