import type { PendingVnPaySession } from '@shared/payments';
import {
  matchParcelVnPaySession,
  parcelPaymentKindForStage,
} from './parcelVnPaySession';

const session = (
  overrides: Partial<PendingVnPaySession> = {},
): PendingVnPaySession => ({
  sessionId: 'sess-1',
  kind: 'parcel_deposit',
  businessId: 'parcel-1',
  ownerUserId: 'user-1',
  createdAt: '2026-08-12T00:00:00.000Z',
  paymentRedirectUrl: 'https://pay.example/redirect',
  vnpaySdk: {
    tmnCode: 'TMN',
    scheme: 'vietride',
    isSandbox: true,
  },
  ...overrides,
});

describe('matchParcelVnPaySession', () => {
  it('accepts matching owner, parcel and kind with valid SDK meta', () => {
    expect(matchParcelVnPaySession(session(), {
      ownerUserId: 'user-1',
      parcelId: 'parcel-1',
      kind: 'parcel_deposit',
    })).toBe(true);
  });

  it('rejects wrong owner, parcel, kind, or incomplete SDK meta', () => {
    expect(matchParcelVnPaySession(session(), {
      ownerUserId: 'other',
      parcelId: 'parcel-1',
      kind: 'parcel_deposit',
    })).toBe(false);
    expect(matchParcelVnPaySession(session(), {
      ownerUserId: 'user-1',
      parcelId: 'parcel-2',
      kind: 'parcel_deposit',
    })).toBe(false);
    expect(matchParcelVnPaySession(session({ kind: 'parcel_final' }), {
      ownerUserId: 'user-1',
      parcelId: 'parcel-1',
      kind: 'parcel_deposit',
    })).toBe(false);
    expect(matchParcelVnPaySession(session({
      vnpaySdk: { tmnCode: '', scheme: 'vietride', isSandbox: true },
    }), {
      ownerUserId: 'user-1',
      parcelId: 'parcel-1',
      kind: 'parcel_deposit',
    })).toBe(false);
  });
});

describe('parcelPaymentKindForStage', () => {
  it('maps deposit and final stages only', () => {
    expect(parcelPaymentKindForStage('deposit')).toBe('parcel_deposit');
    expect(parcelPaymentKindForStage('final')).toBe('parcel_final');
    expect(parcelPaymentKindForStage(null)).toBeNull();
  });
});
