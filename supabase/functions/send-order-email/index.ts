import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderEmailRequest {
  orderId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId }: OrderEmailRequest = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Build email content
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

    const emailHtml = `
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

    const emailText = `New Order Received
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

    // Get Gmail credentials from environment
    const senderEmail = Deno.env.get('GMAIL_SENDER_EMAIL')!;
    const appPassword = Deno.env.get('GMAIL_APP_PASSWORD')!;

    // Connect to Gmail SMTP
    const client = new SmtpClient();

    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: senderEmail,
      password: appPassword,
    });

    // Send email
    await client.send({
      from: senderEmail,
      to: senderEmail, // Send to same email (shop owner)
      subject: `New Order: ${order.id.slice(0, 8)} — ${order.customer_name}`,
      content: emailText,
      html: emailHtml,
    });

    await client.close();

    console.log('Order email sent successfully for order:', orderId);

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
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
