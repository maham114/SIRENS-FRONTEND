import { create } from 'zustand';
import { logout } from '@/services/authService';
import { updateDisplayName, updateProfileFields } from '@/services/tabProfileService';

type ProfileStore = {
  saving: boolean;
  loggingOut: boolean;
  error: string | null;
  saveDisplayName: (displayName: string) => Promise<boolean>;
  saveProfileFields: (fields: { city?: string; district?: string }) => Promise<boolean>;
  logoutUser: () => Promise<void>;
};

export const useProfileStore = create<ProfileStore>((set) => ({
  saving: false,
  loggingOut: false,
  error: null,
  saveDisplayName: async (displayName) => {
    set({ saving: true, error: null });
    try {
      await updateDisplayName(displayName);
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Could not update profile.' });
      return false;
    } finally {
      set({ saving: false });
    }
  },
  saveProfileFields: async (fields) => {
    set({ saving: true, error: null });
    try {
      await updateProfileFields(fields);
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Could not update profile.' });
      return false;
    } finally {
      set({ saving: false });
    }
  },
  logoutUser: async () => {
    set({ loggingOut: true, error: null });
    try {
      await logout();
    } finally {
      set({ loggingOut: false });
    }
  },
}));
