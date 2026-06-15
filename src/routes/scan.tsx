import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, LogOut, MapPin, Save, Trash2, Download, Search, Info } from "lucide-react";
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
import { saveBookInBackground, flushQueue, BookFormValues } from "@/lib/bookQueue";
import { RecoveryDialog } from "@/components/RecoveryDialog";
import { BookDetailSheet, BookDetail } from "@/components/BookDetailSheet";
import { EditBookDialog } from "@/components/EditBookDialog";

export const Route = createFileRoute("/scan")({
  component: ScanPage,
});

import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAssignedSchoolsQuery, type School, type BookRow } from "@/lib/queries";

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
  const queryClient = useQueryClient();

  const { data: schools = [] } = useAssignedSchoolsQuery(user?.id, role ?? undefined);

  const [schoolId, setSchoolId] = useState<string>("");
  const [locked, setLocked] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [records, setRecords] = useState<BookRow[]>([]);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const [scanCount, setScanCount] = useState<number>(() =>
    parseInt(sessionStorage.getItem("scanCount") ?? "0", 10)
  );
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const [recoveryData, setRecoveryData] = useState<BookFormValues | null>(null);
  const [detailBook, setDetailBook] = useState<BookRow | null>(null);
  const [editTarget, setEditTarget] = useState<BookRow | null>(null);

  const incrementCount = () => {
    const next = scanCount + 1;
    setScanCount(next);
    sessionStorage.setItem("scanCount", String(next));
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

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
    
    // Attempt to flush any pending background queue from previous offline
    flushQueue((failedBook) => {
      setRecoveryData(failedBook);
    });
  };

  useEffect(() => {
    const handler = () => flushQueue((b) => setRecoveryData(b));
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, []);

  const handleDetected = async (code: string) => {
    setPaused(true);
    setForm((f) => ({ ...f, isbn: code }));
    await performLookup(code);
  };

  const performLookup = async (code: string) => {
    if (!code) return;
    
    setIsLookingUp(true);
    const loadingToast = toast.loading(`Looking up ${code}...`);
    
    try {
      // 1. Check database first (prevent duplicates in current school)
      const { data: existingDbBook } = await supabase
        .from("books")
        .select("*")
        .eq("school_id", schoolId)
        .eq("isbn", code)
        .maybeSingle();

      if (existingDbBook) {
        toast.dismiss(loadingToast);
        setEditTarget(existingDbBook as BookRow);
        setForm({ ...empty, isbn: code });
        setPaused(true);
        return;
      }

      // 2. Fallback to Google Books
      const meta = await lookupIsbn(code);
      
      if (meta && (meta.title || meta.author)) {
        setForm((f) => ({ ...f, ...meta, isbn: code }));
        toast.success(meta.title || "Book details loaded", { id: loadingToast });
      } else {
        toast.warning("No metadata found — please fill in manually", { id: loadingToast });
        setForm((f) => ({ ...f, isbn: code }));
      }
    } catch (error) {
      console.error('Lookup error:', error);
      toast.error("Failed to lookup ISBN", { id: loadingToast });
      setForm((f) => ({ ...f, isbn: code }));
    } finally {
      setIsLookingUp(false);
    }
  };

  const save = async () => {
    if (!user || !schoolId) return;
    
    const trimmedIsbn = form.isbn?.trim();
    if (!trimmedIsbn && !form.title?.trim()) {
      toast.error("Enter an ISBN or a title");
      return;
    }

    // Fuzzy duplicate warning (No ISBN)
    if (!trimmedIsbn && form.title?.trim()) {
      const { data: similar } = await supabase
        .from("books")
        .select("id, title, quantity")
        .eq("school_id", schoolId)
        .ilike("title", `%${form.title.trim()}%`)
        .limit(3);

      if (similar?.length) {
        if (!window.confirm(`Found similar books in this school:\n${similar.map(s => `- ${s.title}`).join('\n')}\n\nDo you want to continue creating a new record?`)) {
          return;
        }
      }
    }
    
    const payload: BookFormValues = {
      id: crypto.randomUUID(), // Client generated ID
      isbn: trimmedIsbn || null,
      title: form.title?.trim() || null,
      author: form.author?.trim() || null,
      publisher: form.publisher?.trim() || null,
      year: form.year?.trim() || null,
      quantity: form.quantity,
      condition: form.condition,
      notes: form.notes?.trim() || null,
      school_id: schoolId,
      clerk_id: user.id,
    };

    setSaving(true);

    // Add optimistically to records immediately
    const tempRow: BookRow = {
      ...payload,
      created_at: new Date().toISOString()
    };
    setRecords(prev => [tempRow, ...prev]);

    saveBookInBackground(payload, (failedValues) => {
      setRecoveryData(failedValues);
    }, (deletedId) => {
      // Undo callback
      setRecords(prev => prev.filter(r => r.id !== deletedId));
    });

    setSaving(false);
    incrementCount();
    setLastScanned(`${payload.title || 'Untitled'} (×${payload.quantity})`);
    
    setForm({ ...empty });
    setPaused(false);
  };

  const updateQtyMutation = useMutation({
    mutationFn: async ({ book, qty }: { book: BookRow, qty: number }) => {
      if (qty < 0) return;
      setRecords(prev => prev.map(r => r.id === book.id ? { ...r, quantity: qty } : r));
      const { error } = await supabase.from("books").update({ quantity: qty }).eq("id", book.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  });

  const updateQty = (book: BookRow, qty: number) => {
    updateQtyMutation.mutate({ book, qty });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Book deleted");
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const del = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this book?")) return;
    setRecords(prev => prev.filter(b => b.id !== id));
    deleteMutation.mutate(id);
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
              <img src="/blue-logo.png" alt="Logo" className="h-5 w-auto object-contain" />
              <CardTitle>Welcome, {profile?.full_name ?? "Clerk"}</CardTitle>
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
            <Badge variant="secondary" className="ml-2 font-mono">{scanCount}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="mr-1 h-4 w-4" />
            Log out
          </Button>
        </div>
      </header>

      <section className="mb-4">
        {lastScanned && (
          <div className="mb-2 rounded-md bg-green-50 px-3 py-1.5 text-xs text-green-700 flex items-center justify-between">
            <span className="truncate">✓ Last saved: {lastScanned}</span>
            <span className="shrink-0 ml-2 text-green-600/70">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        )}
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
              <div className="flex gap-2">
                <Input
                  value={form.isbn}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      performLookup(form.isbn);
                    }
                  }}
                  placeholder="13-digit barcode"
                  inputMode="numeric"
                />
                <Button 
                  variant="secondary"
                  type="button"
                  onClick={() => performLookup(form.isbn)}
                  disabled={!form.isbn || isLookingUp}
                >
                  <Search className="mr-1 h-4 w-4" />
                  {isLookingUp ? "Looking up..." : "Lookup"}
                </Button>
              </div>
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
                    <tr 
                      key={r.id} 
                      className="border-t cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setDetailBook(r)}
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-primary">{r.title ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.author ?? ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {r.isbn ?? "—"}
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 bg-white rounded border border-slate-200 px-1 py-0.5 w-max">
                          <button 
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-50 text-slate-500" 
                            onClick={() => updateQty(r, r.quantity - 1)}
                            disabled={r.quantity <= 1}
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-medium text-slate-700">{r.quantity}</span>
                          <button 
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500" 
                            onClick={() => updateQty(r, r.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
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

      <BookDetailSheet 
        book={detailBook} 
        onClose={() => setDetailBook(null)} 
        onEdit={(b) => {
          setDetailBook(null);
          setEditTarget(b as unknown as BookRow);
        }} 
      />

      <EditBookDialog 
        book={editTarget} 
        onClose={() => setEditTarget(null)} 
        onSaved={() => loadRecords(schoolId)}
      />

      <RecoveryDialog 
        data={recoveryData} 
        onResolved={() => {
          setRecoveryData(null);
          loadRecords(schoolId);
        }} 
      />
    </div>
  );
}
