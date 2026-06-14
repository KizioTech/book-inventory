/// <reference lib="deno.window" />

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

// ------------------------------------------------------------------ types ---

interface JsonResponse {
  success?: boolean;
  error?: string;
}

interface CallerRole {
  role: string;
}

interface StaffAccessResult {
  isValid: boolean;
  roles: string[];
  callerId: string | null;
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

async function getCallerAccess(
  supabaseAdmin: SupabaseClient,
  authHeader: string | null,
): Promise<StaffAccessResult> {
  if (!authHeader) return { isValid: false, roles: [], callerId: null };

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !userData?.user) return { isValid: false, roles: [], callerId: null };

  const { data: roleRows } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);

  const roles = (roleRows ?? []).map((r: CallerRole) => r.role);
  const isStaff = roles.includes("admin") || roles.includes("super_admin");

  return { isValid: isStaff, roles, callerId: userData.user.id };
}

async function getTargetRoles(
  supabaseAdmin: SupabaseClient,
  targetId: string,
): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", targetId);
  return (data ?? []).map((r: CallerRole) => r.role);
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

    // ── 1. Authenticate caller ──────────────────────────────────────────────
    const { isValid, roles: callerRoles, callerId } = await getCallerAccess(
      supabaseAdmin,
      req.headers.get("Authorization"),
    );

    if (!isValid || !callerId) {
      return json({ error: "Invalid token or insufficient permissions" }, 401);
    }

    // ── 2. Parse request body ───────────────────────────────────────────────
    let body: { user_id?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON payload" }, 400);
    }

    const { user_id: targetId } = body;
    if (!targetId) return json({ error: "user_id is required" }, 400);

    // ── 3. Prevent self-deletion ────────────────────────────────────────────
    if (targetId === callerId) {
      return json({ error: "You cannot delete your own account." }, 403);
    }

    // ── 4. Authorisation rules ──────────────────────────────────────────────
    // super_admin can delete any non-super_admin
    // admin can only delete clerks
    const targetRoles = await getTargetRoles(supabaseAdmin, targetId);

    const targetIsSuperAdmin = targetRoles.includes("super_admin");
    const targetIsAdmin = targetRoles.includes("admin");
    const callerIsSuperAdmin = callerRoles.includes("super_admin");
    const callerIsAdmin = callerRoles.includes("admin");

    if (targetIsSuperAdmin) {
      return json({ error: "Super Admin accounts cannot be deleted." }, 403);
    }

    if (targetIsAdmin && !callerIsSuperAdmin) {
      return json({ error: "Only a Super Admin can delete Admin accounts." }, 403);
    }

    if (!targetIsAdmin && !targetIsSuperAdmin && !callerIsSuperAdmin && !callerIsAdmin) {
      return json({ error: "Forbidden." }, 403);
    }

    // ── 5. Delete related data first (in case no FK cascade is set) ─────────
    await supabaseAdmin.from("clerk_schools").delete().eq("clerk_id", targetId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", targetId);
    await supabaseAdmin.from("profiles").delete().eq("id", targetId);

    // ── 6. Delete the auth user ──────────────────────────────────────────────
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(targetId);

    if (deleteErr) {
      console.error("Failed to delete auth user:", deleteErr.message);
      return json({ error: `Failed to delete user: ${deleteErr.message}` }, 500);
    }

    return json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unexpected error in delete-user function:", message);
    return json({ error: message }, 500);
  }
});
