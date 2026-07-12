import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "moderator" | "editor" | "author" | "user";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isAuthor: boolean;
  roles: Role[];
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) setTimeout(() => fetchRoles(s.user.id), 0);
      else { setRoles([]); setIsSuperAdmin(false); }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) fetchRoles(data.session.user.id);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function fetchRoles(uid: string) {
    const [{ data: rolesData }, { data: sa }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("super_admins").select("user_id").eq("user_id", uid).maybeSingle(),
    ]);
    setRoles(((rolesData ?? []) as { role: Role }[]).map((r) => r.role));
    setIsSuperAdmin(!!sa);
  }

  const isAdmin = isSuperAdmin || roles.includes("admin");
  const isStaff = isAdmin || roles.includes("moderator") || roles.includes("editor");
  const isAuthor = roles.includes("author") || isAdmin;

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    loading,
    isSuperAdmin,
    isAdmin,
    isStaff,
    isAuthor,
    roles,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message };
    },
    async signUp(email, password, username) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { username, display_name: username },
        },
      });
      return { error: error?.message };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
