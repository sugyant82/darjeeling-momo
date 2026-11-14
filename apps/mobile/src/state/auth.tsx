import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { fetchProfile } from '@darjeeling/shared';
import type { ProfileRow, UserRole } from '@darjeeling/shared/types';
import { supabase } from '@/lib/supabase';

interface AuthState {
  loading: boolean;
  user: User | null;
  profile: ProfileRow | null;
  role: UserRole;
  isStaff: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const loadProfile = async (u: User | null) => {
    if (!u) return setProfile(null);
    try {
      setProfile(await fetchProfile(supabase, u.id));
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
      setUser(data.session?.user ?? null);
      await loadProfile(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setUser(session?.user ?? null);
      await loadProfile(session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(() => {
    const role = (profile?.role ?? 'customer') as UserRole;
    return {
      loading,
      user,
      profile,
      role,
      isStaff: role === 'staff' || role === 'admin',
      refreshProfile: () => loadProfile(user),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    };
  }, [loading, user, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
