// @ts-nocheck
/// <reference lib="deno.window" />

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

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

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://futecai-inventory.vercel.app",
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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ error: "Server is missing Supabase configuration." }, 500);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { isValid, roles: callerRoles, callerId } = await getCallerAccess(
      supabaseAdmin,
      req.headers.get("Authorization"),
    );

    if (!isValid || !callerId) {
      return json({ error: "Invalid token or insufficient permissions" }, 401);
    }

    let body: { user_id?: string; role?: string; school_ids?: string[] };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON payload" }, 400);
    }

    const { user_id: targetId, role: newRole, school_ids } = body;
    if (!targetId || !newRole) return json({ error: "user_id and role are required" }, 400);

    const callerIsSuperAdmin = callerRoles.includes("super_admin");
    const callerIsAdmin = callerRoles.includes("admin");

    if (!callerIsSuperAdmin && !callerIsAdmin) {
      return json({ error: "Forbidden." }, 403);
    }

    // Role update requires super_admin if we are changing it
    // Wait, the UI logic: only super_admin can change role. Admin can only change schools.
    if (newRole !== "clerk" && newRole !== "admin") {
      return json({ error: "Invalid role." }, 400);
    }
    
    // Check target's current role
    const { data: targetRoleRows } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", targetId);
    const targetRoles = (targetRoleRows ?? []).map((r: CallerRole) => r.role);
    const targetIsSuperAdmin = targetRoles.includes("super_admin");
    const targetIsAdmin = targetRoles.includes("admin");

    if (targetIsSuperAdmin) {
      return json({ error: "Cannot modify super_admin." }, 403);
    }

    if (targetIsAdmin && !callerIsSuperAdmin) {
      return json({ error: "Only a Super Admin can modify Admin accounts." }, 403);
    }

    if (callerIsSuperAdmin) {
      // Update role
      await supabaseAdmin.from("user_roles").delete().eq("user_id", targetId);
      await supabaseAdmin.from("user_roles").insert({ user_id: targetId, role: newRole });
      
      // If role changed, sign out user
      if (!targetRoles.includes(newRole)) {
        await supabaseAdmin.auth.admin.signOut(targetId, "global");
      }
    }

    // Update schools
    await supabaseAdmin.from("clerk_schools").delete().eq("clerk_id", targetId);
    if (school_ids && school_ids.length > 0) {
      const inserts = school_ids.map((sid) => ({ clerk_id: targetId, school_id: sid }));
      await supabaseAdmin.from("clerk_schools").insert(inserts);
    }

    return json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unexpected error in update-user function:", message);
    return json({ error: message }, 500);
  }
});
