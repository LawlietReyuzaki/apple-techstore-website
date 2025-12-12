import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  orderId?: string;
  repairId?: string;
  type: 'order' | 'order_placed' | 'repair' | 'repair_approved' | 'repair_declined' | 'order_approved' | 'order_declined' | 'order_status_update' | 'payment_uploaded' | 'payment_approved' | 'payment_declined' | 'payment_refunded';
  visitDate?: string;
  customNote?: string;
  declineReason?: string;
  newStatus?: string;
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
    const { orderId, repairId, type, visitDate, customNote, declineReason, newStatus }: EmailRequest = await req.json();

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
    
    // Get Gmail credentials from environment
    const senderEmail = Deno.env.get('GMAIL_SENDER_EMAIL')!;
    const appPassword = Deno.env.get('GMAIL_APP_PASSWORD')!;
    const cleanPassword = appPassword.replace(/\s+/g, '');
    
    // Admin email for receiving order/repair notifications - fetch dynamically
    const { data: adminSettings } = await supabase
      .from('admin_settings')
      .select('admin_email')
      .limit(1)
      .single();
    const adminEmail = adminSettings?.admin_email || 'appletwch2228@gmail.com';

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

      // Build order email content
      const itemsText = order.order_items
        .map((item: any) => 
          `${item.product_name} (x${item.quantity}) — Rs ${item.product_price.toFixed(2)}`
        )
        .join('\n');

      const htmlItems = order.order_items
        .map((item: any) => 
          `<li>${item.product_name} — qty: ${item.quantity}, price: Rs ${item.product_price.toFixed(2)}</li>`
        )
        .join('');

      subject = `New Order: ${order.id.slice(0, 8)} — ${order.customer_name}`;
      
      emailHtml = `
        <h2>New Order Received</h2>
        <p><strong>Order ID:</strong> ${order.id}<br/>
        <strong>Created:</strong> ${new Date(order.created_at).toLocaleString()}<br/>
        <strong>Total:</strong> Rs ${order.total_amount.toFixed(2)}</p>

        <h3>Customer</h3>
        <ul>
          <li><strong>Name:</strong> ${order.customer_name}</li>
          <li><strong>Email:</strong> ${order.customer_email || 'N/A'}</li>
          <li><strong>Phone:</strong> ${order.customer_phone}</li>
          <li><strong>Address:</strong> ${order.delivery_address}</li>
        </ul>

        <h3>Items</h3>
        <ul>
          ${htmlItems}
        </ul>

        <h3>Payment</h3>
        <p><strong>Method:</strong> ${order.payment_method || 'COD'}<br/>
        <strong>Status:</strong> ${order.payment_status || 'Unpaid'}</p>

        ${order.notes ? `<h3>Notes</h3><p>${order.notes}</p>` : ''}
      `;

      emailText = `New Order Received
Order ID: ${order.id}
Created: ${new Date(order.created_at).toLocaleString()}
Total: Rs ${order.total_amount.toFixed(2)}

Customer:
Name: ${order.customer_name}
Email: ${order.customer_email || 'N/A'}
Phone: ${order.customer_phone}
Address: ${order.delivery_address}

Items:
${itemsText}

Payment:
Method: ${order.payment_method || 'COD'}
Status: ${order.payment_status || 'Unpaid'}

${order.notes ? `Notes:\n${order.notes}` : ''}
`;
    } else if (type === 'order_placed' && orderId) {
      // Automatic order placement emails - to BOTH customer and admin
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

      const storeName = "Dilbar Mobiles";
      const storeAddress = "Shop No G15, China Center 2, Wallayat Complex, Bahria Town Phase 7, Rawalpindi, Pakistan";
      const storePhone = "+92 334 2228141";

      // Build order items
      const itemsText = order.order_items
        .map((item: any) => 
          `${item.product_name} (x${item.quantity}) — Rs ${item.subtotal.toLocaleString()}`
        )
        .join('\n');

      const htmlItems = order.order_items
        .map((item: any) => 
          `<tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product_name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Rs ${item.product_price.toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Rs ${item.subtotal.toLocaleString()}</td>
          </tr>`
        )
        .join('');

      const orderDate = new Date(order.created_at).toLocaleString('en-PK', {
        dateStyle: 'full',
        timeStyle: 'short'
      });

      // 1. Send email to CUSTOMER
      if (order.customer_email) {
        const customerSubject = `Order Confirmed - #${order.id.slice(0, 8)} | ${storeName}`;
        
        const customerHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #16a34a; margin: 0; font-size: 28px;">✓ Order Placed Successfully!</h1>
              </div>
              
              <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
                Dear <strong>${order.customer_name}</strong>,
              </p>
              
              <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px;">
                Thank you for your order! We have received your order and it is now being processed.
              </p>
              
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
                <h2 style="color: #15803d; font-size: 18px; margin-bottom: 15px;">Order Details</h2>
                <table style="width: 100%; font-size: 14px; color: #333;">
                  <tr>
                    <td style="padding: 8px 0;"><strong>Order ID:</strong></td>
                    <td style="padding: 8px 0;">#${order.id.slice(0, 8).toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Date:</strong></td>
                    <td style="padding: 8px 0;">${orderDate}</td>
                  </tr>
                </table>
              </div>
              
              <div style="margin-bottom: 20px;">
                <h3 style="color: #374151; font-size: 16px; margin-bottom: 10px;">Order Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <thead>
                    <tr style="background-color: #f3f4f6;">
                      <th style="padding: 10px; text-align: left;">Product</th>
                      <th style="padding: 10px; text-align: center;">Qty</th>
                      <th style="padding: 10px; text-align: right;">Price</th>
                      <th style="padding: 10px; text-align: right;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${htmlItems}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f9fafb; font-weight: bold;">
                      <td colspan="3" style="padding: 12px; text-align: right;">Total:</td>
                      <td style="padding: 12px; text-align: right; color: #16a34a; font-size: 16px;">Rs ${order.total_amount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                <h3 style="color: #374151; font-size: 16px; margin-bottom: 10px;">Delivery Information</h3>
                <p style="font-size: 14px; color: #555; line-height: 1.8; margin: 0;">
                  <strong>Name:</strong> ${order.customer_name}<br/>
                  <strong>Phone:</strong> ${order.customer_phone}<br/>
                  <strong>Address:</strong> ${order.delivery_address}
                </p>
              </div>
              
              <div style="background-color: #fffbeb; padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: center;">
                <p style="font-size: 14px; color: #92400e; margin: 0;">
                  📦 You will receive updates about your order via email.
                </p>
              </div>
              
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
                <h3 style="color: #1e40af; font-size: 16px; margin-bottom: 10px;">Contact Us</h3>
                <p style="font-size: 14px; color: #1e3a8a; line-height: 1.8; margin: 0;">
                  <strong>${storeName}</strong><br/>
                  📍 ${storeAddress}<br/>
                  📞 ${storePhone}
                </p>
              </div>
              
              <p style="font-size: 14px; color: #555; text-align: center; margin-top: 20px;">
                Thank you for shopping with us! 🙏
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 15px;">
              <p style="font-size: 12px; color: #9ca3af;">
                This is an automated message from ${storeName}.
              </p>
            </div>
          </div>
        `;

        const customerText = `Order Placed Successfully!

Dear ${order.customer_name},

Thank you for your order! We have received your order and it is now being processed.

Order Details:
━━━━━━━━━━━━━━━━━━━━━
Order ID: #${order.id.slice(0, 8).toUpperCase()}
Date: ${orderDate}

Order Summary:
━━━━━━━━━━━━━━━━━━━━━
${itemsText}

Total: Rs ${order.total_amount.toLocaleString()}

Delivery Information:
━━━━━━━━━━━━━━━━━━━━━
Name: ${order.customer_name}
Phone: ${order.customer_phone}
Address: ${order.delivery_address}

You will receive updates about your order via email.

Contact Us:
${storeName}
${storeAddress}
${storePhone}

Thank you for shopping with us!
`;

        await sendEmailViaSMTP(
          order.customer_email,
          senderEmail,
          customerSubject,
          customerText,
          customerHtml,
          senderEmail,
          cleanPassword
        );
        console.log('Customer order confirmation email sent to:', order.customer_email);
      }

      // 2. Send email to ADMIN
      const adminSubject = `New Order Received - #${order.id.slice(0, 8)} | ${order.customer_name}`;
      
      const adminHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🛒 New Order Received!</h1>
            </div>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #2563eb;">
              <h2 style="color: #1e40af; font-size: 18px; margin-bottom: 15px;">Order Information</h2>
              <table style="width: 100%; font-size: 14px; color: #333;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Order ID:</strong></td>
                  <td style="padding: 8px 0;">#${order.id.slice(0, 8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Date & Time:</strong></td>
                  <td style="padding: 8px 0;">${orderDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Total Amount:</strong></td>
                  <td style="padding: 8px 0;"><strong style="color: #16a34a; font-size: 16px;">Rs ${order.total_amount.toLocaleString()}</strong></td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
              <h2 style="color: #92400e; font-size: 18px; margin-bottom: 15px;">Customer Details</h2>
              <table style="width: 100%; font-size: 14px; color: #333;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Name:</strong></td>
                  <td style="padding: 8px 0;">${order.customer_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Phone:</strong></td>
                  <td style="padding: 8px 0;">${order.customer_phone}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0;">${order.customer_email || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Delivery Address:</strong></td>
                  <td style="padding: 8px 0;">${order.delivery_address}</td>
                </tr>
              </table>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="color: #374151; font-size: 16px; margin-bottom: 10px;">Ordered Products</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                    <th style="padding: 10px; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${htmlItems}
                </tbody>
                <tfoot>
                  <tr style="background-color: #dcfce7; font-weight: bold;">
                    <td colspan="3" style="padding: 12px; text-align: right;">Total:</td>
                    <td style="padding: 12px; text-align: right; color: #16a34a; font-size: 16px;">Rs ${order.total_amount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            ${order.notes ? `
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #374151; font-size: 14px; margin-bottom: 5px;">Customer Notes:</h3>
              <p style="font-size: 14px; color: #555; margin: 0;">${order.notes}</p>
            </div>
            ` : ''}
            
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; text-align: center;">
              <p style="font-size: 14px; color: #991b1b; margin: 0; font-weight: bold;">
                ⚡ Action Required: Please process this order
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 15px;">
            <p style="font-size: 12px; color: #9ca3af;">
              This is an automated notification from ${storeName}.
            </p>
          </div>
        </div>
      `;

      const adminText = `New Order Received!

Order Information:
━━━━━━━━━━━━━━━━━━━━━
Order ID: #${order.id.slice(0, 8).toUpperCase()}
Date & Time: ${orderDate}
Total Amount: Rs ${order.total_amount.toLocaleString()}

Customer Details:
━━━━━━━━━━━━━━━━━━━━━
Name: ${order.customer_name}
Phone: ${order.customer_phone}
Email: ${order.customer_email || 'Not provided'}
Delivery Address: ${order.delivery_address}

Ordered Products:
━━━━━━━━━━━━━━━━━━━━━
${itemsText}

Total: Rs ${order.total_amount.toLocaleString()}

${order.notes ? `Customer Notes:\n${order.notes}\n` : ''}
Action Required: Please process this order.
`;

      await sendEmailViaSMTP(
        adminEmail,
        senderEmail,
        adminSubject,
        adminText,
        adminHtml,
        senderEmail,
        cleanPassword
      );
      console.log('Admin order notification email sent to:', adminEmail);

      return new Response(
        JSON.stringify({ success: true, message: 'Order placement emails sent to customer and admin' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (type === 'repair_approved' && repairId) {
      // Fetch repair details for approval email
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

      if (!repair.customer_email) {
        return new Response(
          JSON.stringify({ error: 'Customer email not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const storeName = "Mobile Parts & Repair Shop";
      const storeAddress = "123 Main Street, Karachi, Pakistan";
      const storePhone = "+92 300 1234567";
      const storeEmail = "support@mobilerepairshop.com";

      subject = `Repair Request Approved - ${repair.tracking_code}`;
      
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #2563eb; margin-bottom: 20px; font-size: 24px;">Repair Request Approved ✓</h1>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
              Dear <strong>${repair.customer_name || 'Valued Customer'}</strong>,
            </p>
            
            <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px;">
              Great news! Your repair request has been approved and is ready for service.
            </p>
            
            <div style="background-color: #f0f7ff; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #2563eb;">
              <h2 style="color: #1e40af; font-size: 18px; margin-bottom: 15px;">Order Details</h2>
              <table style="width: 100%; font-size: 14px; color: #333;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Order Number:</strong></td>
                  <td style="padding: 8px 0;">${repair.tracking_code}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Device:</strong></td>
                  <td style="padding: 8px 0;">${repair.device_make} ${repair.device_model}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Issue:</strong></td>
                  <td style="padding: 8px 0;">${repair.issue}</td>
                </tr>
                ${repair.description ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Description:</strong></td>
                  <td style="padding: 8px 0;">${repair.description}</td>
                </tr>
                ` : ''}
                ${repair.estimated_cost ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Estimated Cost:</strong></td>
                  <td style="padding: 8px 0;"><strong style="color: #2563eb;">Rs ${repair.estimated_cost}</strong></td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div style="background-color: #dcfce7; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
              <h2 style="color: #15803d; font-size: 18px; margin-bottom: 15px;">Visit Schedule</h2>
              <p style="font-size: 16px; color: #333; margin: 0;">
                <strong>📅 Date & Time:</strong> ${visitDate || 'To be confirmed'}
              </p>
              <p style="font-size: 14px; color: #555; margin-top: 10px;">
                Please visit our shop at the scheduled date and time for your repair service.
              </p>
              ${customNote ? `
              <div style="margin-top: 15px; padding: 12px; background-color: #fff; border-radius: 4px;">
                <p style="font-size: 13px; color: #666; margin: 0;"><strong>Note:</strong> ${customNote}</p>
              </div>
              ` : ''}
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <h2 style="color: #374151; font-size: 18px; margin-bottom: 15px;">Store Information</h2>
              <p style="font-size: 14px; color: #555; line-height: 1.8; margin: 0;">
                <strong>${storeName}</strong><br/>
                📍 ${storeAddress}<br/>
                📞 ${storePhone}<br/>
                ✉️ ${storeEmail}
              </p>
            </div>
            
            <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px;">
              If you have any questions or need to reschedule, please don't hesitate to contact us.
            </p>
            
            <p style="font-size: 14px; color: #333; margin-bottom: 5px;">
              Best regards,<br/>
              <strong>${storeName} Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 15px;">
            <p style="font-size: 12px; color: #9ca3af;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

      emailText = `Repair Request Approved

Dear ${repair.customer_name || 'Valued Customer'},

Great news! Your repair request has been approved and is ready for service.

Order Details:
━━━━━━━━━━━━━━━━━━━━━
Order Number: ${repair.tracking_code}
Device: ${repair.device_make} ${repair.device_model}
Issue: ${repair.issue}
${repair.description ? `Description: ${repair.description}` : ''}
${repair.estimated_cost ? `Estimated Cost: Rs ${repair.estimated_cost}` : ''}

Visit Schedule:
━━━━━━━━━━━━━━━━━━━━━
Date & Time: ${visitDate || 'To be confirmed'}

Please visit our shop at the scheduled date and time for your repair service.
${customNote ? `\nNote: ${customNote}` : ''}

Store Information:
━━━━━━━━━━━━━━━━━━━━━
${storeName}
${storeAddress}
${storePhone}
${storeEmail}

If you have any questions or need to reschedule, please don't hesitate to contact us.

Best regards,
${storeName} Team

---
This is an automated message. Please do not reply to this email.
`;

      // Send to customer
      await sendEmailViaSMTP(
        repair.customer_email,
        senderEmail,
        subject,
        emailText,
        emailHtml,
        senderEmail,
        cleanPassword
      );

    } else if (type === 'repair_declined' && repairId) {
      // Fetch repair details for decline email
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

      if (!repair.customer_email) {
        return new Response(
          JSON.stringify({ error: 'Customer email not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const storeName = "Mobile Parts & Repair Shop";
      const storePhone = "+92 300 1234567";
      const storeEmail = "support@mobilerepairshop.com";

      subject = `Repair Request Declined - ${repair.tracking_code}`;
      
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #dc2626; margin-bottom: 20px; font-size: 24px;">Repair Request Declined</h1>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
              Dear <strong>${repair.customer_name || 'Valued Customer'}</strong>,
            </p>
            
            <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px;">
              We regret to inform you that we are unable to process your repair request at this time.
            </p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
              <h2 style="color: #991b1b; font-size: 18px; margin-bottom: 15px;">Request Details</h2>
              <table style="width: 100%; font-size: 14px; color: #333;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Order Number:</strong></td>
                  <td style="padding: 8px 0;">${repair.tracking_code}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Device:</strong></td>
                  <td style="padding: 8px 0;">${repair.device_make} ${repair.device_model}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Issue:</strong></td>
                  <td style="padding: 8px 0;">${repair.issue}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #fffbeb; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
              <h2 style="color: #92400e; font-size: 18px; margin-bottom: 10px;">Reason</h2>
              <p style="font-size: 14px; color: #78350f; margin: 0; line-height: 1.6;">
                ${declineReason || 'We are unable to process your repair request at this time.'}
              </p>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <p style="font-size: 14px; color: #555; line-height: 1.8; margin: 0;">
                We sincerely apologize for any inconvenience this may cause. If you have any questions or would like to discuss alternative solutions, please feel free to contact us.
              </p>
            </div>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
              <h2 style="color: #1e40af; font-size: 18px; margin-bottom: 15px;">Contact Us</h2>
              <p style="font-size: 14px; color: #1e3a8a; line-height: 1.8; margin: 0;">
                <strong>${storeName}</strong><br/>
                📞 ${storePhone}<br/>
                ✉️ ${storeEmail}
              </p>
            </div>
            
            <p style="font-size: 14px; color: #333; margin-bottom: 5px;">
              Thank you for your understanding,<br/>
              <strong>${storeName} Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 15px;">
            <p style="font-size: 12px; color: #9ca3af;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

      emailText = `Repair Request Declined

Dear ${repair.customer_name || 'Valued Customer'},

We regret to inform you that we are unable to process your repair request at this time.

Request Details:
━━━━━━━━━━━━━━━━━━━━━
Order Number: ${repair.tracking_code}
Device: ${repair.device_make} ${repair.device_model}
Issue: ${repair.issue}

Reason:
━━━━━━━━━━━━━━━━━━━━━
${declineReason || 'We are unable to process your repair request at this time.'}

We sincerely apologize for any inconvenience this may cause. If you have any questions or would like to discuss alternative solutions, please feel free to contact us.

Contact Us:
━━━━━━━━━━━━━━━━━━━━━
${storeName}
${storePhone}
${storeEmail}

Thank you for your understanding,
${storeName} Team

---
This is an automated message. Please do not reply to this email.
`;

      // Send to customer
      await sendEmailViaSMTP(
        repair.customer_email,
        senderEmail,
        subject,
        emailText,
        emailHtml,
        senderEmail,
        cleanPassword
      );

    } else if (type === 'order_approved' && orderId) {
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError || !orderItems) {
        return new Response(
          JSON.stringify({ error: 'Order items not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!order.customer_email) {
        return new Response(
          JSON.stringify({ error: 'Customer email not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const itemsListHtml = orderItems.map(item => `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">${item.product_name}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">PKR ${item.product_price.toLocaleString()}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">PKR ${item.subtotal.toLocaleString()}</td>
        </tr>
      `).join('');

      const itemsListText = orderItems.map(item => 
        `${item.product_name} - Qty: ${item.quantity} - Price: PKR ${item.product_price.toLocaleString()} - Subtotal: PKR ${item.subtotal.toLocaleString()}`
      ).join('\n');

      const storeName = "Dilbar Mobiles";
      subject = `Your Order Has Been Approved 🎉`;
      
      emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #4CAF50; margin-bottom: 20px;">Your Order Has Been Approved 🎉</h2>
              
              <p>Dear <strong>${order.customer_name}</strong>,</p>
              
              <p>Good news! Your order <strong>#${orderId.slice(0, 8)}</strong> has been approved by our team.<br>
              We are now preparing your product.</p>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                <h3 style="margin-top: 0; color: #4CAF50;">Order Details</h3>
                
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                  <thead>
                    <tr style="background-color: #f0f0f0;">
                      <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
                      <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Quantity</th>
                      <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Price</th>
                      <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsListHtml}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f0f0f0; font-weight: bold;">
                      <td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total Amount:</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">PKR ${order.total_amount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <p style="margin: 20px 0;">Your order is now confirmed.<br>
              We will notify you once your product is ready or shipped.</p>
              
              <p>If you have any questions, feel free to reply to this email.</p>
              
              <p style="margin-top: 30px;">Thank you for choosing <strong>${storeName}</strong>!</p>
              
              <p style="margin-top: 20px;">Warm regards,<br>
              <strong>${storeName} Team</strong></p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply.</p>
            </div>
          </body>
        </html>
      `;

      emailText = `Your Order Has Been Approved 🎉

Dear ${order.customer_name},

Good news! Your order #${orderId.slice(0, 8)} has been approved by our team.
We are now preparing your product.

Order Details:

${itemsListText}

Total Amount: PKR ${order.total_amount.toLocaleString()}

Your order is now confirmed.
We will notify you once your product is ready or shipped.

If you have any questions, feel free to reply to this email.

Thank you for choosing ${storeName}!

Warm regards,
${storeName} Team

---
This is an automated email. Please do not reply.`;

      // Send to customer
      await sendEmailViaSMTP(
        order.customer_email,
        senderEmail,
        subject,
        emailText,
        emailHtml,
        senderEmail,
        cleanPassword
      );
      console.log('Customer order approved email sent to:', order.customer_email);

      // Also send notification to admin about order being processed
      const adminApprovedSubject = `Order Processed - #${orderId.slice(0, 8)} | ${order.customer_name}`;
      
      const adminApprovedHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #16a34a; margin: 0; font-size: 28px;">✓ Order Processed</h1>
            </div>
            
            <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
              An order has been approved and is now being processed.
            </p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
              <h2 style="color: #15803d; font-size: 18px; margin-bottom: 15px;">Order Information</h2>
              <table style="width: 100%; font-size: 14px; color: #333;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Order ID:</strong></td>
                  <td style="padding: 8px 0;">#${orderId.slice(0, 8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Customer:</strong></td>
                  <td style="padding: 8px 0;">${order.customer_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Phone:</strong></td>
                  <td style="padding: 8px 0;">${order.customer_phone}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0;">${order.customer_email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Address:</strong></td>
                  <td style="padding: 8px 0;">${order.delivery_address}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Total Amount:</strong></td>
                  <td style="padding: 8px 0;"><strong style="color: #16a34a; font-size: 16px;">PKR ${order.total_amount.toLocaleString()}</strong></td>
                </tr>
              </table>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="color: #374151; font-size: 16px; margin-bottom: 10px;">Ordered Products</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                    <th style="padding: 10px; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsListHtml}
                </tbody>
              </table>
            </div>
            
            <p style="font-size: 14px; color: #555; text-align: center; margin-top: 20px;">
              Please prepare this order for delivery.
            </p>
          </div>
        </div>
      `;

      const adminApprovedText = `Order Processed

Order ID: #${orderId.slice(0, 8).toUpperCase()}
Customer: ${order.customer_name}
Phone: ${order.customer_phone}
Email: ${order.customer_email}
Address: ${order.delivery_address}
Total Amount: PKR ${order.total_amount.toLocaleString()}

Ordered Products:
${itemsListText}

Please prepare this order for delivery.`;

      await sendEmailViaSMTP(
        adminEmail,
        senderEmail,
        adminApprovedSubject,
        adminApprovedText,
        adminApprovedHtml,
        senderEmail,
        cleanPassword
      );
      console.log('Admin order processed email sent to:', adminEmail);

    } else if (type === 'order_declined' && orderId) {
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!order.customer_email) {
        return new Response(
          JSON.stringify({ error: 'Customer email not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const storeName = "Dilbar Mobiles";
      subject = `Update Regarding Your Order #${orderId.slice(0, 8)}`;
      
      emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #f44336; margin-bottom: 20px;">Update Regarding Your Order #${orderId.slice(0, 8)}</h2>
              
              <p>Dear <strong>${order.customer_name}</strong>,</p>
              
              <p>We want to inform you that your order <strong>#${orderId.slice(0, 8)}</strong> has been declined by our team.</p>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f44336;">
                <h3 style="margin-top: 0; color: #f44336;">Reason (if provided):</h3>
                <p style="margin: 0;">${declineReason || 'We are unable to process your order at this time.'}</p>
              </div>
              
              <p style="margin: 20px 0;">We sincerely apologize for the inconvenience.<br>
              If you need help placing another order or have any questions, feel free to contact us.</p>
              
              <p style="margin-top: 30px;">Warm regards,<br>
              <strong>${storeName} Support Team</strong></p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply.</p>
            </div>
          </body>
        </html>
      `;

      emailText = `Update Regarding Your Order #${orderId.slice(0, 8)}

Dear ${order.customer_name},

We want to inform you that your order #${orderId.slice(0, 8)} has been declined by our team.

Reason (if provided):
${declineReason || 'We are unable to process your order at this time.'}

We sincerely apologize for the inconvenience.
If you need help placing another order or have any questions, feel free to contact us.

Warm regards,
${storeName} Support Team

---
This is an automated email. Please do not reply.`;

      // Send to customer
      await sendEmailViaSMTP(
        order.customer_email,
        senderEmail,
        subject,
        emailText,
        emailHtml,
        senderEmail,
        cleanPassword
      );

    } else if (type === 'order_status_update' && orderId && newStatus) {
      // Fetch order details for status update
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!order.customer_email) {
        return new Response(
          JSON.stringify({ error: 'Customer email not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      const storeName = "Dilbar Mobiles";
      
      // Format status for display
      const statusDisplay = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
      
      // Status-specific messages, colors, and subjects
      const statusInfo: Record<string, { message: string; color: string; emoji: string; subject: string }> = {
        pending: {
          message: "Your order has been received and is awaiting review.",
          color: "#f59e0b",
          emoji: "⏳",
          subject: "Your Order Is Pending"
        },
        processing: {
          message: "Great news! Your order is now being processed and prepared.",
          color: "#3b82f6",
          emoji: "📦",
          subject: "Your Order Is Being Processed"
        },
        shipped: {
          message: "Exciting news! Your order has been shipped and is on its way to you.",
          color: "#8b5cf6",
          emoji: "🚚",
          subject: "Your Order Has Been Shipped"
        },
        delivered: {
          message: "Your order has been successfully delivered. We hope you enjoy your purchase!",
          color: "#10b981",
          emoji: "✅",
          subject: "Your Order Has Been Delivered"
        },
        cancelled: {
          message: "Your order has been cancelled. If you have any questions, please contact us.",
          color: "#ef4444",
          emoji: "❌",
          subject: "Your Order Has Been Cancelled"
        }
      };

      const info = statusInfo[newStatus] || statusInfo.pending;

      subject = info.subject;
      
      const itemsList = orderItems?.map(item => 
        `<li style="margin: 8px 0;">${item.product_name} (Qty: ${item.quantity}) - PKR ${item.subtotal.toLocaleString()}</li>`
      ).join('') || '';

      emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: ${info.color}; margin-bottom: 20px;">Order Status Update ${info.emoji}</h2>
              
              <p>Dear <strong>${order.customer_name}</strong>,</p>
              
              <p>We wanted to update you on your order <strong>#${orderId.slice(0, 8)}</strong>.</p>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${info.color};">
                <h3 style="margin-top: 0; color: ${info.color};">Current Status: ${statusDisplay}</h3>
                <p style="margin: 10px 0 0 0;">${info.message}</p>
              </div>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Order Summary</h3>
                <p><strong>Order Number:</strong> #${orderId.slice(0, 8)}</p>
                <ul style="padding-left: 20px;">
                  ${itemsList}
                </ul>
                <p style="margin-top: 15px;"><strong>Total Amount:</strong> PKR ${order.total_amount.toLocaleString()}</p>
              </div>
              
              <p>If you have any questions about your order, feel free to contact us.</p>
              
              <p style="margin-top: 30px;">Thank you for choosing <strong>${storeName}</strong>!</p>
              
              <p style="margin-top: 20px;">Warm regards,<br>
              <strong>${storeName} Team</strong></p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply.</p>
            </div>
          </body>
        </html>
      `;

      const itemsListText = orderItems?.map(item => 
        `${item.product_name} (Qty: ${item.quantity}) - PKR ${item.subtotal.toLocaleString()}`
      ).join('\n') || '';

      emailText = `Order Status Update: ${statusDisplay} - #${orderId.slice(0, 8)}

Dear ${order.customer_name},

We wanted to update you on your order #${orderId.slice(0, 8)}.

Current Status: ${statusDisplay}
${info.message}

Order Summary:
Order Number: #${orderId.slice(0, 8)}

Products:
${itemsListText}

Total Amount: PKR ${order.total_amount.toLocaleString()}

If you have any questions about your order, feel free to contact us.

Thank you for choosing ${storeName}!

Warm regards,
${storeName} Team

---
This is an automated email. Please do not reply.`;

      // Send to customer
      await sendEmailViaSMTP(
        order.customer_email,
        senderEmail,
        subject,
        emailText,
        emailHtml,
        senderEmail,
        cleanPassword
      );

    } else if (type === 'payment_uploaded' && orderId) {
      // Payment submission notification to ADMIN
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('Error fetching order:', orderError);
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get payment details
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const storeName = "Dilbar Mobiles";
      // Use the dynamic admin email fetched from admin_settings
      subject = `Payment Submitted - Order #${orderId.slice(0, 8)}`;

      emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #2563eb; margin-bottom: 20px;">Payment Receipt Submitted</h2>
              
              <p>A customer has submitted payment for order <strong>#${orderId.slice(0, 8)}</strong>.</p>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin-top: 0; color: #f59e0b;">Status: Payment Submitted – Awaiting Verification</h3>
                <p style="margin: 10px 0 0 0;">Please review and verify the payment in the admin panel.</p>
              </div>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>Order Details</h3>
                <ul style="list-style: none; padding: 0;">
                  <li><strong>Customer:</strong> ${order.customer_name}</li>
                  <li><strong>Email:</strong> ${order.customer_email || 'N/A'}</li>
                  <li><strong>Phone:</strong> ${order.customer_phone}</li>
                  <li><strong>Amount:</strong> PKR ${order.total_amount?.toLocaleString()}</li>
                  <li><strong>Payment Method:</strong> ${payment?.payment_method?.toUpperCase() || 'N/A'}</li>
                  <li><strong>Transaction ID:</strong> ${payment?.transaction_id || 'N/A'}</li>
                  <li><strong>Sender Number:</strong> ${payment?.sender_number || 'N/A'}</li>
                </ul>
              </div>
              
              <p style="margin-top: 30px;">Please log in to the admin panel to verify this payment.</p>
              
              <p style="margin-top: 20px;"><strong>${storeName} Admin</strong></p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">This is an automated email.</p>
            </div>
          </body>
        </html>
      `;

      emailText = `Payment Receipt Submitted

A customer has submitted payment for order #${orderId.slice(0, 8)}.

Status: Payment Submitted – Awaiting Verification

Please review and verify the payment in the admin panel.

Order Details:
- Customer: ${order.customer_name}
- Email: ${order.customer_email || 'N/A'}
- Phone: ${order.customer_phone}
- Amount: PKR ${order.total_amount?.toLocaleString()}
- Payment Method: ${payment?.payment_method?.toUpperCase() || 'N/A'}
- Transaction ID: ${payment?.transaction_id || 'N/A'}
- Sender Number: ${payment?.sender_number || 'N/A'}

Please log in to the admin panel to verify this payment.

${storeName} Admin

---
This is an automated email.`;

      await sendEmailViaSMTP(
        adminEmail,
        senderEmail,
        subject,
        emailText,
        emailHtml,
        senderEmail,
        cleanPassword
      );

    } else if (type === 'payment_approved' && orderId) {
      // Payment approved notification
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

      const storeName = "Dilbar Mobiles";
      subject = "Payment Verified - Your Order is Being Processed";

      emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #10b981; margin-bottom: 20px;">Payment Confirmed ✓</h2>
              
              <p>Dear <strong>${order.customer_name}</strong>,</p>
              
              <p>Your payment has been confirmed. Your order is now being processed.</p>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="margin-top: 0; color: #10b981;">Order ID: #${orderId.slice(0, 8)}</h3>
                <p style="margin: 10px 0;"><strong>Amount Paid:</strong> PKR ${order.total_amount.toLocaleString()}</p>
                <p style="margin: 10px 0 0 0;"><strong>Status:</strong> Payment Verified</p>
              </div>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
              </div>
              
              <p>Your order will be shipped soon. Thank you for your purchase!</p>
              
              <p style="margin-top: 30px;">Best regards,<br>
              <strong>${storeName} Team</strong></p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply.</p>
            </div>
          </body>
        </html>
      `;

      emailText = `Payment Confirmed

Dear ${order.customer_name},

Your payment has been confirmed. Your order is now being processed.

Order ID: #${orderId.slice(0, 8)}
Amount Paid: PKR ${order.total_amount.toLocaleString()}
Status: Payment Verified

Delivery Address: ${order.delivery_address}

Your order will be shipped soon. Thank you for your purchase!

Best regards,
${storeName} Team

---
This is an automated email. Please do not reply.`;

      await sendEmailViaSMTP(
        order.customer_email,
        senderEmail,
        subject,
        emailText,
        emailHtml,
        senderEmail,
        cleanPassword
      );

    } else if (type === 'payment_declined' && orderId) {
      // Payment declined notification
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('Error fetching order:', orderError);
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const storeName = "Dilbar Mobiles";
      subject = "Payment Declined - Action Required";

      emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #ef4444; margin-bottom: 20px;">Payment Rejected</h2>
              
              <p>Dear <strong>${order.customer_name}</strong>,</p>
              
              <p>Your payment receipt could not be verified.</p>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <h3 style="margin-top: 0; color: #ef4444;">Order ID: #${orderId.slice(0, 8)}</h3>
                ${declineReason ? `<p style="margin: 10px 0;"><strong>Reason:</strong> ${declineReason}</p>` : ''}
                <p style="margin: 10px 0 0 0;"><strong>Status:</strong> Payment Rejected – Please upload a valid receipt.</p>
              </div>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Amount:</strong> PKR ${order.total_amount.toLocaleString()}</p>
              </div>
              
              <p>Please resubmit your payment receipt with correct details to proceed with your order.</p>
              
              <p style="margin-top: 30px;">Regards,<br>
              <strong>${storeName} Team</strong></p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply.</p>
            </div>
          </body>
        </html>
      `;

      emailText = `Payment Rejected

Dear ${order.customer_name},

Your payment receipt could not be verified.

Order ID: #${orderId.slice(0, 8)}
${declineReason ? `Reason: ${declineReason}\n` : ''}
Status: Payment Rejected – Please upload a valid receipt.

Amount: PKR ${order.total_amount.toLocaleString()}

Please resubmit your payment receipt with correct details to proceed with your order.

Regards,
${storeName} Team

---
This is an automated email. Please do not reply.`;

      await sendEmailViaSMTP(
        order.customer_email,
        senderEmail,
        subject,
        emailText,
        emailHtml,
        senderEmail,
        cleanPassword
      );

    } else if (type === 'payment_refunded' && orderId) {
      // Payment refunded notification
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('Error fetching order:', orderError);
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const storeName = "Dilbar Mobiles";
      subject = "Payment Refunded";

      emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #f97316; margin-bottom: 20px;">Payment Refunded 🔄</h2>
              
              <p>Dear <strong>${order.customer_name}</strong>,</p>
              
              <p>Your payment for order <strong>#${orderId.slice(0, 8)}</strong> has been refunded.</p>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f97316;">
                <h3 style="margin-top: 0; color: #f97316;">Refund Processed</h3>
                <p style="margin: 10px 0 0 0;">The refund amount will be credited to your account within 3-7 business days.</p>
              </div>
              
              <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Order Number:</strong> #${orderId.slice(0, 8)}</p>
                <p><strong>Refund Amount:</strong> PKR ${order.total_amount.toLocaleString()}</p>
                ${customNote ? `<p><strong>Note:</strong> ${customNote}</p>` : ''}
              </div>
              
              <p>If you have any questions about this refund, please contact our support team.</p>
              
              <p style="margin-top: 30px;">Thank you for your understanding.</p>
              
              <p style="margin-top: 20px;">Regards,<br>
              <strong>${storeName} Team</strong></p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply.</p>
            </div>
          </body>
        </html>
      `;

      emailText = `Payment Refunded

Dear ${order.customer_name},

Your payment for order #${orderId.slice(0, 8)} has been refunded.

Refund Processed
The refund amount will be credited to your account within 3-7 business days.

Order Number: #${orderId.slice(0, 8)}
Refund Amount: PKR ${order.total_amount.toLocaleString()}
${customNote ? `Note: ${customNote}` : ''}

If you have any questions about this refund, please contact our support team.

Thank you for your understanding.

Regards,
${storeName} Team

---
This is an automated email. Please do not reply.`;

      await sendEmailViaSMTP(
        order.customer_email,
        senderEmail,
        subject,
        emailText,
        emailHtml,
        senderEmail,
        cleanPassword
      );

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

    // Send email via SMTP to admin
    await sendEmailViaSMTP(
      adminEmail, // to admin for notifications
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
