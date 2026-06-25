import React, { useState } from "react";
import { useDuplicateGroupQuery, type BookRow } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, GitMerge, CheckCircle2, AlertTriangle, Trash2, ChevronDown, ChevronUp, Eye } from "lucide-react";

interface DuplicateGroup {
  title: string;
  author: string;
  school: string; // school name (display)
  schoolId: string;
  count: number;
}

interface Props {
  group: DuplicateGroup | null;
  open: boolean;
  onClose: () => void;
}

const TRACKED_FIELDS = ["title", "author", "publisher", "isbn", "year", "category", "condition"] as const;

function completenessScore(b: BookRow): number {
  return TRACKED_FIELDS.filter(f => !!b[f as keyof BookRow]).length;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

type Step = "review" | "confirm-merge" | "confirm-dismiss";

export function ResolveDuplicateDialog({ group, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("review");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: records = [], isLoading } = useDuplicateGroupQuery(
    group ? { title: group.title, author: group.author, schoolId: group.schoolId } : null
  );

  React.useEffect(() => {
    if (records.length > 0 && selectedIds.size === 0) {
      setSelectedIds(new Set(records.map(r => r.id)));
    }
  }, [records]);

  const selectedRecords = records.filter(r => selectedIds.has(r.id));
  const unselectedRecords = records.filter(r => !selectedIds.has(r.id));

  // Auto-pick most complete record as master from the SELECTED records
  const master = selectedRecords.length > 0
    ? [...selectedRecords].sort((a, b) => completenessScore(b) - completenessScore(a))[0]
    : null;
  const duplicates = master ? selectedRecords.filter(r => r.id !== master.id) : [];
  const totalQuantity = selectedRecords.reduce((sum, r) => sum + (r.quantity ?? 1), 0);

  const handleClose = () => {
    setStep("review");
    setSelectedIds(new Set());
    onClose();
  };

  const handleMerge = async () => {
    if (!master) return;
    setLoading(true);
    try {
      // Update master with summed quantity, unset flag
      const { error: updateErr } = await supabase
        .from("books")
        .update({ quantity: totalQuantity, flagged_as_duplicate: false })
        .eq("id", master.id);
      if (updateErr) throw updateErr;

      // Delete all duplicate selected records
      if (duplicates.length > 0) {
        const { error: deleteErr } = await supabase
          .from("books")
          .delete()
          .in("id", duplicates.map(d => d.id));
        if (deleteErr) throw deleteErr;
      }

      // Unflag unselected records so they remain separate
      if (unselectedRecords.length > 0) {
        const { error: unflagErr } = await supabase
          .from("books")
          .update({ flagged_as_duplicate: false })
          .in("id", unselectedRecords.map(u => u.id));
        if (unflagErr) throw unflagErr;
      }

      await queryClient.invalidateQueries({ queryKey: ["all_books"] });
      await queryClient.invalidateQueries({ queryKey: ["books"] });
      await queryClient.invalidateQueries({ queryKey: ["duplicate_group"] });

      toast.success(`Merged ${selectedRecords.length} records. ${unselectedRecords.length > 0 ? `${unselectedRecords.length} kept separate.` : ""}`);
      handleClose();
    } catch (err) {
      toast.error(`Merge failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReviewed = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("books")
        .update({ flagged_as_duplicate: false })
        .in("id", records.map(r => r.id));
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["all_books"] });
      await queryClient.invalidateQueries({ queryKey: ["books"] });
      await queryClient.invalidateQueries({ queryKey: ["duplicate_group"] });

      toast.success(`${records.length} records marked as reviewed — duplicate flag cleared.`);
      handleClose();
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const conditionColor = (c: string | null) => {
    if (c === "Good") return "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300";
    if (c === "Fair") return "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300";
    if (c === "Poor") return "text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300";
    return "text-muted-foreground bg-muted";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Resolve Duplicate Entry
          </DialogTitle>
          <DialogDescription>
            {group ? (
              <>
                <strong className="text-foreground capitalize">{group.title}</strong>
                {" "}by{" "}
                <strong className="text-foreground capitalize">{group.author}</strong>
                {" "}· {group.school}
              </>
            ) : "Loading..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : step === "review" ? (
          <div className="space-y-4">
            {/* Records comparison table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-muted-foreground text-xs">
                    <th className="w-8 py-2 px-3">
                      <Checkbox
                        checked={selectedIds.size === records.length && records.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedIds(new Set(records.map(r => r.id)));
                          else setSelectedIds(new Set());
                        }}
                      />
                    </th>
                    <th className="text-left py-2 px-3 font-medium">Record</th>
                    <th className="text-left py-2 px-3 font-medium">Date Added</th>
                    <th className="text-left py-2 px-3 font-medium">Condition</th>
                    <th className="text-right py-2 px-3 font-medium">Qty</th>
                    <th className="text-right py-2 px-3 font-medium">Complete</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const score = completenessScore(r);
                    const isMaster = r.id === master?.id;
                    return (
                      <React.Fragment key={r.id}>
                        <tr
                          className={`border-t border-border ${isMaster ? "bg-primary/5" : "hover:bg-muted/20"} cursor-pointer ${!selectedIds.has(r.id) ? "opacity-50" : ""}`}
                          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                        >
                          <td className="py-3 px-3">
                            <Checkbox
                              checked={selectedIds.has(r.id)}
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedIds);
                                if (checked) next.add(r.id);
                                else next.delete(r.id);
                                setSelectedIds(next);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="py-3 px-3 font-medium">
                            <div className="flex items-center gap-2">
                              {isMaster ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">Master</span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Copy {i}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                          <td className="py-3 px-3">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${conditionColor(r.condition)}`}>
                              {r.condition ?? "Unknown"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold">{r.quantity ?? 1}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`text-[11px] font-semibold ${score >= 6 ? "text-emerald-600" : score >= 4 ? "text-amber-600" : "text-red-600"}`}>
                              {score}/{TRACKED_FIELDS.length}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === r.id ? null : r.id); }}>
                              {expandedId === r.id ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                          </td>
                        </tr>
                        {expandedId === r.id && (
                          <tr className={`border-b border-border ${isMaster ? "bg-primary/5" : "bg-muted/10"} ${!selectedIds.has(r.id) ? "opacity-50" : ""}`}>
                            <td colSpan={7} className="py-3 px-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium uppercase tracking-wider text-[10px]">Title</span>
                                  <span className="font-medium">{r.title || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium uppercase tracking-wider text-[10px]">Author</span>
                                  <span>{r.author || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium uppercase tracking-wider text-[10px]">ISBN</span>
                                  <span className="font-mono">{r.isbn || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium uppercase tracking-wider text-[10px]">Publisher</span>
                                  <span>{r.publisher || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium uppercase tracking-wider text-[10px]">Year</span>
                                  <span>{r.year || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium uppercase tracking-wider text-[10px]">Category</span>
                                  <span>{r.category || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block mb-0.5 font-medium uppercase tracking-wider text-[10px]">Location</span>
                                  <span>{r.shelf_location || "—"}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                    <td colSpan={4} className="py-2 px-3 text-sm text-muted-foreground">Total after merge ({selectedRecords.length} selected)</td>
                    <td className="py-2 px-3 text-right font-mono">{totalQuantity}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Master explanation */}
            {master && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                <p className="font-semibold text-primary mb-1">Auto-selected master record</p>
                <p className="text-muted-foreground text-xs">
                  The most complete selected record (added {formatDate(master.created_at)}) will be kept.
                  Other selected records will be deleted and their quantities summed into it ({totalQuantity} total copies). Unselected records will be kept as separate independent entries.
                </p>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/20"
                onClick={() => setStep("confirm-dismiss")}
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark as Reviewed (Keep All)
              </Button>
              <Button
                className="gap-2"
                onClick={() => setStep("confirm-merge")}
                disabled={selectedRecords.length < 2}
              >
                <GitMerge className="h-4 w-4" />
                Merge {selectedRecords.length} into {totalQuantity} Copies
              </Button>
            </DialogFooter>
          </div>
        ) : step === "confirm-merge" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-destructive">Confirm Merge — This is irreversible</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {duplicates.length} record{duplicates.length !== 1 ? "s" : ""} will be permanently deleted.
                    The master record will be updated to {totalQuantity} copies. {unselectedRecords.length > 0 && `${unselectedRecords.length} unselected record(s) will be kept as separate entries.`} This cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("review")} disabled={loading}>
                ← Back
              </Button>
              <Button variant="destructive" className="gap-2" onClick={handleMerge} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Yes, Merge & Delete Duplicates
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Mark All as Reviewed</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All {records.length} records will remain in the system but the duplicate flag will be cleared.
                    They will no longer appear in the duplicates list. Use this if these are intentional separate entries (e.g., different editions or different clerks' sessions).
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("review")} disabled={loading}>
                ← Back
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={handleMarkReviewed}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirm — Mark as Reviewed
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
