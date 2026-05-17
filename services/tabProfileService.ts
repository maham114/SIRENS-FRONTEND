import { auth } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function updateDisplayName(displayName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to update your profile.');
  await updateProfile(user, { displayName: displayName.trim() });
}

export async function updateProfileFields(fields: { city?: string; district?: string }): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to update your profile.');
  await updateDoc(doc(db, 'users', user.uid), {
    ...(fields.city !== undefined ? { city: fields.city.trim() } : {}),
    ...(fields.district !== undefined ? { district: fields.district.trim() } : {}),
  });
}
