import type { CreateParcelPayload } from '../types';

export interface CreateParcelDraft
  extends Omit<CreateParcelPayload, 'photoUrl'> {
  /** Only a Firebase download URL returned by the shared upload service belongs here. */
  photoUrl?: string | null;
  /** @deprecated Local previews are never serialized across the API boundary. */
  localPhotoUris?: readonly string[];
}

/**
 * Converts the local parcel draft into the exact backend payload. Device URIs
 * remain UI-only; the optional photo URL must come from the authenticated,
 * passenger-owned Firebase upload flow.
 */
export const buildCreateParcelPayload = (
  draft: CreateParcelDraft,
): CreateParcelPayload => ({
  tripId: draft.tripId,
  quoteToken: draft.quoteToken,
  dropoffStopId: draft.dropoffStopId,
  bookingId: draft.bookingId,
  itemName: draft.itemName,
  description: draft.description,
  sizeCategory: draft.sizeCategory,
  lengthCm: draft.lengthCm,
  widthCm: draft.widthCm,
  heightCm: draft.heightCm,
  estimatedWeightKg: draft.estimatedWeightKg,
  photoUrl: draft.photoUrl?.trim() || null,
  recipient: draft.recipient,
  deliveryMethod: draft.deliveryMethod,
  paymentMethod: draft.paymentMethod,
  voucherCode: draft.voucherCode,
});
