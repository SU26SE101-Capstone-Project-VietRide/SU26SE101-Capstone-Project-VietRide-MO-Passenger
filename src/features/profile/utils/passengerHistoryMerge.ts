import type {
  PassengerHistoryItem,
  PassengerHistoryPage,
} from '../types';

export const comparePassengerHistoryNewestFirst = (
  left: PassengerHistoryItem,
  right: PassengerHistoryItem,
): number => {
  const leftMs = Date.parse(left.createdAt);
  const rightMs = Date.parse(right.createdAt);
  const leftTime = Number.isFinite(leftMs) ? leftMs : 0;
  const rightTime = Number.isFinite(rightMs) ? rightMs : 0;
  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return right.id.localeCompare(left.id);
};

export const flattenPassengerHistoryPages = (
  pages: readonly PassengerHistoryPage<PassengerHistoryItem>[] | undefined,
): PassengerHistoryItem[] => {
  if (!pages?.length) {
    return [];
  }

  const seen = new Set<string>();
  const items: PassengerHistoryItem[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) {
        continue;
      }
      seen.add(item.id);
      items.push(item);
    }
  }

  return items.sort(comparePassengerHistoryNewestFirst);
};
