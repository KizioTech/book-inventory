import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

import logoImg from "@/assets/blue-logo.png";

/**
 * Defines the root index route (`/`).
 * Serves primarily as a router/redirector based on the user's authentication and role.
 */
export const Route = createFileRoute("/")({
  component: Index,
});

/**
 * The Index component acts as a splash screen and role-based router.
 * It waits for the authentication state to load, then redirects:
 * - Unauthenticated users to `/auth`.
 * - Admins and Super Admins to `/admin`.
 * - Clerks to `/clerk`.
 */
function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
    } else if (role === "super_admin" || role === "admin") {
      navigate({ to: "/admin" });
    } else {
      navigate({ to: "/clerk" });
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <img src={logoImg} alt="FutecAI Logo" className="h-12 w-auto animate-pulse object-contain" />
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
}