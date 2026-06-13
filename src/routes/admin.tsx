import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, LogOut, Plus, Trash2, Download, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv, toCsv } from "@/lib/csv";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

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

function AdminPage() {
  const { user, role, loading, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (role !== "super_admin" && role !== "admin") navigate({ to: "/scan" });
  }, [user, role, loading, navigate]);

  if (loading || !user || (role !== "super_admin" && role !== "admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12">
      <header className="flex items-center justify-between border-b py-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <Badge variant="secondary" className="ml-2 capitalize">
            {role?.replace("_", " ")}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {profile?.full_name}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/scan" })}>
            <ScanLine className="mr-1 h-4 w-4" />
            Scan
          </Button>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="mr-1 h-4 w-4" /> Log out
          </Button>
        </div>
      </header>

      <Tabs defaultValue="schools" className="mt-6">
        <TabsList>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        <TabsContent value="schools">
          <SchoolsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="records">
          <RecordsTab />
        </TabsContent>
        <TabsContent value="export">
          <ExportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Schools tab ----------------

function SchoolsTab() {
  const [schools, setSchools] = useState<School[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false });
    setSchools((data as School[]) ?? []);
    const { data: books } = await supabase.from("books").select("school_id");
    const c: Record<string, number> = {};
    (books ?? []).forEach((b: { school_id: string }) => {
      c[b.school_id] = (c[b.school_id] ?? 0) + 1;
    });
    setCounts(c);
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
    if (editing) {
      const { error } = await supabase.from("schools").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("schools").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("School added");
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  const toggleActive = async (s: School) => {
    await supabase.from("schools").update({ active: !s.active }).eq("id", s.id);
    load();
  };

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Schools</CardTitle>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Add school
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit school" : "New school"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
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
                <Label>Contact</Label>
                <Input name="contact" defaultValue={editing?.contact ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea name="notes" defaultValue={editing?.notes ?? ""} />
              </div>
              <DialogFooter>
                <Button type="submit">{editing ? "Save" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">District</th>
                <th className="px-4 py-2">Books</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.district ?? "—"}</td>
                  <td className="px-4 py-2">{counts[s.id] ?? 0}</td>
                  <td className="px-4 py-2">
                    {s.active ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(s);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(s)}>
                      {s.active ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
              {schools.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                    No schools yet — add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- Users tab ----------------

function UsersTab() {
  const { role: myRole } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [schools, setSchools] = useState<School[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Profile | null>(null);

  const load = async () => {
    const [{ data: ps }, { data: rs }, { data: sc }, { data: cs }] = await Promise.all([
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
    ((cs as { clerk_id: string; school_id: string }[]) ?? []).forEach((c) => {
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

  const openAssign = (u: Profile) => {
    setTarget(u);
    setOpen(true);
  };

  const setAssignmentsFor = async (uid: string, selected: string[]) => {
    await supabase.from("clerk_schools").delete().eq("clerk_id", uid);
    if (selected.length) {
      await supabase
        .from("clerk_schools")
        .insert(selected.map((sid) => ({ clerk_id: uid, school_id: sid })));
    }
  };

  const saveTarget = async (newRole: "clerk" | "admin" | "super_admin", selected: string[]) => {
    if (!target) return;
    if (myRole === "super_admin") {
      await supabase.from("user_roles").delete().eq("user_id", target.id);
      await supabase.from("user_roles").insert({ user_id: target.id, role: newRole });
    }
    await setAssignmentsFor(target.id, selected);
    toast.success("User updated");
    setOpen(false);
    load();
  };

  const toggleActive = async (u: Profile) => {
    await supabase.from("profiles").update({ active: !u.active }).eq("id", u.id);
    load();
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <p className="text-xs text-muted-foreground">
          New users sign themselves up on the login page; come here to set their role and assign
          schools.
        </p>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Schools</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2">{rankFor(u.id)}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {(assignments[u.id] ?? [])
                      .map((sid) => schools.find((s) => s.id === sid)?.name)
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2">
                    {u.active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openAssign(u)}>
                      Manage
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>
                      {u.active ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {target?.full_name}</DialogTitle>
          </DialogHeader>
          {target && (
            <ManageUserForm
              target={target}
              currentRole={
                (roles[target.id]?.[0] as "clerk" | "admin" | "super_admin") ?? "clerk"
              }
              currentSchools={assignments[target.id] ?? []}
              schools={schools}
              canEditRole={myRole === "super_admin"}
              onSave={saveTarget}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ManageUserForm({
  currentRole,
  currentSchools,
  schools,
  canEditRole,
  onSave,
}: {
  target: Profile;
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
            <p className="text-sm text-muted-foreground">Add schools first.</p>
          )}
          {schools.map((s) => {
            const checked = selected.includes(s.id);
            return (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) =>
                    setSelected(v ? [...selected, s.id] : selected.filter((x) => x !== s.id))
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

function RecordsTab() {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [clerkFilter, setClerkFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const [{ data: bks }, { data: scs }, { data: ps }] = await Promise.all([
        supabase
          .from("books")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.from("schools").select("*").order("name"),
        supabase.from("profiles").select("id, full_name, email, active"),
      ]);
      setBooks((bks as BookRow[]) ?? []);
      setSchools((scs as School[]) ?? []);
      setProfiles((ps as Profile[]) ?? []);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      books.filter(
        (b) =>
          (schoolFilter === "all" || b.school_id === schoolFilter) &&
          (clerkFilter === "all" || b.clerk_id === clerkFilter) &&
          (conditionFilter === "all" || b.condition === conditionFilter),
      ),
    [books, schoolFilter, clerkFilter, conditionFilter],
  );

  const totals = useMemo(() => {
    const totalBooks = books.reduce((n, b) => n + (b.quantity ?? 1), 0);
    const activeSchools = new Set(books.map((b) => b.school_id)).size;
    const activeClerks = new Set(books.map((b) => b.clerk_id)).size;
    return { totalBooks, activeSchools, activeClerks };
  }, [books]);

  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name ?? "—";
  const clerkName = (id: string) =>
    profiles.find((p) => p.id === id)?.full_name ?? profiles.find((p) => p.id === id)?.email ?? "—";

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Books recorded" value={totals.totalBooks.toLocaleString()} />
        <SummaryCard label="Schools with records" value={String(totals.activeSchools)} />
        <SummaryCard label="Active clerks" value={String(totals.activeClerks)} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Records</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="w-44">
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
              <SelectTrigger className="w-44">
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
              <SelectTrigger className="w-36">
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
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">ISBN</th>
                  <th className="px-4 py-2">School</th>
                  <th className="px-4 py-2">Clerk</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2">Cond.</th>
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-4 py-2">
                      <div className="font-medium">{b.title ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{b.author ?? ""}</div>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{b.isbn ?? "—"}</td>
                    <td className="px-4 py-2">{schoolName(b.school_id)}</td>
                    <td className="px-4 py-2">{clerkName(b.clerk_id)}</td>
                    <td className="px-4 py-2">{b.quantity}</td>
                    <td className="px-4 py-2">{b.condition ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          await supabase.from("books").delete().eq("id", b.id);
                          setBooks((bs) => bs.filter((x) => x.id !== b.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={8}>
                      No records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

// ---------------- Export tab ----------------

function ExportTab() {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("schools")
      .select("*")
      .order("name")
      .then(({ data }) => setSchools((data as School[]) ?? []));
  }, []);

  const exportAll = async () => {
    let q = supabase
      .from("books")
      .select(
        "id, isbn, title, author, publisher, year, quantity, condition, notes, school_id, clerk_id, created_at, schools(name), profiles(full_name)",
      )
      .order("created_at", { ascending: false });
    if (schoolId !== "all") q = q.eq("school_id", schoolId);
    const { data, error } = await q;
    if (error) return toast.error(error.message);
    const rows = (data ?? []).map((b) => ({
      id: b.id,
      isbn: b.isbn,
      title: b.title,
      author: b.author,
      publisher: b.publisher,
      year: b.year,
      quantity: b.quantity,
      condition: b.condition,
      notes: b.notes,
      school_name: (b.schools as unknown as { name: string } | null)?.name ?? "",
      clerk_name: (b.profiles as unknown as { full_name: string } | null)?.full_name ?? "",
      recorded_at: b.created_at,
    }));
    if (rows.length === 0) return toast.error("Nothing to export");
    downloadCsv(`book-inventory-${Date.now()}.csv`, toCsv(rows));
    toast.success(`Exported ${rows.length} rows`);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Export CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Filter by school</Label>
          <Select value={schoolId} onValueChange={setSchoolId}>
            <SelectTrigger className="w-72">
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
        <Button onClick={exportAll}>
          <Download className="mr-1 h-4 w-4" />
          Download CSV
        </Button>
      </CardContent>
    </Card>
  );
}
