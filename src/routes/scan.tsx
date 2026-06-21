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
  const [step, setStep] = useState<"scan" | "review" | "specifics">("scan");
  const [lookupHit, setLookupHit] = useState<boolean>(false);

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
        setLookupHit(true);
        setStep("review");
        toast.success(meta.title || "Book details loaded", { id: loadingToast });
      } else {
        toast.warning("No metadata found — please fill in manually", { id: loadingToast });
        setForm((f) => ({ ...empty, isbn: code }));
        setLookupHit(false);
        setStep("review");
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: existing } = await (supabase as any)
              .from("book_metadata")
              .select("id")
              .eq("isbn", payload.isbn)
              .maybeSingle();
            if (existing) return; // Already known — nothing to do
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from("book_metadata").upsert({
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
      <div className="min-h-screen bg-background pb-28">
        {/* Top app bar */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-sm">
          <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Logo" className="h-6 w-auto object-contain" />
              <h1 className="text-base font-bold text-primary tracking-tight">FutecAI Book Inventory</h1>
            </div>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary text-xs font-bold">
              {(profile?.full_name ?? "C").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="pt-20 px-4 max-w-2xl mx-auto">
          {/* Hero card */}
          <section className="mb-6">
            <div className="rounded-2xl p-6 text-primary-foreground shadow-lg relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #003178 0%, #0d47a1 100%)" }}>
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-1.5">Welcome, {profile?.full_name ?? "Clerk"}</h2>
                <p className="text-sm opacity-90 leading-snug">
                  Please select your assigned school to begin today's book inventory session.
                </p>
              </div>
              <BookOpen className="absolute -right-6 -bottom-6 h-40 w-40 opacity-10" strokeWidth={1.5} />
            </div>
          </section>

          {/* School list */}
          <section className="space-y-3 mb-6">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Your assigned schools
            </Label>
            {schools.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                No schools assigned to you yet.
              </div>
            ) : (
              schools.map((s) => {
                const selected = schoolId === s.id;
                return (
                  <GlassCard
                    as="button"
                    key={s.id}
                    type="button"
                    onClick={() => setSchoolId(s.id)}
                    selected={selected}
                    className="w-full p-4 text-left active:scale-[0.98]"
                  >
                    <div className="flex items-center">
                      <div className="mr-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-inner">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-foreground">{s.name}</h3>
                        {s.district && (
                          <p className="truncate text-xs text-muted-foreground">{s.district}</p>
                        )}
                      </div>
                      {selected && (
                        <div className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          ✓
                        </div>
                      )}
                    </div>
                  </GlassCard>
                );
              })
            )}
          </section>

          {/* Footer actions */}
          <div className="flex justify-between items-center pt-2">
            {(role === "admin" || role === "super_admin") && (
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin" })}>
                Admin panel
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="ml-auto">
              <LogOut className="mr-1 h-4 w-4" /> Log out
            </Button>
          </div>
        </main>

        {/* Fixed CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/90 backdrop-blur-md border-t border-border z-50">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={startSession}
              disabled={!schoolId}
              className="w-full h-12 rounded-xl uppercase tracking-wider text-xs font-bold shadow-md"
            >
              Start Recording Session →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-3 pb-16">
      <header className="sticky top-0 z-10 -mx-3 mb-4 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-primary leading-tight">
                {activeSchool?.name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-success">
                  Session active
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">{scanCount}/{totalBooks}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut()} title="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {step === "scan" && (
        <section className="mb-4">
          {lastScanned && (
            <div className="mb-3 rounded-xl bg-secondary border border-success/30 px-3 py-2.5 text-xs text-success flex items-center justify-between">
              <span className="truncate flex items-center gap-1.5">
                <span className="material-symbols-outlined" style={{fontSize: '16px'}}>✓</span>
                Last saved: <strong className="font-semibold">{lastScanned}</strong>
              </span>
              <span className="shrink-0 ml-2 opacity-70">
                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          )}
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border">
            <BarcodeScanner onDetected={handleDetected} paused={paused} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Align ISBN barcode in the frame</span>
            {paused && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full h-7 text-xs"
                onClick={() => setPaused(false)}
              >
                Resume camera
              </Button>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setForm({ ...empty }); setLookupHit(false); setStep("review"); setPaused(true); }}
            className="mt-4 w-full h-12 rounded-xl border-2 border-dashed border-border bg-card text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-secondary transition-colors active:scale-[0.98]"
          >
            <Search className="h-4 w-4" /> Add book manually
          </button>
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
      ) : step === "review" ? (
        <section className="mb-4 space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 px-1">
            <div className="h-1.5 flex-1 bg-primary rounded-full" />
            <div className="h-1.5 flex-1 bg-primary rounded-full" />
            <div className="h-1.5 flex-1 bg-border rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary ml-2">
              Step 2 of 3
            </span>
          </div>

          {/* Status banner */}
          {lookupHit ? (
            <div className="rounded-xl bg-secondary text-primary p-3 flex items-center gap-3">
              <Info className="h-5 w-5 shrink-0" />
              <p className="text-xs font-semibold">Barcode successfully scanned · Review details below</p>
            </div>
          ) : (
            <div className="rounded-xl border border-accent/40 p-3 flex items-center gap-3" style={{backgroundColor: '#fff8e7'}}>
              <Info className="h-5 w-5 shrink-0 text-accent-foreground" />
              <p className="text-xs font-semibold text-accent-foreground">No ISBN match · Fill in details manually</p>
            </div>
          )}

          {/* Bibliographic bento header */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Book title
                </span>
                <h2 className="text-lg font-bold text-primary mt-1 leading-tight">
                  {form.title || <span className="text-muted-foreground italic font-normal">Untitled</span>}
                </h2>
                {form.isbn && (
                  <p className="text-xs font-mono text-muted-foreground mt-1.5">ISBN: {form.isbn}</p>
                )}
              </div>
              <div className="bg-secondary p-2 rounded-lg shrink-0">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>

          {/* Edit fields */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Edit details</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setStep("scan"); setPaused(false); }}
              >
                ← Back to scan
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  ISBN <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
                </Label>
                <Input
                  value={form.isbn}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                  placeholder="13-digit barcode"
                  inputMode="numeric"
                  className="h-11 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Title <span className="text-destructive normal-case">*</span>
                </Label>
                <div className="relative">
                  <Input
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onBlur={() => setTimeout(() => setTitleSuggestions([]), 150)}
                    className="h-11 rounded-lg"
                  />
                  {titleSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                      {titleSuggestions.map((s, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-secondary border-b last:border-0 border-border"
                          onMouseDown={(e) => e.preventDefault()}
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
                          <div className="text-xs text-muted-foreground truncate">{s.author} • {s.year}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Author(s) <span className="text-destructive normal-case">*</span>
                </Label>
                <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="h-11 rounded-lg" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Publisher <span className="text-destructive normal-case">*</span>
                  </Label>
                  <Input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} className="h-11 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Year <span className="text-destructive normal-case">*</span>
                  </Label>
                  <Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} inputMode="numeric" className="h-11 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <Button
              onClick={() => {
                const missing: string[] = [];
                if (!form.title?.trim()) missing.push("Title");
                if (!form.author?.trim()) missing.push("Author");
                if (!form.publisher?.trim()) missing.push("Publisher");
                if (!form.year?.trim()) missing.push("Year");
                if (missing.length > 0) {
                  toast.error(`Please fill in: ${missing.join(", ")}`);
                  return;
                }
                setStep("specifics");
              }}
              className="w-full h-12 rounded-xl uppercase tracking-wider text-xs font-bold shadow-md"
            >
              Next: Copy Specifics →
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl uppercase tracking-wider text-xs font-bold"
              onClick={() => { setForm({ ...empty }); setStep("scan"); setPaused(false); }}
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : (
        <section className="mb-4 space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 px-1">
            <div className="h-1.5 flex-1 bg-primary rounded-full" />
            <div className="h-1.5 flex-1 bg-primary rounded-full" />
            <div className="h-1.5 flex-1 bg-primary rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary ml-2">
              Step 3 of 3
            </span>
          </div>

          {/* Book summary bento */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Saving copy of
                </span>
                <h2 className="text-base font-bold text-primary mt-1 leading-tight truncate">
                  {form.title || <span className="text-muted-foreground italic font-normal">Untitled</span>}
                </h2>
                {form.author && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">by {form.author}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {[form.publisher, form.year].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="bg-secondary p-2 rounded-lg shrink-0">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>

          {/* Specifics card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Copy specifics</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStep("review")}>
                ← Back
              </Button>
            </div>

            {/* Quantity stepper */}
            <div className="space-y-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Quantity in stock
              </Label>
              <div className="flex items-center justify-center gap-5">
                <button
                  type="button"
                  className="w-12 h-12 rounded-full border-2 border-primary text-primary flex items-center justify-center active:scale-90 transition-all hover:bg-secondary disabled:opacity-40"
                  onClick={() => setForm({ ...form, quantity: Math.max(1, Number(form.quantity) - 1) })}
                  disabled={Number(form.quantity) <= 1}
                  aria-label="Decrease"
                >
                  <span className="text-2xl leading-none">−</span>
                </button>
                <input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value === "" ? ("" as unknown as number) : Number(e.target.value) })
                  }
                  className="w-20 h-12 text-center text-2xl font-bold border-b-2 border-border focus:border-primary transition-colors bg-transparent outline-none text-primary"
                />
                <button
                  type="button"
                  className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-all shadow-sm hover:opacity-90"
                  onClick={() => setForm({ ...form, quantity: Number(form.quantity) + 1 })}
                  aria-label="Increase"
                >
                  <span className="text-2xl leading-none">+</span>
                </button>
              </div>
            </div>

            {/* Condition segmented */}
            <div className="space-y-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Book condition
              </Label>
              <div className="flex gap-2">
                {(["Good", "Fair", "Poor"] as const).map((cond) => {
                  const active = form.condition === cond;
                  const colorMap = {
                    Good: active ? "bg-success text-white border-success" : "border-border text-foreground",
                    Fair: active ? "bg-accent text-accent-foreground border-accent" : "border-border text-foreground",
                    Poor: active ? "bg-destructive text-destructive-foreground border-destructive" : "border-border text-foreground",
                  };
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setForm({ ...form, condition: cond })}
                      className={`flex-1 h-11 rounded-lg border-2 font-semibold text-sm transition-all active:scale-95 ${colorMap[cond]}`}
                    >
                      {cond}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Category <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
              </Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g., Mathematics, English"
                className="h-11 rounded-lg"
              />
            </div>

            {/* Shelf with icon */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Shelf location <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.shelf_location}
                  onChange={(e) => setForm({ ...form, shelf_location: e.target.value })}
                  placeholder="e.g., Section B, Row 4"
                  className="h-11 rounded-lg pl-10"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <Button
              onClick={() => save()}
              disabled={saving}
              className="w-full h-12 rounded-xl uppercase tracking-wider text-xs font-bold shadow-md flex items-center justify-center gap-2"
            >
              {saving ? "Saving…" : <>Save & Scan Next <Search className="h-4 w-4" /></>}
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl uppercase tracking-wider text-xs font-bold"
              onClick={() => { setForm({ ...empty }); setStep("scan"); setPaused(false); }}
            >
              Cancel
            </Button>
          </div>
        </section>
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
