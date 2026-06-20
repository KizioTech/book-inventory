export type StatusValue = "active" | "slow" | "idle" | "paused";

const STATUS_CONFIG: Record<StatusValue, { dot: string; label: string }> = {
  active: { dot: "bg-success", label: "Active" },
  slow: { dot: "bg-accent", label: "Slow" },
  idle: { dot: "bg-destructive/70", label: "Not started" },
  paused: { dot: "bg-muted-foreground/50", label: "Paused" },
};

export function StatusBadge({ status }: { status: StatusValue }) {
  const { dot, label } = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}