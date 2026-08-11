const mockRefreshPost = jest.fn();
const mockGetRefreshToken = jest.fn();
const mockSetToken = jest.fn();

let mockSessionEpoch = 7;

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      post: (...args: unknown[]) => mockRefreshPost(...args),
    })),
    isAxiosError: jest.fn(() => false),
  },
}));

jest.mock('@shared/constants', () => ({
  API_TIMEOUT: 10_000,
}));
jest.mock('@shared/constants/config', () => ({
  appConfig: { apiBaseUrl: 'https://api.vietride.test/v1' },
}));

jest.mock('@shared/utils/storage', () => ({
  getRefreshToken: (...args: unknown[]) => mockGetRefreshToken(...args),
  getTokenSessionEpoch: jest.fn(() => mockSessionEpoch),
  isTokenSessionEpochCurrent: jest.fn(
    (epoch: number) => epoch === mockSessionEpoch,
  ),
  setToken: (...args: unknown[]) => mockSetToken(...args),
}));

import { ApiRequestError } from './errors';
import {
  refreshStoredTokenBundle,
  shouldForceLogoutAfterRefreshFailure,
} from './tokenRefresh';

const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

describe('token refresh contract', () => {
  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionEpoch = 7;
    mockGetRefreshToken.mockResolvedValue('old-refresh-token');
    mockSetToken.mockResolvedValue(true);
  });

  it('atomically stores both rotated tokens from a successful refresh', async () => {
    mockRefreshPost.mockResolvedValueOnce({
      data: {
        success: true,
        statusCode: 200,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresInSeconds: 900,
        },
      },
    });

    await expect(refreshStoredTokenBundle()).resolves.toEqual({
      success: true,
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresInSeconds: 900,
      },
    });
    expect(mockSetToken).toHaveBeenCalledWith(
      'new-access-token',
      'new-refresh-token',
      900,
      true,
      7,
    );
  });

  it.each([
    ['AUTH_ACCOUNT_LOCKED', 403, 'account_locked'],
    ['OPERATOR_SUSPENDED', 403, 'operator_suspended'],
    ['FORBIDDEN', 403, 'forbidden'],
    ['AUTH_TOKEN_INVALID', 401, 'invalid_refresh_token'],
  ])(
    'forces logout when refresh fails with %s',
    async (code, statusCode, reason) => {
      const error = new ApiRequestError({
        code,
        message: `Refresh rejected with ${code}.`,
        statusCode,
      });
      mockRefreshPost.mockRejectedValueOnce(error);

      const result = await refreshStoredTokenBundle();

      expect(result).toMatchObject({
        success: false,
        reason,
        error,
      });
      expect(shouldForceLogoutAfterRefreshFailure(result)).toBe(true);
      expect(mockSetToken).not.toHaveBeenCalled();
    },
  );

  it('keeps the local session on a transient network failure', async () => {
    const error = new ApiRequestError({
      code: 'NETWORK_ERROR',
      message: 'Network unavailable.',
      isNetworkError: true,
    });
    mockRefreshPost.mockRejectedValueOnce(error);

    const result = await refreshStoredTokenBundle();

    expect(result).toMatchObject({
      success: false,
      reason: 'network',
      error,
    });
    expect(shouldForceLogoutAfterRefreshFailure(result)).toBe(false);
  });
});
