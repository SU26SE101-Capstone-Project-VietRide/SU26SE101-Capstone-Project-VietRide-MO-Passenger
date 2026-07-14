import type { ParcelDetail } from '../types';
import {
  buildParcelMilestones,
  formatParcelEventTime,
  formatParcelStatusLabel,
} from './parcelTracking';

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
  createdAt: '2026-07-13T08:00:00.000Z',
  loadedAt: null,
  unloadedAt: null,
  deliveredPendingConfirmAt: null,
  confirmedAt: null,
  rejectedAt: null,
  originStationName: null,
  destinationStationName: null,
  eta: null,
  ...overrides,
});

describe('parcel tracking presentation', () => {
  it('formats backend status values without maintaining duplicate labels', () => {
    expect(formatParcelStatusLabel('DELIVERED_PENDING_CONFIRM')).toBe('Delivered Pending Confirm');
    expect(formatParcelStatusLabel()).toBe('Pending');
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

  it('omits missing or invalid event times', () => {
    expect(formatParcelEventTime()).toBeNull();
    expect(formatParcelEventTime('not-a-date')).toBeNull();
    expect(formatParcelEventTime('2026-07-13T08:00:00.000Z')).not.toBeNull();
  });
});
