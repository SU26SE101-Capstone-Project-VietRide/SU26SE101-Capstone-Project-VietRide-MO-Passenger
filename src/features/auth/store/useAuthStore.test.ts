const mockQueryClear = jest.fn();
const mockSetQueryData = jest.fn();
const mockFetchQuery = jest.fn();
const mockGetQueryData = jest.fn();
const mockClearSessionBoundState = jest.fn();
const mockSetToken = jest.fn();
const mockSetTokenRefreshAllowed = jest.fn();
const mockGetTokenBundle = jest.fn();
const mockLogout = jest.fn();

let mockSessionEpoch = 0;

jest.mock('@shared/api/queryClient', () => ({
  queryClient: {
    clear: (...args: unknown[]) => mockQueryClear(...args),
    setQueryData: (...args: unknown[]) => mockSetQueryData(...args),
    fetchQuery: (...args: unknown[]) => mockFetchQuery(...args),
    getQueryData: (...args: unknown[]) => mockGetQueryData(...args),
  },
}));
jest.mock('@shared/session/cleanup', () => ({
  clearSessionBoundState: () => mockClearSessionBoundState(),
}));
jest.mock('@shared/utils/storage', () => ({
  beginTokenSession: jest.fn(() => {
    mockSessionEpoch += 1;
    return mockSessionEpoch;
  }),
  clearToken: jest.fn(async () => {
    mockSessionEpoch += 1;
    return true;
  }),
  getTokenBundle: (...args: unknown[]) => mockGetTokenBundle(...args),
  getTokenSessionEpoch: jest.fn(() => mockSessionEpoch),
  isTokenSessionEpochCurrent: jest.fn((epoch: number) => epoch === mockSessionEpoch),
  setToken: (...args: unknown[]) => mockSetToken(...args),
  setTokenRefreshAllowed: (...args: unknown[]) => mockSetTokenRefreshAllowed(...args),
}));
jest.mock('@shared/api/tokenRefresh', () => ({
  isTokenExpired: jest.fn(() => false),
  isTokenExpiringSoon: jest.fn(() => false),
  refreshStoredTokenBundle: jest.fn(async () => ({
    success: false,
    reason: 'network',
  })),
  shouldForceLogoutAfterRefreshFailure: jest.fn(() => false),
}));
jest.mock('../api/authApi', () => ({
  authKeys: { all: ['auth'], me: ['auth', 'me'] },
  getCurrentUser: jest.fn(),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

import type { AuthSession, User } from '../types';
import { useAuthStore } from './useAuthStore';

const user = (id: string, displayName: string): User => ({
  id,
  email: `${id}@example.com`,
  displayName,
  fullName: displayName,
  phone: null,
  role: 'PASSENGER',
  operatorId: null,
  status: 'ACTIVE',
  avatarUrl: null,
});

const session = (account: User): AuthSession => ({
  accessToken: `access-${account.id}`,
  refreshToken: `refresh-${account.id}`,
  expiresInSeconds: 3600,
  user: account,
});

describe('auth store account boundaries', () => {
  beforeEach(() => {
    mockSessionEpoch = 0;
    jest.clearAllMocks();
    mockSetToken.mockResolvedValue(true);
    mockSetTokenRefreshAllowed.mockResolvedValue(true);
    mockGetTokenBundle.mockResolvedValue(null);
    mockLogout.mockResolvedValue(undefined);
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isGuest: false,
      isAuthLoading: false,
      authError: null,
    });
  });

  it('clears all private query and feature state before caching a new account', async () => {
    const account = user('account-a', 'Account A');

    await useAuthStore.getState().setSession(session(account));

    expect(mockQueryClear).toHaveBeenCalledTimes(1);
    expect(mockClearSessionBoundState).toHaveBeenCalledTimes(1);
    expect(mockSetQueryData).toHaveBeenCalledWith(['auth', 'me'], account);
    expect(mockQueryClear.mock.invocationCallOrder[0]).toBeLessThan(
      mockSetQueryData.mock.invocationCallOrder[0],
    );
    expect(useAuthStore.getState()).toMatchObject({
      user: account,
      isAuthenticated: true,
      isGuest: false,
    });
  });

  it('clears all private query and feature state when logging out', async () => {
    const account = user('account-a', 'Account A');
    mockGetTokenBundle.mockResolvedValue({
      accessToken: 'access-account-a',
      refreshToken: 'refresh-account-a',
    });
    useAuthStore.setState({
      user: account,
      isAuthenticated: true,
      isGuest: false,
      isAuthLoading: false,
      authError: null,
    });

    await useAuthStore.getState().logout();

    expect(mockQueryClear).toHaveBeenCalledTimes(1);
    expect(mockClearSessionBoundState).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledWith(
      'refresh-account-a',
      'access-account-a',
    );
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
      isGuest: false,
    });
  });

  it('rejects a delayed profile response from the previous account', async () => {
    const accountA = user('account-a', 'Account A');
    const accountB = user('account-b', 'Account B');

    await useAuthStore.getState().setSession(session(accountA));
    const accountAEpoch = mockSessionEpoch;
    await useAuthStore.getState().setSession(session(accountB));

    expect(useAuthStore.getState().setUser(
      { ...accountA, displayName: 'Stale A' },
      accountAEpoch,
    )).toBe(false);
    expect(useAuthStore.getState().user).toEqual(accountB);
  });

  it('lets the newer login win when two secure writes complete out of order', async () => {
    const accountA = user('account-a', 'Account A');
    const accountB = user('account-b', 'Account B');
    let finishA: ((stored: boolean) => void) | undefined;
    let finishB: ((stored: boolean) => void) | undefined;
    mockSetToken
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => { finishA = resolve; }))
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => { finishB = resolve; }));

    const loginA = useAuthStore.getState().setSession(session(accountA));
    const loginB = useAuthStore.getState().setSession(session(accountB));
    finishA?.(true);
    await expect(loginA).rejects.toThrow('một phiên mới hơn');
    finishB?.(true);
    await expect(loginB).resolves.toBeUndefined();

    expect(useAuthStore.getState().user).toEqual(accountB);
    expect(mockQueryClear).toHaveBeenCalledTimes(1);
  });
});
