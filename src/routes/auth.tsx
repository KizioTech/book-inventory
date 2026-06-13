import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-secondary/40 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center justify-center gap-2">
          <div className="flex flex-col items-center gap-3">
            <img src="/blue-logo.png" alt="FutecAI Logo" className="h-16 object-contain" />
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              Book Inventory
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            FutecAI Limited Company
          </p>
        </div>
        <Card className="rounded-2xl shadow-sm border border-slate-200">
          <CardContent className="pt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="si-email">Email address</Label>
                <Input
                  id="si-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="rounded-xl px-4 py-3 h-auto"
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
                    className="rounded-xl px-4 py-3 h-auto pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl py-6 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={busy}
              >
                {busy ? "Signing in…" : "Sign In"}
              </Button>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                  {errorMsg}
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-slate-500 hover:text-slate-700 font-medium"
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
