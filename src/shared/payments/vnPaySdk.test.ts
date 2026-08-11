const mockRequireOptionalNativeModule = jest.fn();
const mockShow = jest.fn(async () => undefined);
const mockRemove = jest.fn();
let mockPlatformOs = 'android';
let mockNativeListener: ((event: { resultCode: number }) => void) | undefined;

const mockNativeModule = {
  show: mockShow,
  addListener: jest.fn((
    _eventName: 'PaymentBack',
    listener: (event: { resultCode: number }) => void,
  ) => {
    mockNativeListener = listener;
    return { remove: mockRemove };
  }),
};

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: (...args: unknown[]) =>
    mockRequireOptionalNativeModule(...args),
}));

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformOs;
    },
  },
}));

import {
  addVnPaySdkPaymentBackListener,
  isVnPaySdkAvailable,
  mapVnPaySdkResultCode,
  openVnPaySdk,
  resetVnPaySdkModuleForTests,
  VNPAY_RESULT_CODES,
} from './vnPaySdk';

const validInput = {
  paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  tmnCode: 'TMN',
  scheme: 'vietride',
  isSandbox: true,
};

describe('vnPaySdk native adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlatformOs = 'android';
    mockNativeListener = undefined;
    mockRequireOptionalNativeModule.mockReturnValue(mockNativeModule);
    resetVnPaySdkModuleForTests();
  });

  it('maps all five official result codes', () => {
    expect(mapVnPaySdkResultCode(VNPAY_RESULT_CODES.APP_BACK)).toBe('APP_BACK');
    expect(mapVnPaySdkResultCode(VNPAY_RESULT_CODES.CALL_MOBILE_BANKING))
      .toBe('CALL_MOBILE_BANKING');
    expect(mapVnPaySdkResultCode(VNPAY_RESULT_CODES.SUCCESS)).toBe('SUCCESS');
    expect(mapVnPaySdkResultCode(VNPAY_RESULT_CODES.FAILED)).toBe('FAILED');
    expect(mapVnPaySdkResultCode(VNPAY_RESULT_CODES.CANCELLED)).toBe('CANCELLED');
  });

  it('reports unavailable outside Android and when the module is missing', () => {
    mockPlatformOs = 'ios';
    expect(isVnPaySdkAvailable()).toBe(false);
    expect(mockRequireOptionalNativeModule).not.toHaveBeenCalled();

    mockPlatformOs = 'android';
    mockRequireOptionalNativeModule.mockReturnValue(null);
    resetVnPaySdkModuleForTests();
    expect(isVnPaySdkAvailable()).toBe(false);
  });

  it('rejects a wrong scheme and untrusted payment host', async () => {
    await expect(openVnPaySdk({
      ...validInput,
      scheme: 'other-app',
    })).rejects.toMatchObject({ code: 'VNPAY_SDK_SCHEME_INVALID' });

    await expect(openVnPaySdk({
      ...validInput,
      paymentUrl: 'https://example.com/pay',
    })).rejects.toMatchObject({ code: 'VNPAY_REDIRECT_UNTRUSTED' });

    expect(mockShow).not.toHaveBeenCalled();
  });

  it('opens only the native module with normalized metadata', async () => {
    await openVnPaySdk({
      ...validInput,
      paymentUrl: '  ' + validInput.paymentUrl + '  ',
      tmnCode: '  TMN  ',
    });

    expect(mockShow).toHaveBeenCalledWith(validInput);
  });

  it('maps PaymentBack and returns a removable listener subscription', () => {
    const listener = jest.fn();
    const subscription = addVnPaySdkPaymentBackListener(listener);

    mockNativeListener?.({ resultCode: 97 });
    expect(listener).toHaveBeenCalledWith({
      resultCode: 97,
      result: 'SUCCESS',
    });

    subscription?.remove();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
