import { auth, db } from '@/lib/firebase';
import { setAlertPrefsFn } from '@/lib/firebase';
import type { AlertItem, AlertPreferences } from '@/types/tabs';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  weather: true,
  traffic: true,
  highSeverityOnly: false,
  notificationChannel: 'push',
};

export function listenAlertPreferences(callback: (prefs: AlertPreferences) => void, onError: (message: string) => void): Unsubscribe {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    onError('You must be signed in to load alert preferences.');
    return () => {};
  }

  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      const data = snapshot.data();
      callback({
        ...DEFAULT_ALERT_PREFERENCES,
        ...(data?.preferences as Partial<AlertPreferences> | undefined),
      });
    },
    (error) => onError(error.message || 'Could not load alert preferences.')
  );
}

export function listenAlerts(callback: (alerts: AlertItem[]) => void, onError: (message: string) => void): Unsubscribe {
  const alertsQuery = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(50));

  return onSnapshot(
    alertsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((alertDoc) => ({
        id: alertDoc.id,
        ...(alertDoc.data() as Omit<AlertItem, 'id'>),
      })));
    },
    (error) => onError(error.message || 'Could not load alerts.')
  );
}

export async function saveAlertPreferences(preferences: AlertPreferences): Promise<void> {
  const setPrefs = setAlertPrefsFn();
  await setPrefs({ preferences });
}
