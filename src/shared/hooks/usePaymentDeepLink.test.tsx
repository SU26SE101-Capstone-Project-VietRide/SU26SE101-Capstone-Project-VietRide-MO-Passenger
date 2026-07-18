import React from 'react';
import { Linking } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import {
  PAYMENT_RETURN_APP_LINK,
  PAYMENT_RETURN_DEEP_LINK,
  parsePaymentReturnUrl,
  usePaymentDeepLink,
  type PaymentReturnEvent,
} from './usePaymentDeepLink';

describe('parsePaymentReturnUrl', () => {
  it('accepts only the exact custom URI and production HTTPS app link', () => {
    expect(parsePaymentReturnUrl(PAYMENT_RETURN_DEEP_LINK)).toEqual({
      source: 'custom-scheme',
    });
    expect(parsePaymentReturnUrl(
      `${PAYMENT_RETURN_DEEP_LINK}?vnp_ResponseCode=00&vnp_TxnRef=booking-1`,
    )).toEqual({ source: 'custom-scheme' });
    expect(parsePaymentReturnUrl(PAYMENT_RETURN_APP_LINK)).toEqual({
      source: 'app-link',
    });
  });

  it.each([
    'https://evil.example/payments/return',
    'evil://payments/return',
    'vietride://evil/payments/return',
    'vietride://payments/return/extra',
    'vietride://payments/return-evil',
    'vietride://payments/return#spoofed',
    'https://app.vietride.online/payments/return/',
    'https://app.vietride.online.evil/payments/return',
    'not a url',
  ])('rejects a lookalike or malformed URL: %s', (url) => {
    expect(parsePaymentReturnUrl(url)).toBeNull();
  });

  it('rejects ambiguous duplicate parameters and oversized input', () => {
    expect(parsePaymentReturnUrl(
      `${PAYMENT_RETURN_DEEP_LINK}?vnp_ResponseCode=00&VNP_RESPONSECODE=99`,
    )).toBeNull();
    expect(parsePaymentReturnUrl(
      `${PAYMENT_RETURN_DEEP_LINK}?value=${'x'.repeat(4_096)}`,
    )).toBeNull();
  });
});

describe('usePaymentDeepLink', () => {
  type UrlListener = (event: { url: string }) => void;

  let listener: UrlListener | undefined;
  let removeListener: jest.Mock;

  beforeEach(() => {
    listener = undefined;
    removeListener = jest.fn();
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(PAYMENT_RETURN_DEEP_LINK);
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_type, callback) => {
      listener = callback as UrlListener;
      return { remove: removeListener } as unknown as ReturnType<
        typeof Linking.addEventListener
      >;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles a duplicate cold and warm delivery exactly once and cleans up', async () => {
    const onPaymentReturn = jest.fn<void, [PaymentReturnEvent]>();

    function Harness(): null {
      usePaymentDeepLink(onPaymentReturn);
      return null;
    }

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
      await Promise.resolve();
    });

    expect(onPaymentReturn).toHaveBeenCalledTimes(1);
    expect(onPaymentReturn).toHaveBeenCalledWith({ source: 'custom-scheme' });

    ReactTestRenderer.act(() => {
      listener?.({ url: `${PAYMENT_RETURN_DEEP_LINK}?vnp_ResponseCode=00` });
    });
    expect(onPaymentReturn).toHaveBeenCalledTimes(1);

    ReactTestRenderer.act(() => renderer!.unmount());
    expect(removeListener).toHaveBeenCalledTimes(1);
  });
});
