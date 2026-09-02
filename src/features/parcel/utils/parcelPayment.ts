import type {
  ParcelDepositPaymentResult,
  ParcelDetail,
  ParcelFinalPaymentResult,
} from '../types';

const PARCEL_DEPOSIT_PAYMENT_STATUS = 'PENDING_PAYMENT';
const PARCEL_FINAL_PAYMENT_STATUS = 'PENDING_FINAL_PAYMENT';

const PARCEL_CHECKOUT_FAILED_STATUSES = new Set([
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
  'RETURNED',
]);

/** Active operational parcel QR statuses — drop-off, in-transit, transfer, unloaded, and operator action. */
const PARCEL_ACTIVE_QR_STATUSES = new Set([
  'PENDING',
  'RESERVED',
  'CHECKED_IN',
  'READY_TO_LOAD',
  'LOADED',
  'IN_TRANSIT',
  'PENDING_TRANSFER_CONFIRM',
  'TRANSFER_ESCALATED',
  'UNLOADED',
  'PENDING_OPERATOR_ACTION',
]);

export type ParcelCheckoutState =
  | 'awaiting_payment'
  | 'awaiting_review'
  | 'awaiting_additional'
  | 'awaiting_recipient'
  | 'failed'
  | 'attention'
  | 'active'
  | 'in_progress'
  | 'completed';

/**
 * Passenger-payable stages. BE only exposes
 * POST /v1/parcels/{id}/deposit-payment and /final-payment.
 * PENDING_ADDITIONAL_PAYMENT is legacy and never gets paymentRedirectUrl.
 */
export type ParcelPaymentStage = 'deposit' | 'final';

const normalizeParcelStatus = (status?: string | null): string =>
  status?.trim().toUpperCase() ?? '';

/** The replacement crew must scan this code before confirming the handoff. */
export const isParcelTransferQrRequired = (
  status?: string | null,
): boolean => normalizeParcelStatus(status) === 'PENDING_TRANSFER_CONFIRM';

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

type ParcelPaymentResult =
  | ParcelDepositPaymentResult
  | ParcelFinalPaymentResult;

/**
 * Applies the authoritative payment mutation response to the detail cache.
 * A terminal response becomes visible immediately, while a pending response
 * only records its payment ID/amounts and remains subject to reconciliation.
 * The following query invalidation still verifies the full server snapshot.
 */
export const applyParcelPaymentResultToDetail = (
  detail: ParcelDetail | undefined,
  stage: ParcelPaymentStage,
  result: ParcelPaymentResult,
): ParcelDetail | undefined => {
  if (!detail || detail.parcelId !== result.parcelId) {
    return detail;
  }

  if (stage === 'deposit' && 'depositPaymentId' in result) {
    return {
      ...detail,
      status: result.status,
      depositPaymentId: result.depositPaymentId,
      depositRequiredVnd: result.depositRequiredVnd,
      depositPaidVnd: result.depositPaidVnd,
    };
  }

  if (stage === 'final' && 'balancePaymentId' in result) {
    return {
      ...detail,
      status: result.status,
      balancePaymentId: result.balancePaymentId,
      balanceRequiredVnd: result.balanceRequiredVnd,
      balancePaidVnd: result.balancePaidVnd,
      finalPaymentDeadline: result.finalPaymentDeadline,
    };
  }

  return detail;
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

  if (normalizedStatus === 'PENDING_ADDITIONAL_PAYMENT') {
    return 'awaiting_additional';
  }

  if (normalizedStatus === 'DELIVERED_PENDING_CONFIRM') {
    return 'awaiting_recipient';
  }

  if (normalizedStatus === 'DELIVERY_CONFIRMED') {
    return 'completed';
  }

  if (PARCEL_CHECKOUT_FAILED_STATUSES.has(normalizedStatus)) {
    return 'failed';
  }

  if (PARCEL_ACTIVE_QR_STATUSES.has(normalizedStatus)) {
    return 'active';
  }

  // Fail closed for return, delivery-rejection and future BE
  // statuses. A drop-off QR must only appear for explicitly allowed states.
  return 'attention';
};

export type ParcelDetailHeroIcon = 'warning' | 'clock' | 'success';
export type ParcelDetailHeroIconColor = 'error' | 'warning' | 'success';

export interface ParcelDetailHeroCopy {
  titleKey: string;
  descriptionKey: string;
  codeKey: string;
  icon: ParcelDetailHeroIcon;
  iconColor: ParcelDetailHeroIconColor;
}

const HERO_FAILED: ParcelDetailHeroCopy = {
  titleKey: 'parcel.detail.state.unavailableTitle',
  descriptionKey: 'parcel.detail.state.unavailableDescription',
  codeKey: 'parcel.detail.code.unavailableRequest',
  icon: 'warning',
  iconColor: 'error',
};

const HERO_DEPOSIT: ParcelDetailHeroCopy = {
  titleKey: 'parcel.detail.state.depositTitle',
  descriptionKey: 'parcel.detail.state.depositDescription',
  codeKey: 'parcel.detail.code.afterDeposit',
  icon: 'clock',
  iconColor: 'warning',
};

const HERO_FINAL: ParcelDetailHeroCopy = {
  titleKey: 'parcel.detail.state.finalPaymentTitle',
  descriptionKey: 'parcel.detail.state.finalPaymentDescription',
  codeKey: 'parcel.detail.code.afterFinalPayment',
  icon: 'clock',
  iconColor: 'warning',
};

const HERO_REVIEW: ParcelDetailHeroCopy = {
  titleKey: 'parcel.detail.state.awaitingReviewTitle',
  descriptionKey: 'parcel.detail.state.awaitingReviewDescription',
  codeKey: 'parcel.detail.code.afterApproval',
  icon: 'clock',
  iconColor: 'warning',
};

const HERO_ADDITIONAL: ParcelDetailHeroCopy = {
  titleKey: 'parcel.detail.state.additionalPaymentTitle',
  descriptionKey: 'parcel.detail.state.additionalPaymentDescription',
  codeKey: 'parcel.detail.code.additionalPayment',
  icon: 'warning',
  iconColor: 'warning',
};

const HERO_RECIPIENT: ParcelDetailHeroCopy = {
  titleKey: 'parcel.detail.state.awaitingRecipientTitle',
  descriptionKey: 'parcel.detail.state.awaitingRecipientDescription',
  codeKey: 'parcel.detail.code.awaitingRecipient',
  icon: 'clock',
  iconColor: 'warning',
};

const HERO_ATTENTION: ParcelDetailHeroCopy = {
  titleKey: 'parcel.detail.state.attentionTitle',
  descriptionKey: 'parcel.detail.state.attentionDescription',
  codeKey: 'parcel.detail.code.unavailableStatus',
  icon: 'warning',
  iconColor: 'warning',
};

const HERO_ACTIVE: ParcelDetailHeroCopy = {
  titleKey: 'parcel.detail.state.createdTitle',
  descriptionKey: 'parcel.detail.state.createdDescription',
  codeKey: 'parcel.detail.code.showAtDropoff',
  icon: 'success',
  iconColor: 'success',
};

const HERO_POST_DROPOFF: ParcelDetailHeroCopy = {
  titleKey: 'parcel.detail.state.createdTitle',
  descriptionKey: 'parcel.detail.state.createdDescription',
  codeKey: 'parcel.detail.code.unavailableStatus',
  icon: 'success',
  iconColor: 'success',
};

/** Copy for the post-create / detail hero. Derived from checkout state only. */
export const getParcelDetailHeroCopy = (
  checkoutState: ParcelCheckoutState,
  paymentStage: ParcelPaymentStage | null,
): ParcelDetailHeroCopy => {
  switch (checkoutState) {
    case 'failed':
      return HERO_FAILED;
    case 'awaiting_payment':
      return paymentStage === 'final' ? HERO_FINAL : HERO_DEPOSIT;
    case 'awaiting_review':
      return HERO_REVIEW;
    case 'awaiting_additional':
      return HERO_ADDITIONAL;
    case 'awaiting_recipient':
      return HERO_RECIPIENT;
    case 'attention':
      return HERO_ATTENTION;
    case 'active':
      return HERO_ACTIVE;
    default:
      return HERO_POST_DROPOFF;
  }
};
