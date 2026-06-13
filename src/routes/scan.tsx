import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, LogOut, MapPin, Save, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { lookupIsbn } from "@/lib/google-books";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { downloadCsv, toCsv } from "@/lib/csv";

export const Route = createFileRoute("/scan")({
  component: ScanPage,
});

interface School {
  id: string;
  name: string;
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
  created_at: string;
}

const empty = {
  isbn: "",
  title: "",
  author: "",
  publisher: "",
  year: "",
  quantity: 1,
  condition: "Good" as "Good" | "Fair" | "Poor",
  notes: "",
};

function ScanPage() {
  const { user, profile, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [locked, setLocked] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [records, setRecords] = useState<BookRow[]>([]);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  // Load assigned schools (clerks see only their assignments; staff see all)
  useEffect(() => {
    if (!user) return;
    (async () => {
      if (role === "clerk") {
        const { data } = await supabase
          .from("clerk_schools")
          .select("school_id, schools(id, name, active)")
          .eq("clerk_id", user.id);
        const list =
          (data ?? [])
            .map(
              (r) =>
                r.schools as unknown as {
                  id: string;
                  name: string;
                  active: boolean;
                },
            )
            .filter((s) => s && s.active) ?? [];
        setSchools(list.map((s) => ({ id: s.id, name: s.name })));
      } else {
        const { data } = await supabase
          .from("schools")
          .select("id, name")
          .eq("active", true)
          .order("name");
        setSchools(data ?? []);
      }
    })();
  }, [user, role]);

  const activeSchool = useMemo(
    () => schools.find((s) => s.id === schoolId),
    [schools, schoolId],
  );

  const loadRecords = async (sid: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("books")
      .select(
        "id, isbn, title, author, publisher, year, quantity, condition, notes, created_at",
      )
      .eq("school_id", sid)
      .eq("clerk_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setRecords((data as BookRow[]) ?? []);
  };

  const startSession = async () => {
    if (!schoolId) return toast.error("Choose a school first");
    setLocked(true);
    await loadRecords(schoolId);
  };

  const handleDetected = async (code: string) => {
    setPaused(true);
    setForm((f) => ({ ...f, isbn: code }));
    toast.message(`Scanned ${code}`, { description: "Looking up metadata…" });
    const meta = await lookupIsbn(code);
    if (meta) {
      setForm((f) => ({ ...f, ...meta }));
      toast.success(meta.title || "Book details loaded");
    } else {
      toast.warning("No metadata found — fill in manually");
    }
  };

  const save = async () => {
    if (!user || !schoolId) return;
    if (!form.isbn && !form.title) {
      toast.error("Enter an ISBN or a title");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("books").insert({
      isbn: form.isbn || null,
      title: form.title || null,
      author: form.author || null,
      publisher: form.publisher || null,
      year: form.year || null,
      quantity: form.quantity,
      condition: form.condition,
      notes: form.notes || null,
      school_id: schoolId,
      clerk_id: user.id,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    setForm({ ...empty });
    setPaused(false);
    loadRecords(schoolId);
  };

  const del = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this book?")) return;
    await supabase.from("books").delete().eq("id", id);
    loadRecords(schoolId);
    toast.success("Book deleted");
  };

  const exportCsv = () => {
    if (records.length === 0) return toast.error("Nothing to export");
    const csv = toCsv(
      records.map((r) => ({
        isbn: r.isbn,
        title: r.title,
        author: r.author,
        publisher: r.publisher,
        year: r.year,
        quantity: r.quantity,
        condition: r.condition,
        notes: r.notes,
        recorded_at: r.created_at,
      })),
    );
    downloadCsv(
      `${activeSchool?.name ?? "books"}-${Date.now()}.csv`.replace(/\s+/g, "_"),
      csv,
    );
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  // School select screen
  if (!locked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-secondary/40 px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle>Welcome, {profile?.full_name ?? "Clerk"} 👋</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select your school</Label>
              <Select value={schoolId} onValueChange={setSchoolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose school…" />
                </SelectTrigger>
                <SelectContent>
                  {schools.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      No schools assigned to you yet.
                    </div>
                  ) : (
                    schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={startSession}
              className="w-full"
              disabled={!schoolId}
            >
              Start Recording
            </Button>
            <div className="flex justify-between pt-2">
              {(role === "admin" || role === "super_admin") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ to: "/admin" })}
                >
                  Admin panel
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="mr-1 h-4 w-4" /> Log out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-3 pb-16">
      <header className="sticky top-0 z-10 -mx-3 mb-3 border-b bg-background/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">
              {activeSchool?.name}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="mr-1 h-4 w-4" />
            Log out
          </Button>
        </div>
      </header>

      <section className="mb-4">
        <BarcodeScanner onDetected={handleDetected} paused={paused} />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Point camera at the barcode</span>
          {paused && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPaused(false)}
            >
              Resume camera
            </Button>
          )}
        </div>
      </section>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Book details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>ISBN</Label>
              <Input
                value={form.isbn}
                onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                placeholder="13-digit barcode"
                inputMode="numeric"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Author(s)</Label>
              <Input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Publisher</Label>
              <Input
                value={form.publisher}
                onChange={(e) =>
                  setForm({ ...form, publisher: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: Number(e.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select
                value={form.condition}
                onValueChange={(v) =>
                  setForm({ ...form, condition: v as typeof form.condition })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              <Save className="mr-1 h-4 w-4" />
              {saving ? "Saving…" : "Save book"}
            </Button>
            <Button variant="outline" onClick={() => setForm({ ...empty })}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">
            Session records <Badge variant="secondary">{records.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" />
            CSV
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {records.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              No records yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">ISBN</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.title ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.author ?? ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {r.isbn ?? "—"}
                      </td>
                      <td className="px-3 py-2">{r.quantity}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => del(r.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
