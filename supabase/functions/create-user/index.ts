import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Uses service role to bypass RLS
    );

    // Verify caller has permissions (is admin/super_admin)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) throw roleError;

    const roles = roleData.map((r: { role: string }) => r.role);
    const isStaff = roles.includes("admin") || roles.includes("super_admin");

    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden: Admins only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const { email, password, full_name, role, school_ids } = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Only super_admin can create admin
    if (role === "admin" && !roles.includes("super_admin")) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: Only Super Admin can create Admins",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 1. Create auth user
    const { data: newUser, error: createError } =
      await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (createError) throw createError;

    const newUserId = newUser.user.id;

    // 2. Set profile name (auth trigger might create it, but we can update it just in case)
    await supabaseClient
      .from("profiles")
      .upsert({ id: newUserId, full_name, email });

    // 3. Set role
    await supabaseClient
      .from("user_roles")
      .insert({ user_id: newUserId, role });

    // 4. Set schools (if clerk)
    if (
      role === "clerk" &&
      Array.isArray(school_ids) &&
      school_ids.length > 0
    ) {
      const clerkSchools = school_ids.map((school_id: string) => ({
        clerk_id: newUserId,
        school_id,
      }));
      await supabaseClient.from("clerk_schools").insert(clerkSchools);
    }

    return new Response(JSON.stringify({ success: true, user: newUser.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
