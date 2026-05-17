import { auth } from '@/lib/firebase';
import { logout as logoutService } from '@/services/authService';
import { getUserProfile, type UserProfile } from '@/services/profileService';
import { onAuthStateChanged, type User } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  profileLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setProfile(null);
      setProfileLoading(false);
      setError(null);
      return;
    }

    setProfileLoading(true);
    setError(null);
    try {
      setProfile(await getUserProfile(firebaseUser.uid));
    } catch (err: any) {
      setProfile(null);
      setError(err.message || 'Could not load your profile.');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      await loadProfile(firebaseUser);
    });

    return unsubscribe;
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(auth.currentUser);
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    authLoading,
    profileLoading,
    error,
    refreshProfile,
    logout: logoutService,
  }), [authLoading, error, profile, profileLoading, refreshProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
