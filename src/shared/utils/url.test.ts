import {
  isTrustedApiUrl,
  isTrustedPaymentRedirectUrl,
  joinUrl,
  normalizeApiPath,
  normalizeUrlBase,
} from './url';

describe('url helpers', () => {
  it('removes trailing slashes from base URLs without touching protocol slashes', () => {
    expect(normalizeUrlBase(' https://api.vietride.online/v1/ ')).toBe(
      'https://api.vietride.online/v1',
    );
  });

  it('normalizes API paths to exactly one leading slash', () => {
    expect(normalizeApiPath('auth/register')).toBe('/auth/register');
    expect(normalizeApiPath('/auth/register')).toBe('/auth/register');
    expect(normalizeApiPath('//auth/register')).toBe('/auth/register');
  });

  it('joins base URL and API path with one slash between segments', () => {
    expect(joinUrl('https://api.vietride.online/v1/', '/auth/register')).toBe(
      'https://api.vietride.online/v1/auth/register',
    );
  });

  it('does not rewrite absolute request URLs', () => {
    expect(joinUrl('https://api.vietride.online/v1/', 'https://cdn.example.com/file.png')).toBe(
      'https://cdn.example.com/file.png',
    );
  });

  it('only trusts absolute API URLs under the configured origin and base path', () => {
    const baseUrl = 'https://api.vietride.online/v1';

    expect(isTrustedApiUrl('/bookings', baseUrl)).toBe(true);
    expect(isTrustedApiUrl(`${baseUrl}/bookings`, baseUrl)).toBe(true);
    expect(isTrustedApiUrl('https://api.vietride.online/v2/bookings', baseUrl)).toBe(false);
    expect(isTrustedApiUrl('https://evil.example/v1/bookings', baseUrl)).toBe(false);
    expect(isTrustedApiUrl('https://user@api.vietride.online/v1/bookings', baseUrl)).toBe(false);
  });

  it('only trusts HTTPS VNPay payment redirects', () => {
    expect(isTrustedPaymentRedirectUrl(
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=123',
    )).toBe(true);
    expect(isTrustedPaymentRedirectUrl('https://pay.vnpay.vn/checkout')).toBe(true);
    expect(isTrustedPaymentRedirectUrl('http://sandbox.vnpayment.vn/checkout')).toBe(false);
    expect(isTrustedPaymentRedirectUrl('https://vnpayment.vn.evil.example/checkout')).toBe(false);
    expect(isTrustedPaymentRedirectUrl('intent://payment')).toBe(false);
  });
});
