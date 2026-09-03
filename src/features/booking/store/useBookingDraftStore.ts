import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { registerSessionCleanup } from '@shared/session/cleanup';
import { getLocalSessionScope } from '@shared/session/scope';
import { resolveHomeTicketSearchContinuation } from '../utils/homeTicketSearchContinuation';
import { useBookingStore } from './useBookingStore';

type BookingState = ReturnType<typeof useBookingStore.getState>;
type DraftLeg = BookingState['outboundState'];

export interface BookingDraftSnapshot {
  searchParams: BookingState['searchParams'];
  currentLeg: BookingState['currentLeg'];
  outboundState: BookingState['outboundState'];
  returnState: BookingState['returnState'];
  highestStepReached: number;
  selectedTrip: BookingState['selectedTrip'];
  selectedSeats: BookingState['selectedSeats'];
  selectedPickUp: BookingState['selectedPickUp'];
  selectedDropOff: BookingState['selectedDropOff'];
  paymentMethod: BookingState['paymentMethod'];
  voucherCode: string;
  voucherDiscountPreview: number;
}

interface BookingDraftStore {
  ownerUserId: string | null;
  snapshot: BookingDraftSnapshot | null;
  lastStep: number;
  savedAt: number | null;
  hasHydrated: boolean;
  flowActive: boolean;
  setFlowActive: (active: boolean) => void;
  setLastStep: (step: number) => void;
  saveSnapshot: (snapshot: BookingDraftSnapshot | null) => void;
  clearDraft: () => void;
}

const sanitizeLeg = (leg: DraftLeg): DraftLeg => {
  if (!leg) return null;
  // Shuttle drafts contain precise coordinates. Keep them memory-only even
  // when the rest of the unfinished booking is persisted locally.
  return {
    ...leg,
    shuttlePickup: null,
    shuttleDropoff: null,
  };
};

const hasRouteIntent = (state: Pick<BookingState, 'searchParams'>): boolean => Boolean(
  state.searchParams.from.trim()
  && state.searchParams.to.trim()
  && state.searchParams.originLocationCode.trim()
  && state.searchParams.destinationLocationCode.trim(),
);

const captureSnapshot = (state: BookingState): BookingDraftSnapshot | null => {
  if (!hasRouteIntent(state) || state.bookingStatus === 'success') return null;

  return {
    searchParams: state.searchParams,
    currentLeg: state.currentLeg,
    outboundState: sanitizeLeg(state.outboundState),
    returnState: sanitizeLeg(state.returnState),
    highestStepReached: state.highestStepReached,
    selectedTrip: state.selectedTrip,
    selectedSeats: state.selectedSeats,
    selectedPickUp: state.selectedPickUp,
    selectedDropOff: state.selectedDropOff,
    paymentMethod: state.paymentMethod,
    voucherCode: state.voucherCode,
    voucherDiscountPreview: state.voucherDiscountPreview,
  };
};

export const useBookingDraftStore = create<BookingDraftStore>()(
  persist(
    set => ({
      ownerUserId: null,
      snapshot: null,
      lastStep: 1,
      savedAt: null,
      hasHydrated: false,
      flowActive: false,
      setFlowActive: active => set({ flowActive: active }),
      setLastStep: step => set({ lastStep: Math.max(1, Math.floor(step)) }),
      saveSnapshot: snapshot => set({
        ownerUserId: snapshot ? getLocalSessionScope().userId : null,
        snapshot,
        savedAt: snapshot ? Date.now() : null,
        ...(snapshot ? {} : { lastStep: 1 }),
      }),
      clearDraft: () => set({ ownerUserId: null, snapshot: null, lastStep: 1, savedAt: null }),
    }),
    {
      name: 'vietride-booking-draft-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        ownerUserId: state.ownerUserId,
        snapshot: state.snapshot,
        lastStep: state.lastStep,
        savedAt: state.savedAt,
      }),
      onRehydrateStorage: () => () => {
        useBookingDraftStore.setState({ hasHydrated: true, flowActive: false });
      },
    },
  ),
);

let lastSerializedSnapshot = '';
let pendingSnapshot: BookingDraftSnapshot | null | undefined;
let pendingSnapshotTimer: ReturnType<typeof setTimeout> | null = null;

const flushPendingBookingDraft = (): void => {
  if (pendingSnapshotTimer) {
    clearTimeout(pendingSnapshotTimer);
    pendingSnapshotTimer = null;
  }
  if (pendingSnapshot === undefined) return;

  const snapshot = pendingSnapshot;
  pendingSnapshot = undefined;
  useBookingDraftStore.getState().saveSnapshot(snapshot);
};

const syncDraftFromBookingState = (state: BookingState): void => {
  if (!useBookingDraftStore.getState().flowActive) return;

  const snapshot = captureSnapshot(state);
  const serialized = JSON.stringify(snapshot);
  if (serialized === lastSerializedSnapshot) return;

  lastSerializedSnapshot = serialized;
  pendingSnapshot = snapshot;
  if (pendingSnapshotTimer) clearTimeout(pendingSnapshotTimer);
  pendingSnapshotTimer = setTimeout(flushPendingBookingDraft, 220);
};

useBookingStore.subscribe(syncDraftFromBookingState);

export const beginBookingDraftSession = (syncNow = true): void => {
  const draft = useBookingDraftStore.getState();
  draft.setFlowActive(true);
  if (syncNow) syncDraftFromBookingState(useBookingStore.getState());
};

export const endBookingDraftSession = (): void => {
  // Flush the latest user intent before the screen can unmount/background.
  flushPendingBookingDraft();
  useBookingDraftStore.getState().setFlowActive(false);
};

export const updateBookingDraftStep = (step: number): void => {
  const draft = useBookingDraftStore.getState();
  draft.setLastStep(step);
  if (draft.flowActive) syncDraftFromBookingState(useBookingStore.getState());
};

export const isBookingDraftRestorable = ({
  ownerUserId,
  snapshot,
  lastStep,
  now = new Date(),
}: {
  ownerUserId: string | null;
  snapshot: BookingDraftSnapshot | null;
  lastStep: number;
  now?: Date;
}): boolean => {
  const currentUserId = getLocalSessionScope().userId;
  if (!currentUserId || ownerUserId !== currentUserId) return false;
  if (!snapshot || lastStep < 1) return false;
  const { searchParams } = snapshot;
  if (!hasRouteIntent({ searchParams })) return false;

  return resolveHomeTicketSearchContinuation({
    departureDate: searchParams.date,
    returnDate: searchParams.returnDate,
    isRoundTrip: Boolean(searchParams.isRoundTrip),
    now,
  }) === 'search';
};

export const hasRestorableBookingDraft = (): boolean => {
  const draft = useBookingDraftStore.getState();
  return isBookingDraftRestorable({
    ownerUserId: draft.ownerUserId,
    snapshot: draft.snapshot,
    lastStep: draft.lastStep,
  });
};

export const restoreBookingDraft = (): number | null => {
  const draft = useBookingDraftStore.getState();
  const snapshot = draft.snapshot;
  if (!isBookingDraftRestorable({
    ownerUserId: draft.ownerUserId,
    snapshot,
    lastStep: draft.lastStep,
  })) {
    clearBookingDraft();
    return null;
  }
  if (!snapshot) return null;

  useBookingStore.setState({
    ...snapshot,
    // Network-backed state is deliberately rebuilt on resume. This keeps the
    // local draft as user intent instead of pretending cached availability is
    // still authoritative.
    trips: [],
    tripResultsStatus: 'loading',
    lastTripSearchFingerprint: null,
    seatMap: [],
    seatMapAisles: [],
    seatMapStatus: 'idle',
    seatMapError: null,
    tripDetailStatus: 'idle',
    tripDetailError: null,
    pickUpPoints: [],
    dropOffPoints: [],
    selectedShuttlePickup: null,
    selectedShuttleDropoff: null,
    bookingStatus: 'idle',
    bookingResult: null,
    bookingPaymentMethod: null,
    bookingError: null,
    seatConflictLegs: [],
  });

  const totalSteps = useBookingStore.getState().totalSteps();
  return Math.min(Math.max(1, draft.lastStep), totalSteps);
};

export const clearBookingDraft = (): void => {
  if (pendingSnapshotTimer) {
    clearTimeout(pendingSnapshotTimer);
    pendingSnapshotTimer = null;
  }
  pendingSnapshot = undefined;
  lastSerializedSnapshot = '';
  useBookingDraftStore.getState().clearDraft();
};

registerSessionCleanup('booking-draft', () => {
  clearBookingDraft();
});
