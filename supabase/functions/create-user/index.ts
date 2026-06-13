import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function friendly(message: string): string {
  if (/already registered|already been registered/i.test(message))
    return "An account with this email already exists.";
  if (/Password should be at least/i.test(message))
    return "Password must be at least 6 characters.";
  if (/invalid email/i.test(message))
    return "Please enter a valid email address.";
  return message;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ error: "Server is missing Supabase configuration." }, 500);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is staff
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Invalid token" }, 401);

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const roles = (callerRoles ?? []).map((r: { role: string }) => r.role);
    const isStaff = roles.includes("admin") || roles.includes("super_admin");
    if (!isStaff) return json({ error: "Forbidden: admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const { full_name, email, password, role, school_ids } = body ?? {};

    if (!full_name || !email || !password || !role) {
      return json(
        { error: "full_name, email, password, and role are required" },
        400,
      );
    }
    if (!["admin", "clerk"].includes(role)) {
      return json({ error: "role must be admin or clerk" }, 400);
    }
    if (role === "admin" && !roles.includes("super_admin")) {
      return json({ error: "Only a Super Admin can create Admins." }, 403);
    }

    // 1. Create auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
    if (authError || !authData.user) {
      return json({ error: friendly(authError?.message ?? "Failed to create user") }, 400);
    }
    const userId = authData.user.id;

    // 2. Upsert profile (trigger may have inserted already)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name, email, active: true });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return json({ error: profileError.message }, 500);
    }

    // 3. Set role (replace any default the trigger set)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role });
    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return json({ error: roleError.message }, 500);
    }

    // 4. Assign schools (clerks only)
    if (role === "clerk" && Array.isArray(school_ids) && school_ids.length) {
      const rows = school_ids.map((school_id: string) => ({
        clerk_id: userId,
        school_id,
      }));
      const { error: assignError } = await supabaseAdmin
        .from("clerk_schools")
        .insert(rows);
      if (assignError) return json({ error: assignError.message }, 500);
    }

    return json({ success: true, user_id: userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: friendly(message) }, 500);
  }
});
