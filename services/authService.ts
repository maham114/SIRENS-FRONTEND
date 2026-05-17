import { auth } from '@/lib/firebase';
import { createInitialProfile, getUserProfile } from '@/services/profileService';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const profile = await getUserProfile(credential.user.uid);

  if (!profile) {
    await signOut(auth);
    throw new Error('No SIRENS profile exists for this account. Please register first.');
  }

  return credential.user;
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await createInitialProfile(credential.user.uid, credential.user.email);
  return credential.user;
}

export async function sendResetPasswordEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
