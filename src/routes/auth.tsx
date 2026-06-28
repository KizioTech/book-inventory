import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/blue-logo.png";

/**
 * Defines the `/auth` route for TanStack router.
 * Includes page title and meta description.
 */
export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — School Book Inventory" },
      {
        name: "description",
        content: "Sign in to record school book inventories.",
      },
    ],
  }),
  component: AuthPage,
});

/**
 * The main authentication page component.
 * Handles user login (email/password) and password reset flows.
 * Automatically redirects authenticated users to the home page (`/`).
 */
function AuthPage() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setErrorMsg(null);
    const { error } = await signIn(
      String(f.get("email")),
      String(f.get("password")),
    );
    setBusy(false);
    if (error) {
      setErrorMsg("Incorrect email or password. Please try again.");
    } else {
      toast.success("Welcome back");
    }
  };

  const handleForgotPassword = async () => {
    const emailInput = document.getElementById("si-email") as HTMLInputElement;
    if (!emailInput || !emailInput.value) {
      toast.error("Please enter your email address first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      emailInput.value,
      {
        redirectTo: window.location.origin + "/reset-password",
      },
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset instructions sent to your email.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: "linear-gradient(135deg, #e8edf5 0%, #f5f3ee 50%, #eef0f5 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={logoImg} alt="FutecAI Logo" className="h-12 object-contain" />
          <div className="text-center">
            <h1 className="text-page-title text-foreground">
              Book Inventory
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              FutecAI Limited Company
            </p>
          </div>
        </div>
        <GlassCard tilt={false} className="p-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="si-email">Email address</Label>
                <Input
                  id="si-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5 relative">
                <Label htmlFor="si-pw">Password</Label>
                <div className="relative">
                  <Input
                    id="si-pw"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10"
                disabled={busy}
              >
                {busy ? "Signing in…" : "Sign in"}
              </Button>

              {errorMsg && (
                <div className="rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorMsg}
                </div>
              )}

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-muted-foreground hover:text-foreground font-medium"
                >
                  Forgot your password?
                </button>
              </div>
            </form>
        </GlassCard>
      </div>
    </div>
  );
}