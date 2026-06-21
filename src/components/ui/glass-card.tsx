import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Frosted glass card with optional 3D tilt + dynamic glare on pointer move.
 * Designed to sit on a tinted/gradient backdrop for the glass effect to read.
 *
 * Usage:
 *   <GlassCard className="p-5">...</GlassCard>
 *   <GlassCard as="button" onClick={...} className="p-5 text-left">...</GlassCard>
 */
type GlassCardProps<T extends React.ElementType = "div"> = {
  as?: T;
  tilt?: boolean;
  glare?: boolean;
  selected?: boolean;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function GlassCard<T extends React.ElementType = "div">({
  as,
  tilt = true,
  glare = true,
  selected = false,
  className,
  children,
  ...rest
}: GlassCardProps<T>) {
  const Comp = (as ?? "div") as React.ElementType;
  const ref = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;
    // Skip tilt on touch / coarse pointers
    const isCoarse =
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches;
    if (isCoarse || !tilt) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const ry = ((x - cx) / cx) * 6;
      const rx = ((y - cy) / cy) * -6;
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);
    };
    const onLeave = () => {
      el.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [tilt]);

  return (
    <Comp
      ref={ref as never}
      data-glass-card=""
      className={cn(
        "group relative overflow-hidden rounded-2xl border",
        "border-white/40 dark:border-white/10",
        "bg-white/55 dark:bg-white/5 backdrop-blur-xl",
        "shadow-[0_8px_24px_-12px_rgba(20,48,79,0.25),inset_0_1px_0_0_rgba(255,255,255,0.6)]",
        "transition-[transform,box-shadow,border-color] duration-200 will-change-transform",
        "[transform-style:preserve-3d]",
        selected &&
          "border-primary/60 ring-2 ring-primary/25 bg-white/70",
        className,
      )}
      {...rest}
    >
      {/* Glare layer */}
      {glare && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(280px circle at var(--mouse-x,50%) var(--mouse-y,50%), rgba(255,255,255,0.45), transparent 60%)",
          }}
        />
      )}
      {/* Top sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
      />
      <div className="relative">{children}</div>
    </Comp>
  );
}
