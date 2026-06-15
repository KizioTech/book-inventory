import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// --- Types ---
export interface School {
  id: string;
  name: string;
  district: string | null;
  region: string | null;
  contact: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  active: boolean;
}

export interface RoleRow {
  user_id: string;
  role: "super_admin" | "admin" | "clerk";
}

export interface ClerkSchoolAssignment {
  clerk_id: string;
  school_id: string;
}

export interface SchoolStatsRow {
  school_id: string;
  total_books: number;
  clerk_count: number;
  last_entry: string | null;
}

export interface BookRow {
  id: string;
  isbn: string | null;
  title: string | null;
  author: string | null;
  publisher: string | null;
  year: string | null;
  quantity: number;
  condition: string | null;
  notes: string | null;
  school_id: string;
  clerk_id: string;
  created_at: string;
}

// --- Queries ---

export function useSchoolsQuery() {
  return useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data as School[]) ?? [];
    },
    staleTime: 60_000,
  });
}

export function useSchoolStatsQuery() {
  return useQuery({
    queryKey: ["school_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_school_stats");
      if (error) throw error;
      return (data as unknown as SchoolStatsRow[]) ?? [];
    },
    staleTime: 60_000,
  });
}

export function useProfilesQuery() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Profile[]) ?? [];
    },
    staleTime: 60_000,
  });
}

export function useUserRolesQuery() {
  return useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return (data as RoleRow[]) ?? [];
    },
    staleTime: 60_000,
  });
}

export function useClerkSchoolsQuery() {
  return useQuery({
    queryKey: ["clerk_schools"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clerk_schools").select("clerk_id, school_id");
      if (error) throw error;
      return (data as ClerkSchoolAssignment[]) ?? [];
    },
    staleTime: 60_000,
  });
}

export function useAssignedSchoolsQuery(userId: string | undefined, role: string | undefined) {
  return useQuery({
    queryKey: ["assigned_schools", userId, role],
    queryFn: async () => {
      if (!userId) return [];
      if (role === "clerk") {
        const { data, error } = await supabase
          .from("clerk_schools")
          .select("school_id, schools(id, name, active)")
          .eq("clerk_id", userId);
        if (error) throw error;
        const list =
          (data ?? [])
            .map(
              (r) =>
                r.schools as unknown as {
                  id: string;
                  name: string;
                  active: boolean;
                },
            )
            .filter((s) => s && s.active) ?? [];
        return list.map((s) => ({ id: s.id, name: s.name } as School));
      } else {
        const { data, error } = await supabase
          .from("schools")
          .select("id, name")
          .eq("active", true)
          .order("name");
        if (error) throw error;
        return (data as School[]) ?? [];
      }
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export interface BookFilters {
  schoolId?: string;
  clerkId?: string;
  condition?: string;
}

export function useBooksQuery(filters: BookFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ["books", filters, page, pageSize],
    queryFn: async () => {
      let q = supabase
        .from("books")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filters.schoolId && filters.schoolId !== "all") {
        q = q.eq("school_id", filters.schoolId);
      }
      if (filters.clerkId && filters.clerkId !== "all") {
        q = q.eq("clerk_id", filters.clerkId);
      }
      if (filters.condition && filters.condition !== "all") {
        q = q.eq("condition", filters.condition);
      }

      const { data, count, error } = await q;
      if (error) throw error;
      
      return {
        data: (data as BookRow[]) ?? [],
        count: count ?? 0,
      };
    },
    staleTime: 10_000,
  });
}

// Used for "Today" books count or general quick counts
export function useBooksCountQuery(filters: { since?: string; schoolId?: string; range?: string }) {
  return useQuery({
    queryKey: ["books_count", filters],
    queryFn: async () => {
      let q = supabase.from("books").select("id", { count: "exact", head: true });
      
      if (filters.schoolId && filters.schoolId !== "all") {
        q = q.eq("school_id", filters.schoolId);
      }
      if (filters.since) {
        q = q.gte("created_at", filters.since);
      }
      if (filters.range && filters.range !== "all") {
        const since = new Date();
        if (filters.range === "today") since.setHours(0, 0, 0, 0);
        if (filters.range === "week") since.setDate(since.getDate() - 7);
        if (filters.range === "month") since.setMonth(since.getMonth() - 1);
        q = q.gte("created_at", since.toISOString());
      }
      
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });
}
