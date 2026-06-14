/// <reference lib="deno.window" />

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

// ------------------------------------------------------------------ types ---

interface JsonResponse {
  success?: boolean;
  user_id?: string;
  error?: string;
}

interface CreateUserRequest {
  full_name: string;
  email: string;
  password: string;
  role: "admin" | "clerk";
  school_ids?: string[];
}

interface CallerRole {
  role: string;
}

interface StaffAccessResult {
  isValid: boolean;
  roles: string[];
  userId?: string;
}

interface OpResult {
  success: boolean;
  error: string | null;
}

// ------------------------------------------------------------------ utils ---

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: JsonResponse, status = 200): Response {
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
  if (/user does not exist/i.test(message))
    return "User account could not be created.";
  return message;
}

// --------------------------------------------------------------- helpers ---

async function validateStaffAccess(
  supabaseAdmin: SupabaseClient,
  token: string,
): Promise<StaffAccessResult> {
  const { data: userData, error: userErr } =
    await supabaseAdmin.auth.getUser(token);

  if (userErr || !userData?.user) return { isValid: false, roles: [] };

  const { data: callerRoles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);

  const roles = (callerRoles ?? []).map((r: CallerRole) => r.role);
  const isStaff = roles.includes("admin") || roles.includes("super_admin");

  return { isValid: isStaff, roles, userId: userData.user.id };
}

async function createAuthUser(
  supabaseAdmin: SupabaseClient,
  email: string,
  password: string,
  full_name: string,
): Promise<{ userId: string | null; error: string | null }> {
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

  if (authError || !authData?.user) {
    return {
      userId: null,
      error: friendly(authError?.message ?? "Failed to create user"),
    };
  }

  return { userId: authData.user.id, error: null };
}

async function createProfile(
  supabaseAdmin: SupabaseClient,
  userId: string,
  full_name: string,
  email: string,
): Promise<OpResult> {
  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, full_name, email, active: true });

  return error
    ? { success: false, error: error.message }
    : { success: true, error: null };
}

async function setUserRole(
  supabaseAdmin: SupabaseClient,
  userId: string,
  role: string,
): Promise<OpResult> {
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

  const { error } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: userId, role });

  return error
    ? { success: false, error: error.message }
    : { success: true, error: null };
}

async function assignSchoolsToClerk(
  supabaseAdmin: SupabaseClient,
  userId: string,
  school_ids: string[],
): Promise<OpResult> {
  if (!school_ids.length) return { success: true, error: null };

  const rows = school_ids.map((school_id) => ({ clerk_id: userId, school_id }));
  const { error } = await supabaseAdmin.from("clerk_schools").insert(rows);

  return error
    ? { success: false, error: error.message }
    : { success: true, error: null };
}

async function cleanupFailedUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<void> {
  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (err) {
    console.error("Failed to cleanup user:", err);
  }
}

// ----------------------------------------------------------------- handler --

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error("Missing Supabase configuration");
      return json({ error: "Server is missing Supabase configuration." }, 500);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { isValid, roles } = await validateStaffAccess(supabaseAdmin, token);
    if (!isValid) return json({ error: "Invalid token or insufficient permissions" }, 401);

    // Parse body
    let body: CreateUserRequest;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON payload" }, 400);
    }

    const { full_name, email, password, role, school_ids } = body;

    if (!full_name || !email || !password || !role)
      return json({ error: "full_name, email, password, and role are required" }, 400);

    if (!["admin", "clerk"].includes(role))
      return json({ error: "role must be admin or clerk" }, 400);

    if (role === "admin" && !roles.includes("super_admin"))
      return json({ error: "Only a Super Admin can create Admins." }, 403);

    // 1. Create auth user
    const { userId, error: authError } = await createAuthUser(
      supabaseAdmin, email, password, full_name,
    );
    if (authError || !userId)
      return json({ error: authError ?? "Failed to create user" }, 400);

    // 2. Create profile
    const { success: profileOk, error: profileError } = await createProfile(
      supabaseAdmin, userId, full_name, email,
    );
    if (!profileOk) {
      await cleanupFailedUser(supabaseAdmin, userId);
      return json({ error: profileError ?? "Failed to create profile" }, 500);
    }

    // 3. Set role
    const { success: roleOk, error: roleError } = await setUserRole(
      supabaseAdmin, userId, role,
    );
    if (!roleOk) {
      await cleanupFailedUser(supabaseAdmin, userId);
      return json({ error: roleError ?? "Failed to set role" }, 500);
    }

    // 4. Assign schools (clerks only)
    if (role === "clerk" && Array.isArray(school_ids) && school_ids.length > 0) {
      const { success: assignOk, error: assignError } = await assignSchoolsToClerk(
        supabaseAdmin, userId, school_ids,
      );
      if (!assignOk) {
        console.error("Failed to assign schools:", assignError);
        return json(
          { error: "User created but school assignment failed. Please assign schools manually." },
          500,
        );
      }
    }

    return json({ success: true, user_id: userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unexpected error in create-user function:", message);
    return json({ error: friendly(message) }, 500);
  }
});