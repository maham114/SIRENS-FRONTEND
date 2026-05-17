import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type OnboardingRole = 'citizen';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type OnboardingLocation = {
  area: string;
  coords: Coordinates | null;
};

export type AlertPreferences = {
  weather: boolean;
  traffic: boolean;
  highSeverityOnly: boolean;
};

export type LocationTarget =
  | { kind: 'home' }
  | { kind: 'work' }
  | { kind: 'frequent'; index: number };

type OnboardingMode = 'setup' | 'edit';

type OnboardingStore = {
  role: OnboardingRole;
  city: string;
  district: string;
  homeLocation: OnboardingLocation;
  workLocation: OnboardingLocation;
  frequentAreas: OnboardingLocation[];
  preferences: AlertPreferences;
  step: number;
  mode: OnboardingMode;
  loading: boolean;
  error: string | null;
  setRole: (role: OnboardingRole) => void;
  setCity: (city: string) => void;
  setDistrict: (district: string) => void;
  setHomeLocation: (location: OnboardingLocation) => void;
  setWorkLocation: (location: OnboardingLocation) => void;
  addFrequentArea: () => void;
  updateFrequentArea: (index: number, location: Partial<OnboardingLocation>) => void;
  removeFrequentArea: (index: number) => void;
  setPreferences: (preferences: AlertPreferences) => void;
  setLocationCoords: (target: LocationTarget, coords: Coordinates) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setMode: (mode: OnboardingMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  hydrateDraft: (draft: Partial<Pick<OnboardingStore, 'city' | 'district' | 'homeLocation' | 'workLocation' | 'frequentAreas' | 'preferences'>>) => void;
  clearDraft: () => void;
};

const TOTAL_STEPS = 7;

const initialDraft = {
  role: 'citizen' as OnboardingRole,
  city: '',
  district: '',
  homeLocation: { area: '', coords: null },
  workLocation: { area: '', coords: null },
  frequentAreas: [] as OnboardingLocation[],
  preferences: {
    weather: true,
    traffic: true,
    highSeverityOnly: false,
  },
  step: 1,
  mode: 'setup' as OnboardingMode,
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...initialDraft,
      loading: false,
      error: null,
      setRole: (role) => set({ role }),
      setCity: (city) => set({ city }),
      setDistrict: (district) => set({ district }),
      setHomeLocation: (homeLocation) => set({ homeLocation }),
      setWorkLocation: (workLocation) => set({ workLocation }),
      addFrequentArea: () =>
        set((state) => ({
          frequentAreas: [...state.frequentAreas, { area: '', coords: null }],
        })),
      updateFrequentArea: (index, location) =>
        set((state) => ({
          frequentAreas: state.frequentAreas.map((area, i) =>
            i === index ? { ...area, ...location } : area
          ),
        })),
      removeFrequentArea: (index) =>
        set((state) => ({
          frequentAreas: state.frequentAreas.filter((_, i) => i !== index),
        })),
      setPreferences: (preferences) => set({ preferences }),
      setLocationCoords: (target, coords) =>
        set((state) => {
          if (target.kind === 'home') {
            return { homeLocation: { ...state.homeLocation, coords } };
          }
          if (target.kind === 'work') {
            return { workLocation: { ...state.workLocation, coords } };
          }
          return {
            frequentAreas: state.frequentAreas.map((area, i) =>
              i === target.index ? { ...area, coords } : area
            ),
          };
        }),
      setStep: (step) => set({ step: Math.min(Math.max(step, 1), TOTAL_STEPS) }),
      nextStep: () => set((state) => ({ step: Math.min(state.step + 1, TOTAL_STEPS) })),
      previousStep: () => set((state) => ({ step: Math.max(state.step - 1, 1) })),
      setMode: (mode) => set({ mode }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      hydrateDraft: (draft) => set((state) => ({ ...state, ...draft })),
      clearDraft: () => set({ ...initialDraft, loading: false, error: null }),
    }),
    {
      name: 'sirens-onboarding-draft',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        role: state.role,
        city: state.city,
        district: state.district,
        homeLocation: state.homeLocation,
        workLocation: state.workLocation,
        frequentAreas: state.frequentAreas,
        preferences: state.preferences,
        step: state.step,
        mode: state.mode,
      }),
    }
  )
);

export { TOTAL_STEPS };
