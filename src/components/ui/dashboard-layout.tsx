import React, { useState, useEffect } from "react";
import {
  ChevronsRight,
  LogOut,
  ScanLine,
  Menu,
  X,
} from "lucide-react";
import logoImg from "@/assets/blue-logo.png";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export interface SidebarItem {
  id: string;
  title: string;
  icon: React.ElementType;
  notifs?: number;
}

export interface DashboardLayoutProps {
  items: SidebarItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  userFullName: string | null | undefined;
  userRole: string | null;
  onSignOut: () => void;
  children: React.ReactNode;
}

export const DashboardLayout = ({
  items,
  activeTab,
  onTabChange,
  userFullName,
  userRole,
  onSignOut,
  children,
}: DashboardLayoutProps) => {
  // Desktop: collapsible. Mobile: drawer (always "full" when open).
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route/tab change
  const handleTabChange = (id: string) => {
    onTabChange(id);
    setMobileOpen(false);
  };

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const sharedSidebarProps = {
    items,
    activeTab,
    onTabChange: handleTabChange,
    userFullName,
    userRole,
    onSignOut,
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div className="hidden md:flex">
        <Sidebar
          open={desktopOpen}
          setOpen={setDesktopOpen}
          {...sharedSidebarProps}
        />
      </div>

      {/* ── Mobile overlay drawer ── */}
      {mobileOpen && (
        <>
          {/* Blurred backdrop */}
          <div
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 z-50 flex md:hidden animate-in slide-in-from-left duration-300">
            <Sidebar
              open={true}
              setOpen={() => setMobileOpen(false)}
              {...sharedSidebarProps}
              isMobileDrawer
            />
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-muted/20">
        <Header
          userFullName={userFullName}
          onMenuClick={() => setMobileOpen((v) => !v)}
          mobileOpen={mobileOpen}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────

const Header = ({
  userFullName,
  onMenuClick,
  mobileOpen,
}: {
  userFullName: string | null | undefined;
  onMenuClick: () => void;
  mobileOpen: boolean;
}) => {
  const { profile } = useAuth();
  const initials = (userFullName ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-8">
      {/* Hamburger – mobile only */}
      <button
        onClick={onMenuClick}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        className="flex md:hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Spacer so right-side items stay right on desktop */}
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-semibold text-xs overflow-hidden shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
      </div>
    </header>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const Sidebar = ({
  open,
  setOpen,
  items,
  activeTab,
  onTabChange,
  userFullName,
  userRole,
  onSignOut,
  isMobileDrawer = false,
}: Omit<DashboardLayoutProps, "children"> & {
  open: boolean;
  setOpen: (b: boolean) => void;
  isMobileDrawer?: boolean;
}) => {
  const navigate = useNavigate();
  const roleLabel =
    userRole === "super_admin"
      ? "Super Admin"
      : userRole === "admin"
      ? "Admin"
      : "Clerk";

  return (
    <nav
      className={`relative h-screen shrink-0 border-r border-border bg-card shadow-sm flex flex-col transition-all duration-300 ease-in-out ${
        isMobileDrawer ? "w-72" : open ? "w-64" : "w-16"
      }`}
    >
      <TitleSection open={open || isMobileDrawer} userFullName={userFullName} roleLabel={roleLabel} />

      <div className="flex-1 space-y-1 p-2 overflow-y-auto">
        {items.map((item) => (
          <Option
            key={item.id}
            Icon={item.icon}
            title={item.title}
            selected={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
            open={open || isMobileDrawer}
            notifs={item.notifs}
          />
        ))}

        <div className="pt-4 mt-4 border-t border-border space-y-1">
          <Option
            Icon={ScanLine}
            title="Scan Mode"
            selected={false}
            onClick={() => navigate({ to: "/scan" })}
            open={open || isMobileDrawer}
          />
          <Option
            Icon={LogOut}
            title="Log out"
            selected={false}
            onClick={onSignOut}
            open={open || isMobileDrawer}
            destructive
          />
        </div>
      </div>

      {/* Desktop collapse toggle – hidden in mobile drawer */}
      {!isMobileDrawer && <ToggleClose open={open} setOpen={setOpen} />}
    </nav>
  );
};

// ─── Option ───────────────────────────────────────────────────────────────────

const Option = ({
  Icon,
  title,
  selected,
  onClick,
  open,
  notifs,
  destructive,
}: {
  Icon: React.ElementType;
  title: string;
  selected: boolean;
  onClick: () => void;
  open: boolean;
  notifs?: number;
  destructive?: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
        selected
          ? "bg-primary/10 text-primary shadow-sm border-l-2 border-primary"
          : destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <div className="grid h-full w-12 shrink-0 place-content-center">
        <Icon className="h-4 w-4" />
      </div>

      {open && (
        <span className="text-sm font-medium transition-opacity duration-200 truncate pr-2 opacity-100">
          {title}
        </span>
      )}

      {notifs && open && (
        <span className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-medium">
          {notifs}
        </span>
      )}
    </button>
  );
};

// ─── TitleSection ─────────────────────────────────────────────────────────────

const TitleSection = ({
  open,
  roleLabel,
}: {
  open: boolean;
  userFullName?: string | null;
  roleLabel: string;
}) => {
  return (
    <div className="border-b border-border p-3">
      <div className="flex items-center gap-3 rounded-md p-1">
        <img src={logoImg} alt="Logo" className="h-8 w-8 object-contain shrink-0" />
        {open && (
          <div className="transition-opacity duration-200 min-w-0 opacity-100">
            <span className="block text-sm font-bold text-foreground truncate">
              Book Inventory
            </span>
            <span className="block text-xs text-muted-foreground truncate">
              {roleLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── ToggleClose (desktop only) ───────────────────────────────────────────────

const ToggleClose = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (b: boolean) => void;
}) => {
  return (
    <button
      onClick={() => setOpen(!open)}
      className="border-t border-border transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
    >
      <div className="flex items-center p-3">
        <div className="grid h-10 w-10 shrink-0 place-content-center">
          <ChevronsRight
            className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </div>
        {open && (
          <span className="text-sm font-medium transition-opacity duration-200 opacity-100">
            Collapse
          </span>
        )}
      </div>
    </button>
  );
};
