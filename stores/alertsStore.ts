import { create } from 'zustand';
import type { Unsubscribe } from 'firebase/firestore';
import {
  DEFAULT_ALERT_PREFERENCES,
  listenAlertPreferences,
  listenAlerts,
  saveAlertPreferences,
} from '@/services/alertService';
import type { AlertItem, AlertPreferences } from '@/types/tabs';

type AlertsStore = {
  preferences: AlertPreferences;
  alerts: AlertItem[];
  loading: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
  unsubscribePrefs?: Unsubscribe;
  unsubscribeAlerts?: Unsubscribe;
  start: () => void;
  stop: () => void;
  updatePreferences: (preferences: AlertPreferences) => void;
  save: () => Promise<void>;
};

export const useAlertsStore = create<AlertsStore>((set, get) => ({
  preferences: DEFAULT_ALERT_PREFERENCES,
  alerts: [],
  loading: false,
  saving: false,
  saved: false,
  error: null,
  start: () => {
    const state = get();
    if (state.unsubscribePrefs || state.unsubscribeAlerts) return;
    set({ loading: true, error: null });
    const onError = (message: string) => set({ error: message, loading: false });
    const unsubscribePrefs = listenAlertPreferences(
      (preferences) => set({ preferences, loading: false }),
      onError
    );
    const unsubscribeAlerts = listenAlerts(
      (alerts) => set({ alerts, loading: false }),
      onError
    );
    set({ unsubscribePrefs, unsubscribeAlerts });
  },
  stop: () => {
    get().unsubscribePrefs?.();
    get().unsubscribeAlerts?.();
    set({ unsubscribePrefs: undefined, unsubscribeAlerts: undefined });
  },
  updatePreferences: (preferences) => set({ preferences, saved: false }),
  save: async () => {
    set({ saving: true, saved: false, error: null });
    try {
      await saveAlertPreferences(get().preferences);
      set({ saved: true });
      setTimeout(() => set({ saved: false }), 2500);
    } catch (error: any) {
      set({ error: error.message || 'Could not save preferences.' });
    } finally {
      set({ saving: false });
    }
  },
}));
