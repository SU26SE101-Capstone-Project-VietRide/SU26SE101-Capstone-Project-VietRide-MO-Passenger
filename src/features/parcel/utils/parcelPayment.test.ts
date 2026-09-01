import {
  getParcelCheckoutState,
  getParcelDetailHeroCopy,
  getParcelPaymentStage,
  isParcelTransferQrRequired,
  isParcelPaymentPending,
} from './parcelPayment';

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
