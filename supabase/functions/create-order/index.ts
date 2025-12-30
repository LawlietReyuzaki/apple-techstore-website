import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: string;
  images?: string[];
  selectedColor?: string | null;
  selectedPartType?: string | null;
}

interface CreateOrderRequest {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  notes?: string;
  totalAmount: number;
  items: OrderItem[];
  userId?: string | null;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const orderData: CreateOrderRequest = await req.json();

    console.log("Creating order for:", orderData.customerName);

    // Validate required fields
    if (!orderData.customerName || !orderData.customerPhone || !orderData.deliveryAddress) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, phone, and address are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!orderData.items || orderData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Order must contain at least one item" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create order using service role (bypasses RLS)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: orderData.userId || null,
        customer_name: orderData.customerName,
        customer_email: orderData.customerEmail || null,
        customer_phone: orderData.customerPhone,
        delivery_address: orderData.deliveryAddress,
        total_amount: orderData.totalAmount,
        notes: orderData.notes || null,
        status: "pending",
        payment_status: "unpaid",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order", details: orderError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Order created:", order.id);

    // Create order items with selected color and part type
    const orderItems = orderData.items.map((item) => {
      const itemType = item.type || "product";
      
      let productId = null;
      let sparePartId = null;
      let shopItemId = null;
      
      if (itemType === "product") {
        productId = item.id;
      } else if (itemType === "spare_part") {
        sparePartId = item.id;
      } else if (itemType === "shop_item") {
        shopItemId = item.id;
      }
      
      return {
        order_id: order.id,
        product_id: productId,
        spare_part_id: sparePartId,
        shop_item_id: shopItemId,
        item_type: itemType,
        product_name: item.name,
        product_price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        selected_color: item.selectedColor || null,
        selected_part_type: item.selectedPartType || null,
      };
    });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items error:", itemsError);
      // Rollback: delete the order if items failed
      await supabase.from("orders").delete().eq("id", order.id);
      
      return new Response(
        JSON.stringify({ error: "Failed to create order items", details: itemsError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Order items created successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: order,
        message: "Order created successfully" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});