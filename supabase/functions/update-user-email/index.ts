import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newEmail, userId } = await req.json();

    if (!newEmail || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: newEmail and userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if the user is an admin
    const { data: userRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    const isAdmin = userRoles && userRoles.length > 0;

    // Update user email directly using admin privileges
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true, // Mark email as confirmed since we verified via OTP
    });

    if (error) {
      console.error("Error updating user email:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If the user is an admin, update the admin_settings table
    if (isAdmin) {
      // First, delete all existing admin_settings entries (only one admin allowed)
      await supabaseAdmin
        .from("admin_settings")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      // Insert new admin email
      const { error: settingsError } = await supabaseAdmin
        .from("admin_settings")
        .insert({
          admin_email: newEmail,
          admin_user_id: userId,
        });

      if (settingsError) {
        console.error("Error updating admin settings:", settingsError);
        // Don't fail the whole operation, just log the error
      } else {
        console.log(`Admin settings updated with new email: ${newEmail}`);
      }
    }

    console.log(`Email updated successfully for user ${userId} to ${newEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email updated successfully",
        email: data.user?.email 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    console.error("Error in update-user-email function:", err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
