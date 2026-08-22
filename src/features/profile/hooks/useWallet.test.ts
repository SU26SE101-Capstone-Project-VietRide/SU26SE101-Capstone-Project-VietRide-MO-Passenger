jest.mock('@shared/api/queryClient', () => ({
  queryClient: {
    clear: jest.fn(),
    setQueryData: jest.fn(),
    fetchQuery: jest.fn(),
    getQueryData: jest.fn(),
  },
}));
jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));
jest.mock('@shared/session/cleanup', () => ({
  clearSessionBoundState: jest.fn(),
}));
jest.mock('@shared/notifications', () => ({
  revokeDeviceRegistration: jest.fn(async () => undefined),
}));
jest.mock('@features/auth/api/authApi', () => ({
  authKeys: { all: ['auth'], me: ['auth', 'me'] },
  getCurrentUser: jest.fn(),
  logout: jest.fn(),
}));
jest.mock('@shared/api/tokenRefresh', () => ({
  isTokenExpired: jest.fn(() => false),
  isTokenExpiringSoon: jest.fn(() => false),
  refreshStoredTokenBundle: jest.fn(),
  shouldForceLogoutAfterRefreshFailure: jest.fn(() => false),
}));

import type { User } from '@features/auth/types';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { ApiRequestError } from '@shared/api/errors';
import { QueryClient } from '@tanstack/react-query';
import {
  walletKeys,
  type TopUpResult,
  type WalletTransactionsPage,
} from '../api/walletApi';
import {
  getNextWalletTransactionsPage,
  PaymentReturnGate,
  refreshWalletForUser,
  TopUpSubmissionCoordinator,
} from './useWallet';

const USER_ID = 'bd83a307-3314-43d6-8482-28341c8e366c';
const topUpResult: TopUpResult = {
  topUpRequestId: 'cdb6d954-83f6-44e7-99a7-f4a11b8a06ed',
  status: 'PENDING',
  paymentRedirectUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
};

const user: User = {
  id: USER_ID,
  email: 'passenger@example.com',
  displayName: 'Passenger',
  fullName: 'Passenger',
  phone: null,
  role: 'PASSENGER',
  operatorId: null,
  status: 'ACTIVE',
  avatarUrl: null,
};

describe('wallet top-up coordination', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user,
      isAuthenticated: true,
      isAuthLoading: false,
      authError: null,
    });
  });

  afterEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isAuthLoading: false,
      authError: null,
    });
  });

  it('coalesces rapid submissions into one in-flight request', async () => {
    let resolveRequest: ((result: TopUpResult) => void) | undefined;
    const submitter = jest.fn(
      () => new Promise<TopUpResult>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const coordinator = new TopUpSubmissionCoordinator(submitter);

    const first = coordinator.submit({ userId: USER_ID, amount: 100_000 });
    const second = coordinator.submit({ userId: USER_ID, amount: 100_000 });

    expect(second).toBe(first);
    expect(submitter).toHaveBeenCalledTimes(1);
    resolveRequest?.(topUpResult);
    await expect(first).resolves.toBe(topUpResult);
  });

  it('keeps the same key after an ambiguous failure', async () => {
    const submitter = jest
      .fn()
      .mockRejectedValueOnce(
        new ApiRequestError({
          message: 'Network disconnected',
          code: 'NETWORK_ERROR',
          isNetworkError: true,
        }),
      )
      .mockResolvedValueOnce(topUpResult);
    const coordinator = new TopUpSubmissionCoordinator(submitter);

    await expect(
      coordinator.submit({ userId: USER_ID, amount: 100_000 }),
    ).rejects.toThrow('Network disconnected');
    await expect(
      coordinator.submit({ userId: USER_ID, amount: 100_000 }),
    ).resolves.toBe(topUpResult);

    expect(submitter.mock.calls[0][1]).toBe(submitter.mock.calls[1][1]);
  });

  it('blocks a different amount while an ambiguous request is unresolved', async () => {
    const submitter = jest.fn().mockRejectedValue(
      new ApiRequestError({
        message: 'Request timed out',
        code: 'TIMEOUT',
        statusCode: 408,
      }),
    );
    const coordinator = new TopUpSubmissionCoordinator(submitter);

    await expect(
      coordinator.submit({ userId: USER_ID, amount: 100_000 }),
    ).rejects.toThrow('Request timed out');
    await expect(
      coordinator.submit({ userId: USER_ID, amount: 200_000 }),
    ).rejects.toMatchObject({ code: 'TOP_UP_RECONCILIATION_REQUIRED' });
    expect(submitter).toHaveBeenCalledTimes(1);

    coordinator.completePaymentReturn();
    await expect(
      coordinator.submit({ userId: USER_ID, amount: 200_000 }),
    ).rejects.toThrow('Request timed out');
    expect(submitter).toHaveBeenCalledTimes(2);
  });

  it('releases the key after a definitive rejection or completed return', async () => {
    const submitter = jest
      .fn()
      .mockRejectedValueOnce(
        new ApiRequestError({
          message: 'Amount rejected',
          code: 'VALIDATION_ERROR',
          statusCode: 422,
        }),
      )
      .mockResolvedValue(topUpResult);
    const coordinator = new TopUpSubmissionCoordinator(submitter);

    await expect(
      coordinator.submit({ userId: USER_ID, amount: 100_000 }),
    ).rejects.toThrow('Amount rejected');
    await coordinator.submit({ userId: USER_ID, amount: 100_000 });

    const rejectedKey = submitter.mock.calls[0][1];
    const retryKey = submitter.mock.calls[1][1];
    expect(retryKey).not.toBe(rejectedKey);

    coordinator.completePaymentReturn();
    await coordinator.submit({ userId: USER_ID, amount: 100_000 });
    expect(submitter.mock.calls[2][1]).not.toBe(retryKey);
  });

  it('rejects a response that resolves after the authenticated user changes', async () => {
    let resolveRequest: ((result: TopUpResult) => void) | undefined;
    const submitter = jest.fn(
      () => new Promise<TopUpResult>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const coordinator = new TopUpSubmissionCoordinator(submitter);
    const submission = coordinator.submit({ userId: USER_ID, amount: 100_000 });

    useAuthStore.setState({
      user: { ...user, id: '3a8e17ed-f4ce-4406-87ea-c55d38d76026' },
    });
    resolveRequest?.(topUpResult);

    await expect(submission).rejects.toMatchObject({
      code: 'SESSION_INVALIDATED',
    });
  });
});

describe('wallet payment return gate', () => {
  it('consumes exactly one foreground transition after the app leaves', () => {
    const gate = new PaymentReturnGate();

    gate.arm('active');
    expect(gate.consume('active')).toBe(false);
    expect(gate.consume('background')).toBe(false);
    expect(gate.consume('active')).toBe(true);
    expect(gate.consume('active')).toBe(false);
  });

  it('handles arming while the app is already inactive', () => {
    const gate = new PaymentReturnGate();

    gate.arm('background');
    expect(gate.consume('active')).toBe(true);
    expect(gate.consume('active')).toBe(false);
  });
});

describe('wallet payment-return cache refresh', () => {
  it('invalidates only the requested user subtree exactly once per refresh', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);

    await refreshWalletForUser(queryClient, 'user-a');

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: walletKeys.user('user-a'),
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: walletKeys.all,
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: walletKeys.user('user-b'),
    });

    await refreshWalletForUser(queryClient, 'user-b');

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: walletKeys.user('user-b'),
    });
  });
});

describe('wallet infinite pagination', () => {
  const page = (currentPage: number, hasNextPage: boolean) => ({
    items: [],
    page: currentPage,
    pageSize: 30,
    totalItems: 125,
    totalPages: 5,
    hasNextPage,
    hasPreviousPage: currentPage > 1,
  } satisfies WalletTransactionsPage);

  it('continues beyond 100 ledger entries and stops on the final page', () => {
    expect(getNextWalletTransactionsPage(page(4, true))).toBe(5);
    expect(getNextWalletTransactionsPage(page(5, false))).toBeUndefined();
  });
});
