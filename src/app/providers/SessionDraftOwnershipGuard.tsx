import { useEffect } from 'react';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import {
  clearBookingDraft,
  useBookingDraftStore,
} from '@features/booking/store/useBookingDraftStore';
import { useParcelDraftStore } from '@features/parcel/store/useParcelDraftStore';
import { useParcelStore } from '@features/parcel/store/useParcelStore';
import { useSavedRecipientsStore } from '@features/parcel/store/useSavedRecipientsStore';

/**
 * Prevents locally persisted unfinished flows from crossing account boundaries.
 *
 * Drafts are convenience state, not server truth. A logout normally clears
 * them synchronously in memory, but an OS kill can interrupt a queued disk
 * write. Ownership metadata lets the next authenticated session reject that
 * stale state before it can be resumed or shown on Home.
 */
export function SessionDraftOwnershipGuard(): null {
  const userId = useAuthStore(state => state.user?.id ?? null);

  const bookingHydrated = useBookingDraftStore(state => state.hasHydrated);
  const bookingOwnerUserId = useBookingDraftStore(state => state.ownerUserId);
  const bookingSavedAt = useBookingDraftStore(state => state.savedAt);

  const parcelHydrated = useParcelStore(state => state.hasHydrated);
  const parcelOwnerUserId = useParcelStore(state => state.ownerUserId);
  const parcelFromCity = useParcelStore(state => state.fromCity);
  const parcelToCity = useParcelStore(state => state.toCity);
  const parcelFromLocationCode = useParcelStore(state => state.fromLocationCode);
  const parcelToLocationCode = useParcelStore(state => state.toLocationCode);
  const resetParcel = useParcelStore(state => state.resetParcel);

  const parcelProgressHydrated = useParcelDraftStore(state => state.hasHydrated);
  const parcelProgressOwnerUserId = useParcelDraftStore(state => state.ownerUserId);
  const parcelProgressSavedAt = useParcelDraftStore(state => state.savedAt);
  const clearParcelProgress = useParcelDraftStore(state => state.clearDraft);
  const recipientsHydrationStatus = useSavedRecipientsStore(
    state => state.hydrationStatus,
  );
  const loadRecipients = useSavedRecipientsStore(state => state.loadRecipients);

  useEffect(() => {
    if (!userId || recipientsHydrationStatus !== 'idle') return;
    loadRecipients().catch(() => {
      // The store exposes an explicit error state for retry UI.
    });
  }, [loadRecipients, recipientsHydrationStatus, userId]);

  useEffect(() => {
    if (!userId || !bookingHydrated || !bookingSavedAt) return;
    if (bookingOwnerUserId !== userId) clearBookingDraft();
  }, [bookingHydrated, bookingOwnerUserId, bookingSavedAt, userId]);

  useEffect(() => {
    if (!userId || !parcelHydrated) return;

    const hasLegacyRouteIntent = Boolean(
      parcelFromCity.trim()
      || parcelToCity.trim()
      || parcelFromLocationCode.trim()
      || parcelToLocationCode.trim(),
    );
    const belongsToAnotherUser = Boolean(
      parcelOwnerUserId && parcelOwnerUserId !== userId,
    );
    const hasUnownedLegacyIntent = parcelOwnerUserId == null && hasLegacyRouteIntent;

    if (belongsToAnotherUser || hasUnownedLegacyIntent) {
      resetParcel();
    }
  }, [
    parcelFromCity,
    parcelFromLocationCode,
    parcelHydrated,
    parcelOwnerUserId,
    parcelToCity,
    parcelToLocationCode,
    resetParcel,
    userId,
  ]);

  useEffect(() => {
    if (!userId || !parcelProgressHydrated || !parcelProgressSavedAt) return;
    if (parcelProgressOwnerUserId !== userId) clearParcelProgress();
  }, [
    clearParcelProgress,
    parcelProgressHydrated,
    parcelProgressOwnerUserId,
    parcelProgressSavedAt,
    userId,
  ]);

  return null;
}
