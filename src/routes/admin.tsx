import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { AdminSidebar, type AdminTab } from "@/components/admin-sidebar";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

// Type definitions
interface School {
  id: string;
  name: string;
  district: string | null;
  region: string | null;
  contact: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  active: boolean;
}

interface RoleRow {
  user_id: string;
  role: "super_admin" | "admin" | "clerk";
}

interface BookRow {
  id: string;
  isbn: string | null;
  title: string | null;
  author: string | null;
  publisher: string | null;
  year: string | null;
  quantity: number;
  condition: string | null;
  notes: string | null;
  school_id: string;
  clerk_id: string;
  created_at: string;
}


interface ClerkSchoolAssignment {
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
      navigate({ to: "/scan" });
  }, [user, role, loading, navigate]);

  if (loading || !user || (role !== "super_admin" && role !== "admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <AdminSidebar
        active={tab}
        onChange={setTab}
        fullName={profile?.full_name}
        role={role}
        onSignOut={() => signOut()}
      />
      <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {tab === "schools" && <SchoolsTab />}
          {tab === "users" && <UsersTab />}
          {tab === "records" && <RecordsTab />}
          {tab === "export" && <ExportTab />}
        </div>
      </main>
    </div>
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
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ---------------- Schools tab ----------------

function SchoolsTab() {
  const [schools, setSchools] = useState<School[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [clerkCounts, setClerkCounts] = useState<Record<string, number>>({});
  const [lastEntries, setLastEntries] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: sData }, { data: stats }] = await Promise.all([
      supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.rpc("get_school_stats"),
    ]);
    setSchools((sData as School[]) ?? []);

    const c: Record<string, number> = {};
    const cc: Record<string, number> = {};
    const latest: Record<string, string> = {};
    ((stats as Array<{ school_id: string; total_books: number; clerk_count: number; last_entry: string | null }>) ?? []).forEach((r) => {
      c[r.school_id] = Number(r.total_books) || 0;
      cc[r.school_id] = Number(r.clerk_count) || 0;
      if (r.last_entry) latest[r.school_id] = r.last_entry;
    });
    setCounts(c);
    setClerkCounts(cc);
    setLastEntries(latest);
  };

  useEffect(() => {
    load();
  }, []);


  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name")),
      district: String(f.get("district") || "") || null,
      region: String(f.get("region") || "") || null,
      contact: String(f.get("contact") || "") || null,
      notes: String(f.get("notes") || "") || null,
    };
    setSaving(true);
    const res = editing
      ? await supabase.from("schools").update(payload).eq("id", editing.id)
      : await supabase.from("schools").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "School updated" : "School added");
    setOpen(false);
    setEditing(null);
    load();
  };

  const toggleActive = async (s: School) => {
    await supabase.from("schools").update({ active: !s.active }).eq("id", s.id);
    load();
  };

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
            Add School
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {schools.map((s) => {
          const status = schoolStatus(s.active, lastEntries[s.id]);
          return (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="font-semibold text-slate-900">{s.name}</div>
              <div className="text-sm text-slate-500">
                {s.district ?? "—"}
                {s.region ? ` · ${s.region}` : ""}
              </div>
              <div className="mt-3 flex gap-4 text-sm text-slate-600">
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
                <span className="text-xs text-slate-400">
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
                <Button size="sm" variant="ghost" onClick={() => toggleActive(s)}>
                  {s.active ? "Pause" : "Unpause"}
                </Button>
              </div>
            </div>
          );
        })}
        {schools.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2">
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
              {editing ? "Update the school's details below." : "Fill in the details to add a new school."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5">
              <Label>
                School Name <span className="text-red-500">*</span>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {editing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Users tab ----------------

function UsersTab() {
  const { role: myRole } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [schools, setSchools] = useState<School[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [manageOpen, setManageOpen] = useState(false);
  const [target, setTarget] = useState<Profile | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const [{ data: ps }, { data: rs }, { data: sc }, { data: cs }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, active")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("schools").select("*").order("name"),
        supabase.from("clerk_schools").select("clerk_id, school_id"),
      ]);
    setUsers((ps as Profile[]) ?? []);
    const rmap: Record<string, string[]> = {};
    ((rs as RoleRow[]) ?? []).forEach((r) => {
      rmap[r.user_id] = [...(rmap[r.user_id] ?? []), r.role];
    });
    setRoles(rmap);
    setSchools((sc as School[]) ?? []);
    const amap: Record<string, string[]> = {};
    ((cs as ClerkSchoolAssignment[]) ?? []).forEach((c) => {
      amap[c.clerk_id] = [...(amap[c.clerk_id] ?? []), c.school_id];
    });
    setAssignments(amap);
  };
  
  useEffect(() => {
    load();
  }, []);

  const rankFor = (uid: string) => {
    const r = roles[uid] ?? [];
    if (r.includes("super_admin")) return "Super Admin";
    if (r.includes("admin")) return "Admin";
    return "Clerk";
  };

  const roleBadgeClass = (label: string) => {
    if (label === "Super Admin") return "bg-slate-800 text-white";
    if (label === "Admin") return "bg-purple-100 text-purple-700";
    return "bg-blue-100 text-blue-700";
  };

  const setAssignmentsFor = async (uid: string, selected: string[]) => {
    await supabase.from("clerk_schools").delete().eq("clerk_id", uid);
    if (selected.length) {
      await supabase
        .from("clerk_schools")
        .insert(selected.map((sid) => ({ clerk_id: uid, school_id: sid })));
    }
  };

  const saveTarget = async (
    newRole: "clerk" | "admin" | "super_admin",
    selected: string[],
  ) => {
    if (!target) return;
    if (myRole === "super_admin") {
      await supabase.from("user_roles").delete().eq("user_id", target.id);
      await supabase
        .from("user_roles")
        .insert({ user_id: target.id, role: newRole });
    }
    await setAssignmentsFor(target.id, selected);
    toast.success("User updated");
    setManageOpen(false);
    load();
  };

  const toggleActive = async (u: Profile) => {
    await supabase.from("profiles").update({ active: !u.active }).eq("id", u.id);
    load();
  };

  const { user } = useAuth();
  const myId = user?.id;

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: invokeErr } = await supabase.functions.invoke("delete-user", {
      body: { user_id: deleteTarget.id },
    });
    setDeleting(false);
    if (invokeErr) {
      toast.error(invokeErr.message || "Failed to delete user");
      return;
    }
    toast.success(`${deleteTarget.full_name ?? deleteTarget.email} has been deleted.`);
    setDeleteTarget(null);
    load();
  };

  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Users"
        subtitle={`${activeCount} active account${activeCount !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add User
          </Button>
        }
      />

      <div className="space-y-3">
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
              className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                !u.active ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">
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
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="truncate text-sm text-slate-500">{u.email}</div>
                  <div className="mt-1 text-xs text-slate-500">
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
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>
                    {u.active ? "Disable" : "Enable"}
                  </Button>
                  {/* Don't allow deleting yourself or super admins */}
                  {u.id !== myId && rankLabel !== "Super Admin" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
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
        onCreated={load}
      />

      {/* ── Delete confirmation dialog ─────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX size={18} /> Delete account
            </DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-slate-900">
                {deleteTarget?.full_name ?? deleteTarget?.email}
              </span>
              's account, role, and all school assignments. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteUser}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
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
    const { data, error: invokeErr } = await supabase.functions.invoke<CreateUserResponse>(
      "create-user",
      {
        body: {
          full_name: fullName,
          email,
          password: password || undefined,   // omit if blank → invite flow
          role,
          school_ids: role === "clerk" ? selected : [],
        },
      },
    );
    setCreating(false);

    if (invokeErr) {
      let msg = invokeErr.message || "Failed to create user";
      const errWithCtx = invokeErr as FunctionInvokeError;
      if (errWithCtx.context?.body) {
        try {
          const body = typeof errWithCtx.context.body === "string" 
            ? JSON.parse(errWithCtx.context.body) 
            : errWithCtx.context.body;
          if (body && typeof body === "object" && "error" in body && body.error) {
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
    toast.success(`${fullName} added. They'll receive an email to set their password.`);
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
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Temporary password <span className="text-slate-400 font-normal">(optional)</span></Label>
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
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              If left blank, the user receives an email to set their own password.
              {password && " If set, they can log in immediately but should change it."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>
              Role <span className="text-red-500">*</span>
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
              className={`max-h-40 space-y-1.5 overflow-y-auto rounded-md border p-3 ${
                role !== "clerk" ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {schools.length === 0 && (
                <p className="text-sm text-slate-500">No schools available.</p>
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
              Create & Send Invite
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
        <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border p-3">
          {schools.length === 0 && (
            <p className="text-sm text-slate-500">Add schools first.</p>
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
  const [pageRows, setPageRows] = useState<BookRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [schools, setSchools] = useState<School[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [clerkFilter, setClerkFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totals, setTotals] = useState({
    totalBooks: 0,
    activeSchools: 0,
    activeClerks: 0,
    todayBooks: 0,
  });
  const [perSchool, setPerSchool] = useState<
    Array<{
      school: School;
      total: number;
      clerks: number;
      lastEntry?: string;
      status: StatusValue;
    }>
  >([]);

  // Load lookups + summary once (cheap, joined via RPC + small tables)
  useEffect(() => {
    (async () => {
      const [{ data: scs }, { data: ps }, { data: stats }] = await Promise.all([
        supabase.from("schools").select("*").order("name"),
        supabase.from("profiles").select("id, full_name, email, active"),
        supabase.rpc("get_school_stats"),
      ]);
      const schoolsList = (scs as School[]) ?? [];
      setSchools(schoolsList);
      setProfiles((ps as Profile[]) ?? []);

      const statRows =
        (stats as Array<{
          school_id: string;
          total_books: number;
          clerk_count: number;
          last_entry: string | null;
        }>) ?? [];
      const byId = new Map(statRows.map((r) => [r.school_id, r]));

      const totalBooks = statRows.reduce(
        (n, r) => n + (Number(r.total_books) || 0),
        0,
      );
      const activeSchools = statRows.filter(
        (r) => Number(r.total_books) > 0,
      ).length;
      const activeClerks = statRows.reduce(
        (n, r) => n + (Number(r.clerk_count) || 0),
        0,
      );

      // Today's books — single small count query
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from("books")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since.toISOString());

      setTotals({
        totalBooks,
        activeSchools,
        activeClerks,
        todayBooks: todayCount ?? 0,
      });

      setPerSchool(
        schoolsList.map((s) => {
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
        }),
      );
    })();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [schoolFilter, clerkFilter, conditionFilter]);

  // Server-side paginated + filtered books query
  useEffect(() => {
    (async () => {
      let q = supabase
        .from("books")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (schoolFilter !== "all") q = q.eq("school_id", schoolFilter);
      if (clerkFilter !== "all") q = q.eq("clerk_id", clerkFilter);
      if (conditionFilter !== "all") q = q.eq("condition", conditionFilter);
      const { data, count } = await q;
      setPageRows((data as BookRow[]) ?? []);
      setTotalCount(count ?? 0);
    })();
  }, [page, schoolFilter, clerkFilter, conditionFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const schoolName = (id: string) =>
    schools.find((s) => s.id === id)?.name ?? "—";
  const clerkName = (id: string) =>
    profiles.find((p) => p.id === id)?.full_name ??
    profiles.find((p) => p.id === id)?.email ??
    "—";

  const del = async (id: string) => {
    if (!window.confirm("Delete this record?")) return;
    await supabase.from("books").delete().eq("id", id);
    setPageRows((bs) => bs.filter((x) => x.id !== id));
    setTotalCount((c) => Math.max(0, c - 1));
  };


  return (
    <div className="space-y-6">
      <SectionHeader title="Records" subtitle="Live activity across all schools" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          label="Total Books"
          value={totals.totalBooks.toLocaleString()}
          icon={<BookOpen size={20} />}
        />
        <SummaryCard
          label="Schools"
          value={String(totals.activeSchools)}
          icon={<SchoolIcon size={20} />}
        />
        <SummaryCard
          label="Clerks"
          value={String(totals.activeClerks)}
          icon={<Users size={20} />}
        />
        <SummaryCard
          label="Today"
          value={totals.todayBooks.toLocaleString()}
          icon={<BarChart2 size={20} />}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
          School Progress
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">School</th>
                <th className="px-4 py-2 text-right">Books</th>
                <th className="px-4 py-2 text-right">Clerks</th>
                <th className="px-4 py-2 text-left">Last Entry</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {perSchool.map((row) => (
                <tr
                  key={row.school.id}
                  className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                >
                  <td className="px-4 py-2 font-medium">{row.school.name}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {row.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">{row.clerks}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {row.lastEntry ? timeAgo(row.lastEntry) : "Never"}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
              {perSchool.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
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
          <CardTitle className="text-base">Detailed records</CardTitle>
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
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
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
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2 text-slate-400">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {b.isbn ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{b.title ?? "—"}</div>
                      <div className="text-xs text-slate-500">
                        {b.author ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-2">{schoolName(b.school_id)}</td>
                    <td className="px-4 py-2">{clerkName(b.clerk_id)}</td>
                    <td className="px-4 py-2">{b.condition ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => del(b.id)}
                        aria-label="Delete"
                        className="rounded p-1 hover:bg-red-50"
                      >
                        <Trash2
                          size={15}
                          className="text-red-400 hover:text-red-600"
                        />
                      </button>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                      No records match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
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
                <span className="text-xs text-slate-500">
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
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {icon && (
        <div className="absolute right-4 top-4 text-slate-300">{icon}</div>
      )}
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

// ---------------- Export tab ----------------

// ---------------- Export tab ----------------

function ExportTab() {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string>("all");
  const [range, setRange] = useState<"all" | "today" | "week" | "month">("all");
  const [estimate, setEstimate] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("schools")
      .select("*")
      .order("name")
      .then(({ data }) => setSchools((data as School[]) ?? []));
  }, []);

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

  // Re-fetch count whenever filters change
  useEffect(() => {
    (async () => {
      const base = supabase
        .from("books")
        .select("id", { count: "exact", head: true });
      const { count } = await applyFilters(base);
      setEstimate(count ?? 0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, range]);

  const exportAll = async () => {
    setBusy(true);
    const base = supabase
      .from("books")
      .select("title, author, isbn, publisher, year, category, quantity, condition, shelf_location, notes")
      .order("created_at", { ascending: false });

    const { data, error } = await applyFilters(base);
    setBusy(false);

    if (error) return toast.error(error.message);

    const records = (data ?? []) as unknown as ExportBookData[];
    if (records.length === 0) return toast.error("No records match the selected filters.");

    const rows = records.map((b) => ({
      book_title:    b.title         ?? "",
      author:        b.author        ?? "",
      isbn:          b.isbn          ?? "",
      publisher:     b.publisher     ?? "",
      year_published: b.year         ?? "",
      category_name: b.category      ?? "",
      book_copies:   b.quantity      ?? 0,
      status:        b.condition     ?? "",
      shelf_location: b.shelf_location ?? "",
      description:   b.notes         ?? "",
    }));

    const columns: (keyof (typeof rows)[0])[] = [
      "book_title", "author", "isbn", "publisher",
      "year_published", "category_name", "book_copies",
      "status", "shelf_location", "description",
    ];

    const filename = `book-inventory-${schoolId === "all" ? "all-schools" : schoolId}-${Date.now()}.csv`;
    downloadCsv(filename, toCsv(rows, columns));
    toast.success(`Exported ${rows.length.toLocaleString()} rows`);
    setLastExport(new Date().toLocaleString());
  };

  const rangeLabel: Record<typeof range, string> = {
    all:   "All time",
    today: "Today",
    week:  "This week",
    month: "This month",
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Export Records"
        subtitle="Download book inventory as a CSV file"
      />

      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <p className="text-sm font-semibold text-slate-700">Filter your export</p>

        {/* School filter */}
        <div className="space-y-1.5">
          <Label>School</Label>
          <Select value={schoolId} onValueChange={setSchoolId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools</SelectItem>
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
          <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
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
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {estimate === 0
            ? "No records match the current filters."
            : <>Ready to export <span className="font-semibold text-slate-900">{estimate.toLocaleString()}</span> row{estimate !== 1 ? "s" : ""}.</>
          }
        </div>

        <Button onClick={exportAll} disabled={busy || estimate === 0} className="w-full">
          {busy
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Download className="mr-2 h-4 w-4" />
          }
          {busy ? "Exporting…" : "Download CSV"}
        </Button>

        {lastExport && (
          <p className="text-xs text-slate-400 text-center">Last export: {lastExport}</p>
        )}
      </div>
    </div>
  );
}