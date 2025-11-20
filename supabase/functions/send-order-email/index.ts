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

    // Get Gmail credentials from environment
    const senderEmail = Deno.env.get('GMAIL_SENDER_EMAIL')!;
    const appPassword = Deno.env.get('GMAIL_APP_PASSWORD')!;

    // Remove spaces from app password
    const cleanPassword = appPassword.replace(/\s+/g, '');

    // Send email via SMTP
    await sendEmailViaSMTP(
      senderEmail, // to (sending to self for notifications)
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
