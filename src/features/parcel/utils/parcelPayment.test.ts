import {
  applyParcelPaymentResultToDetail,
  getParcelCheckoutState,
  getParcelDetailHeroCopy,
  getParcelPaymentStage,
  isParcelTransferQrRequired,
  isParcelPaymentPending,
} from './parcelPayment';
import type { ParcelDetail } from '../types';

const detail = (status: string): ParcelDetail =>
  ({
    parcelId: 'parcel-1',
    status,
    depositPaymentId: null,
    depositRequiredVnd: 30_000,
    depositPaidVnd: 0,
    balancePaymentId: null,
    balanceRequiredVnd: 70_000,
    balancePaidVnd: 0,
    finalPaymentDeadline: null,
  } as ParcelDetail);

describe('getParcelPaymentStage', () => {
  it('maps only the two passenger payment POSTs', () => {
    expect(getParcelPaymentStage('PENDING_PAYMENT')).toBe('deposit');
    expect(getParcelPaymentStage('PENDING_FINAL_PAYMENT')).toBe('final');
  });

  it('does not invent a stage for legacy additional payment', () => {
    expect(getParcelPaymentStage('PENDING_ADDITIONAL_PAYMENT')).toBeNull();
    expect(isParcelPaymentPending('PENDING_ADDITIONAL_PAYMENT')).toBe(false);
  });
});

describe('applyParcelPaymentResultToDetail', () => {
  it('applies a synchronously confirmed Wallet deposit to the detail cache', () => {
    const updated = applyParcelPaymentResultToDetail(
      detail('PENDING_PAYMENT'),
      'deposit',
      {
        parcelId: 'parcel-1',
        status: 'RESERVED',
        depositPaymentId: 'payment-1',
        depositRequiredVnd: 30_000,
        depositPaidVnd: 30_000,
        paymentDueAt: null,
        paymentRedirectUrl: null,
      },
    );

    expect(updated).toMatchObject({
      status: 'RESERVED',
      depositPaymentId: 'payment-1',
      depositPaidVnd: 30_000,
    });
    expect(isParcelPaymentPending(updated?.status)).toBe(false);
  });

  it('applies a synchronously confirmed Wallet balance to the detail cache', () => {
    const updated = applyParcelPaymentResultToDetail(
      detail('PENDING_FINAL_PAYMENT'),
      'final',
      {
        parcelId: 'parcel-1',
        status: 'READY_TO_LOAD',
        balancePaymentId: 'payment-2',
        balanceRequiredVnd: 70_000,
        balancePaidVnd: 70_000,
        finalPaymentDeadline: '2026-09-03T10:00:00+07:00',
        paymentRedirectUrl: null,
      },
    );

    expect(updated).toMatchObject({
      status: 'READY_TO_LOAD',
      balancePaymentId: 'payment-2',
      balancePaidVnd: 70_000,
    });
    expect(isParcelPaymentPending(updated?.status)).toBe(false);
  });

  it('does not mutate another parcel cache entry', () => {
    const current = detail('PENDING_PAYMENT');
    const updated = applyParcelPaymentResultToDetail(current, 'deposit', {
      parcelId: 'parcel-2',
      status: 'RESERVED',
      depositPaymentId: 'payment-1',
      depositRequiredVnd: 30_000,
      depositPaidVnd: 30_000,
      paymentDueAt: null,
      paymentRedirectUrl: null,
    });

    expect(updated).toBe(current);
  });
});

describe('getParcelCheckoutState', () => {
  it('does not treat recipient-confirm as drop-off', () => {
    expect(getParcelCheckoutState('DELIVERED_PENDING_CONFIRM')).toBe(
      'awaiting_recipient',
    );
    expect(getParcelCheckoutState('DELIVERY_CONFIRMED')).toBe('completed');
  });

  it('keeps operational parcel QR active before load and throughout transit', () => {
    expect(getParcelCheckoutState('PENDING')).toBe('active');
    expect(getParcelCheckoutState('RESERVED')).toBe('active');
    expect(getParcelCheckoutState('CHECKED_IN')).toBe('active');
    expect(getParcelCheckoutState('READY_TO_LOAD')).toBe('active');
    expect(getParcelCheckoutState('LOADED')).toBe('active');
    expect(getParcelCheckoutState('IN_TRANSIT')).toBe('active');
    expect(getParcelCheckoutState('PENDING_TRANSFER_CONFIRM')).toBe('active');
    expect(getParcelCheckoutState('TRANSFER_ESCALATED')).toBe('active');
    expect(getParcelCheckoutState('UNLOADED')).toBe('active');
    expect(getParcelCheckoutState('PENDING_OPERATOR_ACTION')).toBe('active');
  });

  it('surfaces legacy additional payment as its own wait state', () => {
    expect(getParcelCheckoutState('PENDING_ADDITIONAL_PAYMENT')).toBe(
      'awaiting_additional',
    );
  });
});

describe('isParcelTransferQrRequired', () => {
  it('keeps the transfer-specific QR copy while the replacement crew must scan it', () => {
    expect(isParcelTransferQrRequired('PENDING_TRANSFER_CONFIRM')).toBe(true);
    expect(isParcelTransferQrRequired(' pending_transfer_confirm ')).toBe(true);
  });

  it('does not flag transfer-specific copy for regular in-transit or other statuses', () => {
    expect(isParcelTransferQrRequired('TRANSFER_ESCALATED')).toBe(false);
    expect(isParcelTransferQrRequired('IN_TRANSIT')).toBe(false);
  });
});

describe('getParcelDetailHeroCopy', () => {
  it('uses final-payment copy only for the final payable stage', () => {
    expect(getParcelDetailHeroCopy('awaiting_payment', 'deposit').titleKey)
      .toBe('parcel.detail.state.depositTitle');
    expect(getParcelDetailHeroCopy('awaiting_payment', 'final').codeKey)
      .toBe('parcel.detail.code.afterFinalPayment');
  });

  it('does not show drop-off copy for recipient confirm or additional pay', () => {
    expect(getParcelDetailHeroCopy('awaiting_recipient', null).codeKey)
      .toBe('parcel.detail.code.awaitingRecipient');
    expect(getParcelDetailHeroCopy('awaiting_additional', null).icon)
      .toBe('warning');
  });

  it('keeps drop-off copy while active', () => {
    expect(getParcelDetailHeroCopy('active', null).codeKey)
      .toBe('parcel.detail.code.showAtDropoff');
    expect(getParcelDetailHeroCopy('completed', null).codeKey)
      .toBe('parcel.detail.code.unavailableStatus');
  });
});
