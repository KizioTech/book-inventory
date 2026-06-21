import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  BookOpen,
  Users,
  School as SchoolIcon,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  UserX,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv, toCsv } from "@/lib/csv";
import { StatusBadge, type StatusValue } from "@/components/status-badge";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { AccountSettings } from "@/components/account-settings";
import {
  useSchoolsQuery,
  useSchoolStatsQuery,
  useProfilesQuery,
  useUserRolesQuery,
  useClerkSchoolsQuery,
  useBooksQuery,
  useBooksCountQuery,
  type School,
  type Profile,
  type RoleRow,
  type BookRow,
  type ClerkSchoolAssignment,
  type SchoolStatsRow,
} from "@/lib/queries";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { type BookMeta } from "@/lib/book-metadata";
import { GlassCard } from "@/components/ui/glass-card";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

export type AdminTab = "schools" | "users" | "records" | "metadata" | "export" | "account";

const ADMIN_ITEMS = [
  { id: "schools", title: "Schools", icon: SchoolIcon },
  { id: "users", title: "Users", icon: Users },
  { id: "records", title: "Records", icon: BarChart2 },
  { id: "metadata", title: "Reference Data", icon: BookOpen },
  { id: "export", title: "Export", icon: Download },
  { id: "account", title: "Account", icon: User },
];

interface ClerkSchoolAssignmentOld {
  clerk_id: string;
  school_id: string;
}

interface ExportBookData {
  title: string | null;
  author: string | null;
  isbn: string | null;
  publisher: string | null;
  year: string | null;
  category: string | null;
  quantity: number;
  condition: string | null;
  shelf_location: string | null;
  notes: string | null;
}

interface CreateUserResponse {
  error?: string;
}

interface FunctionInvokeError {
  message: string;
  context?: {
    body?: unknown;
  };
}

function timeAgo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  return `${Math.floor(h / 24)} day${Math.floor(h / 24) > 1 ? "s" : ""} ago`;
}

function schoolStatus(active: boolean, lastEntry?: string): StatusValue {
  if (!active) return "paused";
  if (!lastEntry) return "idle";
  const diffMin = (Date.now() - new Date(lastEntry).getTime()) / 60000;
  if (diffMin < 30) return "active";
  if (diffMin < 180) return "slow";
  return "idle";
}

function AdminPage() {
  const { user, role, loading, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("schools");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (role !== "super_admin" && role !== "admin")
      navigate({ to: "/clerk" });
  }, [user, role, loading, navigate]);

  if (loading || !user || (role !== "super_admin" && role !== "admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <DashboardLayout
      items={ADMIN_ITEMS}
      activeTab={tab}
      onTabChange={(t) => setTab(t as AdminTab)}
      userFullName={profile?.full_name}
      userRole={role}
      onSignOut={() => signOut()}
    >
      <div className="space-y-6">
        {tab === "schools" && <SchoolsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "records" && <RecordsTab />}
        {tab === "metadata" && <MetadataTab />}
        {tab === "export" && <ExportTab />}
        {tab === "account" && <AccountSettings />}
      </div>
    </DashboardLayout>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-page-title text-foreground">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ---------------- Schools tab ----------------

function SchoolsTab() {
  const queryClient = useQueryClient();
  const { data: schools = [], isLoading: loadingSchools } = useSchoolsQuery();
  const { data: stats = [], isLoading: loadingStats } = useSchoolStatsQuery();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (
      payload: Omit<School, "id" | "created_at" | "active">,
    ) => {
      if (editing) {
        const { error } = await supabase
          .from("schools")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("schools").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "School updated" : "School added");
      setOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name")),
      district: String(f.get("district") || "") || null,
      region: String(f.get("region") || "") || null,
      contact: String(f.get("contact") || "") || null,
      notes: String(f.get("notes") || "") || null,
    };
    saveMutation.mutate(payload);
  };

  const toggleMutation = useMutation({
    mutationFn: async (s: School) => {
      const { error } = await supabase
        .from("schools")
        .update({ active: !s.active })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schools"] }),
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("School deleted");
      queryClient.invalidateQueries({ queryKey: ["schools"] });
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

  const counts: Record<string, number> = {};
  const clerkCounts: Record<string, number> = {};
  const lastEntries: Record<string, string> = {};

  stats.forEach((r) => {
    counts[r.school_id] = Number(r.total_books) || 0;
    clerkCounts[r.school_id] = Number(r.clerk_count) || 0;
    if (r.last_entry) lastEntries[r.school_id] = r.last_entry;
  });

  if (loadingSchools || loadingStats) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">Loading schools…</div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Schools"
        subtitle="Manage cataloguing sites"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add school
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {schools.map((s) => {
          const status = schoolStatus(s.active, lastEntries[s.id]);
          return (
            <GlassCard key={s.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-inner">
                  <SchoolIcon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">{s.name}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {s.district ?? "—"}
                    {s.region ? ` · ${s.region}` : ""}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BookOpen size={14} />
                  {(counts[s.id] ?? 0).toLocaleString()} books
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={14} />
                  {clerkCounts[s.id] ?? 0} clerks
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <StatusBadge status={status} />
                <span className="text-xs text-muted-foreground">
                  {lastEntries[s.id]
                    ? `Last entry: ${timeAgo(lastEntries[s.id])}`
                    : "No entries yet"}
                </span>
              </div>
              <div className="mt-4 flex justify-end gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(s);
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleMutation.mutate(s)}
                  disabled={toggleMutation.isPending}
                >
                  {s.active ? "Pause" : "Unpause"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(s.id)}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </GlassCard>
          );
        })}
        {schools.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground md:col-span-2">
            No schools yet — add one to get started.
          </div>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit school" : "Add school"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the school's details below."
                : "Fill in the details to add a new school."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5">
              <Label>
                School name <span className="text-destructive">*</span>
              </Label>
              <Input name="name" required defaultValue={editing?.name ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>District</Label>
                <Input name="district" defaultValue={editing?.district ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Region</Label>
                <Input name="region" defaultValue={editing?.region ?? ""} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Contact person</Label>
              <Input name="contact" defaultValue={editing?.contact ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea name="notes" defaultValue={editing?.notes ?? ""} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                {editing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete school?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this school and all associated books
              and assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------- Users tab ----------------

function UsersTab() {
  const { role: myRole } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: l1 } = useProfilesQuery();
  const { data: rolesData = [], isLoading: l2 } = useUserRolesQuery();
  const { data: schools = [], isLoading: l3 } = useSchoolsQuery();
  const { data: clerkSchools = [], isLoading: l4 } = useClerkSchoolsQuery();

  const roles: Record<string, string[]> = {};
  rolesData.forEach((r) => {
    roles[r.user_id] = [...(roles[r.user_id] ?? []), r.role];
  });

  const assignments: Record<string, string[]> = {};
  clerkSchools.forEach((c) => {
    assignments[c.clerk_id] = [...(assignments[c.clerk_id] ?? []), c.school_id];
  });

  const [manageOpen, setManageOpen] = useState(false);
  const [target, setTarget] = useState<Profile | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  const saveTargetMutation = useMutation({
    mutationFn: async ({
      uid,
      newRole,
      selected,
    }: {
      uid: string;
      newRole: "clerk" | "admin" | "super_admin";
      selected: string[];
    }) => {
      if (myRole === "super_admin") {
        await supabase.from("user_roles").delete().eq("user_id", uid);
        await supabase
          .from("user_roles")
          .insert({ user_id: uid, role: newRole });
      }
      await supabase.from("clerk_schools").delete().eq("clerk_id", uid);
      if (selected.length) {
        await supabase
          .from("clerk_schools")
          .insert(selected.map((sid) => ({ clerk_id: uid, school_id: sid })));
      }
    },
    onSuccess: () => {
      toast.success("User updated");
      setManageOpen(false);
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
      queryClient.invalidateQueries({ queryKey: ["clerk_schools"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (u: Profile) => {
      await supabase
        .from("profiles")
        .update({ active: !u.active })
        .eq("id", u.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profiles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (u: Profile) => {
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: u.id },
      });
      if (error) throw error;
    },
    onSuccess: (_, u) => {
      toast.success(`${u.full_name ?? u.email} has been deleted.`);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
      queryClient.invalidateQueries({ queryKey: ["clerk_schools"] });
    },
    onError: (err) => toast.error(err.message || "Failed to delete user"),
  });

  const saveTarget = (
    newRole: "clerk" | "admin" | "super_admin",
    selected: string[],
  ) => {
    if (!target) return;
    saveTargetMutation.mutate({ uid: target.id, newRole, selected });
  };

  const toggleActive = (u: Profile) => toggleMutation.mutate(u);

  const deleteUser = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget);
  };

  const rankFor = (uid: string) => {
    const r = roles[uid] ?? [];
    if (r.includes("super_admin")) return "Super Admin";
    if (r.includes("admin")) return "Admin";
    return "Clerk";
  };

  const roleBadgeClass = (label: string) => {
    if (label === "Super Admin") return "bg-primary text-primary-foreground";
    if (label === "Admin") return "bg-accent/15 text-accent";
    return "bg-secondary text-foreground";
  };

  const { user } = useAuth();
  const myId = user?.id;

  if (l1 || l2 || l3 || l4) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">Loading users…</div>
    );
  }

  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Users"
        subtitle={`${activeCount} active account${activeCount !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add user
          </Button>
        }
      />

      <div className="space-y-2.5">
        {users.map((u) => {
          const rankLabel = rankFor(u.id);
          const userSchools = (assignments[u.id] ?? [])
            .map((sid) => schools.find((s) => s.id === sid)?.name)
            .filter((name): name is string => Boolean(name));
          const initials = (u.full_name ?? u.email ?? "U")
            .split(" ")
            .map((s) => s[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            <div
              key={u.id}
              className={`rounded-lg border border-border bg-card p-4 ${
                !u.active ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {u.full_name ?? "—"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass(
                        rankLabel,
                      )}`}
                    >
                      {rankLabel}
                    </span>
                    {!u.active && (
                      <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {u.email}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {rankLabel === "Clerk"
                      ? userSchools.length
                        ? userSchools.slice(0, 2).join(", ") +
                          (userSchools.length > 2
                            ? ` + ${userSchools.length - 2} more`
                            : "")
                        : "No schools assigned"
                      : `${rankLabel} access`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTarget(u);
                      setManageOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActive(u)}
                  >
                    {u.active ? "Disable" : "Enable"}
                  </Button>
                  {/* Don't allow deleting yourself or super admins */}
                  {u.id !== myId && rankLabel !== "Super Admin" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(u)}
                    >
                      <UserX size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {target?.full_name}</DialogTitle>
            <DialogDescription>
              Update this user's role and school assignments.
            </DialogDescription>
          </DialogHeader>
          {target && (
            <ManageUserForm
              currentRole={
                (roles[target.id]?.[0] as "clerk" | "admin" | "super_admin") ??
                "clerk"
              }
              currentSchools={assignments[target.id] ?? []}
              schools={schools}
              canEditRole={myRole === "super_admin"}
              onSave={saveTarget}
            />
          )}
        </DialogContent>
      </Dialog>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        schools={schools}
        canCreateAdmin={myRole === "super_admin"}
        onCreated={() =>
          queryClient.invalidateQueries({ queryKey: ["profiles"] })
        }
      />

      {/* ── Delete confirmation dialog ─────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserX size={17} /> Delete account
            </DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.full_name ?? deleteTarget?.email}
              </span>
              's account, role, and all school assignments. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteUser}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  schools,
  canCreateAdmin,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  schools: School[];
  canCreateAdmin: boolean;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState<"clerk" | "admin">("clerk");
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFullName("");
      setEmail("");
      setPassword("");
      setShowPwd(false);
      setRole("clerk");
      setSelected([]);
      setError(null);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const { data, error: invokeErr } =
      await supabase.functions.invoke<CreateUserResponse>("create-user", {
        body: {
          full_name: fullName,
          email,
          password: password || undefined, // omit if blank → invite flow
          role,
          school_ids: role === "clerk" ? selected : [],
        },
      });
    setCreating(false);

    if (invokeErr) {
      let msg = invokeErr.message || "Failed to create user";
      const errWithCtx = invokeErr as FunctionInvokeError;
      if (errWithCtx.context?.body) {
        try {
          const body =
            typeof errWithCtx.context.body === "string"
              ? JSON.parse(errWithCtx.context.body)
              : errWithCtx.context.body;
          if (
            body &&
            typeof body === "object" &&
            "error" in body &&
            body.error
          ) {
            msg = String(body.error);
          }
        } catch {
          /* noop */
        }
      }
      setError(msg);
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }
    toast.success(
      `${fullName} added. They'll receive an email to set their password.`,
    );
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            The user will receive an email invitation to set their own password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Temporary password{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to send invite email"
                minLength={password ? 6 : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-secondary"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              If left blank, the user receives an email to set their own
              password.
              {password &&
                " If set, they can log in immediately but should change it."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>
              Role <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="role"
                  checked={role === "clerk"}
                  onChange={() => setRole("clerk")}
                />
                Clerk
              </label>
              {canCreateAdmin && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="role"
                    checked={role === "admin"}
                    onChange={() => setRole("admin")}
                  />
                  Admin
                </label>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assign schools (clerks only)</Label>
            <div
              className={`max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-border p-3 ${
                role !== "clerk" ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {schools.length === 0 && (
                <p className="text-sm text-muted-foreground">No schools available.</p>
              )}
              {schools.map((s) => {
                const checked = selected.includes(s.id);
                return (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setSelected(
                          v
                            ? [...selected, s.id]
                            : selected.filter((x) => x !== s.id),
                        )
                      }
                    />
                    <span>{s.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Create & send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManageUserForm({
  currentRole,
  currentSchools,
  schools,
  canEditRole,
  onSave,
}: {
  currentRole: "clerk" | "admin" | "super_admin";
  currentSchools: string[];
  schools: School[];
  canEditRole: boolean;
  onSave: (role: "clerk" | "admin" | "super_admin", selected: string[]) => void;
}) {
  const [role, setRole] = useState(currentRole);
  const [selected, setSelected] = useState<string[]>(currentSchools);

  return (
    <div className="space-y-4">
      {canEditRole && (
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clerk">Clerk</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Assigned schools</Label>
        <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border border-border p-3">
          {schools.length === 0 && (
            <p className="text-sm text-muted-foreground">Add schools first.</p>
          )}
          {schools.map((s) => {
            const checked = selected.includes(s.id);
            return (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) =>
                    setSelected(
                      v
                        ? [...selected, s.id]
                        : selected.filter((x) => x !== s.id),
                    )
                  }
                />
                <span>{s.name}</span>
              </label>
            );
          })}
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(role, selected)}>Save</Button>
      </DialogFooter>
    </div>
  );
}

// ---------------- Records tab ----------------

const PAGE_SIZE = 50;

function RecordsTab() {
  const queryClient = useQueryClient();
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [clerkFilter, setClerkFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: schools = [], isLoading: l1 } = useSchoolsQuery();
  const { data: profiles = [], isLoading: l2 } = useProfilesQuery();
  const { data: stats = [], isLoading: l3 } = useSchoolStatsQuery();
  const { data: todayBooksCount = 0, isLoading: l4 } = useBooksCountQuery({
    range: "today",
  });

  const filters = {
    schoolId: schoolFilter === "all" ? undefined : schoolFilter,
    clerkId: clerkFilter === "all" ? undefined : clerkFilter,
    condition: conditionFilter === "all" ? undefined : conditionFilter,
  };
  const { data: booksData, isLoading: l5 } = useBooksQuery(
    filters,
    page,
    PAGE_SIZE,
  );
  const pageRows = booksData?.data ?? [];
  const totalCount = booksData?.count ?? 0;

  useEffect(() => {
    setPage(1);
  }, [schoolFilter, clerkFilter, conditionFilter]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["school_stats"] });
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

  const byId = new Map(stats.map((r) => [r.school_id, r]));
  const totals = {
    totalBooks: stats.reduce((n, r) => n + (Number(r.total_books) || 0), 0),
    activeSchools: stats.filter((r) => Number(r.total_books) > 0).length,
    activeClerks: stats.reduce((n, r) => n + (Number(r.clerk_count) || 0), 0),
    todayBooks: todayBooksCount,
  };

  const perSchool = schools.map((s) => {
    const r = byId.get(s.id);
    const total = Number(r?.total_books) || 0;
    const clerks = Number(r?.clerk_count) || 0;
    const lastEntry = r?.last_entry ?? undefined;
    return {
      school: s,
      total,
      clerks,
      lastEntry,
      status: schoolStatus(s.active, lastEntry),
    };
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const schoolName = (id: string) =>
    schools.find((s) => s.id === id)?.name ?? "—";
  const clerkName = (id: string) =>
    profiles.find((p) => p.id === id)?.full_name ??
    profiles.find((p) => p.id === id)?.email ??
    "—";

  if (l1 || l2 || l3 || l4 || (l5 && pageRows.length === 0)) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">Loading records…</div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Records"
        subtitle="Live activity across all schools"
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          label="Total books"
          value={totals.totalBooks.toLocaleString()}
          icon={<BookOpen size={18} />}
        />
        <SummaryCard
          label="Schools"
          value={String(totals.activeSchools)}
          icon={<SchoolIcon size={18} />}
        />
        <SummaryCard
          label="Clerks"
          value={String(totals.activeClerks)}
          icon={<Users size={18} />}
        />
        <SummaryCard
          label="Today"
          value={totals.todayBooks.toLocaleString()}
          icon={<BarChart2 size={18} />}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-foreground">
          School progress
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">School</th>
                <th className="px-4 py-2 text-right">Books</th>
                <th className="px-4 py-2 text-right">Clerks</th>
                <th className="px-4 py-2 text-left">Last entry</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {perSchool.map((row) => (
                <tr
                  key={row.school.id}
                  className="border-t border-border text-foreground hover:bg-secondary/30"
                >
                  <td className="px-4 py-2 font-medium">{row.school.name}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {row.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{row.clerks}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {row.lastEntry ? timeAgo(row.lastEntry) : "Never"}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
              {perSchool.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No schools yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Detailed records</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="School" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All schools</SelectItem>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clerkFilter} onValueChange={setClerkFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Clerk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clerks</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">ISBN</th>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">School</th>
                  <th className="px-4 py-2">Clerk</th>
                  <th className="px-4 py-2">Cond.</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((b, i) => (
                  <tr
                    key={b.id}
                    className="border-t border-border hover:bg-secondary/30"
                  >
                    <td className="px-4 py-2 text-muted-foreground">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {b.isbn ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-foreground">{b.title ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.author ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-2">{schoolName(b.school_id)}</td>
                    <td className="px-4 py-2">{clerkName(b.clerk_id)}</td>
                    <td className="px-4 py-2">{b.condition ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setDeleteTarget(b.id)}
                        disabled={
                          deleteMutation.isPending && deleteTarget === b.id
                        }
                        aria-label="Delete"
                        className="rounded p-1 hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2
                          size={15}
                          className="text-destructive/70 hover:text-destructive"
                        />
                      </button>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      No records match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} /> Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative rounded-lg border border-border bg-card p-5">
      {icon && (
        <div className="absolute right-4 top-4 text-muted-foreground/40">{icon}</div>
      )}
      <div className="text-2xl font-semibold text-foreground tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

// ---------------- Export tab ----------------

function ExportTab() {
  const [schoolId, setSchoolId] = useState<string>("all");
  const [range, setRange] = useState<"all" | "today" | "week" | "month">("all");
  const [busy, setBusy] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const { data: schools = [], isLoading: l1 } = useSchoolsQuery();
  const { data: estimate = 0, isLoading: l2 } = useBooksCountQuery({
    schoolId: schoolId === "all" ? undefined : schoolId,
    range,
    countType: "rows",
  });

  const applyFilters = <T extends object>(q: T): T => {
    let query = q as ReturnType<typeof supabase.from>;
    if (schoolId !== "all") query = query.eq("school_id", schoolId);
    if (range !== "all") {
      const since = new Date();
      if (range === "today") since.setHours(0, 0, 0, 0);
      if (range === "week") since.setDate(since.getDate() - 7);
      if (range === "month") since.setMonth(since.getMonth() - 1);
      query = query.gte("created_at", since.toISOString());
    }
    return query as unknown as T;
  };

  const exportAll = async () => {
    setBusy(true);
    const base = supabase
      .from("books")
      .select(
        "title, author, isbn, publisher, year, category, quantity, condition, shelf_location, notes",
      )
      .order("created_at", { ascending: false });

    const { data, error } = await applyFilters(base);
    setBusy(false);

    if (error) return toast.error(error.message);

    const records = (data ?? []) as unknown as ExportBookData[];
    if (records.length === 0)
      return toast.error("No records match the selected filters.");

    const rows = records.map((b) => ({
      book_title: b.title ?? "",
      author: b.author ?? "",
      isbn: b.isbn ?? "",
      publisher: b.publisher ?? "",
      year_published: b.year ?? "",
      category_name: b.category ?? "",
      book_copies: b.quantity ?? 0,
      status: b.condition ?? "",
      shelf_location: b.shelf_location ?? "",
      description: b.notes ?? "",
    }));

    const columns: (keyof (typeof rows)[0])[] = [
      "book_title",
      "author",
      "isbn",
      "publisher",
      "year_published",
      "category_name",
      "book_copies",
      "status",
      "shelf_location",
      "description",
    ];

    const filename = `book-inventory-${schoolId === "all" ? "all-schools" : schoolId}-${Date.now()}.csv`;
    downloadCsv(filename, toCsv(rows, columns));
    toast.success(`Exported ${rows.length.toLocaleString()} rows`);
    setLastExport(new Date().toLocaleString());
  };

  const rangeLabel: Record<typeof range, string> = {
    all: "All time",
    today: "Today",
    week: "This week",
    month: "This month",
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Export records"
        subtitle="Download book inventory as a CSV file"
      />

      <div className="max-w-xl rounded-lg border border-border bg-card p-6 space-y-5">
        <p className="text-sm font-medium text-foreground">
          Filter your export
        </p>

        {/* School filter */}
        <div className="space-y-1.5">
          <Label>School</Label>
          <Select value={schoolId} onValueChange={setSchoolId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All schools</SelectItem>
              {schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range filter */}
        <div className="space-y-1.5">
          <Label>Date range</Label>
          <Select
            value={range}
            onValueChange={(v) => setRange(v as typeof range)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(rangeLabel) as (typeof range)[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {rangeLabel[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estimate + action */}
        <div className="rounded-md bg-secondary px-4 py-3 text-sm text-muted-foreground">
          {l2 ? (
            "Loading estimate…"
          ) : estimate === 0 ? (
            "No records match the current filters."
          ) : (
            <>
              Ready to export{" "}
              <span className="font-medium text-foreground">
                {estimate.toLocaleString()}
              </span>{" "}
              row{estimate !== 1 ? "s" : ""}.
            </>
          )}
        </div>

        <Button
          onClick={exportAll}
          disabled={busy || estimate === 0}
          className="w-full"
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {busy ? "Exporting…" : "Download CSV"}
        </Button>

        {lastExport && (
          <p className="text-xs text-muted-foreground text-center">
            Last export: {lastExport}
          </p>
        )}
      </div>
    </div>
  );
}

function MetadataTab() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<BookMeta[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load total count on mount
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("book_metadata")
      .select("id", { count: "exact", head: true })
      .then(({ count }: { count: number | null }) => setCount(count ?? 0));
  }, [progress]);

  // Debounced search
  const searchRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearch = (q: string) => {
    setSearch(q);
    clearTimeout(searchRef.current);
    if (q.length < 2) { setResults([]); return; }
    searchRef.current = setTimeout(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("book_metadata")
        .select("title, author, isbn, publisher, year, category")
        .ilike("title", `%${q}%`)
        .limit(20);
      setResults((data as BookMeta[]) ?? []);
    }, 300);
  };

  // CSV import handler
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setProgress(0);

    abortRef.current = new AbortController();
    const worker = new Worker(new URL('./metadataWorker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = async (ev) => {
      if (abortRef.current?.signal.aborted) {
        worker.terminate();
        return;
      }

      if (ev.data.type === 'batch') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from('book_metadata').upsert(ev.data.batch, { onConflict: 'isbn' });
        if (error) console.error("Batch error:", error);
        setProgress(Math.round(ev.data.progress * 100));
      } else if (ev.data.type === 'done') {
        setProgress(100);
        setImporting(false);
        worker.terminate();
        toast.success(`Import complete! Processed ${ev.data.total} rows.`);
        e.target.value = "";
      } else if (ev.data.type === 'error') {
        setImporting(false);
        worker.terminate();
        toast.error(`Import error: ${ev.data.error}`);
        e.target.value = "";
      }
    };

    worker.postMessage({ file, batchSize: 50 });
  };

  const cancelImport = () => {
    abortRef.current?.abort();
    setImporting(false);
    setProgress(null);
    toast.info("Import cancelled");
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Reference data"
        subtitle={
          count !== null
            ? `${count.toLocaleString()} books in the shared metadata pool`
            : "Loading…"
        }
      />

      {/* Import card */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <p className="text-sm font-medium text-foreground">Import from CSV</p>
        <p className="text-sm text-muted-foreground">
          Upload a CSV with columns:{" "}
          <code className="text-xs bg-secondary px-1 rounded">
            book_title, author, isbn, publisher, year_published, category_name
          </code>
          . Existing ISBN matches will be updated.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Button asChild variant="outline" disabled={importing}>
              <span>
                {importing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {importing ? "Importing…" : "Choose CSV file"}
              </span>
            </Button>
            <input
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={handleImport}
              disabled={importing}
            />
          </label>
          {importing && (
            <Button variant="ghost" onClick={cancelImport} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              Cancel
            </Button>
          )}
        </div>
        {progress !== null && importing && (
          <div className="w-full bg-secondary rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Search card */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <p className="text-sm font-medium text-foreground">Browse / verify</p>
        <Input
          placeholder="Search by title…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {results.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Author</th>
                  <th className="px-3 py-2 text-left">ISBN</th>
                  <th className="px-3 py-2 text-left">Publisher</th>
                  <th className="px-3 py-2 text-left">Year</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">{r.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.author || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.isbn || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.publisher || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.year || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}