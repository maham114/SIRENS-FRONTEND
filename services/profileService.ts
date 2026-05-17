import { db } from '@/lib/firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AlertPreferences, OnboardingLocation } from '@/stores/onboardingStore';

export type UserProfile = {
  email?: string | null;
  onboardingComplete?: boolean;
  role?: string;
  city?: string;
  district?: string;
  homeLocation?: OnboardingLocation | { area?: string; coords?: unknown };
  workLocation?: OnboardingLocation | { area?: string; coords?: unknown };
  frequentAreas?: Array<OnboardingLocation | { area?: string; coords?: unknown }>;
  preferences?: AlertPreferences;
  [key: string]: unknown;
};

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
}

export async function createInitialProfile(uid: string, email: string | null): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    email,
    onboardingComplete: false,
    createdAt: serverTimestamp(),
  });
}

export async function saveOnboardingProfile(uid: string, profileData: UserProfile): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, {
    ...profileData,
    onboardingComplete: true,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

