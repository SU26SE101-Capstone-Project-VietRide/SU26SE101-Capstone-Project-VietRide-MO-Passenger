import type { StatusChipTone } from '@shared/components';

export interface ParcelPresentation {
  labelKey: string;
  fallback: string;
  tone: StatusChipTone;
}

const PARCEL_STATUS_PRESENTATIONS: Record<string, ParcelPresentation> = {
  PENDING_OPERATOR_REVIEW: { labelKey: 'history.status.parcel.review', fallback: 'Awaiting review', tone: 'warning' },
  PENDING_PAYMENT: { labelKey: 'history.status.parcel.pendingPayment', fallback: 'Payment pending', tone: 'warning' },
  PENDING: { labelKey: 'history.status.parcel.pending', fallback: 'Preparing shipment', tone: 'info' },
  PENDING_ADDITIONAL_PAYMENT: { labelKey: 'history.status.parcel.additionalPayment', fallback: 'Additional payment required', tone: 'warning' },
  RESERVED: { labelKey: 'history.status.parcel.reserved', fallback: 'Reserved', tone: 'info' },
  CHECKED_IN: { labelKey: 'history.status.parcel.checkedIn', fallback: 'Checked in', tone: 'info' },
  PENDING_FINAL_PAYMENT: { labelKey: 'history.status.parcel.finalPayment', fallback: 'Final payment required', tone: 'warning' },
  READY_TO_LOAD: { labelKey: 'history.status.parcel.readyToLoad', fallback: 'Ready to load', tone: 'info' },
  LOADED: { labelKey: 'history.status.parcel.loaded', fallback: 'Loaded', tone: 'info' },
  IN_TRANSIT: { labelKey: 'history.status.parcel.inTransit', fallback: 'In transit', tone: 'info' },
  PENDING_TRANSFER_CONFIRM: { labelKey: 'history.status.parcel.transferConfirm', fallback: 'Transfer confirmation required', tone: 'warning' },
  TRANSFER_ESCALATED: { labelKey: 'history.status.parcel.transferEscalated', fallback: 'Transfer needs attention', tone: 'warning' },
  UNLOADED: { labelKey: 'history.status.parcel.unloaded', fallback: 'At destination terminal', tone: 'info' },
  DELIVERED_PENDING_CONFIRM: { labelKey: 'history.status.parcel.deliveryConfirm', fallback: 'Awaiting pickup confirmation', tone: 'warning' },
  DELIVERY_CONFIRMED: { labelKey: 'history.status.parcel.delivered', fallback: 'Delivered', tone: 'success' },
  DELIVERY_REJECTED: { labelKey: 'history.status.parcel.deliveryRejected', fallback: 'Delivery rejected', tone: 'error' },
  RETURN_INITIATED: { labelKey: 'history.status.parcel.returnInitiated', fallback: 'Return started', tone: 'warning' },
  RETURNED: { labelKey: 'history.status.parcel.returned', fallback: 'Returned', tone: 'neutral' },
  PENDING_OPERATOR_ACTION: { labelKey: 'history.status.parcel.operatorAction', fallback: 'Operator action required', tone: 'warning' },
  CANCELLED: { labelKey: 'history.status.parcel.cancelled', fallback: 'Cancelled', tone: 'error' },
  REJECTED: { labelKey: 'history.status.parcel.rejected', fallback: 'Rejected', tone: 'error' },
  EXPIRED: { labelKey: 'history.status.parcel.expired', fallback: 'Expired', tone: 'neutral' },
};

const UNKNOWN_PARCEL_PRESENTATION: ParcelPresentation = {
  labelKey: 'history.status.parcel.unknown',
  fallback: 'Status unavailable',
  tone: 'neutral',
};

const PARCEL_SIZE_PRESENTATIONS: Record<string, ParcelPresentation> = {
  SMALL: { labelKey: 'history.size.small', fallback: 'Small parcel', tone: 'neutral' },
  MEDIUM: { labelKey: 'history.size.medium', fallback: 'Medium parcel', tone: 'neutral' },
  LARGE: { labelKey: 'history.size.large', fallback: 'Large parcel', tone: 'neutral' },
  EXTRA_LARGE: { labelKey: 'history.size.extraLarge', fallback: 'Extra-large parcel', tone: 'neutral' },
};

const UNKNOWN_SIZE_PRESENTATION: ParcelPresentation = {
  labelKey: 'history.size.unknown',
  fallback: 'Parcel size unavailable',
  tone: 'neutral',
};

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
    return {
      labelKey: 'history.delivery.terminalPickup',
      fallback: 'Terminal pickup',
      tone: 'neutral',
    };
  }
  return {
    labelKey: 'history.delivery.unknown',
    fallback: 'Delivery method unavailable',
    tone: 'neutral',
  };
};
