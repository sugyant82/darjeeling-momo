import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
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

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) return setProfile(null);
    try {
      setProfile(await fetchProfile(supabase, u.id));
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setUser(data.session?.user ?? null);
        await loadProfile(data.session?.user ?? null);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const next = session?.user ?? null;
      // Token refreshes (about hourly) hand over a new user object for the same person. Keep the
      // existing one so screens don't reset what the user is typing or reload their cart.
      setUser((prev) => (prev?.id === next?.id && event !== 'USER_UPDATED' ? prev : next));
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        void loadProfile(next);
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthState>(() => {
    const role = (profile?.role ?? 'customer') as UserRole;
    return {
      loading,
      user,
      profile,
      role,
      isStaff: role === 'staff' || role === 'admin',
      refreshProfile: () => loadProfile(user),
      // "local" clears this device's session even when offline (the default scope needs the network).
      signOut: async () => {
        await supabase.auth.signOut({ scope: 'local' });
      },
    };
  }, [loading, user, profile, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
