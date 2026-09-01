import React from 'react';
import { AppState } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import type { AvailableParcelTrip } from '../types';
import { useParcelQuoteLifecycle } from './useParcelQuoteLifecycle';

const trip = (overrides: Partial<AvailableParcelTrip> = {}): AvailableParcelTrip => ({
  tripId: '11111111-1111-4111-8111-111111111111',
  routeId: '22222222-2222-4222-8222-222222222222',
  status: 'SCHEDULED',
  operatorId: '33333333-3333-4333-8333-333333333333',
  operatorName: 'VietRide',
  originStation: {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Origin',
  },
  destinationStation: {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Destination',
  },
  departureDateTime: '2026-08-12T08:00:00+07:00',
  estimatedArrivalTime: '2026-08-12T12:00:00+07:00',
  quoteToken: 'opaque.signed-quote',
  quoteExpiresAt: '2026-08-12T07:10:00+07:00',
  estimatedSizeCategory: 'MEDIUM',
  estimatedGrossPriceVnd: 160_000,
  estimatedDiscountVnd: 0,
  estimatedPriceVnd: 160_000,
  estimatedDepositVnd: 32_000,
  depositPercent: 20,
  dropoffPoints: [{
    type: 'STATION',
    stationId: '55555555-5555-4555-8555-555555555555',
    stopId: null,
    name: 'Destination',
    orderIndex: 2,
    estimatedArrivalTime: '2026-08-12T12:00:00+07:00',
  }],
  ...overrides,
});

const fingerprint = JSON.stringify([
  'MEDIUM',
  160_000,
  0,
  160_000,
  20,
  32_000,
]);

function LifecycleHost(props: {
  enabled: boolean;
  selectedTrip: AvailableParcelTrip | null;
  selectedFingerprint: string | null;
  isSearchSuccess: boolean;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
  clearQuoteDependentSelection: () => void;
  onPriceChanged?: () => void;
}): null {
  useParcelQuoteLifecycle(props);
  return null;
}

describe('useParcelQuoteLifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse('2026-08-12T07:00:00+07:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('refetches once when the quote enters the 30-second safety window', () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    const clearQuoteDependentSelection = jest.fn();

    act(() => {
      renderer.create(
        <LifecycleHost
          enabled
          selectedTrip={trip({
            quoteExpiresAt: '2026-08-12T07:00:45+07:00',
          })}
          selectedFingerprint={fingerprint}
          isSearchSuccess
          isFetching={false}
          refetch={refetch}
          clearQuoteDependentSelection={clearQuoteDependentSelection}
        />,
      );
    });

    expect(refetch).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(15_000);
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('cleans up the refresh timer when disabled', () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    let root: renderer.ReactTestRenderer;

    act(() => {
      root = renderer.create(
        <LifecycleHost
          enabled
          selectedTrip={trip({
            quoteExpiresAt: '2026-08-12T07:00:45+07:00',
          })}
          selectedFingerprint={fingerprint}
          isSearchSuccess
          isFetching={false}
          refetch={refetch}
          clearQuoteDependentSelection={jest.fn()}
        />,
      );
    });

    act(() => {
      root.update(
        <LifecycleHost
          enabled={false}
          selectedTrip={trip({
            quoteExpiresAt: '2026-08-12T07:00:45+07:00',
          })}
          selectedFingerprint={fingerprint}
          isSearchSuccess
          isFetching={false}
          refetch={refetch}
          clearQuoteDependentSelection={jest.fn()}
        />,
      );
    });

    act(() => {
      jest.advanceTimersByTime(20_000);
    });
    expect(refetch).not.toHaveBeenCalled();
  });

  it('refetches on app foreground only while enabled', () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    const listeners: Array<(state: string) => void> = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
    });

    act(() => {
      renderer.create(
        <LifecycleHost
          enabled
          selectedTrip={trip()}
          selectedFingerprint={fingerprint}
          isSearchSuccess
          isFetching={false}
          refetch={refetch}
          clearQuoteDependentSelection={jest.fn()}
        />,
      );
    });

    act(() => {
      listeners.forEach(listener => listener('active'));
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps selection when only token and expiry change', () => {
    const clearQuoteDependentSelection = jest.fn();
    const onPriceChanged = jest.fn();
    let root: renderer.ReactTestRenderer;

    act(() => {
      root = renderer.create(
        <LifecycleHost
          enabled
          selectedTrip={trip()}
          selectedFingerprint={fingerprint}
          isSearchSuccess
          isFetching={false}
          refetch={jest.fn().mockResolvedValue(undefined)}
          clearQuoteDependentSelection={clearQuoteDependentSelection}
          onPriceChanged={onPriceChanged}
        />,
      );
    });

    act(() => {
      root.update(
        <LifecycleHost
          enabled
          selectedTrip={trip({
            quoteToken: 'different-token',
            quoteExpiresAt: '2026-08-12T07:20:00+07:00',
          })}
          selectedFingerprint={fingerprint}
          isSearchSuccess
          isFetching={false}
          refetch={jest.fn().mockResolvedValue(undefined)}
          clearQuoteDependentSelection={clearQuoteDependentSelection}
          onPriceChanged={onPriceChanged}
        />,
      );
    });

    expect(clearQuoteDependentSelection).not.toHaveBeenCalled();
    expect(onPriceChanged).not.toHaveBeenCalled();
  });

  it('clears quote-dependent selection when the semantic fingerprint changes', () => {
    const clearQuoteDependentSelection = jest.fn();
    const onPriceChanged = jest.fn();
    let root: renderer.ReactTestRenderer;

    act(() => {
      root = renderer.create(
        <LifecycleHost
          enabled
          selectedTrip={trip()}
          selectedFingerprint={fingerprint}
          isSearchSuccess
          isFetching={false}
          refetch={jest.fn().mockResolvedValue(undefined)}
          clearQuoteDependentSelection={clearQuoteDependentSelection}
          onPriceChanged={onPriceChanged}
        />,
      );
    });

    act(() => {
      root.update(
        <LifecycleHost
          enabled
          selectedTrip={trip({ estimatedGrossPriceVnd: 170_000 })}
          selectedFingerprint={fingerprint}
          isSearchSuccess
          isFetching={false}
          refetch={jest.fn().mockResolvedValue(undefined)}
          clearQuoteDependentSelection={clearQuoteDependentSelection}
          onPriceChanged={onPriceChanged}
        />,
      );
    });

    expect(clearQuoteDependentSelection).toHaveBeenCalledTimes(1);
    expect(onPriceChanged).toHaveBeenCalledTimes(1);
  });
});
