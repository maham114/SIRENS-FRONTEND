import { getPersonalizedFeedFn } from '@/lib/firebase';
import type { FeedReport } from '@/types/tabs';

export type FeedPage = {
  reports: FeedReport[];
  nextCursor: string | null;
};

export async function fetchPersonalizedFeed(options: {
  cursor?: string | null;
  limit?: number;
} = {}): Promise<FeedPage> {
  const getFeed = getPersonalizedFeedFn();
  const result = await getFeed({
    cursor: options.cursor ?? null,
    limit: options.limit ?? 10,
  });
  const data = result.data as Partial<FeedPage> & { reports?: FeedReport[] };

  return {
    reports: data.reports ?? [],
    nextCursor: data.nextCursor ?? null,
  };
}
