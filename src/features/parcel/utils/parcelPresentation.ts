import type { StatusChipTone } from '@shared/components';
import i18n from '@shared/i18n';

export interface ParcelPresentation {
  labelKey: string;
  fallback: string;
  tone: StatusChipTone;
}

const createPresentation = (
  labelKey: string,
  tone: StatusChipTone,
): ParcelPresentation => ({
  labelKey,
  fallback: i18n.t(labelKey),
  tone,
});

const PARCEL_STATUS_PRESENTATIONS: Record<string, ParcelPresentation> = {
  PENDING_OPERATOR_REVIEW: createPresentation('parcel.status.review', 'warning'),
  PENDING_PAYMENT: createPresentation('parcel.status.pendingPayment', 'warning'),
  PENDING: createPresentation('parcel.status.pending', 'info'),
  PENDING_ADDITIONAL_PAYMENT: createPresentation(
    'parcel.status.additionalPayment',
    'warning',
  ),
  RESERVED: createPresentation('parcel.status.reserved', 'info'),
  CHECKED_IN: createPresentation('parcel.status.checkedIn', 'info'),
  PENDING_FINAL_PAYMENT: createPresentation(
    'parcel.status.finalPayment',
    'warning',
  ),
  READY_TO_LOAD: createPresentation('parcel.status.readyToLoad', 'info'),
  LOADED: createPresentation('parcel.status.loaded', 'info'),
  IN_TRANSIT: createPresentation('parcel.status.inTransit', 'info'),
  PENDING_TRANSFER_CONFIRM: createPresentation(
    'parcel.status.transferConfirm',
    'warning',
  ),
  TRANSFER_ESCALATED: createPresentation(
    'parcel.status.transferEscalated',
    'warning',
  ),
  UNLOADED: createPresentation('parcel.status.unloaded', 'info'),
  DELIVERED_PENDING_CONFIRM: createPresentation(
    'parcel.status.deliveryConfirm',
    'warning',
  ),
  DELIVERY_CONFIRMED: createPresentation('parcel.status.delivered', 'success'),
  DELIVERY_REJECTED: createPresentation(
    'parcel.status.deliveryRejected',
    'error',
  ),
  RETURN_INITIATED: createPresentation(
    'parcel.status.returnInitiated',
    'warning',
  ),
  RETURNED: createPresentation('parcel.status.returned', 'neutral'),
  PENDING_OPERATOR_ACTION: createPresentation(
    'parcel.status.operatorAction',
    'warning',
  ),
  CANCELLED: createPresentation('parcel.status.cancelled', 'error'),
  REJECTED: createPresentation('parcel.status.rejected', 'error'),
  EXPIRED: createPresentation('parcel.status.expired', 'neutral'),
};

const UNKNOWN_PARCEL_PRESENTATION = createPresentation(
  'parcel.status.unknown',
  'neutral',
);

const PARCEL_SIZE_PRESENTATIONS: Record<string, ParcelPresentation> = {
  SMALL: createPresentation('parcel.size.small', 'neutral'),
  MEDIUM: createPresentation('parcel.size.medium', 'neutral'),
  LARGE: createPresentation('parcel.size.large', 'neutral'),
  EXTRA_LARGE: createPresentation('parcel.size.extraLarge', 'neutral'),
};

const UNKNOWN_SIZE_PRESENTATION = createPresentation(
  'parcel.size.unknown',
  'neutral',
);

export const getParcelStatusPresentation = (
  status: string | null | undefined,
): ParcelPresentation => {
  const normalizedStatus = status?.trim().toUpperCase();
  return normalizedStatus
    ? PARCEL_STATUS_PRESENTATIONS[normalizedStatus] ?? UNKNOWN_PARCEL_PRESENTATION
    : UNKNOWN_PARCEL_PRESENTATION;
};

export const getParcelSizePresentation = (
  size: string | null | undefined,
): ParcelPresentation => {
  const normalizedSize = size?.trim().toUpperCase();
  return normalizedSize
    ? PARCEL_SIZE_PRESENTATIONS[normalizedSize] ?? UNKNOWN_SIZE_PRESENTATION
    : UNKNOWN_SIZE_PRESENTATION;
};

export const getParcelDeliveryMethodPresentation = (
  deliveryMethod: string | null | undefined,
): ParcelPresentation => {
  if (deliveryMethod?.trim().toUpperCase() === 'TERMINAL_PICKUP') {
    return createPresentation('parcel.delivery.terminalPickup', 'neutral');
  }
  return createPresentation('parcel.delivery.unknown', 'neutral');
};
