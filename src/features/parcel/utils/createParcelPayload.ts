import type { CreateParcelPayload } from '../types';
import { isValidEmail } from '@features/auth/validation/authValidation';

export interface CreateParcelDraft
  extends Omit<CreateParcelPayload, 'photoUrl'> {
  /** Only a Firebase download URL returned by the shared upload service belongs here. */
  photoUrl?: string | null;
  /** @deprecated Local previews are never serialized across the API boundary. */
  localPhotoUris?: readonly string[];
}

interface ValidatedCreateFields {
  itemName: string;
  recipientEmail: string;
}

const validateCreateContract = (
  draft: CreateParcelDraft,
): ValidatedCreateFields => {
  if (!Number.isInteger(draft.quantity) || draft.quantity < 1 || draft.quantity > 10_000) {
    throw new Error('Parcel quantity must be an integer from 1 to 10000.');
  }
  if (
    draft.declaredValueVnd !== null
    && (
      !Number.isSafeInteger(draft.declaredValueVnd)
      || draft.declaredValueVnd < 0
    )
  ) {
    throw new Error('Parcel declared value must be a non-negative safe VND integer.');
  }

  const itemName = draft.itemName?.trim();
  if (!itemName) {
    throw new Error('Parcel item name is required.');
  }

  const recipientEmail = draft.recipient.email?.trim();
  if (!recipientEmail) {
    throw new Error('Parcel recipient email is required.');
  }
  if (!isValidEmail(recipientEmail)) {
    throw new Error('Parcel recipient email is invalid.');
  }

  return { itemName, recipientEmail };
};

/**
 * Converts the local parcel draft into the exact backend payload. Device URIs
 * remain UI-only; the optional photo URL must come from the authenticated,
 * passenger-owned Firebase upload flow.
 */
export const buildCreateParcelPayload = (
  draft: CreateParcelDraft,
): CreateParcelPayload => {
  const { itemName, recipientEmail } = validateCreateContract(draft);

  return {
    tripId: draft.tripId,
    quoteToken: draft.quoteToken,
    dropoffStopId: draft.dropoffStopId,
    bookingId: draft.bookingId,
    itemName,
    description: draft.description,
    sizeCategory: draft.sizeCategory,
    lengthCm: draft.lengthCm,
    widthCm: draft.widthCm,
    heightCm: draft.heightCm,
    estimatedWeightKg: draft.estimatedWeightKg,
    photoUrl: draft.photoUrl?.trim() || null,
    recipient: {
      ...draft.recipient,
      email: recipientEmail,
    },
    deliveryMethod: draft.deliveryMethod,
    paymentMethod: draft.paymentMethod,
    voucherCode: draft.voucherCode,
    declaredValueVnd: draft.declaredValueVnd,
    quantity: draft.quantity,
  };
};
