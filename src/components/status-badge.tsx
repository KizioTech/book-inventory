export type StatusValue = "active" | "slow" | "idle" | "paused";

const STATUS_CONFIG: Record<StatusValue, { dot: string; label: string }> = {
  active: { dot: "bg-green-500", label: "Active" },
  slow: { dot: "bg-amber-400", label: "Slow" },
  idle: { dot: "bg-red-400", label: "Not started" },
  paused: { dot: "bg-slate-400", label: "Paused" },
};

export function StatusBadge({ status }: { status: StatusValue }) {
  const { dot, label } = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
