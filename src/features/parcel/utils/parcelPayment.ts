const PARCEL_PAYMENT_PENDING_STATUSES = new Set([
  'PENDING_PAYMENT',
  'PENDING_ADDITIONAL_PAYMENT',
]);

const PARCEL_CHECKOUT_FAILED_STATUSES = new Set([
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
  'RETURNED',
]);

const PARCEL_CHECKOUT_ACTIVE_STATUSES = new Set([
  'PENDING',
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

const normalizeParcelStatus = (status?: string | null): string =>
  status?.trim().toUpperCase() ?? '';

export const isParcelPaymentPending = (status?: string | null): boolean => {
  return PARCEL_PAYMENT_PENDING_STATUSES.has(normalizeParcelStatus(status));
};

export const getParcelCheckoutState = (
  status?: string | null,
): ParcelCheckoutState => {
  const normalizedStatus = normalizeParcelStatus(status);

  if (PARCEL_PAYMENT_PENDING_STATUSES.has(normalizedStatus)) {
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
