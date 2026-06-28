import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Defines the possible roles a user can hold within the application.
 * - `super_admin`: Full access to all schools and system settings.
 * - `admin`: Administrative access for specific assigned schools.
 * - `clerk`: Basic access to scan and manage inventory for assigned schools.
 */
export type AppRole = "super_admin" | "admin" | "clerk";

/**
 * Represents the public profile of an authenticated user, typically
 * synced with the `profiles` table in Supabase.
 */
interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  active: boolean;
  avatar_url: string | null;
}

/**
 * The Authentication Context shape, providing state and methods
 * for managing user sessions and profiles.
 */
interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

/**
 * The Provider component that wraps the application (or parts of it)
 * to supply the AuthContext. It listens to Supabase Auth state changes
 * and automatically loads the user's profile and highest role.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select("id, full_name, email, active, avatar_url")
        .eq("id", uid)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(p as Profile | null);
    const roles = (r ?? []).map((x: { role: AppRole }) => x.role);
    const best: AppRole | null = roles.includes("super_admin")
      ? "super_admin"
      : roles.includes("admin")
        ? "admin"
        : roles.includes("clerk")
          ? "clerk"
          : null;
    setRole(best);

    if (p && !p.active) {
      await supabase.auth.signOut();
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error ? { error: error.message } : {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signIn,
        signOut,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

/**
 * Custom hook to access the current authentication context.
 * Must be used within a component wrapped by `<AuthProvider>`.
 * 
 * @throws {Error} If called outside of an `<AuthProvider>`.
 */
export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
