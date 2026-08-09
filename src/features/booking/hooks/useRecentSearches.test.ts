import {
  MAX_RECENT_SEARCHES,
  parseRecentSearches,
  recentSearchStorageKey,
  serializeRecentSearches,
  upsertRecentSearch,
  type RecentSearch,
  type RecentSearchInput,
} from './useRecentSearches';

const search = (index: number): RecentSearchInput => ({
  fromCode: `from-${index}`,
  fromName: `From ${index}`,
  toCode: `to-${index}`,
  toName: `To ${index}`,
  date: `2026-07-${String(index + 1).padStart(2, '0')}`,
  passengers: 1,
});

describe('recent search persistence', () => {
  it('uses isolated user and guest namespaces', () => {
    expect(recentSearchStorageKey()).toBe('vietride:recent-searches:v1:guest');
    expect(recentSearchStorageKey('user-a')).toBe('vietride:recent-searches:v1:user-a');
  });

  it('deduplicates by route and date while moving the latest search first', () => {
    const first = upsertRecentSearch([], search(1), 10);
    const second = upsertRecentSearch(first, search(2), 20);
    const repeated = upsertRecentSearch(second, search(1), 30);

    expect(repeated).toHaveLength(2);
    expect(repeated[0]).toMatchObject({
      fromCode: 'from-1',
      savedAt: 30,
    });
  });

  it('caps the list and round-trips the versioned envelope', () => {
    const items = Array.from({ length: MAX_RECENT_SEARCHES + 3 }).reduce<RecentSearch[]>(
      (current, _, index) => upsertRecentSearch(current, search(index), index),
      [],
    );

    expect(items).toHaveLength(MAX_RECENT_SEARCHES);
    expect(parseRecentSearches(serializeRecentSearches(items))).toEqual(items);
  });

  it('keeps a route whose endpoints share one location code', () => {
    const items = upsertRecentSearch([], {
      ...search(1),
      fromCode: 'HCM',
      toCode: 'HCM',
    }, 10);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ fromCode: 'HCM', toCode: 'HCM' });
  });

  it('migrates a legacy array and ignores malformed entries', () => {
    const legacy = JSON.stringify([
      { ...search(1), savedAt: 5 },
      { fromCode: '', toCode: 'invalid' },
    ]);

    expect(parseRecentSearches(legacy)).toHaveLength(1);
  });

  it('rejects an unsupported schema so callers can clear corrupt storage', () => {
    expect(() => parseRecentSearches('{"unexpected":true}')).toThrow(
      'unsupported schema',
    );
  });

  it('rejects an envelope from a different schema version', () => {
    expect(() => parseRecentSearches(JSON.stringify({
      version: 2,
      items: [{ ...search(1), savedAt: 5 }],
    }))).toThrow('unsupported schema');
  });

  it('does not restore passenger counts outside the backend booking limit', () => {
    const restored = parseRecentSearches(JSON.stringify([{
      ...search(1),
      passengers: 9,
      savedAt: 5,
    }]));

    expect(restored[0]?.passengers).toBe(1);
  });
});
