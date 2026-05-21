import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { AuthorityContact } from '@/stores/onboardingStore';

export async function fetchAuthorities(): Promise<AuthorityContact[]> {
  try {
    const snapshot = await getDocs(collection(db, 'authorities'));
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        name: data.name || '',
        contact: data.contact || '',
        crisisType: data.crisisType || '',
      };
    });
  } catch (error) {
    console.error('Failed to fetch authorities:', error);
    return [];
  }
}