import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BookOpen,
  BarChart2,
  Trash2,
  School as SchoolIcon,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountSettings } from "@/components/account-settings";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  useBooksQuery,
  useAssignedSchoolsQuery,
  useBooksCountQuery,
  type BookRow
} from "@/lib/queries";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export const Route = createFileRoute("/clerk")({
  component: ClerkPage,
});

const CLERK_ITEMS = [
  { id: "dashboard", title: "Dashboard", icon: BarChart2 },
  { id: "records", title: "My Records", icon: BookOpen },
  { id: "account", title: "Account", icon: User },
];

type ClerkTab = "dashboard" | "records" | "account";

function ClerkPage() {
  const { user, role, loading, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ClerkTab>("dashboard");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (role === "admin" || role === "super_admin")
      navigate({ to: "/admin" });
  }, [user, role, loading, navigate]);

  if (loading || !user || role !== "clerk") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <DashboardLayout
      items={CLERK_ITEMS}
      activeTab={tab}
      onTabChange={(t) => setTab(t as ClerkTab)}
      userFullName={profile?.full_name}
      userRole={role}
      onSignOut={() => signOut()}
    >
      <div className="space-y-6">
        {tab === "dashboard" && <ClerkDashboardTab userId={user.id} role={role} />}
        {tab === "records" && <ClerkRecordsTab userId={user.id} />}
        {tab === "account" && <AccountSettings />}
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between shadow-sm">
      <div>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
    </div>
  );
}

function ClerkDashboardTab({ userId, role }: { userId: string; role: string }) {
  const { data: schools = [], isLoading: loadingSchools } = useAssignedSchoolsQuery(userId, role);
  
  const { data: totalBooksCount = 0 } = useBooksCountQuery({
    clerkId: userId,
  });

  const { data: todayBooksCount = 0 } = useBooksCountQuery({
    clerkId: userId,
    range: "today",
  });

  const { data: recentBooks } = useBooksQuery({ clerkId: userId }, 1, 5);

  if (loadingSchools) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome to your assigned schools overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="My Total Scans"
          value={totalBooksCount.toLocaleString()}
          icon={<BookOpen size={18} />}
        />
        <SummaryCard
          label="My Scans Today"
          value={todayBooksCount.toLocaleString()}
          icon={<BarChart2 size={18} />}
        />
        <SummaryCard
          label="Assigned Schools"
          value={schools.length.toString()}
          icon={<SchoolIcon size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Assigned Schools</CardTitle>
          </CardHeader>
          <CardContent>
            {schools.length === 0 ? (
              <p className="text-sm text-muted-foreground">No schools assigned yet.</p>
            ) : (
              <ul className="space-y-3">
                {schools.map(s => (
                  <li key={s.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                    <span className="font-medium text-sm">{s.name}</span>
                    <SchoolIcon className="h-4 w-4 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentBooks?.data || recentBooks.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent scans.</p>
            ) : (
              <ul className="space-y-3">
                {recentBooks.data.map(b => (
                  <li key={b.id} className="flex flex-col p-3 border border-border rounded-lg bg-card">
                    <span className="font-semibold text-sm truncate">{b.title || "Untitled"}</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-muted-foreground">{b.author || "Unknown Author"}</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Qty: {b.quantity}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClerkRecordsTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: booksData, isLoading } = useBooksQuery(
    { clerkId: userId },
    page,
    PAGE_SIZE,
  );
  
  const pageRows = booksData?.data ?? [];
  const totalCount = booksData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["books_count"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Loading records…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Records</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Title & Author</th>
                  <th className="px-4 py-3 font-medium">ISBN</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground truncate max-w-[200px]">
                        {b.title || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {b.author || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {b.isbn || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.quantity}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(b.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      You haven't scanned any books yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <div className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this book record from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

