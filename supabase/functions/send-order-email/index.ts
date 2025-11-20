import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  orderId?: string;
  repairId?: string;
  type: 'order' | 'repair';
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
    return 'Email sent successfully';
  } catch (error) {
    conn.close();
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, repairId, type }: EmailRequest = await req.json();

    if (!orderId && !repairId) {
      return new Response(
        JSON.stringify({ error: 'Order ID or Repair ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let emailHtml = '';
    let emailText = '';
    let subject = '';
    let recipientEmail = '';
    const senderEmail = Deno.env.get('GMAIL_SENDER_EMAIL')!;

    if (type === 'order' && orderId) {
      // Fetch order details with items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('Error fetching order:', orderError);
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Set recipient to customer email
      recipientEmail = order.customer_email || senderEmail;

      const orderNumber = order.id.slice(0, 8).toUpperCase();
      const expectedDelivery = new Date();
      expectedDelivery.setDate(expectedDelivery.getDate() + 5); // 5 business days
      
      // Build order items HTML table
      const htmlItemsTable = order.order_items
        .map((item: any) => 
          `<tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.product_name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Rs ${item.product_price.toFixed(2)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Rs ${item.subtotal.toFixed(2)}</td>
          </tr>`
        )
        .join('');

      const itemsText = order.order_items
        .map((item: any) => 
          `${item.product_name} (x${item.quantity}) — Rs ${item.product_price.toFixed(2)}`
        )
        .join('\n');

      subject = `Order Confirmation - #${orderNumber}`;
      
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Order Confirmed!</h1>
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Thank you for your order</p>
                    </td>
                  </tr>

                  <!-- Greeting -->
                  <tr>
                    <td style="padding: 30px 30px 20px 30px;">
                      <p style="margin: 0; font-size: 16px; color: #333; line-height: 1.6;">
                        Hi <strong>${order.customer_name}</strong>,
                      </p>
                      <p style="margin: 15px 0 0 0; font-size: 16px; color: #666; line-height: 1.6;">
                        We've received your order and are getting it ready. Your order details are below.
                      </p>
                    </td>
                  </tr>

                  <!-- Order Info Box -->
                  <tr>
                    <td style="padding: 0 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef;">
                        <tr>
                          <td style="padding: 20px;">
                            <table width="100%">
                              <tr>
                                <td style="padding: 8px 0;">
                                  <span style="color: #666; font-size: 14px;">Order Number:</span><br>
                                  <span style="color: #333; font-size: 18px; font-weight: 600;">#${orderNumber}</span>
                                </td>
                                <td style="padding: 8px 0; text-align: right;">
                                  <span style="color: #666; font-size: 14px;">Order Date:</span><br>
                                  <span style="color: #333; font-size: 16px; font-weight: 500;">${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Divider -->
                  <tr>
                    <td style="padding: 25px 30px;">
                      <div style="border-top: 2px solid #e9ecef;"></div>
                    </td>
                  </tr>

                  <!-- Order Details Heading -->
                  <tr>
                    <td style="padding: 0 30px 15px 30px;">
                      <h2 style="margin: 0; font-size: 20px; color: #333; font-weight: 600;">Order Details</h2>
                    </td>
                  </tr>

                  <!-- Order Items Table -->
                  <tr>
                    <td style="padding: 0 30px 20px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e9ecef; border-radius: 6px; overflow: hidden;">
                        <thead>
                          <tr style="background-color: #f8f9fa;">
                            <th style="padding: 12px; text-align: left; font-size: 14px; color: #666; font-weight: 600; border-bottom: 2px solid #e9ecef;">Product</th>
                            <th style="padding: 12px; text-align: center; font-size: 14px; color: #666; font-weight: 600; border-bottom: 2px solid #e9ecef;">Qty</th>
                            <th style="padding: 12px; text-align: right; font-size: 14px; color: #666; font-weight: 600; border-bottom: 2px solid #e9ecef;">Price</th>
                            <th style="padding: 12px; text-align: right; font-size: 14px; color: #666; font-weight: 600; border-bottom: 2px solid #e9ecef;">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${htmlItemsTable}
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  <!-- Order Total -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0; text-align: right; font-size: 18px; color: #333;">
                            <strong>Total Amount:</strong>
                          </td>
                          <td style="padding: 8px 0 8px 20px; text-align: right; font-size: 22px; color: #667eea; font-weight: 700;">
                            Rs ${order.total_amount.toFixed(2)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Divider -->
                  <tr>
                    <td style="padding: 0 30px 25px 30px;">
                      <div style="border-top: 2px solid #e9ecef;"></div>
                    </td>
                  </tr>

                  <!-- Delivery Info -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px;">
                        <tr>
                          <td>
                            <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333; font-weight: 600;">📦 Expected Delivery</h3>
                            <p style="margin: 0; font-size: 16px; color: #667eea; font-weight: 600;">
                              ${expectedDelivery.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
                              (Estimated 3-5 business days)
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 20px;">
                            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333; font-weight: 600;">📍 Delivery Address</h3>
                            <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.6;">
                              ${order.delivery_address}
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 20px;">
                            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333; font-weight: 600;">💳 Payment Method</h3>
                            <p style="margin: 0; font-size: 14px; color: #666;">
                              ${order.payment_method === 'cod' ? 'Cash on Delivery (COD)' : order.payment_method}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Thank You Message -->
                  <tr>
                    <td style="padding: 0 30px 30px 30px; text-align: center;">
                      <p style="margin: 0; font-size: 16px; color: #333; line-height: 1.6;">
                        Thank you for shopping with us! 🎉
                      </p>
                      <p style="margin: 10px 0 0 0; font-size: 14px; color: #666; line-height: 1.6;">
                        If you have any questions, feel free to contact us at ${senderEmail}
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0; font-size: 12px; color: #999;">
                        © ${new Date().getFullYear()} Dilbar Mobiles. All rights reserved.
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

      emailText = `ORDER CONFIRMATION

Hi ${order.customer_name},

We've received your order and are getting it ready. Your order details are below.

ORDER NUMBER: #${orderNumber}
ORDER DATE: ${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

ORDER DETAILS:
${itemsText}

TOTAL AMOUNT: Rs ${order.total_amount.toFixed(2)}

EXPECTED DELIVERY: ${expectedDelivery.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
(Estimated 3-5 business days)

DELIVERY ADDRESS:
${order.delivery_address}

PAYMENT METHOD: ${order.payment_method === 'cod' ? 'Cash on Delivery (COD)' : order.payment_method}

Thank you for shopping with us!

If you have any questions, feel free to contact us at ${senderEmail}

© ${new Date().getFullYear()} Dilbar Mobiles. All rights reserved.
`;
    } else if (type === 'repair' && repairId) {
      // Fetch repair details
      const { data: repair, error: repairError } = await supabase
        .from('repairs')
        .select('*')
        .eq('id', repairId)
        .single();

      if (repairError || !repair) {
        console.error('Error fetching repair:', repairError);
        return new Response(
          JSON.stringify({ error: 'Repair not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Set recipient to admin email for repairs
      recipientEmail = senderEmail;

      subject = `New Repair Request: ${repair.tracking_code} — ${repair.device_make} ${repair.device_model}`;
      
      emailHtml = `
        <h2>New Repair Request</h2>
        <p><strong>Tracking Code:</strong> ${repair.tracking_code}<br/>
        <strong>Created:</strong> ${new Date(repair.created_at).toLocaleString()}<br/>
        <strong>Status:</strong> ${repair.status}</p>

        <h3>Device Details</h3>
        <ul>
          <li><strong>Make:</strong> ${repair.device_make}</li>
          <li><strong>Model:</strong> ${repair.device_model}</li>
          <li><strong>Issue:</strong> ${repair.issue}</li>
        </ul>

        ${repair.description ? `<h3>Description</h3><p>${repair.description}</p>` : ''}
        ${repair.estimated_cost ? `<p><strong>Estimated Cost:</strong> Rs ${repair.estimated_cost}</p>` : ''}
      `;

      emailText = `New Repair Request
Tracking Code: ${repair.tracking_code}
Created: ${new Date(repair.created_at).toLocaleString()}
Status: ${repair.status}

Device Details:
Make: ${repair.device_make}
Model: ${repair.device_model}
Issue: ${repair.issue}

${repair.description ? `Description:\n${repair.description}` : ''}
${repair.estimated_cost ? `Estimated Cost: Rs ${repair.estimated_cost}` : ''}
`;
    }

    // Get Gmail app password from environment
    const appPassword = Deno.env.get('GMAIL_APP_PASSWORD')!;

    // Remove spaces from app password
    const cleanPassword = appPassword.replace(/\s+/g, '');

    // Send email via SMTP
    await sendEmailViaSMTP(
      recipientEmail, // to
      senderEmail, // from
      subject,
      emailText,
      emailHtml,
      senderEmail,
      cleanPassword
    );

    console.log(`Email sent successfully for ${type}:`, type === 'order' ? orderId : repairId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification sent successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-order-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
