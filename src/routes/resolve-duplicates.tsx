import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, useMemo } from "react";
import { useDuplicateGroupsRpc, type DuplicateGroupRpcResponse, type BookRow, useSchoolsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GitMerge, Loader2, Trash2, Eye, ChevronUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import React from "react";

export const Route = createFileRoute("/resolve-duplicates")({
  component: ResolveDuplicatesPage,
});

const TRACKED_FIELDS = ["title", "author", "publisher", "isbn", "year", "category", "condition"] as const;

function completenessScore(b: BookRow): number {
  return TRACKED_FIELDS.filter(f => !!b[f as keyof BookRow]).length;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ResolveDuplicatesPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterSchoolId, setFilterSchoolId] = useState<string | null>(null);
  
  const { data: schools = [] } = useSchoolsQuery();
  const { data: duplicateGroups = [], isLoading: loadingGroups, refetch: refetchGroups } = useDuplicateGroupsRpc(filterSchoolId);

  const [mergingAll, setMergingAll] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || (role !== "admin" && role !== "super_admin")) {
      navigate({ to: "/auth" });
    }
  }, [user, role, loading, navigate]);

  const handleMergeAll = async () => {
    if (duplicateGroups.length === 0) return;
    if (!confirm(`Are you sure you want to merge all ${duplicateGroups.length} duplicate groups automatically? This will keep the most complete record for each ISBN and sum quantities. This cannot be undone.`)) return;

    setMergingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const group of duplicateGroups) {
      try {
        const { data: records, error } = await supabase
          .from("books")
          .select("*")
          .eq("isbn", group.isbn)
          .eq("school_id", group.school_id)
          .order("created_at", { ascending: true });
        
        if (error) throw error;
        if (!records || records.length < 2) continue; // nothing to merge

        // Find master
        const sorted = [...(records as BookRow[])].sort((a, b) => completenessScore(b) - completenessScore(a));
        const master = sorted[0];
        const duplicates = sorted.slice(1);
        const totalQty = sorted.reduce((sum, r) => sum + (r.quantity ?? 1), 0);

        // Update master
        const { error: updateErr } = await supabase
          .from("books")
          .update({ quantity: totalQty, flagged_as_duplicate: false })
          .eq("id", master.id);
        if (updateErr) throw updateErr;

        // Delete duplicates
        const { error: deleteErr } = await supabase
          .from("books")
          .delete()
          .in("id", duplicates.map(d => d.id));
        if (deleteErr) throw deleteErr;

        successCount++;
      } catch (err) {
        console.error(`Error merging group ${group.isbn}:`, err);
        errorCount++;
      }
    }

    setMergingAll(false);
    await queryClient.invalidateQueries({ queryKey: ["duplicate_groups_rpc"] });
    await queryClient.invalidateQueries({ queryKey: ["all_books"] });
    await queryClient.invalidateQueries({ queryKey: ["books"] });
    
    toast.success(`Bulk merge complete. Merged ${successCount} groups successfully. ${errorCount > 0 ? `${errorCount} errors occurred.` : ''}`);
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="mb-8 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/admin" })} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Review Duplicates</h1>
              <p className="text-muted-foreground text-sm">Explore and merge book entries with the same ISBN</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select 
              className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full sm:w-auto"
              value={filterSchoolId || "all"}
              onChange={(e) => setFilterSchoolId(e.target.value === "all" ? null : e.target.value)}
            >
              <option value="all">All Schools</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Button 
              className="gap-2 w-full sm:w-auto" 
              onClick={handleMergeAll} 
              disabled={mergingAll || duplicateGroups.length === 0}
            >
              {mergingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
              Merge All ({duplicateGroups.length} Groups)
            </Button>
          </div>
        </div>

        {loadingGroups ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : duplicateGroups.length === 0 ? (
          <div className="text-center py-20 bg-background rounded-lg border border-border">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Duplicates Found</h3>
            <p className="text-muted-foreground mt-1">All clear! No books sharing the same ISBN were detected.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {duplicateGroups.map((group) => (
              <DuplicateGroupCard key={`${group.isbn}-${group.school_id}`} group={group} schools={schools} onMerged={refetchGroups} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponent for individual group review
function DuplicateGroupCard({ group, schools, onMerged }: { group: DuplicateGroupRpcResponse; schools: any[]; onMerged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [records, setRecords] = useState<BookRow[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [merging, setMerging] = useState(false);
  const queryClient = useQueryClient();

  const fetchRecords = async () => {
    setLoadingRecords(true);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("isbn", group.isbn)
      .eq("school_id", group.school_id)
      .order("created_at", { ascending: true });
    
    if (data) setRecords(data as BookRow[]);
    setLoadingRecords(false);
  };

  const toggleExpand = () => {
    if (!expanded && records.length === 0) {
      fetchRecords();
    }
    setExpanded(!expanded);
  };

  const handleMergeGroup = async () => {
    setMerging(true);
    try {
      const sorted = [...records].sort((a, b) => completenessScore(b) - completenessScore(a));
      const master = sorted[0];
      const duplicates = sorted.slice(1);
      const totalQty = sorted.reduce((sum, r) => sum + (r.quantity ?? 1), 0);

      // Update master
      await supabase.from("books").update({ quantity: totalQty, flagged_as_duplicate: false }).eq("id", master.id);
      
      // Delete copies
      if (duplicates.length > 0) {
        await supabase.from("books").delete().in("id", duplicates.map(d => d.id));
      }

      await queryClient.invalidateQueries({ queryKey: ["all_books"] });
      toast.success(`Merged ${records.length} records into 1.`);
      onMerged();
    } catch (err) {
      toast.error(`Merge failed: ${(err as Error).message}`);
    } finally {
      setMerging(false);
    }
  };

  const schoolName = schools.find(s => s.id === group.school_id)?.name || "Unknown School";

  return (
    <div className="bg-background rounded-lg border border-border overflow-hidden shadow-sm">
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors" onClick={toggleExpand}>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded text-sm font-semibold">{group.isbn}</span>
            <span className="font-semibold text-lg">{group.title || "Unknown Title"}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className="capitalize">{group.author || "Unknown Author"}</span>
            <span>&bull;</span>
            <span>{schoolName}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-sm font-bold text-amber-600 dark:text-amber-500">{group.duplicate_count} Copies</span>
            <span className="block text-xs text-muted-foreground uppercase tracking-wider">To Merge</span>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full h-8 w-8">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-border p-4 bg-muted/10">
          {loadingRecords ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="rounded-md border border-border overflow-hidden bg-background mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3 text-left">Record</th>
                      <th className="py-2 px-3 text-left">Condition</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Data Complete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => {
                      const score = completenessScore(r);
                      const isMaster = i === 0; // if we assume pre-sorted? No, records is not sorted by completeness.
                      // Let's sort for display so master is first.
                      return null;
                    })}
                    
                    {[...records].sort((a, b) => completenessScore(b) - completenessScore(a)).map((r, i) => {
                      const score = completenessScore(r);
                      const isMaster = i === 0;
                      return (
                        <tr key={r.id} className={`border-t border-border ${isMaster ? "bg-primary/5" : ""}`}>
                          <td className="py-2 px-3 font-medium">
                            <div className="flex items-center gap-2">
                              {isMaster ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">Master</span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Copy</span>
                              )}
                              <span className="text-xs text-muted-foreground ml-1">{formatDate(r.created_at)}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">{r.condition || "—"}</td>
                          <td className="py-2 px-3 text-right font-mono">{r.quantity ?? 1}</td>
                          <td className="py-2 px-3 text-right">
                            <span className={`text-[11px] font-semibold ${score >= 6 ? "text-emerald-600" : score >= 4 ? "text-amber-600" : "text-red-600"}`}>
                              {score}/{TRACKED_FIELDS.length} fields
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={toggleExpand}>Cancel</Button>
                <Button onClick={handleMergeGroup} disabled={merging} className="gap-2">
                  {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
                  Merge Group Now
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
