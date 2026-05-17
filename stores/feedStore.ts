import { create } from 'zustand';
import { fetchPersonalizedFeed } from '@/services/feedService';
import type { FeedReport } from '@/types/tabs';

type FeedStore = {
  reports: FeedReport[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  nextCursor: string | null;
  lastLoadedAt: number | null;
  hasLoaded: boolean;
  loadInitial: (force?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
};

const CACHE_MS = 45_000;

export const useFeedStore = create<FeedStore>((set, get) => ({
  reports: [],
  loading: false,
  refreshing: false,
  loadingMore: false,
  error: null,
  nextCursor: null,
  lastLoadedAt: null,
  hasLoaded: false,
  loadInitial: async (force = false) => {
    const state = get();
    if (state.loading) return;
    if (!force && state.hasLoaded && state.lastLoadedAt && Date.now() - state.lastLoadedAt < CACHE_MS) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const page = await fetchPersonalizedFeed();
      set({
        reports: page.reports,
        nextCursor: page.nextCursor,
        lastLoadedAt: Date.now(),
        hasLoaded: true,
      });
    } catch (error: any) {
      set({ error: error.message || 'Could not load feed.' });
    } finally {
      set({ loading: false });
    }
  },
  refresh: async () => {
    set({ refreshing: true, error: null });
    try {
      const page = await fetchPersonalizedFeed();
      set({
        reports: page.reports,
        nextCursor: page.nextCursor,
        lastLoadedAt: Date.now(),
        hasLoaded: true,
      });
    } catch (error: any) {
      set({ error: error.message || 'Could not refresh feed.' });
    } finally {
      set({ refreshing: false });
    }
  },
  loadMore: async () => {
    const { nextCursor, loadingMore } = get();
    if (!nextCursor || loadingMore) return;
    set({ loadingMore: true, error: null });
    try {
      const page = await fetchPersonalizedFeed({ cursor: nextCursor });
      set((state) => {
        const existing = new Set(state.reports.map((report) => report.reportId));
        const incoming = page.reports.filter((report) => !existing.has(report.reportId));
        return {
          reports: [...state.reports, ...incoming],
          nextCursor: page.nextCursor,
          lastLoadedAt: Date.now(),
        };
      });
    } catch (error: any) {
      set({ error: error.message || 'Could not load more reports.' });
    } finally {
      set({ loadingMore: false });
    }
  },
}));
