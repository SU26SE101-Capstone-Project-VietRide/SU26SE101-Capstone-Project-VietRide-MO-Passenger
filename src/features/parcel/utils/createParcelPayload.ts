import type { CreateParcelPayload } from '../types';

export interface CreateParcelDraft extends Omit<CreateParcelPayload, 'photoUrl'> {
  /** Local preview URIs are deliberately accepted only so this boundary can discard them. */
  localPhotoUris: readonly string[];
}

/**
 * Converts the local parcel draft into the exact backend payload. The current
 * backend has no authenticated upload contract, so device URIs never cross the
 * network boundary and photoUrl remains explicitly null.
 */
export const buildCreateParcelPayload = (
  draft: CreateParcelDraft,
): CreateParcelPayload => ({
  tripId: draft.tripId,
  dropoffStopId: draft.dropoffStopId,
  bookingId: draft.bookingId,
  itemName: draft.itemName,
  description: draft.description,
  sizeCategory: draft.sizeCategory,
  lengthCm: draft.lengthCm,
  widthCm: draft.widthCm,
  heightCm: draft.heightCm,
  estimatedWeightKg: draft.estimatedWeightKg,
  photoUrl: null,
  recipient: draft.recipient,
  deliveryMethod: draft.deliveryMethod,
  paymentMethod: draft.paymentMethod,
  voucherCode: draft.voucherCode,
});
