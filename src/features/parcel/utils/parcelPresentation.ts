import type { StatusChipTone } from '@shared/components';
import type { ParcelSizeCategory, ParcelStatus } from '../types';

export interface ParcelPresentation {
  labelKey: string;
  tone: StatusChipTone;
}

export const PARCEL_ERROR_TRANSLATION_KEYS: Readonly<Record<string, string>> = {
  SESSION_INVALIDATED: 'parcel.errors.sessionChanged',
};

const createPresentation = (
  labelKey: string,
  tone: StatusChipTone,
): ParcelPresentation => ({
  labelKey,
  tone,
});

const PARCEL_STATUS_PRESENTATIONS = {
  PENDING_OPERATOR_REVIEW: createPresentation(
    'history.status.parcel.review',
    'warning',
  ),
  PENDING_PAYMENT: createPresentation(
    'history.status.parcel.pendingPayment',
    'warning',
  ),
  PENDING: createPresentation('history.status.parcel.pending', 'info'),
  PENDING_ADDITIONAL_PAYMENT: createPresentation(
    'history.status.parcel.additionalPayment',
    'warning',
  ),
  RESERVED: createPresentation('history.status.parcel.reserved', 'info'),
  CHECKED_IN: createPresentation('history.status.parcel.checkedIn', 'info'),
  PENDING_FINAL_PAYMENT: createPresentation(
    'history.status.parcel.finalPayment',
    'warning',
  ),
  READY_TO_LOAD: createPresentation(
    'history.status.parcel.readyToLoad',
    'info',
  ),
  LOADED: createPresentation('history.status.parcel.loaded', 'info'),
  IN_TRANSIT: createPresentation('history.status.parcel.inTransit', 'info'),
  PENDING_TRANSFER_CONFIRM: createPresentation(
    'history.status.parcel.transferConfirm',
    'warning',
  ),
  TRANSFER_ESCALATED: createPresentation(
    'history.status.parcel.transferEscalated',
    'warning',
  ),
  UNLOADED: createPresentation('history.status.parcel.unloaded', 'info'),
  DELIVERED_PENDING_CONFIRM: createPresentation(
    'history.status.parcel.deliveryConfirm',
    'warning',
  ),
  DELIVERY_CONFIRMED: createPresentation(
    'history.status.parcel.delivered',
    'success',
  ),
  DELIVERY_REJECTED: createPresentation(
    'history.status.parcel.deliveryRejected',
    'error',
  ),
  RETURN_INITIATED: createPresentation(
    'history.status.parcel.returnInitiated',
    'warning',
  ),
  RETURNED: createPresentation('history.status.parcel.returned', 'neutral'),
  PENDING_OPERATOR_ACTION: createPresentation(
    'history.status.parcel.operatorAction',
    'warning',
  ),
  CANCELLED: createPresentation('history.status.parcel.cancelled', 'error'),
  REJECTED: createPresentation('history.status.parcel.rejected', 'error'),
  EXPIRED: createPresentation('history.status.parcel.expired', 'neutral'),
} satisfies Record<ParcelStatus, ParcelPresentation>;

const UNKNOWN_PARCEL_PRESENTATION = createPresentation(
  'history.status.parcel.unknown',
  'neutral',
);

const PARCEL_SIZE_PRESENTATIONS = {
  SMALL: createPresentation('history.size.small', 'neutral'),
  MEDIUM: createPresentation('history.size.medium', 'neutral'),
  LARGE: createPresentation('history.size.large', 'neutral'),
  EXTRA_LARGE: createPresentation('history.size.extraLarge', 'neutral'),
} satisfies Record<ParcelSizeCategory, ParcelPresentation>;

const UNKNOWN_SIZE_PRESENTATION = createPresentation(
  'history.size.unknown',
  'neutral',
);

export const getParcelStatusPresentation = (
  status: string | null | undefined,
): ParcelPresentation => {
  const normalizedStatus = status?.trim().toUpperCase();
  return normalizedStatus
    ? PARCEL_STATUS_PRESENTATIONS[normalizedStatus as ParcelStatus] ??
      UNKNOWN_PARCEL_PRESENTATION
    : UNKNOWN_PARCEL_PRESENTATION;
};

export const getParcelSizePresentation = (
  size: string | null | undefined,
): ParcelPresentation => {
  const normalizedSize = size?.trim().toUpperCase();
  return normalizedSize
    ? PARCEL_SIZE_PRESENTATIONS[normalizedSize as ParcelSizeCategory] ??
      UNKNOWN_SIZE_PRESENTATION
    : UNKNOWN_SIZE_PRESENTATION;
};

export const getParcelDeliveryMethodPresentation = (
  deliveryMethod: string | null | undefined,
): ParcelPresentation => {
  if (deliveryMethod?.trim().toUpperCase() === 'TERMINAL_PICKUP') {
    return createPresentation('history.delivery.terminalPickup', 'neutral');
  }
  return createPresentation('history.delivery.unknown', 'neutral');
};
