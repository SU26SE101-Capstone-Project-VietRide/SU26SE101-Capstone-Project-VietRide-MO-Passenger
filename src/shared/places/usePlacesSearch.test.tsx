jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type {
  PlacePrediction,
  PlacesProvider,
  ResolvedPlace,
} from './types';
import {
  usePlacesSearch,
  type UsePlacesSearchResult,
} from './usePlacesSearch';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

function Harness({
  provider,
  onValue,
}: {
  provider: PlacesProvider;
  onValue: (value: UsePlacesSearchResult) => void;
}): null {
  onValue(usePlacesSearch(provider));
  return null;
}

describe('usePlacesSearch', () => {
  it('aborts the prior autocomplete and rejects its late response as stale', async () => {
    const first = deferred<PlacePrediction[]>();
    const second = deferred<PlacePrediction[]>();
    const autocomplete = jest.fn<
      ReturnType<PlacesProvider['autocomplete']>,
      Parameters<PlacesProvider['autocomplete']>
    >()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const provider: PlacesProvider = {
      autocomplete,
      resolvePlace: jest.fn<
        ReturnType<PlacesProvider['resolvePlace']>,
        Parameters<PlacesProvider['resolvePlace']>
      >(),
    };
    let hook!: UsePlacesSearchResult;
    let renderer!: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Harness provider={provider} onValue={value => { hook = value; }} />,
      );
    });

    const firstRequest = hook.findPredictions({ query: 'Ben' });
    const firstSignal = autocomplete.mock.calls[0]![1]!.signal as AbortSignal;
    const secondRequest = hook.findPredictions({ query: 'Ben Thanh' });
    const secondSignal = autocomplete.mock.calls[1]![1]!.signal as AbortSignal;

    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal.aborted).toBe(false);

    const latestPrediction: PlacePrediction = {
      placeId: 'latest-place',
      primaryText: 'Bến Thành',
      secondaryText: 'Quận 1',
      fullText: 'Bến Thành, Quận 1',
    };
    first.resolve([]);
    second.resolve([latestPrediction]);

    await expect(firstRequest).rejects.toMatchObject({ code: 'ABORTED' });
    await expect(secondRequest).resolves.toEqual([latestPrediction]);
    await act(async () => renderer.unmount());
  });

  it('aborts pending autocomplete and detail work on cleanup', async () => {
    const autocompleteDeferred = deferred<PlacePrediction[]>();
    const detailDeferred = deferred<ResolvedPlace>();
    const autocomplete = jest.fn<
      ReturnType<PlacesProvider['autocomplete']>,
      Parameters<PlacesProvider['autocomplete']>
    >(() => autocompleteDeferred.promise);
    const resolvePlace = jest.fn<
      ReturnType<PlacesProvider['resolvePlace']>,
      Parameters<PlacesProvider['resolvePlace']>
    >(() => detailDeferred.promise);
    const provider: PlacesProvider = { autocomplete, resolvePlace };
    let hook!: UsePlacesSearchResult;
    let renderer!: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Harness provider={provider} onValue={value => { hook = value; }} />,
      );
    });

    const searchRequest = hook.findPredictions({ query: 'Bến Thành' });
    const detailRequest = hook.resolvePlaceDetails({ placeId: 'place-1' });
    const searchSignal = autocomplete.mock.calls[0]![1]!.signal as AbortSignal;
    const detailSignal = resolvePlace.mock.calls[0]![1]!.signal as AbortSignal;

    await act(async () => renderer.unmount());
    expect(searchSignal.aborted).toBe(true);
    expect(detailSignal.aborted).toBe(true);

    autocompleteDeferred.resolve([]);
    detailDeferred.resolve({
      provider: 'goong',
      placeId: 'place-1',
      displayName: 'Bến Thành',
      formattedAddress: 'Quận 1, Hồ Chí Minh',
      latitude: 10.772,
      longitude: 106.698,
    });
    await expect(searchRequest).rejects.toMatchObject({ code: 'ABORTED' });
    await expect(detailRequest).rejects.toMatchObject({ code: 'ABORTED' });
  });
});
