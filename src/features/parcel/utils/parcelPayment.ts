const PARCEL_DEPOSIT_PAYMENT_STATUS = 'PENDING_PAYMENT';
const PARCEL_FINAL_PAYMENT_STATUS = 'PENDING_FINAL_PAYMENT';

const PARCEL_CHECKOUT_FAILED_STATUSES = new Set([
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
  'RETURNED',
]);

const PARCEL_CHECKOUT_ACTIVE_STATUSES = new Set([
  'PENDING',
  'RESERVED',
  'CHECKED_IN',
  'READY_TO_LOAD',
  'LOADED',
  'IN_TRANSIT',
  'PENDING_TRANSFER_CONFIRM',
  'TRANSFER_ESCALATED',
  'UNLOADED',
  'DELIVERED_PENDING_CONFIRM',
  'DELIVERY_CONFIRMED',
]);

export type ParcelCheckoutState =
  | 'awaiting_payment'
  | 'awaiting_review'
  | 'failed'
  | 'attention'
  | 'active';

export type ParcelPaymentStage = 'deposit' | 'final';

const normalizeParcelStatus = (status?: string | null): string =>
  status?.trim().toUpperCase() ?? '';

export const getParcelPaymentStage = (
  status?: string | null,
): ParcelPaymentStage | null => {
  const normalizedStatus = normalizeParcelStatus(status);

  if (normalizedStatus === PARCEL_DEPOSIT_PAYMENT_STATUS) {
    return 'deposit';
  }

  return normalizedStatus === PARCEL_FINAL_PAYMENT_STATUS ? 'final' : null;
};

export const isParcelPaymentPending = (status?: string | null): boolean => {
  return getParcelPaymentStage(status) !== null;
};

export const getParcelCheckoutState = (
  status?: string | null,
): ParcelCheckoutState => {
  const normalizedStatus = normalizeParcelStatus(status);

  if (getParcelPaymentStage(normalizedStatus)) {
    return 'awaiting_payment';
  }

  if (normalizedStatus === 'PENDING_OPERATOR_REVIEW') {
    return 'awaiting_review';
  }

  if (PARCEL_CHECKOUT_FAILED_STATUSES.has(normalizedStatus)) {
    return 'failed';
  }

  if (PARCEL_CHECKOUT_ACTIVE_STATUSES.has(normalizedStatus)) {
    return 'active';
  }

  // Fail closed for return, delivery-rejection, operator-action and future BE
  // statuses. A delivery code must only appear for explicitly allowed states.
  return 'attention';
};
