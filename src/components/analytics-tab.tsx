import React, { useState, useMemo } from "react";
import { useAllBooksQuery, useSchoolsQuery, useProfilesQuery, type BookRow } from "@/lib/queries";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/glass-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import { Loader2, Download, AlertTriangle, FileText, CheckCircle2, TrendingUp, BookOpen, GitMerge, Layers } from "lucide-react";
import { ResolveDuplicateDialog } from "@/components/ResolveDuplicateDialog";

const REQUIRED_FIELDS = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "publisher", label: "Publisher" },
  { key: "isbn", label: "ISBN" },
  { key: "year", label: "Year" },
  { key: "category", label: "Subject" },
  { key: "condition", label: "Condition" },
] as const;

export function AnalyticsTab() {
  const { data: books = [], isLoading: bLoading } = useAllBooksQuery();
  const { data: schools = [], isLoading: sLoading } = useSchoolsQuery();
  const { data: clerks = [], isLoading: pLoading } = useProfilesQuery();

  const [filterSchool, setFilterSchool] = useState<string>("all");
  const [filterClerk, setFilterClerk] = useState<string>("all");
  const [resolveGroup, setResolveGroup] = useState<{
    title: string; author: string; school: string; schoolId: string; count: number;
  } | null>(null);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (filterSchool !== "all" && b.school_id !== filterSchool) return false;
      if (filterClerk !== "all" && b.clerk_id !== filterClerk) return false;
      return true;
    });
  }, [books, filterSchool, filterClerk]);

  const { metrics, missingFieldCounts, clerkBreakdown, schoolBreakdown, duplicates, velocityData } = useMemo(() => {
    let completeCount = 0;
    let incompleteCount = 0;
    const missingCounts: Record<string, number> = {};
    const clerkStats: Record<string, { total: number; quantity: number; complete: number; missing: Record<string, number> }> = {};
    const schoolStats: Record<string, { total: number; quantity: number; complete: number; missing: Record<string, number> }> = {};

    let totalQuantityAll = 0;
    const entryDates: Record<string, number> = {};
    
    // For duplicate detection
    const sigMap: Record<string, number> = {};

    filteredBooks.forEach((b) => {
      let isComplete = true;
      const missingForBook: string[] = [];

      REQUIRED_FIELDS.forEach((f) => {
        if (!b[f.key as keyof BookRow]) {
          isComplete = false;
          missingForBook.push(f.label);
          missingCounts[f.label] = (missingCounts[f.label] || 0) + 1;
        }
      });

      if (isComplete) completeCount++;
      else incompleteCount++;

      // Clerk stats
      if (!clerkStats[b.clerk_id]) clerkStats[b.clerk_id] = { total: 0, quantity: 0, complete: 0, missing: {} };
      clerkStats[b.clerk_id].total++;
      clerkStats[b.clerk_id].quantity += (b.quantity || 1);
      totalQuantityAll += (b.quantity || 1);
      if (isComplete) clerkStats[b.clerk_id].complete++;
      missingForBook.forEach(m => {
        clerkStats[b.clerk_id].missing[m] = (clerkStats[b.clerk_id].missing[m] || 0) + 1;
      });

      // School stats
      if (!schoolStats[b.school_id]) schoolStats[b.school_id] = { total: 0, quantity: 0, complete: 0, missing: {} };
      schoolStats[b.school_id].total++;
      schoolStats[b.school_id].quantity += (b.quantity || 1);
      if (isComplete) schoolStats[b.school_id].complete++;
      missingForBook.forEach(m => {
        schoolStats[b.school_id].missing[m] = (schoolStats[b.school_id].missing[m] || 0) + 1;
      });

      // Velocity
      const dateKey = new Date(b.created_at).toISOString().split('T')[0];
      entryDates[dateKey] = (entryDates[dateKey] || 0) + 1;

      // Duplicates
      const titleClean = (b.title || "").trim().toLowerCase();
      const authClean = (b.author || "").trim().toLowerCase();
      if (titleClean && authClean) {
        const sig = `${titleClean}|${authClean}|${b.school_id}`;
        sigMap[sig] = (sigMap[sig] || 0) + 1;
      }
    });

    const qualityScore = filteredBooks.length > 0 ? (completeCount / filteredBooks.length) * 100 : 0;

    // Formatting for charts & tables
    const missingFieldData = Object.entries(missingCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const clerkBreakdownData = Object.entries(clerkStats).map(([id, stats]) => {
      const name = clerks.find(c => c.id === id)?.full_name || "Unknown Clerk";
      const topMissing = Object.entries(stats.missing).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
      const qtyPct = totalQuantityAll > 0 ? (stats.quantity / totalQuantityAll) * 100 : 0;
      return { id, name, ...stats, rate: (stats.complete / stats.total) * 100, topMissing, qtyPct };
    }).sort((a, b) => b.total - a.total);

    const schoolBreakdownData = Object.entries(schoolStats).map(([id, stats]) => {
      const name = schools.find(s => s.id === id)?.name || "Unknown School";
      const topMissing = Object.entries(stats.missing).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
      return { id, name, ...stats, rate: (stats.complete / stats.total) * 100, topMissing };
    }).sort((a, b) => b.total - a.total);

    const velData = Object.entries(entryDates)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const dups = Object.entries(sigMap)
      .filter(([_, count]) => count > 1)
      .map(([sig, count]) => {
        const [title, author, sid] = sig.split("|");
        const sName = schools.find(s => s.id === sid)?.name || sid;
        return { title, author, school: sName, schoolId: sid, count };
      })
      .sort((a, b) => b.count - a.count);

    return {
      metrics: { total: filteredBooks.length, totalQuantity: totalQuantityAll, complete: completeCount, incomplete: incompleteCount, qualityScore },
      missingFieldCounts: missingFieldData,
      clerkBreakdown: clerkBreakdownData,
      schoolBreakdown: schoolBreakdownData,
      duplicates: dups,
      velocityData: velData,
    };
  }, [filteredBooks, schools, clerks]);

  const handleExportMarkdown = () => {
    let md = `# Field Report: Book Inventory System\n\n`;
    md += `**Generated on:** ${new Date().toLocaleDateString()}\n`;
    md += `**Filters:** ${filterSchool === "all" ? "All Schools" : schools.find(s => s.id === filterSchool)?.name} / ${filterClerk === "all" ? "All Clerks" : clerks.find(c => c.id === filterClerk)?.full_name}\n\n`;

    md += `## Executive Summary\n`;
    md += `- **Quality Score:** ${metrics.qualityScore.toFixed(1)}%\n`;
    md += `- **Total Records:** ${metrics.total.toLocaleString()}\n`;
    md += `- **Total Quantity:** ${metrics.totalQuantity.toLocaleString()}\n`;
    md += `- **Complete Records:** ${metrics.complete.toLocaleString()}\n`;
    md += `- **Incomplete Records:** ${metrics.incomplete.toLocaleString()}\n\n`;

    md += `## Clerk Performance Breakdown\n`;
    if (clerkBreakdown.length > 0) {
      md += `| Clerk | Total Records | Total Qty | Qty % | Complete Rate | Top Missing |\n`;
      md += `|---|---|---|---|---|---|\n`;
      clerkBreakdown.forEach(c => {
        md += `| ${c.name} | ${c.total} | ${c.quantity} | ${c.qtyPct.toFixed(1)}% | ${c.rate.toFixed(1)}% | ${c.topMissing} |\n`;
      });
    } else {
      md += `*No data available*\n`;
    }
    md += `\n`;

    md += `## School Data Quality Breakdown\n`;
    if (schoolBreakdown.length > 0) {
      md += `| School | Total Records | Total Qty | Complete | Rate | Top Missing |\n`;
      md += `|---|---|---|---|---|---|\n`;
      schoolBreakdown.forEach(s => {
        md += `| ${s.name} | ${s.total} | ${s.quantity} | ${s.complete} | ${s.rate.toFixed(0)}% | ${s.topMissing} |\n`;
      });
    } else {
      md += `*No data available*\n`;
    }
    md += `\n`;

    md += `## System-Wide Missing Fields\n`;
    if (missingFieldCounts.length > 0) {
      md += `| Field | Missing Count |\n`;
      md += `|---|---|\n`;
      missingFieldCounts.forEach(f => {
        md += `| ${f.name} | ${f.count} |\n`;
      });
    } else {
      md += `*No fields missing*\n`;
    }
    md += `\n`;

    if (duplicates.length > 0) {
      md += `## Potential Duplicates Flagged\n`;
      md += `| Title | Author | School | Count |\n`;
      md += `|---|---|---|---|\n`;
      duplicates.forEach(d => {
        md += `| ${d.title} | ${d.author} | ${d.school} | ${d.count} |\n`;
      });
      md += `\n`;
    }

    md += `## Actionable Recommendations\n`;
    const recs = [];
    if (metrics.qualityScore < 80) recs.push("System-wide data quality is below 80%. Consider running a targeted cleanup campaign.");
    if (missingFieldCounts[0] && missingFieldCounts[0].count > (metrics.total * 0.1)) {
      recs.push(`The most frequently missing field is **${missingFieldCounts[0].name}** (missing in ${missingFieldCounts[0].count} records). Review whether this field can be made mandatory or if clerks need training on where to find it.`);
    }
    clerkBreakdown.filter(c => c.total > 10 && c.rate < 60).forEach(c => {
      recs.push(`Clerk **${c.name}** has a high rate of incomplete records (${(100-c.rate).toFixed(0)}%). Consider providing additional support.`);
    });
    if (duplicates.length > 0) {
      recs.push(`There are **${duplicates.length}** sets of duplicate entries flagged. Verify these physical books.`);
    }

    if (recs.length > 0) {
      recs.forEach(r => { md += `- ${r}\n`; });
    } else {
      md += `*No recommendations at this time.*\n`;
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Field_Report_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (bLoading || sLoading || pLoading) {
    return <div className="flex justify-center items-center h-64 text-sm text-muted-foreground"><Loader2 className="animate-spin mr-2 h-5 w-5" /> Processing analytics data...</div>;
  }

  const renderProgressBar = (rate: number) => (
    <div className="w-full bg-secondary rounded-full h-2 mt-2 overflow-hidden border border-border">
      <div 
        className={`h-2 rounded-full transition-all duration-1000 ${rate >= 90 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} 
        style={{ width: `${rate}%` }}
      />
    </div>
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-primary to-primary/60">Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time metrics on cataloguing completeness and velocity.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={filterSchool} onValueChange={setFilterSchool}>
            <SelectTrigger className="w-[160px] bg-card/50 backdrop-blur-sm border-border">
              <SelectValue placeholder="All Schools" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools</SelectItem>
              {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterClerk} onValueChange={setFilterClerk}>
            <SelectTrigger className="w-[160px] bg-card/50 backdrop-blur-sm border-border">
              <SelectValue placeholder="All Clerks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clerks</SelectItem>
              {clerks.filter(c => c.active).map(c => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleExportMarkdown} variant="default" className="gap-2 shadow-md hover:shadow-lg transition-all active:scale-95">
            <Download size={16} /> Export Markdown
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <GlassCard className="relative overflow-hidden group">
          <div className="absolute -inset-1 bg-linear-to-r from-primary/20 to-transparent blur-xl group-hover:opacity-75 opacity-0 transition duration-500" />
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-br from-foreground to-muted-foreground">
              {metrics.qualityScore.toFixed(1)}%
            </div>
            {renderProgressBar(metrics.qualityScore)}
          </CardContent>
        </GlassCard>
        
        <GlassCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.total.toLocaleString()}</div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Total Quantity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.totalQuantity.toLocaleString()}</div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.complete.toLocaleString()}</div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Incomplete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">{metrics.incomplete.toLocaleString()}</div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard>
          <CardHeader>
            <CardTitle>System-Wide Missing Fields</CardTitle>
            <CardDescription>Frequency of fields missing from incomplete records</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={missingFieldCounts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.4} />
                <XAxis type="number" tick={{fill: "var(--color-muted-foreground)"}} />
                <YAxis dataKey="name" type="category" width={80} tick={{fill: "var(--color-foreground)"}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "var(--color-card)", borderRadius: "8px", border: "1px solid var(--color-border)" }}
                  itemStyle={{ color: "var(--color-foreground)" }}
                  cursor={{fill: "var(--color-muted)", opacity: 0.2}}
                />
                <Bar dataKey="count" fill="var(--color-primary, #3b82f6)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader>
            <CardTitle>Entry Velocity</CardTitle>
            <CardDescription>Books catalogued per day over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                <XAxis dataKey="date" tickFormatter={(t) => t.split('-').slice(1).join('/')} tick={{fill: "var(--color-muted-foreground)"}} />
                <YAxis tick={{fill: "var(--color-muted-foreground)"}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "var(--color-card)", borderRadius: "8px", border: "1px solid var(--color-border)" }}
                />
                <Area type="monotone" dataKey="count" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </GlassCard>
      </div>

      {/* Tables Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Clerk Breakdown */}
        <GlassCard className="overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b border-border/50">
            <CardTitle className="text-lg">Clerk Performance</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto p-0 flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30">
                <tr className="text-muted-foreground">
                  <th className="py-3 px-4 font-medium">Clerk</th>
                  <th className="py-3 px-4 font-medium text-right">Records</th>
                  <th className="py-3 px-4 font-medium text-right">Quantity</th>
                  <th className="py-3 px-4 font-medium text-right">Complete Rate</th>
                  <th className="py-3 px-4 font-medium text-right">Top Missing</th>
                </tr>
              </thead>
              <tbody>
                {clerkBreakdown.length > 0 ? clerkBreakdown.map(c => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium truncate max-w-[150px]">{c.name}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{c.total}</td>
                    <td className="py-3 px-4 text-right">
                      {c.quantity} <span className="text-xs text-muted-foreground ml-1">({c.qtyPct.toFixed(1)}%)</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-semibold">{c.rate.toFixed(0)}%</span>
                        <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden hidden sm:block">
                          <div className={`h-full ${c.rate >= 90 ? 'bg-emerald-500' : c.rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${c.rate}%`}} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{c.topMissing}</td>
                  </tr>
                )) : <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No data available</td></tr>}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* School Breakdown */}
        <GlassCard className="overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b border-border/50">
            <CardTitle className="text-lg">School Quality Breakdown</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto p-0 flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30">
                <tr className="text-muted-foreground">
                  <th className="py-3 px-4 font-medium">School</th>
                  <th className="py-3 px-4 font-medium text-right">Records</th>
                  <th className="py-3 px-4 font-medium text-right">Quantity</th>
                  <th className="py-3 px-4 font-medium text-right">Rate</th>
                  <th className="py-3 px-4 font-medium text-right">Top Missing</th>
                </tr>
              </thead>
              <tbody>
                {schoolBreakdown.length > 0 ? schoolBreakdown.map(s => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium truncate max-w-[150px]">{s.name}</td>
                    <td className="py-3 px-4 text-right">{s.total}</td>
                    <td className="py-3 px-4 text-right">{s.quantity}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-semibold">{s.rate.toFixed(0)}%</span>
                        <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden hidden sm:block">
                          <div className={`h-full ${s.rate >= 90 ? 'bg-emerald-500' : s.rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${s.rate}%`}} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{s.topMissing}</td>
                  </tr>
                )) : <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No data available</td></tr>}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* Duplicate Flags */}
      {duplicates.length > 0 && (
        <GlassCard className="border-amber-200/50 bg-amber-50/10 dark:bg-amber-950/20 overflow-hidden">
          <CardHeader className="bg-amber-500/10 border-b border-amber-200/30">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
              <AlertTriangle size={18} /> Potential Duplicates Flagged
            </CardTitle>
            <CardDescription className="text-amber-700/70 dark:text-amber-500/70">
              These books appear multiple times with the exact same Title, Author, and School.
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-amber-500/5">
                <tr className="border-b border-amber-200/30 text-amber-800/70 dark:text-amber-500/70">
                  <th className="py-3 px-4 font-medium">Title</th>
                  <th className="py-3 px-4 font-medium">Author</th>
                  <th className="py-3 px-4 font-medium">School</th>
                  <th className="py-3 px-4 font-medium text-right">Count</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {duplicates.slice(0, 10).map((d, i) => (
                  <tr key={i} className="border-b border-amber-200/20 last:border-0 text-amber-900 dark:text-amber-100 hover:bg-amber-500/5 transition-colors">
                    <td className="py-3 px-4 capitalize font-medium">{d.title}</td>
                    <td className="py-3 px-4 capitalize">{d.author}</td>
                    <td className="py-3 px-4">{d.school}</td>
                    <td className="py-3 px-4 text-right font-bold">{d.count}×</td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
                        onClick={() => setResolveGroup({ title: d.title, author: d.author, school: d.school, schoolId: d.schoolId, count: d.count })}
                      >
                        <GitMerge className="h-3 w-3" /> Resolve
                      </Button>
                    </td>
                  </tr>
                ))}
                {duplicates.length > 10 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-amber-700/80 dark:text-amber-500/80 text-xs font-medium bg-amber-500/5">
                      + {duplicates.length - 10} more duplicates hidden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Actionable Recommendations Section - Added to complete the UI and give suggestions natively */}
      <GlassCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Actionable Insights</CardTitle>
          <CardDescription>Recommendations based on your current applied filters.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {metrics.qualityScore < 80 ? (
              <li className="flex gap-3 text-sm"><div className="mt-0.5 rounded-full bg-amber-500/20 p-1 text-amber-600"><AlertTriangle className="h-3 w-3" /></div> System-wide data quality is below 80%. Consider running a targeted cleanup campaign.</li>
            ) : (
              <li className="flex gap-3 text-sm"><div className="mt-0.5 rounded-full bg-emerald-500/20 p-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /></div> Overall data quality is excellent ({metrics.qualityScore.toFixed(1)}%).</li>
            )}
            
            {missingFieldCounts[0] && missingFieldCounts[0].count > (metrics.total * 0.1) && (
              <li className="flex gap-3 text-sm"><div className="mt-0.5 rounded-full bg-primary/20 p-1 text-primary"><BookOpen className="h-3 w-3" /></div> The most frequently missing field is <strong className="mx-1">{missingFieldCounts[0].name}</strong>. Ensure clerks have easy access to this information during cataloguing.</li>
            )}

            {clerkBreakdown.filter(c => c.total > 10 && c.rate < 60).slice(0, 3).map(c => (
              <li key={c.id} className="flex gap-3 text-sm"><div className="mt-0.5 rounded-full bg-red-500/20 p-1 text-red-600"><AlertTriangle className="h-3 w-3" /></div> Clerk <strong className="mx-1">{c.name}</strong> has an incomplete record rate of {(100-c.rate).toFixed(0)}%. Targeted retraining may be helpful.</li>
            ))}

            {duplicates.length > 0 && (
              <li className="flex gap-3 text-sm"><div className="mt-0.5 rounded-full bg-amber-500/20 p-1 text-amber-600"><GitMerge className="h-3 w-3" /></div> <span>There are <strong className="mx-1">{duplicates.length}</strong> duplicate groups flagged. Use the <strong>Resolve</strong> buttons in the Duplicates section to merge or dismiss them.</span></li>
            )}
          </ul>
        </CardContent>
      </GlassCard>

      <ResolveDuplicateDialog
        group={resolveGroup}
        open={!!resolveGroup}
        onClose={() => setResolveGroup(null)}
      />
    </div>
  );
}
