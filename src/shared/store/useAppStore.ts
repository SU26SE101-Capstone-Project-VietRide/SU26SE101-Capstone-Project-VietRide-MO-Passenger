/**
 * App Store — Global application state (non-feature-specific)
 *
 * Manages connectivity status, locale, global loading, etc.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Locale = 'en' | 'vi';
export type HomeService = 'ticket' | 'parcel';
export type PushNotificationStatus =
  | 'idle'
  | 'syncing'
  | 'active'
  | 'permission_denied'
  | 'configuration_required'
  | 'error';

const DEFAULT_LOCALE: Locale = 'vi';

const isLocale = (value: unknown): value is Locale =>
  value === 'en' || value === 'vi';

const persistedBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

interface AppState {
  /** Whether the device has internet connectivity */
  isOnline: boolean;

  /** Current app locale */
  locale: Locale;

  /** Service tab the passenger used most recently on Home. */
  lastHomeService: HomeService;

  /** Global loading overlay (e.g., during app initialization) */
  isGlobalLoading: boolean;

  /** Whether persisted app preferences have been restored */
  hasHydrated: boolean;

  /** User intent for account-scoped remote notifications. */
  pushNotificationsEnabled: boolean;

  /** A generic local reminder scheduled for 19:00 device time. */
  dailyReminderEnabled: boolean;

  /** Ephemeral status of the native push registration pipeline. */
  pushNotificationStatus: PushNotificationStatus;

  // ─── Actions ────────────────────────────────────────────
  setOnline: (status: boolean) => void;
  setLocale: (locale: Locale) => void;
  setLastHomeService: (service: HomeService) => void;
  setGlobalLoading: (loading: boolean) => void;
  setPushNotificationsEnabled: (enabled: boolean) => void;
  setDailyReminderEnabled: (enabled: boolean) => void;
  setPushNotificationStatus: (status: PushNotificationStatus) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    set => ({
      isOnline: true,
      locale: DEFAULT_LOCALE,
      lastHomeService: 'ticket',
      isGlobalLoading: false,
      hasHydrated: false,
      pushNotificationsEnabled: true,
      dailyReminderEnabled: false,
      pushNotificationStatus: 'idle',

      setOnline: status => set({ isOnline: status }),
      setLocale: locale => set({ locale }),
      setLastHomeService: lastHomeService => set({ lastHomeService }),
      setGlobalLoading: loading => set({ isGlobalLoading: loading }),
      setPushNotificationsEnabled: enabled => set({ pushNotificationsEnabled: enabled }),
      setDailyReminderEnabled: enabled => set({ dailyReminderEnabled: enabled }),
      setPushNotificationStatus: status => set({ pushNotificationStatus: status }),
    }),
    {
      name: 'vietride-app-preferences',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        locale: state.locale,
        lastHomeService: state.lastHomeService,
        pushNotificationsEnabled: state.pushNotificationsEnabled,
        dailyReminderEnabled: state.dailyReminderEnabled,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState> | undefined;
        const persistedLocale = persisted?.locale;

        return {
          ...currentState,
          locale: isLocale(persistedLocale)
            ? persistedLocale
            : DEFAULT_LOCALE,
          lastHomeService:
            persisted?.lastHomeService === 'parcel' ? 'parcel' : 'ticket',
          pushNotificationsEnabled: persistedBoolean(
            persisted?.pushNotificationsEnabled,
            true,
          ),
          dailyReminderEnabled: persistedBoolean(
            persisted?.dailyReminderEnabled,
            false,
          ),
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('[Preferences] Could not restore app preferences.');
        }
        useAppStore.setState({ hasHydrated: true });
      },
    },
  ),
);
