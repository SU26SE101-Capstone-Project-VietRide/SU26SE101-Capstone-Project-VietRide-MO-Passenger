export const PARCEL_PASSENGER_ACTIONS = [
  'REPORT_INCIDENT',
  'SUBMIT_CLAIM',
  'ADD_EVIDENCE',
  'APPEAL',
] as const;

export type ParcelPassengerAction = (typeof PARCEL_PASSENGER_ACTIONS)[number];

export const PARCEL_INCIDENT_TYPES = [
  'MISSING',
  'WRONG_STOP',
  'DELIVERY_NOT_RECEIVED',
  'PARTIAL_LOSS',
  'DAMAGED',
  'SCAN_IDENTITY_MISMATCH',
  'PACKAGE_IDENTITY_MISMATCH',
  'UNSCANNED_HANDOFF',
  'MISSING_AFTER_DEPARTURE',
] as const;

export type ParcelIncidentType = (typeof PARCEL_INCIDENT_TYPES)[number];

export interface ParcelOperatorSummary {
  operatorId: string;
  name: string | null;
  logoUrl: string | null;
  contactPhone: string | null;
}

export interface ParcelReliabilityLocation {
  type: string | null;
  id: string | null;
  name: string | null;
  orderIndex: number | null;
  eta: string | null;
}

export interface ParcelReliabilityVehicle {
  vehicleId: string;
  licensePlate: string;
  status: string | null;
}

export interface ParcelReliabilityTripStop {
  stopId: string;
  name: string;
  orderIndex: number;
  estimatedArrivalAt: string;
  status: string;
  actualArrivalAt: string | null;
  actualDepartureAt: string | null;
}

export interface ParcelReliabilityTrip {
  tripId: string;
  status: string | null;
  departureAt: string | null;
  eta: string | null;
  route: {
    routeId: string;
    name: string;
    origin: ParcelReliabilityLocation;
    destination: ParcelReliabilityLocation;
  } | null;
  vehicle: ParcelReliabilityVehicle | null;
  stops: ParcelReliabilityTripStop[];
}

/** List/detail custody uses a nested lastConfirmedLocation object. */
export interface ParcelReliabilityCustodySummary {
  lastEventType: string;
  lastConfirmedLocation: ParcelReliabilityLocation;
  lastConfirmedAt: string;
  currentTripId: string | null;
  currentVehicleId: string | null;
  trackingConfidence: string;
  hasTrackingGap: boolean;
}

export interface ParcelReliabilityIncidentSummary {
  incidentId: string;
  type: ParcelIncidentType;
  status: string;
  searchDeadline: string | null;
  nextUpdateAt: string | null;
  slaState: string;
  operatorProcessBreach: boolean;
}

export interface ParcelReliabilityClaimSummary {
  claimId: string;
  status: string;
  totalAwardVnd: number;
  decisionDeadline: string | null;
  payoutDeadline: string | null;
  slaState: string | null;
}

export interface ParcelReliabilitySummary {
  currentCustody: ParcelReliabilityCustodySummary | null;
  activeIncident: ParcelReliabilityIncidentSummary | null;
  claim: ParcelReliabilityClaimSummary | null;
  nextUpdateAt: string | null;
  availableActions: ParcelPassengerAction[];
}

export interface ParcelCompensationPolicySnapshot {
  version: number;
  compensationRatePercent: number;
  maxCompensationVnd: number;
  noProofFallbackMultiplier: number;
  claimWindowDays: number;
  searchSlaHours: number;
  decisionSlaBusinessDays: number;
  payoutSlaBusinessDays: number;
}

export interface ParcelReliabilityParcelSummary {
  parcelId: string;
  parcelCode: string;
  status: string;
  description: string | null;
  photoUrl: string | null;
  quantity: number;
  declaredValueVnd: number | null;
}

/** Trace custody intentionally stays flat; do not alias to list/detail custody. */
export interface ParcelTraceCustody {
  lastEventType: string;
  lastLocationType: string | null;
  lastLocationId: string | null;
  lastLocationSnapshot: string | null;
  lastConfirmedAt: string;
  currentTripId: string | null;
  currentVehicleId: string | null;
  trackingConfidence: string;
}

export interface ParcelCustodyEvent {
  eventId: string;
  eventType: string;
  tripId: string | null;
  expectedLocationType: string | null;
  expectedLocationId: string | null;
  actualLocationType: string | null;
  actualLocationId: string | null;
  locationSnapshot: string | null;
  occurredAt: string;
  actorRole: string;
  source: string;
  reason: string | null;
  sequence: number;
}

export interface ParcelIncident {
  incidentId: string;
  type: ParcelIncidentType;
  status: string;
  lastKnownLocation: string | null;
  searchDeadline: string | null;
  createdAt: string;
  resolvedAt: string | null;
  operatorProcessBreach: boolean;
}

export interface ParcelTrace {
  parcelId: string;
  parcelCode: string;
  parcelStatus: string;
  parcelSummary: ParcelReliabilityParcelSummary;
  operator: ParcelOperatorSummary;
  trip: ParcelReliabilityTrip;
  dropoffLocation: ParcelReliabilityLocation;
  currentCustody: ParcelTraceCustody | null;
  activeIncident: ParcelReliabilityIncidentSummary | null;
  forwardingTrip: ParcelReliabilityTrip | null;
  claimSummary: ParcelReliabilityClaimSummary | null;
  availableActions: ParcelPassengerAction[];
  timeline: {
    items: ParcelCustodyEvent[];
    nextCursor: string | null;
  };
  incidents: ParcelIncident[];
  nextUpdateAt: string | null;
}

export interface ParcelClaimEvidence {
  evidenceId: string;
  evidenceType: string;
  reference: string;
  note: string | null;
  uploadedByUserId: string;
  createdAt: string;
}

export const PARCEL_CLAIM_PROOF_STATUSES = [
  'VERIFIED',
  'UNVERIFIED',
  'NO_PROOF',
] as const;

export type ParcelClaimProofStatus =
  | (typeof PARCEL_CLAIM_PROOF_STATUSES)[number]
  | (string & {});

export const PARCEL_CLAIM_APPEAL_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'UPHELD',
  'ADJUSTMENT_APPROVED',
  'FUNDING_PENDING',
  'PAID',
] as const;

export type ParcelClaimAppealStatus =
  | (typeof PARCEL_CLAIM_APPEAL_STATUSES)[number]
  | (string & {});

export interface ParcelClaimAppeal {
  appealId: string;
  claimId: string;
  originalClaimStatus: string;
  originalTotalAwardVnd: number;
  status: ParcelClaimAppealStatus;
  reason: string;
  submittedByUserId: string;
  submittedAt: string;
  proofStatus: ParcelClaimProofStatus | null;
  revisedProvenDirectLossVnd: number | null;
  revisedCargoAwardVnd: number;
  revisedFreightRefundVnd: number;
  revisedTotalAwardVnd: number;
  supplementaryAwardVnd: number;
  decisionReason: string | null;
  decidedByUserId: string | null;
  decidedAt: string | null;
  payoutReferenceId: string | null;
  paidAt: string | null;
  acceptedEvidenceIds: string[];
  availableActions: ParcelPassengerAction[];
}

export interface ParcelClaim {
  claimId: string;
  parcelId: string;
  incidentId: string;
  status: string;
  declaredValueVnd: number | null;
  proofStatus: ParcelClaimProofStatus | null;
  provenDirectLossVnd: number | null;
  compensationRatePercent: number;
  policyCapVnd: number;
  cargoAwardVnd: number;
  freightRefundVnd: number;
  totalAwardVnd: number;
  policyVersion: number;
  beneficiaryUserId: string;
  decisionReason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  payoutReferenceId: string | null;
  paidAt: string | null;
  appealReason: string | null;
  appealedByUserId: string | null;
  appealedAt: string | null;
  acceptedEvidenceIds: string[];
  evidence: ParcelClaimEvidence[];
  parcelSummary: ParcelReliabilityParcelSummary | null;
  incidentSummary: ParcelReliabilityIncidentSummary | null;
  policySnapshot: ParcelCompensationPolicySnapshot | null;
  decisionDeadline: string | null;
  payoutDeadline: string | null;
  availableActions: ParcelPassengerAction[];
  appeal: ParcelClaimAppeal | null;
}

export interface ReportParcelIncidentInput {
  parcelId: string;
  incidentType: ParcelIncidentType;
  description: string | null;
  evidenceUrls: string[];
}

export interface ReportParcelIncidentResult {
  incidentId: string;
  parcelId: string;
  incidentType: ParcelIncidentType;
  status: string;
  searchDeadline: string;
}

export interface AddParcelClaimEvidenceInput {
  parcelId: string;
  claimId: string;
  evidenceType: string;
  reference: string;
  note: string | null;
}

export interface AppealParcelClaimInput {
  parcelId: string;
  claimId: string;
  reason: string;
}

export interface ParcelDeliveryTokenInput {
  token: string;
}

export interface RejectParcelDeliveryInput extends ParcelDeliveryTokenInput {
  reason: string;
}
