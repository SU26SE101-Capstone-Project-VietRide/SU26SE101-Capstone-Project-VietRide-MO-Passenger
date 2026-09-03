import type { StatusChipTone } from '@shared/components';
import type { ParcelSizeCategory, ParcelStatus } from '../types';

export interface ParcelPresentation {
  labelKey: string;
  tone: StatusChipTone;
}

export interface ParcelProofPresentation extends ParcelPresentation {
  descriptionKey: string;
}

export const PARCEL_ERROR_TRANSLATION_KEYS: Readonly<Record<string, string>> = {
  SESSION_INVALIDATED: 'parcel.errors.sessionChanged',
  PARCEL_QUOTE_INVALID: 'parcel.errors.quoteInvalidDescription',
  PARCEL_QUOTE_EXPIRED: 'parcel.errors.quoteExpiredDescription',
  PARCEL_QUOTE_STALE: 'parcel.errors.quoteExpiredDescription',
  PARCEL_QUOTE_MISMATCH: 'parcel.errors.quoteInvalidDescription',
  PARCEL_RETRY_INTENT_CHANGED: 'parcel.errors.retryIntentChanged',
  PARCEL_RETRY_NO_RETAINED: 'parcel.errors.retryNoRetainedRequest',
  PARCEL_CODE_COLLISION: 'parcel.errors.codeCollision',
  IDEMPOTENCY_REQUEST_PENDING: 'parcel.errors.idempotencyPending',
  TRIP_NOT_FOUND: 'parcel.errors.tripAvailabilityChangedDescription',
  TRIP_NOT_ACCEPTING_PARCEL: 'parcel.errors.tripAvailabilityChangedDescription',
  TRIP_CARGO_CAPACITY_EXCEEDED: 'parcel.errors.tripAvailabilityChangedDescription',
  PARCEL_ASSISTANT_REQUIRED: 'parcel.errors.tripAssistantRequired',
  PARCEL_INCIDENT_TYPE_NOT_REPORTABLE: 'parcel.errors.incidentTypeNotReportable',
  VNPAY_SESSION_OWNER_MISMATCH: 'parcel.errors.paymentSessionUnavailable',
  VNPAY_SESSION_NOT_PENDING: 'parcel.errors.paymentSessionUnavailable',
  VNPAY_CHARGE_INCOMPLETE: 'parcel.errors.paymentSessionUnavailable',
  PAYMENT_ALREADY_STARTED: 'parcel.errors.paymentAlreadyStarted',
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

const PARCEL_CUSTODY_EVENT_LABEL_KEYS: Readonly<Record<string, string>> = {
  ACCEPTED: 'parcel.reliability.events.ACCEPTED',
  CHECKED_IN: 'parcel.reliability.events.CHECKED_IN',
  LOADED: 'parcel.reliability.events.LOADED',
  TRIP_STARTED: 'parcel.reliability.events.TRIP_STARTED',
  ARRIVED_AT_STOP: 'parcel.reliability.events.ARRIVED_AT_STOP',
  UNLOADED: 'parcel.reliability.events.UNLOADED',
  HANDOFF: 'parcel.reliability.events.HANDOFF',
  FORWARDED_OUT: 'parcel.reliability.events.FORWARDED_OUT',
  FORWARDED_IN: 'parcel.reliability.events.FORWARDED_IN',
  RETURNED_TO_STATION: 'parcel.reliability.events.RETURNED_TO_STATION',
  FOUND: 'parcel.reliability.events.FOUND',
  DELIVERED: 'parcel.reliability.events.DELIVERED',
  MANUAL_CUSTODY_EXCEPTION: 'parcel.reliability.events.MANUAL_CUSTODY_EXCEPTION',
  UNIDENTIFIED_PACKAGE_CREATED: 'parcel.reliability.events.UNIDENTIFIED_PACKAGE_CREATED',
  IDENTIFIED_MANUALLY: 'parcel.reliability.events.IDENTIFIED_MANUALLY',
  EXCEPTION_REPORTED: 'parcel.reliability.events.EXCEPTION_REPORTED',
};

const PARCEL_INCIDENT_STATUS_LABEL_KEYS: Readonly<Record<string, string>> = {
  OPEN: 'parcel.reliability.incidentStatuses.OPEN',
  SEARCHING: 'parcel.reliability.incidentStatuses.SEARCHING',
  FOUND: 'parcel.reliability.incidentStatuses.FOUND',
  FORWARDING: 'parcel.reliability.incidentStatuses.FORWARDING',
  RESOLVED: 'parcel.reliability.incidentStatuses.RESOLVED',
  CLOSED: 'parcel.reliability.incidentStatuses.CLOSED',
  ESCALATED: 'parcel.reliability.incidentStatuses.ESCALATED',
  SEARCH_EXPIRED: 'parcel.reliability.incidentStatuses.SEARCH_EXPIRED',
  LOST_CONFIRMED: 'parcel.reliability.incidentStatuses.LOST_CONFIRMED',
};

const PARCEL_INCIDENT_SEARCH_PHASE_STATUSES: ReadonlySet<string> = new Set([
  'OPEN',
  'SEARCHING',
  'ESCALATED',
]);

const PARCEL_CLAIM_STATUS_LABEL_KEYS: Readonly<Record<string, string>> = {
  SUBMITTED: 'parcel.claim.statuses.SUBMITTED',
  UNDER_REVIEW: 'parcel.claim.statuses.UNDER_REVIEW',
  APPROVED: 'parcel.claim.statuses.APPROVED',
  FUNDING_PENDING: 'parcel.claim.statuses.FUNDING_PENDING',
  PAID: 'parcel.claim.statuses.PAID',
  REJECTED: 'parcel.claim.statuses.REJECTED',
  CANCELLED: 'parcel.claim.statuses.CANCELLED',
  APPEALED: 'parcel.claim.statuses.APPEALED',
};

const PARCEL_CLAIM_APPEAL_STATUS_LABEL_KEYS: Readonly<Record<string, string>> = {
  SUBMITTED: 'parcel.claim.appealStatuses.SUBMITTED',
  UNDER_REVIEW: 'parcel.claim.appealStatuses.UNDER_REVIEW',
  UPHELD: 'parcel.claim.appealStatuses.UPHELD',
  ADJUSTMENT_APPROVED: 'parcel.claim.appealStatuses.ADJUSTMENT_APPROVED',
  FUNDING_PENDING: 'parcel.claim.appealStatuses.FUNDING_PENDING',
  PAID: 'parcel.claim.appealStatuses.PAID',
};

const PARCEL_CLAIM_PROOF_PRESENTATIONS: Readonly<
  Record<string, ParcelProofPresentation>
> = {
  VERIFIED: {
    labelKey: 'parcel.claim.proofStatuses.VERIFIED',
    descriptionKey: 'parcel.claim.proofDescriptions.VERIFIED',
    tone: 'success',
  },
  UNVERIFIED: {
    labelKey: 'parcel.claim.proofStatuses.UNVERIFIED',
    descriptionKey: 'parcel.claim.proofDescriptions.UNVERIFIED',
    tone: 'warning',
  },
  NO_PROOF: {
    labelKey: 'parcel.claim.proofStatuses.NO_PROOF',
    descriptionKey: 'parcel.claim.proofDescriptions.NO_PROOF',
    tone: 'neutral',
  },
};

const PENDING_PROOF_PRESENTATION: ParcelProofPresentation = {
  labelKey: 'parcel.claim.proofStatuses.NOT_ASSESSED',
  descriptionKey: 'parcel.claim.proofDescriptions.NOT_ASSESSED',
  tone: 'info',
};

const LEGACY_PROOF_PRESENTATION: ParcelProofPresentation = {
  labelKey: 'parcel.claim.proofStatuses.LEGACY',
  descriptionKey: 'parcel.claim.proofDescriptions.LEGACY',
  tone: 'neutral',
};

const UNKNOWN_PROOF_PRESENTATION: ParcelProofPresentation = {
  labelKey: 'parcel.claim.proofStatuses.UNKNOWN',
  descriptionKey: 'parcel.claim.proofDescriptions.UNKNOWN',
  tone: 'neutral',
};

const PARCEL_TRACKING_CONFIDENCE_DESCRIPTION_KEYS: Readonly<Record<string, string>> = {
  CONFIRMED_SCAN: 'parcel.reliability.confidenceDescriptions.CONFIRMED_SCAN',
  MANUAL_EXCEPTION: 'parcel.reliability.confidenceDescriptions.MANUAL_EXCEPTION',
  INFERRED_FROM_MANIFEST: 'parcel.reliability.confidenceDescriptions.INFERRED_FROM_MANIFEST',
  UNKNOWN: 'parcel.reliability.confidenceDescriptions.UNKNOWN',
};

const lookupParcelLabelKey = (
  values: Readonly<Record<string, string>>,
  value: string | null | undefined,
  fallback: string,
): string => values[value?.trim().toUpperCase() ?? ''] ?? fallback;

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

export const getParcelCustodyEventLabelKey = (
  eventType: string | null | undefined,
): string => lookupParcelLabelKey(
  PARCEL_CUSTODY_EVENT_LABEL_KEYS,
  eventType,
  'parcel.reliability.events.UNKNOWN',
);

export const getParcelIncidentStatusLabelKey = (
  status: string | null | undefined,
): string => lookupParcelLabelKey(
  PARCEL_INCIDENT_STATUS_LABEL_KEYS,
  status,
  'parcel.reliability.incidentStatuses.UNKNOWN',
);

export const shouldShowParcelIncidentSearchDeadline = (
  status: string | null | undefined,
  slaState: string | null | undefined,
  searchDeadline: string | null | undefined,
): boolean => Boolean(searchDeadline) && PARCEL_INCIDENT_SEARCH_PHASE_STATUSES.has(
  status?.trim().toUpperCase() ?? '',
) && slaState?.trim().toUpperCase() !== 'BREACHED';

export const getParcelClaimStatusLabelKey = (
  status: string | null | undefined,
): string => lookupParcelLabelKey(
  PARCEL_CLAIM_STATUS_LABEL_KEYS,
  status,
  'parcel.claim.statuses.UNKNOWN',
);

export const getParcelClaimAppealStatusLabelKey = (
  status: string | null | undefined,
): string => lookupParcelLabelKey(
  PARCEL_CLAIM_APPEAL_STATUS_LABEL_KEYS,
  status,
  'parcel.claim.appealStatuses.UNKNOWN',
);

export const getParcelClaimProofPresentation = (
  proofStatus: string | null | undefined,
  decisionRecorded: boolean,
): ParcelProofPresentation => {
  const normalizedStatus = proofStatus?.trim().toUpperCase();
  if (!normalizedStatus) {
    return decisionRecorded
      ? LEGACY_PROOF_PRESENTATION
      : PENDING_PROOF_PRESENTATION;
  }
  return PARCEL_CLAIM_PROOF_PRESENTATIONS[normalizedStatus]
    ?? UNKNOWN_PROOF_PRESENTATION;
};

export const getParcelTrackingConfidenceDescriptionKey = (
  confidence: string | null | undefined,
): string => lookupParcelLabelKey(
  PARCEL_TRACKING_CONFIDENCE_DESCRIPTION_KEYS,
  confidence,
  'parcel.reliability.confidenceDescriptions.UNKNOWN',
);
