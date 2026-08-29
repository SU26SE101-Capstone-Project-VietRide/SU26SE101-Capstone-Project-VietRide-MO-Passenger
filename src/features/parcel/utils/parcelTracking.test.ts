import i18n from '@shared/i18n';
import type { ParcelDetail, ParcelReliabilityTrip } from '../types';
import {
  buildParcelMilestones,
  formatParcelEventTime,
  formatParcelStatusLabel,
  isParcelLocationTrackingTerminal,
  isParcelRejected,
  isParcelTrackingEligible,
  resolveParcelLiveTrackingTrip,
} from './parcelTracking';

const createReliabilityTrip = (
  tripId: string,
  status: string | null,
): ParcelReliabilityTrip => ({
  tripId,
  status,
  departureAt: null,
  eta: null,
  route: null,
  vehicle: null,
  stops: [],
});

const createParcel = (overrides: Partial<ParcelDetail> = {}): ParcelDetail => ({
  parcelId: '4d680b5f-8a94-4f26-9f5b-413bd1221e02',
  parcelCode: 'PRC-001',
  status: 'PENDING',
  senderUserId: 'sender',
  recipientUserId: null,
  recipientName: null,
  recipientPhone: null,
  operatorId: 'operator',
  tripId: 'trip',
  dropoffStopId: null,
  description: null,
  quantity: 1,
  declaredValueVnd: null,
  photoUrl: null,
  checkInPhotoUrls: null,
  deliveryPhotoUrls: null,
  sizeCategory: 'SMALL',
  estimatedWeightKg: 1,
  actualWeightKg: null,
  deliveryMethod: 'TERMINAL_PICKUP',
  depositAmount: 0,
  originalDepositAmount: 0,
  discountAmount: 0,
  voucherCode: null,
  voucherUsageId: null,
  additionalAmount: 0,
  estimatedSizeCategory: 'SMALL',
  actualSizeCategory: null,
  estimatedLengthCm: 20,
  estimatedWidthCm: 15,
  estimatedHeightCm: 10,
  estimatedVolumeM3: 0.003,
  estimatedDimWeightKg: 0.6,
  estimatedChargeableWeightKg: 1,
  actualLengthCm: null,
  actualWidthCm: null,
  actualHeightCm: null,
  actualVolumeM3: null,
  actualDimWeightKg: null,
  actualChargeableWeightKg: null,
  estimatedGrossPriceVnd: 100_000,
  finalGrossPriceVnd: 0,
  discountAmountVnd: 0,
  estimatedTotalPriceVnd: 100_000,
  finalTotalPriceVnd: 0,
  depositPercent: 30,
  depositRequiredVnd: 30_000,
  depositPaidVnd: 30_000,
  balanceRequiredVnd: 0,
  balancePaidVnd: 0,
  refundDueVnd: 0,
  refundedAmountVnd: 0,
  forfeitedDepositVnd: 0,
  depositPaymentId: null,
  balancePaymentId: null,
  loadCutoffAt: null,
  latestCheckInAt: null,
  checkedInAt: null,
  checkedInByUserId: null,
  reweighedAt: null,
  reweighedByUserId: null,
  finalPaymentDeadline: null,
  pricePerKgVnd: 0,
  minimumPriceVnd: 0,
  dimWeightFactor: 5_000,
  settlementPolicyVersion: 2,
  createdAt: '2026-07-13T08:00:00.000Z',
  loadedAt: null,
  unloadedAt: null,
  deliveredPendingConfirmAt: null,
  confirmedAt: null,
  rejectedAt: null,
  originStationName: null,
  destinationStationName: null,
  eta: null,
  operator: null,
  trip: null,
  dropoffLocation: null,
  compensationPolicySnapshot: null,
  reliabilitySummary: null,
  availableActions: [],
  ...overrides,
});

describe('parcel tracking presentation', () => {
  const previousLanguage = i18n.language;

  afterEach(async () => {
    await i18n.changeLanguage(previousLanguage);
  });

  it('formats backend status values without maintaining duplicate labels', async () => {
    await i18n.changeLanguage('en');
    expect(formatParcelStatusLabel('DELIVERED_PENDING_CONFIRM')).toBe(
      i18n.t('history.status.parcel.deliveryConfirm'),
    );
    expect(formatParcelStatusLabel('PENDING')).toBe(
      i18n.t('history.status.parcel.pending'),
    );
  });

  it('does not claim a loaded parcel is already in transit', () => {
    const milestones = buildParcelMilestones(createParcel({
      status: 'LOADED',
      loadedAt: '2026-07-13T09:00:00.000Z',
    }));

    expect(milestones.find((item) => item.id === 'loaded')?.status).toBe('active');
    expect(milestones.find((item) => item.id === 'in-transit')?.status).toBe('pending');
  });

  it('uses the real backend status to mark transit active', () => {
    const milestones = buildParcelMilestones(createParcel({
      status: 'IN_TRANSIT',
      loadedAt: '2026-07-13T09:00:00.000Z',
    }));

    expect(milestones.find((item) => item.id === 'loaded')?.status).toBe('completed');
    expect(milestones.find((item) => item.id === 'in-transit')?.status).toBe('active');
  });

  it('keeps future milestones pending when a shipment is rejected', () => {
    const milestones = buildParcelMilestones(createParcel({
      status: 'REJECTED',
      rejectedAt: '2026-07-13T08:15:00.000Z',
    }));

    expect(milestones[0].status).toBe('completed');
    expect(milestones.slice(1).every((item) => item.status === 'pending')).toBe(true);
  });

  it('recognizes the current delivery rejection status returned by BE', () => {
    const parcel = createParcel({ status: 'DELIVERY_REJECTED' });

    expect(isParcelRejected(parcel)).toBe(true);
    expect(isParcelTrackingEligible(parcel.status)).toBe(true);
    expect(isParcelLocationTrackingTerminal(parcel.status)).toBe(false);
    expect(isParcelLocationTrackingTerminal('DELIVERY_CONFIRMED')).toBe(true);
  });

  it('fails closed before calling Tracking for unsupported parcel states', () => {
    expect(isParcelTrackingEligible()).toBe(false);
    expect(isParcelTrackingEligible('PENDING_PAYMENT')).toBe(false);
    expect(isParcelTrackingEligible('PENDING_OPERATOR_REVIEW')).toBe(false);
    expect(isParcelTrackingEligible('IN_TRANSIT')).toBe(true);
  });

  it('does not subscribe to the disrupted source trip while transfer confirmation waits', () => {
    const sourceTrip = createReliabilityTrip(
      '11111111-1111-4111-8111-111111111111',
      'DISRUPTED',
    );
    const replacementTrip = createReliabilityTrip(
      '22222222-2222-4222-8222-222222222222',
      'BOARDING',
    );

    expect(resolveParcelLiveTrackingTrip({
      parcelStatus: 'PENDING_TRANSFER_CONFIRM',
      trip: sourceTrip,
      forwardingTrip: replacementTrip,
    })).toBeNull();
  });

  it('switches to the BE-provided replacement trip only when it is in progress', () => {
    const sourceTrip = createReliabilityTrip(
      '11111111-1111-4111-8111-111111111111',
      'DISRUPTED',
    );
    const replacementTrip = createReliabilityTrip(
      '22222222-2222-4222-8222-222222222222',
      'IN_PROGRESS',
    );

    expect(resolveParcelLiveTrackingTrip({
      parcelStatus: 'TRANSFER_ESCALATED',
      trip: sourceTrip,
      forwardingTrip: replacementTrip,
    })).toBe(replacementTrip);
    expect(resolveParcelLiveTrackingTrip({
      parcelStatus: 'IN_TRANSIT',
      trip: sourceTrip,
      forwardingTrip: replacementTrip,
    })).toBe(sourceTrip);
  });

  it('omits missing or invalid event times', () => {
    expect(formatParcelEventTime()).toBeNull();
    expect(formatParcelEventTime('not-a-date')).toBeNull();
    expect(formatParcelEventTime('2026-07-13T08:00:00.000Z')).not.toBeNull();
  });
});
