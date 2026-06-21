import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Search, Trash2, Download } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBooksQuery, type BookRow } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-card";
import { BookDetailSheet } from "@/components/BookDetailSheet";
import { EditBookDialog } from "@/components/EditBookDialog";
import { downloadCsv, toCsv } from "@/lib/csv";
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

export const Route = createFileRoute("/explore/$schoolId")({
  component: ExploreSchoolPage,
});

function ExploreSchoolPage() {
  const { schoolId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on search change
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: booksData, isLoading } = useBooksQuery(
    { schoolId, search: debouncedSearch },
    page,
    PAGE_SIZE
  );

  const [detailBook, setDetailBook] = useState<BookRow | null>(null);
  const [editTarget, setEditTarget] = useState<BookRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const updateQtyMutation = useMutation({
    mutationFn: async ({ book, qty }: { book: BookRow, qty: number }) => {
      if (qty < 0) return;
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
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["books_count"] });
      toast.success("Book deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const exportCsv = () => {
    if (!booksData?.data || booksData.data.length === 0) return toast.error("Nothing to export");
    const csv = toCsv(
      booksData.data.map((r) => ({
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
      `school-${schoolId}-export-${Date.now()}.csv`.replace(/\s+/g, "_"),
      csv,
    );
  };

  const pageRows = booksData?.data ?? [];
  const totalCount = booksData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 h-14 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="mr-1">
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Button>
            <h1 className="text-base font-bold text-primary tracking-tight">Explore Data</h1>
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-1 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-6 px-4 max-w-5xl mx-auto space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books by title, author, or ISBN..."
            className="pl-10 h-12 rounded-xl border-border bg-card shadow-sm text-base"
          />
        </div>

        <GlassCard tilt={false}>
          <div className="p-0">
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
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No books found.</td>
                    </tr>
                  ) : (
                    pageRows.map((b) => (
                      <tr 
                        key={b.id} 
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => setDetailBook(b)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground truncate max-w-[200px] md:max-w-[300px]">
                            {b.title || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-[300px]">
                            {b.author || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {b.isbn || "—"}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 bg-white dark:bg-slate-900 rounded border border-border px-1 py-0.5 w-max ml-auto">
                            <button 
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted disabled:opacity-50 text-muted-foreground" 
                              onClick={() => updateQty(b, b.quantity - 1)}
                              disabled={b.quantity <= 1}
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-medium text-foreground">{b.quantity}</span>
                            <button 
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground" 
                              onClick={() => updateQty(b, b.quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(b.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
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
                    ))
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
          </div>
        </GlassCard>
      </main>

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
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["books"] });
            setEditTarget(null);
          }}
        />
      )}

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
    </div>
  );
}
