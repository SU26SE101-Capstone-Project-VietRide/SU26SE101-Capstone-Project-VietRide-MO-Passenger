import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { registerSessionCleanup } from '@shared/session/cleanup';
import { getLocalSessionScope } from '@shared/session/scope';
import { addApiCalendarDays, toVietnamBusinessDate } from '@shared/utils/apiTime';
import type { ParcelCreateStep } from '../utils/parcelCreateFlow';

interface ParcelDraftStore {
  ownerUserId: string | null;
  lastStep: ParcelCreateStep;
  highestStepReached: ParcelCreateStep;
  departureOffset: number;
  departureDate: string | null;
  savedAt: number | null;
  hasHydrated: boolean;
  setProgress: (
    step: ParcelCreateStep,
    highestStepReached: ParcelCreateStep,
    departureOffset: number,
  ) => void;
  clearDraft: () => void;
}

const isoDayNumber = (value: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 86_400_000) : null;
};

export const resolveParcelDraftDepartureOffset = ({
  departureDate,
  departureOffset,
  savedAt,
  now = new Date(),
}: {
  departureDate: string | null;
  departureOffset: number;
  savedAt: number | null;
  now?: Date;
}): number => {
  const today = toVietnamBusinessDate(now);
  let intendedDate = departureDate;

  // Backward-compatible recovery for v1 drafts that only stored +N days.
  if (!intendedDate && savedAt) {
    const savedDate = new Date(savedAt);
    if (Number.isFinite(savedDate.getTime())) {
      intendedDate = addApiCalendarDays(
        toVietnamBusinessDate(savedDate),
        Math.max(0, Math.floor(departureOffset)),
      );
    }
  }

  if (!intendedDate) return Math.max(0, Math.floor(departureOffset));
  const intendedDay = isoDayNumber(intendedDate);
  const todayDay = isoDayNumber(today);
  if (intendedDay === null || todayDay === null) return 0;

  // A planned day that has already passed cannot be restored literally. Resume
  // at today's delivery options so fresh server availability is shown.
  return Math.max(0, intendedDay - todayDay);
};

export const useParcelDraftStore = create<ParcelDraftStore>()(
  persist(
    set => ({
      ownerUserId: null,
      lastStep: 1,
      highestStepReached: 1,
      departureOffset: 0,
      departureDate: null,
      savedAt: null,
      hasHydrated: false,
      setProgress: (lastStep, highestStepReached, departureOffset) => {
        const normalizedOffset = Math.max(0, Math.floor(departureOffset));
        const now = new Date();
        set({
          ownerUserId: getLocalSessionScope().userId,
          lastStep,
          highestStepReached,
          departureOffset: normalizedOffset,
          // Persist the intended calendar date as ground truth. Keeping only a
          // relative +N-day offset would silently shift the user's intent when
          // the draft is resumed on a later day.
          departureDate: addApiCalendarDays(
            toVietnamBusinessDate(now),
            normalizedOffset,
          ),
          savedAt: now.getTime(),
        });
      },
      clearDraft: () => set({
        ownerUserId: null,
        lastStep: 1,
        highestStepReached: 1,
        departureOffset: 0,
        departureDate: null,
        savedAt: null,
      }),
    }),
    {
      name: 'vietride-parcel-draft-progress-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        ownerUserId: state.ownerUserId,
        lastStep: state.lastStep,
        highestStepReached: state.highestStepReached,
        departureOffset: state.departureOffset,
        departureDate: state.departureDate,
        savedAt: state.savedAt,
      }),
      onRehydrateStorage: () => () => {
        useParcelDraftStore.setState({ hasHydrated: true });
      },
    },
  ),
);

registerSessionCleanup('parcel-draft-progress', () => {
  useParcelDraftStore.getState().clearDraft();
});
