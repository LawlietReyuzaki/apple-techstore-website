import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Direct SMTP email sending using Gmail
async function sendEmailViaSMTP(to: string, subject: string, htmlContent: string, textContent: string): Promise<boolean> {
  const GMAIL_USER = Deno.env.get("GMAIL_SENDER_EMAIL");
  const GMAIL_PASS = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!GMAIL_USER || !GMAIL_PASS) {
    console.error("Gmail credentials not configured");
    throw new Error("Email service not configured");
  }

  try {
    // Connect to Gmail SMTP
    const conn = await Deno.connectTls({
      hostname: "smtp.gmail.com",
      port: 465,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      return decoder.decode(buffer.subarray(0, n || 0));
    };

    const sendCommand = async (command: string): Promise<string> => {
      await conn.write(encoder.encode(command + "\r\n"));
      return await readResponse();
    };

    // SMTP handshake
    await readResponse(); // Initial greeting
    await sendCommand("EHLO gmail.com");
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(GMAIL_USER));
    await sendCommand(btoa(GMAIL_PASS));
    await sendCommand(`MAIL FROM:<${GMAIL_USER}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    // Construct email with proper headers
    const boundary = "----=_Part_" + Math.random().toString(36).substring(2);
    const emailContent = [
      `From: "Mobile Shop" <${GMAIL_USER}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      textContent,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlContent,
      ``,
      `--${boundary}--`,
      `.`
    ].join("\r\n");

    await sendCommand(emailContent);
    await sendCommand("QUIT");
    conn.close();

    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error("SMTP Error:", error);
    throw error;
  }
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get email HTML content
function getOTPEmailHTML(otp: string, newEmail: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px 40px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                📧 Email Verification
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello,
              </p>
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                You have requested to change your email address to <strong>${newEmail}</strong>. Please use the following verification code to complete the process:
              </p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 10px; color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">
                  Your Verification Code
                </p>
                <div style="font-size: 42px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otp}
                </div>
              </div>
              
              <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                ⏰ This code will expire in <strong>10 minutes</strong>.
              </p>
              
              <p style="margin: 0 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                If you did not request this email change, please ignore this email or contact support immediately.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">
              
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                This is an automated message from Mobile Shop Admin Panel.<br>
                Please do not reply to this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 40px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                © 2024 Mobile Shop. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getOTPEmailText(otp: string, newEmail: string): string {
  return `
Email Verification

Hello,

You have requested to change your email address to ${newEmail}.

Your Verification Code: ${otp}

This code will expire in 10 minutes.

If you did not request this email change, please ignore this email or contact support immediately.

---
This is an automated message from Mobile Shop Admin Panel.
  `;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newEmail, currentEmail } = await req.json();

    if (!newEmail) {
      throw new Error("New email is required");
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`Generating OTP for email change: ${currentEmail} -> ${newEmail}`);

    // Send OTP email
    const subject = "🔐 Your Email Verification Code - Mobile Shop";
    const htmlContent = getOTPEmailHTML(otp, newEmail);
    const textContent = getOTPEmailText(otp, newEmail);

    await sendEmailViaSMTP(newEmail, subject, htmlContent, textContent);

    console.log(`OTP email sent to ${newEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification code sent",
        otp: otp, // Return OTP to store temporarily (in production, store in DB)
        expiresAt: expiresAt.toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email-verification-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send verification email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
