/// <reference lib="deno.window" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request): Promise<Response> => {
  // Allow OPTIONS for local testing
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  // ── Guard: only callable with the shared secret ───────────────────────────
  // The Supabase cron scheduler sends this as a Bearer token.
  // You can also call it manually: curl -H "Authorization: Bearer <secret>" ...
  const authHeader = req.headers.get("Authorization") ?? "";
  const providedSecret = authHeader.replace("Bearer ", "").trim();

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // List all users and sign each one out globally.
    // signOut with scope "global" deletes ALL refresh tokens for that user,
    // immediately invalidating every active session across every device.
    let page = 1;
    let revokedCount = 0;
    let errors: string[] = [];

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 50,
      });

      if (error) {
        console.error("Failed to list users:", error.message);
        return new Response(
          JSON.stringify({ error: `Failed to list users: ${error.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      if (!data.users.length) break;

      // Sign out each user in parallel for speed
      const results = await Promise.allSettled(
        data.users.map((u) =>
          supabaseAdmin.auth.admin.signOut(u.id, "global"),
        ),
      );

      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          revokedCount++;
        } else {
          errors.push(`${data.users[i].email}: ${r.reason}`);
        }
      });

      // Supabase paginates at perPage items; if we got fewer, we're done
      if (data.users.length < 50) break;
      page++;
    }

    const summary = {
      success: true,
      revoked: revokedCount,
      errors: errors.length ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    console.log("Session revocation complete:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unexpected error in revoke-all-sessions:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
