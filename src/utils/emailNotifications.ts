import { supabase } from '@/integrations/supabase/client';

export const sendOrderConfirmationEmail = async (orderId: string) => {
  try {
    // This would integrate with Resend or similar email service
    // For now, we'll create a notification in the database
    const { data: order } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (!order || !order.user_id) return;

    await supabase.from('notifications').insert({
      user_id: order.user_id,
      type: 'order_placed',
      title: 'Order Confirmed',
      message: `Your order #${orderId.slice(0, 8)} has been placed successfully. Total: Rs ${order.total_amount}`,
      metadata: { order_id: orderId },
    });
  } catch (error) {
    console.error('Error sending order confirmation:', error);
  }
};

export const sendOrderStatusUpdate = async (orderId: string, newStatus: string) => {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('user_id')
      .eq('id', orderId)
      .single();

    if (!order || !order.user_id) return;

    await supabase.from('notifications').insert({
      user_id: order.user_id,
      type: 'order_status',
      title: 'Order Status Updated',
      message: `Your order #${orderId.slice(0, 8)} status has been updated to: ${newStatus}`,
      metadata: { order_id: orderId, status: newStatus },
    });
  } catch (error) {
    console.error('Error sending status update:', error);
  }
};

export const notifyAdminNewOrder = async (orderId: string) => {
  try {
    // Get all admin users
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminRoles) return;

    const notifications = adminRoles.map(admin => ({
      user_id: admin.user_id,
      type: 'new_order',
      title: 'New Order Received',
      message: `A new order #${orderId.slice(0, 8)} has been placed`,
      metadata: { order_id: orderId },
    }));

    await supabase.from('notifications').insert(notifications);
  } catch (error) {
    console.error('Error notifying admin:', error);
  }
};
