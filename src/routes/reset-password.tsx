import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

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
      <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-secondary/40 px-4">
        <Card className="w-full max-w-md rounded-2xl border border-slate-200 shadow-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <KeyRound className="mx-auto h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">
              Waiting for your reset link…
            </p>
            <p className="text-xs text-slate-400">
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-secondary/40 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <img
            src="/blue-logo.png"
            alt="Logo"
            className="h-14 object-contain"
          />
          <h1 className="text-xl font-bold text-primary">Set New Password</h1>
          <p className="text-sm text-slate-500">
            Choose a strong password for your account.
          </p>
        </div>

        <Card className="rounded-2xl border border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
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
                    className="rounded-xl px-4 py-3 h-auto pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400">Minimum 6 characters</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-pwd">Confirm password</Label>
                <Input
                  id="confirm-pwd"
                  type={showPwd ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="rounded-xl px-4 py-3 h-auto"
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl py-6 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={busy}
              >
                {busy ? "Updating…" : "Set New Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}