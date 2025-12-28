import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export type AppRole = 'admin' | 'technician' | 'customer';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ data: any; error: any }>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTechnician: boolean;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Avoid multi-tab refresh-token thrashing (can cause rapid /token calls -> 429 -> auto sign-out)
    const tabId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const LEADER_KEY = "auth_refresh_leader";
    const HEARTBEAT_MS = 10_000;
    const LEADER_TTL_MS = 25_000;

    let isLeader = false;
    let heartbeatTimer: number | null = null;
    const bc = typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel("auth-refresh") : null;

    const now = () => Date.now();

    const readLeader = () => {
      try {
        const raw = localStorage.getItem(LEADER_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { tabId: string; ts: number };
        return parsed;
      } catch {
        return null;
      }
    };

    const writeLeader = () => {
      localStorage.setItem(LEADER_KEY, JSON.stringify({ tabId, ts: now() }));
    };

    const becomeLeader = () => {
      isLeader = true;
      writeLeader();
      try {
        supabase.auth.startAutoRefresh();
      } catch {
        // ignore
      }
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      heartbeatTimer = window.setInterval(() => {
        writeLeader();
        bc?.postMessage({ type: "leader_heartbeat", tabId });
      }, HEARTBEAT_MS);
      bc?.postMessage({ type: "leader", tabId });
    };

    const becomeFollower = () => {
      isLeader = false;
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
      try {
        supabase.auth.stopAutoRefresh();
      } catch {
        // ignore
      }
    };

    const tryClaimLeadership = () => {
      const leader = readLeader();

      // If there is no leader or the leader is stale, take over.
      if (!leader || now() - leader.ts > LEADER_TTL_MS) {
        if (!isLeader) becomeLeader();
        return;
      }

      // If we're already the leader, stay the leader.
      if (leader.tabId === tabId) {
        if (!isLeader) becomeLeader();
        return;
      }

      // Someone else is leader
      if (isLeader) becomeFollower();
    };

    // Initial claim
    tryClaimLeadership();

    // Re-check leadership on visibility changes (returning to tab) and on cross-tab messages
    const onVisibility = () => {
      if (document.visibilityState === "visible") tryClaimLeadership();
    };
    document.addEventListener("visibilitychange", onVisibility);

    bc?.addEventListener("message", (ev) => {
      const msg = ev.data;
      if (!msg) return;
      if (msg.type === "leader" && msg.tabId !== tabId) {
        // Another tab became leader
        becomeFollower();
      }
      if (msg.type === "leader_heartbeat" && msg.tabId !== tabId) {
        // Ensure we stay follower while leader is alive
        becomeFollower();
      }
    });

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Helpful for debugging unexpected sign-outs
      // (doesn't log secrets; just event name)
      console.info("[auth]", event);

      setSession(session);
      setUser(session?.user ?? null);

      // Fetch profile when user changes - use setTimeout to avoid deadlock
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      bc?.close();
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);

      // Release leadership if we were leader
      const leader = readLeader();
      if (leader?.tabId === tabId) {
        try {
          localStorage.removeItem(LEADER_KEY);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) throw rolesError;
      setRoles(rolesData?.map(r => r.role as AppRole) || []);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setRoles([]);
    }
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    roles,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: roles.includes("admin"),
    isTechnician: roles.includes("technician"),
    hasRole: (role: AppRole) => roles.includes(role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
