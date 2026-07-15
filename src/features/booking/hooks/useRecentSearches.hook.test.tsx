import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  serializeRecentSearches,
  upsertRecentSearch,
  useRecentSearches,
  type RecentSearchInput,
} from './useRecentSearches';

const firstSearch: RecentSearchInput = {
  fromCode: 'HCM',
  fromName: 'Ho Chi Minh City',
  toCode: 'DL',
  toName: 'Da Lat',
  date: '20/07/2026',
  passengers: 1,
};

const secondSearch: RecentSearchInput = {
  fromCode: 'HN',
  fromName: 'Ha Noi',
  toCode: 'DN',
  toName: 'Da Nang',
  date: '21/07/2026',
  passengers: 2,
};

describe('useRecentSearches concurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges a save made while the initial storage read is pending', async () => {
    let resolveLoad: ((value: string | null) => void) | undefined;
    jest.mocked(AsyncStorage.getItem).mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );

    let latest: ReturnType<typeof useRecentSearches> | undefined;
    function Harness(): null {
      latest = useRecentSearches('user-a');
      return null;
    }

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
    });

    let savePromise: Promise<void> | undefined;
    await act(async () => {
      savePromise = latest!.saveSearch(secondSearch);
      await Promise.resolve();
    });

    const storedFirst = upsertRecentSearch([], firstSearch, 10);
    await act(async () => {
      resolveLoad?.(serializeRecentSearches(storedFirst));
      await savePromise;
    });

    expect(latest!.items).toHaveLength(2);
    expect(latest!.items.map((item) => item.fromCode)).toEqual(['HN', 'HCM']);
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
      'vietride:recent-searches:v1:user-a',
      serializeRecentSearches(latest!.items),
    );

    await act(async () => renderer!.unmount());
  });
});
