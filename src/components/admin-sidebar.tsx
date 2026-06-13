import { useState } from "react";
import {
  BookOpen,
  School as SchoolIcon,
  Users,
  BarChart2,
  Download,
  LogOut,
  Menu,
  X,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export type AdminTab = "schools" | "users" | "records" | "export";

const NAV: { id: AdminTab; label: string; icon: typeof BookOpen }[] = [
  { id: "schools", label: "Schools", icon: SchoolIcon },
  { id: "users", label: "Users", icon: Users },
  { id: "records", label: "Records", icon: BarChart2 },
  { id: "export", label: "Export", icon: Download },
];

interface Props {
  active: AdminTab;
  onChange: (t: AdminTab) => void;
  fullName: string | null | undefined;
  role: string | null;
  onSignOut: () => void;
}

function NavList({
  active,
  onChange,
}: {
  active: AdminTab;
  onChange: (t: AdminTab) => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={18} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function SidebarBody({ active, onChange, fullName, role, onSignOut }: Props) {
  const navigate = useNavigate();
  const roleLabel =
    role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : "Clerk";
  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <BookOpen className="h-5 w-5 text-blue-600" />
        <span className="font-bold text-lg text-blue-600">Book Inventory</span>
      </div>
      <NavList active={active} onChange={onChange} />
      <button
        onClick={() => navigate({ to: "/scan" })}
        className="mt-3 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        <ScanLine size={18} />
        Scan mode
      </button>
      <div className="mt-auto border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            {(fullName ?? "U")
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">
              {fullName ?? "User"}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              {role === "super_admin" && (
                <ShieldCheck size={12} className="text-slate-700" />
              )}
              {roleLabel}
            </div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </div>
  );
}

export function AdminSidebar(props: Props) {
  const [open, setOpen] = useState(false);
  const handleChange = (t: AdminTab) => {
    props.onChange(t);
    setOpen(false);
  };

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:block sticky top-0 h-screen">
        <SidebarBody {...props} onChange={handleChange} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-1.5 hover:bg-slate-100"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-600">Book Inventory</span>
        </div>
        <span className="text-xs text-slate-500 truncate max-w-[100px]">
          {props.fullName ?? ""}
        </span>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="relative h-full">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-3 z-10 rounded-lg p-1.5 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
            <SidebarBody {...props} onChange={handleChange} />
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        </div>
      )}
    </>
  );
}
