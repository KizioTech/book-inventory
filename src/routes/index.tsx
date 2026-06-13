import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

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
      navigate({ to: "/scan" });
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <BookOpen className="h-10 w-10 animate-pulse text-primary" />
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
}
