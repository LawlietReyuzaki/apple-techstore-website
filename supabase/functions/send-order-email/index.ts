import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  orderId?: string;
  repairId?: string;
  type: 'repair_accepted' | 'repair_declined' | 'order_accepted' | 'order_declined';
  visitDate?: string;
  visitTime?: string;
  reason?: string;
  deliveryDate?: string;
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, repairId, type, visitDate, visitTime, reason, deliveryDate }: EmailRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let emailHtml = '';
    let emailText = '';
    let subject = '';
    let customerEmail = '';

    // Handle Repair Accepted
    if (type === 'repair_accepted' && repairId) {
      const { data: repair, error } = await supabase
        .from('repairs')
        .select('*')
        .eq('id', repairId)
        .single();

      if (error || !repair) throw new Error('Repair not found');

      customerEmail = repair.customer_email;
      subject = `✅ Repair Request Accepted - ${repair.tracking_code}`;

      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Great News!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your Repair Request Has Been Accepted</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear <strong>${repair.customer_name}</strong>,</p>
            
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              We're pleased to inform you that your repair request has been <strong style="color: #10b981;">APPROVED</strong>! 
              Our expert technicians are ready to service your device.
            </p>

            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 18px;">📋 Repair Details</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Tracking Code:</strong> ${repair.tracking_code}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Device:</strong> ${repair.device_make} ${repair.device_model}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Issue:</strong> ${repair.issue}</p>
              ${repair.estimated_cost ? `<p style="margin: 5px 0; color: #555;"><strong>Estimated Cost:</strong> Rs ${repair.estimated_cost}</p>` : ''}
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 18px;">📅 Visit Schedule</h3>
              <p style="margin: 5px 0; color: #78350f; font-size: 16px;"><strong>Date:</strong> ${visitDate || 'To be confirmed'}</p>
              <p style="margin: 5px 0; color: #78350f; font-size: 16px;"><strong>Time:</strong> ${visitTime || 'To be confirmed'}</p>
              <p style="margin: 15px 0 0 0; color: #92400e; font-weight: 600;">
                ⚠️ Please visit our shop at the scheduled date and time with your device.
              </p>
            </div>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">📍 Store Information</h3>
              <p style="margin: 5px 0; color: #6b7280;"><strong>Dilbar Mobiles</strong></p>
              <p style="margin: 5px 0; color: #6b7280;">Expert Mobile Repair Services</p>
              <p style="margin: 5px 0; color: #6b7280;">📞 Contact: +92 XXX XXXXXXX</p>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 25px; line-height: 1.6;">
              If you have any questions or need to reschedule, please contact us immediately.
            </p>

            <p style="font-size: 14px; color: #333; margin-top: 20px;">
              Best regards,<br/>
              <strong>Dilbar Mobiles Team</strong>
            </p>
          </div>
        </div>
      `;

      emailText = `Great News!
Your Repair Request Has Been Accepted

Dear ${repair.customer_name},

We're pleased to inform you that your repair request has been APPROVED!

Repair Details:
- Tracking Code: ${repair.tracking_code}
- Device: ${repair.device_make} ${repair.device_model}
- Issue: ${repair.issue}
${repair.estimated_cost ? `- Estimated Cost: Rs ${repair.estimated_cost}` : ''}

Visit Schedule:
- Date: ${visitDate || 'To be confirmed'}
- Time: ${visitTime || 'To be confirmed'}

Please visit our shop at the scheduled date and time with your device.

Store Information:
Dilbar Mobiles - Expert Mobile Repair Services
Contact: +92 XXX XXXXXXX

Best regards,
Dilbar Mobiles Team`;
    }

    // Handle Repair Declined
    else if (type === 'repair_declined' && repairId) {
      const { data: repair, error } = await supabase
        .from('repairs')
        .select('*')
        .eq('id', repairId)
        .single();

      if (error || !repair) throw new Error('Repair not found');

      customerEmail = repair.customer_email;
      subject = `❌ Repair Request Update - ${repair.tracking_code}`;

      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Repair Request Update</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear <strong>${repair.customer_name}</strong>,</p>
            
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              We regret to inform you that we are unable to proceed with your repair request at this time.
            </p>

            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 18px;">📋 Request Details</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Tracking Code:</strong> ${repair.tracking_code}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Device:</strong> ${repair.device_make} ${repair.device_model}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Issue:</strong> ${repair.issue}</p>
            </div>

            ${reason ? `
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">ℹ️ Reason</h3>
              <p style="margin: 0; color: #78350f; line-height: 1.6;">${reason}</p>
            </div>
            ` : ''}

            <p style="font-size: 15px; color: #555; margin-top: 25px; line-height: 1.6;">
              We sincerely apologize for any inconvenience this may cause. If you have any questions or would like to discuss 
              alternative solutions, please don't hesitate to contact us.
            </p>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">📞 Contact Support</h3>
              <p style="margin: 5px 0; color: #6b7280;">Phone: +92 XXX XXXXXXX</p>
              <p style="margin: 5px 0; color: #6b7280;">Email: support@dilbarmobiles.com</p>
            </div>

            <p style="font-size: 14px; color: #333; margin-top: 20px;">
              Thank you for considering Dilbar Mobiles.<br/>
              <strong>Dilbar Mobiles Team</strong>
            </p>
          </div>
        </div>
      `;

      emailText = `Repair Request Update

Dear ${repair.customer_name},

We regret to inform you that we are unable to proceed with your repair request at this time.

Request Details:
- Tracking Code: ${repair.tracking_code}
- Device: ${repair.device_make} ${repair.device_model}
- Issue: ${repair.issue}

${reason ? `Reason: ${reason}` : ''}

We sincerely apologize for any inconvenience. Please contact us if you have any questions.

Contact: +92 XXX XXXXXXX

Thank you,
Dilbar Mobiles Team`;
    }

    // Handle Order Accepted
    else if (type === 'order_accepted' && orderId) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

      if (orderError || !order) throw new Error('Order not found');

      customerEmail = order.customer_email;
      subject = `✅ Order Confirmed - Order #${order.id.slice(0, 8)}`;

      const htmlItems = order.order_items
        .map((item: any) => 
          `<tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.product_name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">Rs ${item.product_price.toFixed(2)}</td>
          </tr>`
        )
        .join('');

      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Order Confirmed!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Thank you for your purchase</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear <strong>${order.customer_name}</strong>,</p>
            
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              Great news! Your order has been <strong style="color: #10b981;">CONFIRMED</strong> and is being processed.
            </p>

            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="color: #065f46; margin: 0 0 10px 0; font-size: 18px;">📦 Order Summary</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Order Number:</strong> #${order.id.slice(0, 8)}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
              ${deliveryDate ? `<p style="margin: 5px 0; color: #555;"><strong>Estimated Delivery:</strong> ${deliveryDate}</p>` : ''}
            </div>

            <div style="margin: 20px 0;">
              <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">🛍️ Order Items</h3>
              <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 5px;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${htmlItems}
                  <tr style="background: #f3f4f6; font-weight: bold;">
                    <td colspan="2" style="padding: 12px; text-align: right;">Total Amount:</td>
                    <td style="padding: 12px; text-align: right; color: #10b981; font-size: 18px;">Rs ${order.total_amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">📍 Delivery Address</h3>
              <p style="margin: 0; color: #555;">${order.delivery_address}</p>
            </div>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">💳 Payment Information</h3>
              <p style="margin: 5px 0; color: #6b7280;"><strong>Method:</strong> ${order.payment_method || 'Cash on Delivery'}</p>
              <p style="margin: 5px 0; color: #6b7280;"><strong>Status:</strong> ${order.payment_status || 'Pending'}</p>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 25px; line-height: 1.6;">
              We'll notify you once your order is shipped. Track your order anytime on our website.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 14px; color: #888; margin: 5px 0;">Need help? Contact us:</p>
              <p style="font-size: 14px; color: #667eea; margin: 5px 0;">📞 +92 XXX XXXXXXX</p>
            </div>

            <p style="font-size: 14px; color: #333; margin-top: 20px;">
              Thank you for shopping with us!<br/>
              <strong>Dilbar Mobiles Team</strong>
            </p>
          </div>
        </div>
      `;

      const textItems = order.order_items
        .map((item: any) => `${item.product_name} (x${item.quantity}) — Rs ${item.product_price.toFixed(2)}`)
        .join('\n');

      emailText = `Order Confirmed!

Dear ${order.customer_name},

Great news! Your order has been CONFIRMED and is being processed.

Order Summary:
- Order Number: #${order.id.slice(0, 8)}
- Order Date: ${new Date(order.created_at).toLocaleDateString()}
${deliveryDate ? `- Estimated Delivery: ${deliveryDate}` : ''}

Order Items:
${textItems}

Total Amount: Rs ${order.total_amount.toFixed(2)}

Delivery Address:
${order.delivery_address}

Payment:
- Method: ${order.payment_method || 'Cash on Delivery'}
- Status: ${order.payment_status || 'Pending'}

Thank you for shopping with us!

Contact: +92 XXX XXXXXXX

Dilbar Mobiles Team`;
    }

    // Handle Order Declined
    else if (type === 'order_declined' && orderId) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) throw new Error('Order not found');

      customerEmail = order.customer_email;
      subject = `❌ Order Update - Order #${order.id.slice(0, 8)}`;

      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Order Update</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear <strong>${order.customer_name}</strong>,</p>
            
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              We are sorry, but your order <strong>#${order.id.slice(0, 8)}</strong> could not be processed at this time.
            </p>

            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 18px;">📦 Order Details</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Order Number:</strong> #${order.id.slice(0, 8)}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Total Amount:</strong> Rs ${order.total_amount.toFixed(2)}</p>
            </div>

            ${reason ? `
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">ℹ️ Reason</h3>
              <p style="margin: 0; color: #78350f; line-height: 1.6;">${reason}</p>
            </div>
            ` : ''}

            <p style="font-size: 15px; color: #555; margin-top: 25px; line-height: 1.6;">
              We sincerely apologize for any inconvenience this may have caused. If you have any questions or concerns, 
              please feel free to contact our customer support team.
            </p>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">📞 Customer Support</h3>
              <p style="margin: 5px 0; color: #6b7280;">Phone: +92 XXX XXXXXXX</p>
              <p style="margin: 5px 0; color: #6b7280;">Email: support@dilbarmobiles.com</p>
            </div>

            <p style="font-size: 14px; color: #333; margin-top: 20px;">
              We hope to serve you better in the future.<br/>
              <strong>Dilbar Mobiles Team</strong>
            </p>
          </div>
        </div>
      `;

      emailText = `Order Update

Dear ${order.customer_name},

We are sorry, but your order #${order.id.slice(0, 8)} could not be processed at this time.

Order Details:
- Order Number: #${order.id.slice(0, 8)}
- Order Date: ${new Date(order.created_at).toLocaleDateString()}
- Total Amount: Rs ${order.total_amount.toFixed(2)}

${reason ? `Reason: ${reason}` : ''}

We sincerely apologize for any inconvenience. Please contact us for any questions.

Contact: +92 XXX XXXXXXX

Dilbar Mobiles Team`;
    }

    if (!customerEmail) {
      throw new Error('Customer email not found');
    }

    // Send email
    const senderEmail = Deno.env.get('GMAIL_SENDER_EMAIL')!;
    const appPassword = Deno.env.get('GMAIL_APP_PASSWORD')!;
    const cleanPassword = appPassword.replace(/\s+/g, '');

    await sendEmailViaSMTP(
      customerEmail,
      senderEmail,
      subject,
      emailText,
      emailHtml,
      senderEmail,
      cleanPassword
    );

    console.log(`${type} email sent successfully to ${customerEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully'
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
