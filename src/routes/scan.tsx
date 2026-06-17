import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, LogOut, MapPin, Save, Trash2, Download, Search, Info, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
import { searchMetadataByTitle, type BookMeta } from "@/lib/book-metadata";
import logoImg from "@/assets/blue-logo.png";
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
import { useRef } from "react";

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
  category: "",
  shelf_location: "",
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
  const [step, setStep] = useState<"scan" | "details">("scan");

  // Metadata search
  const [titleSuggestions, setTitleSuggestions] = useState<BookMeta[]>([]);
  const titleDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  // Alert dialogs
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Session search
  const [recordSearch, setRecordSearch] = useState("");



  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const [recoveryData, setRecoveryData] = useState<BookFormValues | null>(null);
  const [detailBook, setDetailBook] = useState<BookRow | null>(null);
  const [editTarget, setEditTarget] = useState<BookRow | null>(null);
  const [recordsExpanded, setRecordsExpanded] = useState(true);

  // Derived counters from actual records (survives refresh, accounts for quantity)
  const scanCount = records.length;
  const totalBooks = records.reduce((sum, r) => sum + (r.quantity ?? 0), 0);


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
        "id, isbn, title, author, publisher, year, quantity, condition, category, shelf_location, created_at",
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
        setStep("details");
        toast.success(meta.title || "Book details loaded", { id: loadingToast });
      } else {
        toast.warning("No metadata found — please fill in manually", { id: loadingToast });
        setForm((f) => ({ ...f, isbn: code }));
        setStep("details");
      }
    } catch (error) {
      console.error('Lookup error:', error);
      toast.error("Failed to lookup ISBN", { id: loadingToast });
      setForm((f) => ({ ...f, isbn: code }));
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleTitleChange = (value: string) => {
    setForm((f) => ({ ...f, title: value }));
    clearTimeout(titleDebounce.current);
    if (value.length < 2) { setTitleSuggestions([]); return; }

    titleDebounce.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const results = await searchMetadataByTitle(value, 6, abortRef.current.signal);
        setTitleSuggestions(results);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') throw err;
      }
    }, 300);
  };

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const save = async () => {
    if (!user || !schoolId) return;

    const trimmedIsbn = form.isbn?.trim();
    const trimmedTitle = form.title?.trim();
    const trimmedAuthor = form.author?.trim();
    const trimmedPublisher = form.publisher?.trim();
    const trimmedYear = form.year?.trim();
    const qty = Number(form.quantity);

    const missing: string[] = [];
    if (!trimmedTitle) missing.push("Title");
    if (!trimmedAuthor) missing.push("Author");
    if (!trimmedPublisher) missing.push("Publisher");
    if (!trimmedYear) missing.push("Year");
    if (!qty || qty < 1) missing.push("Quantity");

    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    const payload: BookFormValues = {
      id: crypto.randomUUID(), // Client generated ID
      isbn: trimmedIsbn,
      title: trimmedTitle,
      author: trimmedAuthor,
      publisher: trimmedPublisher,
      year: trimmedYear,
      quantity: qty,
      condition: form.condition,
      category: form.category?.trim() || null,
      shelf_location: form.shelf_location?.trim() || null,
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

    // Silently contribute to the shared metadata pool in the background.
    // This enriches the pool for future projects at any school.
    if (payload.title) {
      (async () => {
        try {
          // If the book has an ISBN, skip if it's already in the pool
          if (payload.isbn) {
            const { data: existing } = await supabase
              .from("book_metadata" as any)
              .select("id")
              .eq("isbn", payload.isbn)
              .maybeSingle();
            if (existing) return; // Already known — nothing to do
          }
          await supabase.from("book_metadata" as any).upsert({
            isbn:      payload.isbn,
            title:     payload.title || "",
            author:    payload.author,
            publisher: payload.publisher,
            year:      payload.year,
          }, { onConflict: "isbn", ignoreDuplicates: true });
        } catch {
          // Silently ignore — metadata contribution is best-effort
        }
      })();
    }

    setSaving(false);
    incrementCount();
    setLastScanned(`${payload.title} (×${payload.quantity})`);
    
    setForm({ ...empty });
    setStep("scan");
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

  const confirmDelete = () => {
    if (deleteTarget) {
      setRecords(prev => prev.filter(b => b.id !== deleteTarget));
      deleteMutation.mutate(deleteTarget);
      setDeleteTarget(null);
    }
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
        category: r.category,
        shelf_location: r.shelf_location,
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
              <img src={logoImg} alt="Logo" className="h-5 w-auto object-contain" />
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

      {step === "scan" && (
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
          <Button 
            variant="secondary" 
            className="w-full mt-3" 
            onClick={() => { setStep("details"); setPaused(true); }}
          >
            Add book manually
          </Button>
        </section>
      )}

      {step === "scan" ? (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Book details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>
                  ISBN <span className="text-red-500">*</span>
                </Label>
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
              <div className="col-span-2 text-xs text-muted-foreground">
                Scan a barcode or enter an ISBN — once found, you'll be taken to a quick details page.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-4">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Finalize book</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStep("scan"); setPaused(false); }}
            >
              ← Back
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metadata summary so user can verify the hit */}
            <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground truncate">
                    {form.title || <span className="text-muted-foreground italic">No title</span>}
                  </div>
                  {form.author && (
                    <div className="text-xs text-muted-foreground truncate">by {form.author}</div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {[form.publisher, form.year].filter(Boolean).join(" · ") || "—"}
                  </div>
                  <div className="mt-0.5 text-xs font-mono text-muted-foreground">ISBN: {form.isbn || "—"}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-700">
                <Info className="h-3 w-3" />
                <span>Wrong book?</span>
                <button
                  type="button"
                  className="underline font-medium"
                  onClick={() => { setStep("scan"); setPaused(false); }}
                >
                  Re-scan or edit
                </button>
              </div>
            </div>

            {/* Editable summary fields (collapsible-style inline edit) */}
            <details className="rounded-md border px-3 py-2 text-sm">
              <summary className="cursor-pointer text-muted-foreground">Edit details manually</summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>ISBN <span className="text-slate-400 font-normal">(optional if no barcode)</span></Label>
                  <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} placeholder="13-digit barcode" inputMode="numeric" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Title <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} />
                    {titleSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden">
                        {titleSuggestions.map((s, i) => (
                          <div
                            key={i}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 border-b last:border-0 border-slate-100"
                            onClick={() => {
                              setForm(f => ({
                                ...f,
                                title: s.title || "",
                                author: s.author || f.author,
                                publisher: s.publisher || f.publisher,
                                year: s.year || f.year,
                                isbn: s.isbn || f.isbn,
                                category: s.category || f.category
                              }));
                              setTitleSuggestions([]);
                            }}
                          >
                            <div className="font-medium truncate">{s.title}</div>
                            <div className="text-xs text-slate-500 truncate">{s.author} • {s.year}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Author(s) <span className="text-red-500">*</span></Label>
                  <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Publisher <span className="text-red-500">*</span></Label>
                  <Input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Year <span className="text-red-500">*</span></Label>
                  <Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} inputMode="numeric" />
                </div>
              </div>
            </details>

            {/* Quick-entry fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value === "" ? ("" as unknown as number) : Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Condition</Label>
                <Select
                  value={form.condition}
                  onValueChange={(v) => setForm({ ...form, condition: v as typeof form.condition })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Shelf <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input value={form.shelf_location} onChange={(e) => setForm({ ...form, shelf_location: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => save()} disabled={saving} className="flex-1">
                <Save className="mr-1 h-4 w-4" />
                {saving ? "Saving…" : "Save & scan next"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setForm({ ...empty }); setStep("scan"); setPaused(false); }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader 
          className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer hover:bg-slate-50 transition-colors rounded-t-xl"
          onClick={() => setRecordsExpanded(!recordsExpanded)}
        >
          <CardTitle className="text-base flex items-center gap-2">
            Session records <Badge variant="secondary">{records.length}</Badge>
            {recordsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </CardTitle>
          <div onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-1 h-4 w-4" />
              CSV
            </Button>
          </div>
        </CardHeader>
        {recordsExpanded && (
        <CardContent className="px-0 pt-2">
          {records.length > 0 && (
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  placeholder="Search by title, author, or ISBN…"
                  className="pl-8 h-9"
                />
              </div>
            </div>
          )}
          {(() => {
            const q = recordSearch.trim().toLowerCase();
            const filtered = q
              ? records.filter((r) =>
                  [r.title, r.author, r.isbn]
                    .some((v) => v?.toLowerCase().includes(q)),
                )
              : records;
            if (records.length === 0) {
              return (
                <p className="px-6 py-4 text-sm text-muted-foreground">
                  No records yet.
                </p>
              );
            }
            if (filtered.length === 0) {
              return (
                <p className="px-6 py-4 text-sm text-muted-foreground">
                  No records match "{recordSearch}".
                </p>
              );
            }
            return (

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
                  {filtered.map((r) => (
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
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteTarget(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            );
          })()}

        </CardContent>
        )}
      </Card>

      <BookDetailSheet 
        book={detailBook} 
        onClose={() => setDetailBook(null)} 
        onEdit={(b) => {
          setDetailBook(null);
          setEditTarget(b as unknown as BookRow);
        }} 
      />

      {editTarget && (
        <EditBookDialog
          book={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updatedBook) => setRecords(prev => prev.map(r => r.id === updatedBook.id ? (updatedBook as unknown as BookRow) : r))}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this book? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



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
