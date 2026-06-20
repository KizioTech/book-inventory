import React, { useState } from "react";
import {
  ChevronsRight,
  LogOut,
  Bell,
  ScanLine
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
  const [open, setOpen] = useState(true);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar
        open={open}
        setOpen={setOpen}
        items={items}
        activeTab={activeTab}
        onTabChange={onTabChange}
        userFullName={userFullName}
        userRole={userRole}
        onSignOut={onSignOut}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-muted/20">
        <Header userFullName={userFullName} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const Header = ({ userFullName }: { userFullName: string | null | undefined }) => {
  const { profile } = useAuth();
  const initials = (userFullName ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-end border-b border-border bg-card px-4 md:px-8">
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full"></span>
        </button>
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

const Sidebar = ({
  open,
  setOpen,
  items,
  activeTab,
  onTabChange,
  userFullName,
  userRole,
  onSignOut,
}: Omit<DashboardLayoutProps, "children"> & { open: boolean; setOpen: (b: boolean) => void }) => {
  const navigate = useNavigate();
  const roleLabel =
    userRole === "super_admin"
      ? "Super Admin"
      : userRole === "admin"
      ? "Admin"
      : "Clerk";

  return (
    <nav
      className={`relative h-screen shrink-0 border-r transition-all duration-300 ease-in-out ${
        open ? "w-64" : "w-16"
      } border-border bg-card shadow-sm flex flex-col`}
    >
      <TitleSection open={open} userFullName={userFullName} roleLabel={roleLabel} />

      <div className="flex-1 space-y-1 p-2 overflow-y-auto">
        {items.map((item) => (
          <Option
            key={item.id}
            Icon={item.icon}
            title={item.title}
            selected={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
            open={open}
            notifs={item.notifs}
          />
        ))}

        <div className="pt-4 mt-4 border-t border-border space-y-1">
          <Option
            Icon={ScanLine}
            title="Scan Mode"
            selected={false}
            onClick={() => navigate({ to: "/scan" })}
            open={open}
          />
          <Option
            Icon={LogOut}
            title="Log out"
            selected={false}
            onClick={onSignOut}
            open={open}
            destructive
          />
        </div>
      </div>

      <ToggleClose open={open} setOpen={setOpen} />
    </nav>
  );
};

const Option = ({
  Icon,
  title,
  selected,
  onClick,
  open,
  notifs,
  destructive
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
        <span
          className={`text-sm font-medium transition-opacity duration-200 truncate pr-2 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        >
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

const TitleSection = ({ open, userFullName, roleLabel }: { open: boolean; userFullName?: string | null; roleLabel: string }) => {
  return (
    <div className="border-b border-border p-3">
      <div className="flex items-center gap-3 rounded-md p-1">
        <img
          src={logoImg}
          alt="Logo"
          className="h-8 w-8 object-contain shrink-0"
        />
        {open && (
          <div className={`transition-opacity duration-200 min-w-0 ${open ? "opacity-100" : "opacity-0"}`}>
            <div className="flex items-center gap-2">
              <div className="min-w-0">
                <span className="block text-sm font-bold text-foreground truncate">
                  Book Inventory
                </span>
                <span className="block text-xs text-muted-foreground truncate">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ToggleClose = ({ open, setOpen }: { open: boolean; setOpen: (b: boolean) => void }) => {
  return (
    <button
      onClick={() => setOpen(!open)}
      className="border-t border-border transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
    >
      <div className="flex items-center p-3">
        <div className="grid h-10 w-10 shrink-0 place-content-center">
          <ChevronsRight
            className={`h-4 w-4 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
        {open && (
          <span
            className={`text-sm font-medium transition-opacity duration-200 ${
              open ? "opacity-100" : "opacity-0"
            }`}
          >
            Collapse
          </span>
        )}
      </div>
    </button>
  );
};
