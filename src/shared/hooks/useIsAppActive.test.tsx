import React from 'react';
import {
  AppState,
  type AppStateStatus,
  type NativeEventSubscription,
} from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { useIsAppActive } from './useIsAppActive';

describe('useIsAppActive', () => {
  it('tracks native background and foreground events and removes its listener', async () => {
    const originalCurrentState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => 'background',
    });

    let listener: ((state: AppStateStatus) => void) | undefined;
    const remove = jest.fn();
    const subscription = { remove } as NativeEventSubscription;
    const addEventListener = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, nextListener) => {
        listener = nextListener;
        return subscription;
      });
    let latest: boolean | undefined;

    function Harness(): null {
      latest = useIsAppActive();
      return null;
    }

    let renderer: ReactTestRenderer.ReactTestRenderer;
    try {
      await act(async () => {
        renderer = ReactTestRenderer.create(<Harness />);
      });
      expect(latest).toBe(false);

      await act(async () => listener?.('active'));
      expect(latest).toBe(true);

      await act(async () => listener?.('background'));
      expect(latest).toBe(false);

      await act(async () => renderer!.unmount());
      expect(remove).toHaveBeenCalledTimes(1);
    } finally {
      addEventListener.mockRestore();
      if (originalCurrentState) {
        Object.defineProperty(AppState, 'currentState', originalCurrentState);
      }
    }
  });
});
