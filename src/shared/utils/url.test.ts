import { joinUrl, normalizeApiPath, normalizeUrlBase } from './url';

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
});
