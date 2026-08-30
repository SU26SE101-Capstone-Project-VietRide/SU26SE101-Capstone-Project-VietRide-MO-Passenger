import { z } from 'zod';

import { apiInstantSchema } from '@shared/utils/apiTime';
import {
  PARCEL_INCIDENT_TYPES,
  PARCEL_PASSENGER_ACTIONS,
  PARCEL_SIZE_CATEGORIES,
  PARCEL_STATUSES,
  type ParcelPassengerAction,
} from '../types';

const safeNonNegativeIntSchema = z.number().int().nonnegative().safe();
const safeNullableMoneySchema = safeNonNegativeIntSchema.nullable();
const finiteNumberSchema = z.number().finite();
const nullableTextSchema = z.string().trim().max(2_000).nullable();
const statusTokenSchema = z.string().trim().min(1).max(100);
const nullableUuidSchema = z.string().uuid().nullable();

const nullableOptional = <T extends z.ZodType>(schema: T) => schema
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const isPassengerAction = (value: string): value is ParcelPassengerAction =>
  (PARCEL_PASSENGER_ACTIONS as readonly string[]).includes(value);

export const parcelPassengerActionsSchema = z.array(z.string())
  .transform((values) => values.filter(isPassengerAction));

export const parcelIncidentTypeSchema = z.enum(PARCEL_INCIDENT_TYPES);

export const parcelCompensationPolicySchema = z.object({
  version: z.number().int().positive(),
  compensationRatePercent: z.number().int().min(0).max(100),
  maxCompensationVnd: safeNonNegativeIntSchema,
  noProofFallbackMultiplier: z.number().int().nonnegative(),
  claimWindowDays: z.number().int().nonnegative(),
  searchSlaHours: z.number().int().nonnegative(),
  decisionSlaBusinessDays: z.number().int().nonnegative(),
  payoutSlaBusinessDays: z.number().int().nonnegative(),
});

export const parcelOperatorSummarySchema = z.object({
  operatorId: z.string().uuid(),
  name: nullableOptional(z.string().trim().max(255)),
  logoUrl: nullableOptional(z.string().trim().max(2_048)),
  contactPhone: nullableOptional(z.string().trim().max(50)),
});

export const parcelReliabilityLocationSchema = z.object({
  type: nullableOptional(z.string().trim().max(100)),
  id: nullableOptional(z.string().uuid()),
  name: nullableOptional(z.string().trim().max(500)),
  orderIndex: nullableOptional(z.number().int()),
  eta: nullableOptional(apiInstantSchema),
});

const parcelReliabilityVehicleSchema = z.object({
  vehicleId: z.string().uuid(),
  licensePlate: z.string().trim().min(1).max(50),
  status: nullableOptional(statusTokenSchema),
});

const parcelReliabilityTripStopSchema = z.object({
  stopId: z.string().uuid(),
  name: z.string().trim().min(1).max(500),
  orderIndex: z.number().int(),
  estimatedArrivalAt: apiInstantSchema,
  status: statusTokenSchema,
  actualArrivalAt: nullableOptional(apiInstantSchema),
  actualDepartureAt: nullableOptional(apiInstantSchema),
});

export const parcelReliabilityTripSchema = z.object({
  tripId: z.string().uuid(),
  status: nullableOptional(statusTokenSchema),
  departureAt: nullableOptional(apiInstantSchema),
  eta: nullableOptional(apiInstantSchema),
  route: nullableOptional(z.object({
    routeId: z.string().uuid(),
    name: z.string().trim().max(500),
    origin: parcelReliabilityLocationSchema,
    destination: parcelReliabilityLocationSchema,
  })),
  vehicle: nullableOptional(parcelReliabilityVehicleSchema),
  stops: z.array(parcelReliabilityTripStopSchema).default([]),
});

export const parcelReliabilityCustodySummarySchema = z.object({
  lastEventType: statusTokenSchema,
  lastConfirmedLocation: parcelReliabilityLocationSchema,
  lastConfirmedAt: apiInstantSchema,
  currentTripId: nullableUuidSchema,
  currentVehicleId: nullableUuidSchema,
  trackingConfidence: statusTokenSchema,
  hasTrackingGap: z.boolean(),
});

export const parcelReliabilityIncidentSummarySchema = z.object({
  incidentId: z.string().uuid(),
  type: parcelIncidentTypeSchema,
  status: statusTokenSchema,
  searchDeadline: nullableOptional(apiInstantSchema),
  nextUpdateAt: nullableOptional(apiInstantSchema),
  slaState: statusTokenSchema,
  operatorProcessBreach: z.boolean(),
});

export const parcelReliabilityClaimSummarySchema = z.object({
  claimId: z.string().uuid(),
  status: statusTokenSchema,
  totalAwardVnd: safeNonNegativeIntSchema,
  decisionDeadline: nullableOptional(apiInstantSchema),
  payoutDeadline: nullableOptional(apiInstantSchema),
  slaState: nullableOptional(statusTokenSchema),
});

export const parcelReliabilitySummarySchema = z.object({
  currentCustody: nullableOptional(parcelReliabilityCustodySummarySchema),
  activeIncident: nullableOptional(parcelReliabilityIncidentSummarySchema),
  claim: nullableOptional(parcelReliabilityClaimSummarySchema),
  nextUpdateAt: nullableOptional(apiInstantSchema),
  availableActions: parcelPassengerActionsSchema.default([]),
});

const parcelSummarySchema = z.object({
  parcelId: z.string().uuid(),
  parcelCode: z.string().trim().min(1).max(100),
  status: statusTokenSchema,
  description: nullableTextSchema,
  photoUrl: nullableOptional(z.string().trim().max(2_048)),
  quantity: z.number().int().min(1).max(10_000),
  declaredValueVnd: safeNullableMoneySchema,
});

const pagedShape = <T extends z.ZodType>(itemSchema: T) => z.object({
  items: z.array(itemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export const createParcelResultSchema = z.object({
  parcelId: z.string().uuid(),
  bookingId: nullableOptional(z.string().uuid()),
  parcelCode: z.string().trim().min(1).max(100),
  status: z.enum(PARCEL_STATUSES),
  estimatedSizeCategory: z.enum(PARCEL_SIZE_CATEGORIES),
  estimatedGrossPriceVnd: safeNonNegativeIntSchema,
  discountAmountVnd: safeNonNegativeIntSchema,
  estimatedTotalPriceVnd: safeNonNegativeIntSchema,
  depositPercent: z.number().min(0).max(100),
  depositRequiredVnd: safeNonNegativeIntSchema,
  depositPaidVnd: safeNonNegativeIntSchema,
  voucherCode: nullableOptional(z.string().trim().max(100)),
  settlementPolicyVersion: z.number().int().positive(),
  compensationPolicy: nullableOptional(parcelCompensationPolicySchema),
});

const parcelDetailBaseSchema = z.object({
  parcelId: z.string().uuid(),
  parcelCode: z.string().trim().min(1).max(100),
  status: statusTokenSchema,
  senderUserId: z.string().uuid(),
  recipientUserId: nullableUuidSchema,
  recipientName: nullableOptional(z.string().trim().max(255)),
  recipientPhone: nullableOptional(z.string().trim().max(50)),
  operatorId: z.string().uuid(),
  tripId: z.string().uuid(),
  bookingId: nullableOptional(z.string().uuid()),
  dropoffStopId: nullableUuidSchema,
  description: nullableTextSchema,
  quantity: z.number().int().min(1).max(10_000).default(1),
  declaredValueVnd: safeNonNegativeIntSchema.nullable().optional().default(null),
  photoUrl: nullableOptional(z.string().trim().max(2_048)),
  checkInPhotoUrls: nullableOptional(z.array(z.string().trim().max(2_048))),
  deliveryPhotoUrls: nullableOptional(z.array(z.string().trim().max(2_048))),
  sizeCategory: statusTokenSchema,
  estimatedWeightKg: finiteNumberSchema.positive(),
  actualWeightKg: nullableOptional(finiteNumberSchema.positive()),
  deliveryMethod: statusTokenSchema,
  depositAmount: safeNonNegativeIntSchema,
  originalDepositAmount: safeNonNegativeIntSchema,
  discountAmount: safeNonNegativeIntSchema,
  voucherCode: nullableOptional(z.string().trim().max(100)),
  voucherUsageId: nullableUuidSchema,
  additionalAmount: safeNonNegativeIntSchema,
  estimatedSizeCategory: statusTokenSchema,
  actualSizeCategory: nullableOptional(statusTokenSchema),
  estimatedLengthCm: finiteNumberSchema.positive(),
  estimatedWidthCm: finiteNumberSchema.positive(),
  estimatedHeightCm: finiteNumberSchema.positive(),
  estimatedVolumeM3: finiteNumberSchema.nonnegative(),
  estimatedDimWeightKg: finiteNumberSchema.nonnegative(),
  estimatedChargeableWeightKg: finiteNumberSchema.nonnegative(),
  actualLengthCm: nullableOptional(finiteNumberSchema.positive()),
  actualWidthCm: nullableOptional(finiteNumberSchema.positive()),
  actualHeightCm: nullableOptional(finiteNumberSchema.positive()),
  actualVolumeM3: nullableOptional(finiteNumberSchema.nonnegative()),
  actualDimWeightKg: nullableOptional(finiteNumberSchema.nonnegative()),
  actualChargeableWeightKg: nullableOptional(finiteNumberSchema.nonnegative()),
  estimatedGrossPriceVnd: safeNonNegativeIntSchema,
  finalGrossPriceVnd: safeNonNegativeIntSchema,
  discountAmountVnd: safeNonNegativeIntSchema,
  estimatedTotalPriceVnd: safeNonNegativeIntSchema,
  finalTotalPriceVnd: safeNonNegativeIntSchema,
  depositPercent: z.number().min(0).max(100),
  depositRequiredVnd: safeNonNegativeIntSchema,
  depositPaidVnd: safeNonNegativeIntSchema,
  balanceRequiredVnd: safeNonNegativeIntSchema,
  balancePaidVnd: safeNonNegativeIntSchema,
  refundDueVnd: safeNonNegativeIntSchema,
  refundedAmountVnd: safeNonNegativeIntSchema,
  forfeitedDepositVnd: safeNonNegativeIntSchema,
  depositPaymentId: nullableUuidSchema,
  balancePaymentId: nullableUuidSchema,
  loadCutoffAt: nullableOptional(apiInstantSchema),
  latestCheckInAt: nullableOptional(apiInstantSchema),
  checkedInAt: nullableOptional(apiInstantSchema),
  checkedInByUserId: nullableUuidSchema,
  reweighedAt: nullableOptional(apiInstantSchema),
  reweighedByUserId: nullableUuidSchema,
  finalPaymentDeadline: nullableOptional(apiInstantSchema),
  pricePerKgVnd: safeNonNegativeIntSchema,
  minimumPriceVnd: safeNonNegativeIntSchema,
  dimWeightFactor: finiteNumberSchema.nonnegative(),
  settlementPolicyVersion: z.number().int().positive(),
  createdAt: apiInstantSchema,
  loadedAt: nullableOptional(apiInstantSchema),
  unloadedAt: nullableOptional(apiInstantSchema),
  deliveredPendingConfirmAt: nullableOptional(apiInstantSchema),
  confirmedAt: nullableOptional(apiInstantSchema),
  rejectedAt: nullableOptional(apiInstantSchema),
  originStationName: nullableOptional(z.string().trim().max(500)),
  destinationStationName: nullableOptional(z.string().trim().max(500)),
  eta: nullableOptional(apiInstantSchema),
  operator: nullableOptional(parcelOperatorSummarySchema),
  trip: nullableOptional(parcelReliabilityTripSchema),
  dropoffLocation: nullableOptional(parcelReliabilityLocationSchema),
  compensationPolicySnapshot: nullableOptional(parcelCompensationPolicySchema),
  reliabilitySummary: nullableOptional(parcelReliabilitySummarySchema),
  availableActions: parcelPassengerActionsSchema.optional().default([]),
});

export const parcelDetailSchema = parcelDetailBaseSchema;

const sentParcelSchema = z.object({
  parcelId: z.string().uuid(),
  parcelCode: z.string().trim().min(1).max(100),
  tripId: z.string().uuid(),
  status: statusTokenSchema,
  createdAt: apiInstantSchema,
  totalAmount: safeNonNegativeIntSchema,
  originName: nullableOptional(z.string().trim().max(500)),
  destinationName: nullableOptional(z.string().trim().max(500)),
  departureDateTime: nullableOptional(apiInstantSchema),
  estimatedArrivalTime: nullableOptional(apiInstantSchema),
  bookingId: nullableUuidSchema,
  recipientName: z.string().trim().min(1).max(255),
  sizeCategory: statusTokenSchema,
  photoUrl: nullableOptional(z.string().trim().max(2_048)),
  deliveryMethod: statusTokenSchema,
  operator: nullableOptional(parcelOperatorSummarySchema),
  dropoffLocation: nullableOptional(parcelReliabilityLocationSchema),
  reliability: nullableOptional(parcelReliabilitySummarySchema),
});

const stationSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(500),
});

const receivedParcelSchema = z.object({
  parcelId: z.string().uuid(),
  parcelCode: z.string().trim().min(1).max(100),
  status: statusTokenSchema,
  originStation: nullableOptional(stationSummarySchema),
  destinationStation: nullableOptional(stationSummarySchema),
  eta: nullableOptional(apiInstantSchema),
  senderUserId: z.string().uuid(),
  recipientName: nullableOptional(z.string().trim().max(255)),
  sizeCategory: statusTokenSchema,
  createdAt: apiInstantSchema,
  operatorId: z.string().uuid(),
  tripId: z.string().uuid(),
  operator: nullableOptional(parcelOperatorSummarySchema),
  dropoffLocation: nullableOptional(parcelReliabilityLocationSchema),
  reliability: nullableOptional(parcelReliabilitySummarySchema),
});

export const sentParcelPageSchema = pagedShape(sentParcelSchema);
export const receivedParcelPageSchema = pagedShape(receivedParcelSchema);

const traceCustodySchema = z.object({
  lastEventType: statusTokenSchema,
  lastLocationType: nullableOptional(statusTokenSchema),
  lastLocationId: nullableUuidSchema,
  lastLocationSnapshot: nullableOptional(z.string().trim().max(500)),
  lastConfirmedAt: apiInstantSchema,
  currentTripId: nullableUuidSchema,
  currentVehicleId: nullableUuidSchema,
  trackingConfidence: statusTokenSchema,
});

export const parcelCustodyEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: statusTokenSchema,
  tripId: nullableUuidSchema,
  expectedLocationType: nullableOptional(statusTokenSchema),
  expectedLocationId: nullableUuidSchema,
  actualLocationType: nullableOptional(statusTokenSchema),
  actualLocationId: nullableUuidSchema,
  locationSnapshot: nullableOptional(z.string().trim().max(500)),
  occurredAt: apiInstantSchema,
  actorRole: statusTokenSchema,
  source: statusTokenSchema,
  reason: nullableTextSchema,
  sequence: z.number().int().nonnegative(),
});

export const parcelIncidentSchema = z.object({
  incidentId: z.string().uuid(),
  type: parcelIncidentTypeSchema,
  status: statusTokenSchema,
  lastKnownLocation: nullableOptional(z.string().trim().max(500)),
  searchDeadline: nullableOptional(apiInstantSchema),
  createdAt: apiInstantSchema,
  resolvedAt: nullableOptional(apiInstantSchema),
  operatorProcessBreach: z.boolean(),
});

export const parcelTraceSchema = z.object({
  parcelId: z.string().uuid(),
  parcelCode: z.string().trim().min(1).max(100),
  parcelStatus: statusTokenSchema,
  parcelSummary: parcelSummarySchema,
  operator: parcelOperatorSummarySchema,
  trip: parcelReliabilityTripSchema,
  dropoffLocation: parcelReliabilityLocationSchema,
  currentCustody: nullableOptional(traceCustodySchema),
  activeIncident: nullableOptional(parcelReliabilityIncidentSummarySchema),
  forwardingTrip: nullableOptional(parcelReliabilityTripSchema),
  claimSummary: nullableOptional(parcelReliabilityClaimSummarySchema),
  availableActions: parcelPassengerActionsSchema.default([]),
  timeline: z.object({
    items: z.array(parcelCustodyEventSchema),
    nextCursor: nullableOptional(z.string().trim().min(1).max(200)),
  }),
  incidents: z.array(parcelIncidentSchema),
  nextUpdateAt: nullableOptional(apiInstantSchema),
});

export const reportParcelIncidentResultSchema = z.object({
  incidentId: z.string().uuid(),
  parcelId: z.string().uuid(),
  incidentType: parcelIncidentTypeSchema,
  status: statusTokenSchema,
  searchDeadline: apiInstantSchema,
});

const parcelClaimEvidenceSchema = z.object({
  evidenceId: z.string().uuid(),
  evidenceType: z.string().trim().min(1).max(100),
  reference: z.string().trim().min(1).max(2_048),
  note: nullableTextSchema,
  uploadedByUserId: z.string().uuid(),
  createdAt: apiInstantSchema,
});

export const parcelClaimAppealSchema = z.object({
  appealId: z.string().uuid(),
  claimId: z.string().uuid(),
  originalClaimStatus: statusTokenSchema,
  originalTotalAwardVnd: safeNonNegativeIntSchema,
  status: statusTokenSchema,
  // Current BE requires only nonblank input and persists unbounded text.
  // The form's 2,000-character cap remains a separate Passenger safety bound.
  reason: z.string().trim().min(1),
  submittedByUserId: z.string().uuid(),
  submittedAt: apiInstantSchema,
  revisedProvenDirectLossVnd: safeNullableMoneySchema,
  revisedCargoAwardVnd: safeNonNegativeIntSchema,
  revisedFreightRefundVnd: safeNonNegativeIntSchema,
  revisedTotalAwardVnd: safeNonNegativeIntSchema,
  supplementaryAwardVnd: safeNonNegativeIntSchema,
  decisionReason: nullableTextSchema,
  decidedByUserId: nullableUuidSchema,
  decidedAt: nullableOptional(apiInstantSchema),
  payoutReferenceId: nullableUuidSchema,
  paidAt: nullableOptional(apiInstantSchema),
  availableActions: parcelPassengerActionsSchema.nullable().optional()
    .transform((value) => value ?? []),
});

export const parcelClaimSchema = z.object({
  claimId: z.string().uuid(),
  parcelId: z.string().uuid(),
  incidentId: z.string().uuid(),
  status: statusTokenSchema,
  declaredValueVnd: safeNullableMoneySchema,
  provenDirectLossVnd: safeNullableMoneySchema,
  compensationRatePercent: z.number().int().min(0).max(100),
  policyCapVnd: safeNonNegativeIntSchema,
  cargoAwardVnd: safeNonNegativeIntSchema,
  freightRefundVnd: safeNonNegativeIntSchema,
  totalAwardVnd: safeNonNegativeIntSchema,
  policyVersion: z.number().int().positive(),
  beneficiaryUserId: z.string().uuid(),
  decisionReason: nullableTextSchema,
  decidedBy: nullableUuidSchema,
  decidedAt: nullableOptional(apiInstantSchema),
  payoutReferenceId: nullableUuidSchema,
  paidAt: nullableOptional(apiInstantSchema),
  appealReason: nullableTextSchema,
  appealedByUserId: nullableUuidSchema,
  appealedAt: nullableOptional(apiInstantSchema),
  evidence: z.array(parcelClaimEvidenceSchema),
  parcelSummary: nullableOptional(parcelSummarySchema),
  incidentSummary: nullableOptional(parcelReliabilityIncidentSummarySchema),
  policySnapshot: nullableOptional(parcelCompensationPolicySchema),
  decisionDeadline: nullableOptional(apiInstantSchema),
  payoutDeadline: nullableOptional(apiInstantSchema),
  availableActions: parcelPassengerActionsSchema.nullable().optional()
    .transform((value) => value ?? []),
  // Production can omit this during rolling deploy; new BE returns the child case.
  appeal: nullableOptional(parcelClaimAppealSchema),
});

export const parcelClaimsSchema = z.array(parcelClaimSchema);

export const confirmParcelDeliveryResultSchema = z.object({
  parcelId: z.string().uuid(),
  status: statusTokenSchema,
  confirmedAt: apiInstantSchema,
});

export const rejectParcelDeliveryResultSchema = z.object({
  parcelId: z.string().uuid(),
  status: statusTokenSchema,
  rejectedAt: apiInstantSchema,
  canUndoUntil: apiInstantSchema,
});

export const undoRejectParcelDeliveryResultSchema = z.object({
  parcelId: z.string().uuid(),
  status: statusTokenSchema,
  undoneAt: apiInstantSchema,
});

export const parseParcelDetail = (value: unknown) => parcelDetailSchema.parse(value);
export const parseSentParcelPage = (value: unknown) => sentParcelPageSchema.parse(value);
export const parseReceivedParcelPage = (value: unknown) => receivedParcelPageSchema.parse(value);
export const parseParcelTrace = (value: unknown) => parcelTraceSchema.parse(value);
export const parseParcelClaims = (value: unknown) => parcelClaimsSchema.parse(value);
