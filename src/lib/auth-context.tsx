import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from './supabase';
import type { UserRole } from './types';

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  isGuest: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  continueAsGuest: (name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  updateName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const GUEST_KEY = 'bink.guestUser';
const USERS_KEY = 'bink.users'; // demo-mode registry so the admin panel can list users

// In demo mode, sign in with an email starting with "admin@" to get admin
// access; "owner@" gets the partner role (used by the one-click salon demo).
function demoRole(email: string): UserRole {
  const e = email.toLowerCase();
  if (e.startsWith('admin@')) return 'admin';
  if (e.startsWith('owner@')) return 'partner';
  return 'customer';
}

async function registerDemoUser(user: AuthUser) {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    const users: (AuthUser & { joined_at: string })[] = raw ? JSON.parse(raw) : [];
    if (!users.some((u) => u.email === user.email)) {
      users.unshift({ ...user, joined_at: new Date().toISOString() });
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    } else {
      await AsyncStorage.setItem(
        USERS_KEY,
        JSON.stringify(users.map((u) => (u.email === user.email ? { ...u, ...user } : u)))
      );
    }
  } catch {}
}

export async function getDemoUsers(): Promise<(AuthUser & { joined_at: string })[]> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function fromSession(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: (session.user.user_metadata?.full_name as string) ?? null,
    role: ((session.user.user_metadata?.role as UserRole) ?? 'customer') as UserRole,
    isGuest: false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const sb = getSupabase();
      if (sb) {
        const { data } = await sb.auth.getSession();
        if (data.session) {
          const u = fromSession(data.session);
          // profiles.role is the source of truth when Supabase is live
          if (u) {
            const { data: p } = await sb.from('profiles').select('role').eq('id', u.id).maybeSingle();
            if (p?.role) u.role = p.role as UserRole;
          }
          setUser(u);
          setLoading(false);
        }
        const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
          const u = fromSession(session);
          setUser(u);
          // profiles.role stays the source of truth (metadata may lag)
          if (u) {
            sb.from('profiles').select('role').eq('id', u.id).maybeSingle().then(({ data: p }) => {
              if (p?.role) setUser((cur) => (cur && cur.id === u.id ? { ...cur, role: p.role as UserRole } : cur));
            });
          }
        });
        unsub = () => sub.subscription.unsubscribe();
        if (data.session) return;
      }
      const raw = await AsyncStorage.getItem(GUEST_KEY);
      if (raw) setUser(JSON.parse(raw));
      setLoading(false);
    })();
    return () => unsub?.();
  }, []);

  const persistLocal = useCallback(async (u: AuthUser) => {
    await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(u));
    await registerDemoUser(u);
    setUser(u);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const sb = getSupabase();
      if (!sb) {
        // Demo mode: any credentials work; existing demo user keeps their role
        const existing = (await getDemoUsers()).find((u) => u.email === email);
        await persistLocal(
          existing ?? {
            id: `demo-${email}`,
            email,
            name: email.split('@')[0],
            role: demoRole(email),
            isGuest: true,
          }
        );
        return null;
      }
      const { error } = await sb.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    [persistLocal]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const sb = getSupabase();
      if (!sb) {
        await persistLocal({ id: `demo-${email}`, email, name, role: demoRole(email), isGuest: true });
        return null;
      }
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      return error ? error.message : null;
    },
    [persistLocal]
  );

  const continueAsGuest = useCallback(
    async (name?: string) => {
      await persistLocal({ id: 'guest', email: null, name: name ?? 'Guest', role: 'customer', isGuest: true });
    },
    [persistLocal]
  );

  const setRole = useCallback(
    async (role: UserRole) => {
      if (!user) return;
      const next = { ...user, role };
      const sb = getSupabase();
      if (sb && !user.isGuest) {
        await sb.from('profiles').update({ role }).eq('id', user.id);
        setUser(next);
        return;
      }
      await persistLocal(next);
    },
    [user, persistLocal]
  );

  const updateName = useCallback(
    async (name: string) => {
      if (!user || !name.trim()) return;
      const next = { ...user, name: name.trim() };
      const sb = getSupabase();
      if (sb && !user.isGuest) {
        await sb.auth.updateUser({ data: { full_name: name.trim() } });
        await sb.from('profiles').update({ full_name: name.trim() }).eq('id', user.id);
        setUser(next);
        return;
      }
      await persistLocal(next);
    },
    [user, persistLocal]
  );

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    await AsyncStorage.removeItem(GUEST_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, continueAsGuest, signOut, setRole, updateName }),
    [user, loading, signIn, signUp, continueAsGuest, signOut, setRole, updateName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { isSupabaseConfigured };
