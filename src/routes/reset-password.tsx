import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/blue-logo.png";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset Password — School Book Inventory" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase sends the user here with a recovery token in the URL hash.
  // onAuthStateChange fires a PASSWORD_RECOVERY event when the token is valid.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if we already have a session from the recovery link
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (err) {
      setError(err.message);
      return;
    }

    toast.success("Password updated! Please sign in with your new password.");
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #e8edf5 0%, #f5f3ee 50%, #eef0f5 100%)" }}>
        <GlassCard tilt={false} className="w-full max-w-sm p-8 text-center space-y-3">
            <KeyRound className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Waiting for your reset link…
            </p>
            <p className="text-xs text-muted-foreground/80">
              If you arrived here directly, please use the password reset link
              from your email.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/auth" })}
            >
              Back to sign in
            </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: "linear-gradient(135deg, #e8edf5 0%, #f5f3ee 50%, #eef0f5 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img
            src={logoImg}
            alt="Logo"
            className="h-11 object-contain"
          />
          <div className="text-center">
            <h1 className="text-page-title text-foreground">Set new password</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose a strong password for your account.
            </p>
          </div>
        </div>

        <GlassCard tilt={false} className="p-6">
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive/25 bg-destructive/10 p-3 text-center text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="new-pwd">New password</Label>
                <div className="relative">
                  <Input
                    id="new-pwd"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-pwd">Confirm password</Label>
                <Input
                  id="confirm-pwd"
                  type={showPwd ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="h-10"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10"
                disabled={busy}
              >
                {busy ? "Updating…" : "Set new password"}
              </Button>
            </form>
        </GlassCard>
      </div>
    </div>
  );
}