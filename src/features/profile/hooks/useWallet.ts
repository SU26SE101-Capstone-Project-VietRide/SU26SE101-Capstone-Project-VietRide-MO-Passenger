import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { ApiRequestError, toApiError } from '@shared/api/errors';
import { IdempotencyKeyTracker } from '@shared/api/idempotency';
import {
  getTokenSessionEpoch,
  isTokenSessionEpochCurrent,
} from '@shared/utils/storage';
import { PaymentReturnGate } from '@shared/utils/paymentRedirect';
import {
  createTopUpPayload,
  getWalletBalance,
  getWalletTransactions,
  initiateTopUp,
  walletKeys,
  WALLET_TRANSACTION_PAGE_SIZE,
  type TopUpPayload,
  type TopUpResult,
  type WalletTransactionsPage,
} from '../api/walletApi';

const WALLET_BALANCE_STALE_TIME_MS = 30 * 1000;
const WALLET_TRANSACTIONS_STALE_TIME_MS = 60 * 1000;
const WALLET_GC_TIME_MS = 5 * 60 * 1000;

interface TopUpSubmissionInput {
  userId: string;
  amount: number;
}

type TopUpSubmitter = (
  payload: TopUpPayload,
  idempotencyKey: string,
) => Promise<TopUpResult>;

export const isAmbiguousTopUpError = (error: unknown): boolean => {
  const apiError = toApiError(error);
  const statusCode = apiError.statusCode;

  return (
    apiError.isNetworkError ||
    apiError.code === 'SESSION_INVALIDATED' ||
    statusCode === undefined ||
    statusCode === 408 ||
    statusCode === 429 ||
    statusCode >= 500
  );
};

/**
 * Coordinates one logical top-up submission.
 *
 * A successful or ambiguous request retains its idempotency key so a retry
 * cannot create a second charge. The key is released only after the app
 * returns from the hosted payment flow or after a definitive 4xx rejection.
 */
export class TopUpSubmissionCoordinator {
  private readonly tracker = new IdempotencyKeyTracker('wallet-top-up-mobile');
  private inFlight: Promise<TopUpResult> | null = null;
  private unresolvedInput: TopUpSubmissionInput | null = null;

  constructor(private readonly submitter: TopUpSubmitter = initiateTopUp) {}

  submit({ userId, amount }: TopUpSubmissionInput): Promise<TopUpResult> {
    if (this.inFlight) {
      return this.inFlight;
    }

    if (
      this.unresolvedInput &&
      (this.unresolvedInput.userId !== userId ||
        this.unresolvedInput.amount !== amount)
    ) {
      return Promise.reject(
        new ApiRequestError({
          message: 'topUp.errors.reconciliationRequired',
          code: 'TOP_UP_RECONCILIATION_REQUIRED',
        }),
      );
    }

    const payload = createTopUpPayload(amount);
    const idempotencyKey = this.tracker.getOrCreate({ userId, ...payload });
    const sessionEpoch = getTokenSessionEpoch();

    const submission = (async (): Promise<TopUpResult> => {
      const result = await this.submitter(payload, idempotencyKey);
      const activeUserId = useAuthStore.getState().user?.id;

      if (
        !isTokenSessionEpochCurrent(sessionEpoch) ||
        activeUserId !== userId
      ) {
        throw new ApiRequestError({
          message: 'topUp.errors.sessionChanged',
          code: 'SESSION_INVALIDATED',
        });
      }

      return result;
    })();

    this.inFlight = submission;
    submission.then(
      () => {
        if (this.inFlight === submission) {
          this.inFlight = null;
          this.unresolvedInput = { userId, amount };
        }
      },
      (error: unknown) => {
        if (this.inFlight === submission) {
          this.inFlight = null;
        }
        if (isAmbiguousTopUpError(error)) {
          this.unresolvedInput = { userId, amount };
        } else {
          this.unresolvedInput = null;
          this.tracker.reset();
        }
      },
    );

    return submission;
  }

  completePaymentReturn(): void {
    this.unresolvedInput = null;
    this.tracker.reset();
  }
}

// Preserve the established public import while the generic lifecycle owner
// now lives beside the shared trusted redirect coordinator.
export { PaymentReturnGate };

export const getNextWalletTransactionsPage = (
  lastPage: WalletTransactionsPage,
): number | undefined => (lastPage.hasNextPage ? lastPage.page + 1 : undefined);

/** Invalidates only the authenticated user's wallet subtree. */
export async function refreshWalletForUser(
  queryClient: QueryClient,
  userId: string,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: walletKeys.user(userId) });
}

export function useWalletBalance(enabled = true) {
  const userId = useAuthStore(state => state.user?.id);

  return useQuery({
    queryKey: walletKeys.balance(userId ?? 'none'),
    queryFn: ({ signal }) => getWalletBalance(signal),
    enabled: Boolean(userId) && enabled,
    staleTime: WALLET_BALANCE_STALE_TIME_MS,
    gcTime: WALLET_GC_TIME_MS,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useWalletTransactions(pageSize = WALLET_TRANSACTION_PAGE_SIZE) {
  const userId = useAuthStore(state => state.user?.id);

  return useInfiniteQuery({
    queryKey: walletKeys.transactions(userId ?? 'none', pageSize),
    queryFn: ({ pageParam, signal }) =>
      getWalletTransactions(pageParam, pageSize, signal),
    initialPageParam: 1,
    getNextPageParam: getNextWalletTransactionsPage,
    enabled: Boolean(userId),
    staleTime: WALLET_TRANSACTIONS_STALE_TIME_MS,
    gcTime: WALLET_GC_TIME_MS,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useCreateWalletTopUp() {
  const userId = useAuthStore(state => state.user?.id);
  const coordinatorRef = useRef<TopUpSubmissionCoordinator | null>(null);

  if (!coordinatorRef.current) {
    coordinatorRef.current = new TopUpSubmissionCoordinator();
  }

  const mutation = useMutation({
    mutationFn: (amount: number) => {
      if (!userId) {
        throw new ApiRequestError({
          message: 'topUp.errors.authRequired',
          code: 'AUTH_REQUIRED',
          statusCode: 401,
        });
      }

      return coordinatorRef.current!.submit({ userId, amount });
    },
    retry: 0,
  });
  const resetMutation = mutation.reset;

  useEffect(() => {
    coordinatorRef.current?.completePaymentReturn();
    resetMutation();
  }, [resetMutation, userId]);

  const completePaymentReturn = useCallback(() => {
    coordinatorRef.current?.completePaymentReturn();
    resetMutation();
  }, [resetMutation]);

  return {
    ...mutation,
    completePaymentReturn,
  };
}

export function useRefreshWallet(): () => Promise<void> {
  const queryClient = useQueryClient();
  const userId = useAuthStore(state => state.user?.id);

  return useCallback(async () => {
    if (!userId) {
      return;
    }

    await refreshWalletForUser(queryClient, userId);
  }, [queryClient, userId]);
}

export function useWalletRefreshOnPaymentReturn(
  onPaymentReturn?: (didRefresh: boolean) => void,
) {
  const userId = useAuthStore(state => state.user?.id);
  const queryClient = useQueryClient();
  const callbackRef = useRef(onPaymentReturn);
  const gateRef = useRef<PaymentReturnGate | null>(null);
  const armedUserIdRef = useRef<string | undefined>(undefined);
  const [isAwaitingReturn, setIsAwaitingReturn] = useState(false);
  if (!gateRef.current) {
    gateRef.current = new PaymentReturnGate();
  }
  callbackRef.current = onPaymentReturn;

  const cancelPaymentReturn = useCallback(() => {
    gateRef.current?.cancel();
    armedUserIdRef.current = undefined;
    setIsAwaitingReturn(false);
  }, []);

  const armPaymentReturn = useCallback(() => {
    if (!userId) {
      return false;
    }

    armedUserIdRef.current = userId;
    gateRef.current?.arm(AppState.currentState);
    setIsAwaitingReturn(true);
    return true;
  }, [userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const armedUserId = armedUserIdRef.current;
        if (!armedUserId) {
          return;
        }

        if (armedUserId !== userId) {
          cancelPaymentReturn();
          return;
        }

        if (!gateRef.current?.consume(nextState)) {
          return;
        }

        armedUserIdRef.current = undefined;
        setIsAwaitingReturn(false);
        refreshWalletForUser(queryClient, armedUserId)
          .then(() => callbackRef.current?.(true))
          .catch(() => callbackRef.current?.(false));
      },
    );

    return () => subscription.remove();
  }, [cancelPaymentReturn, queryClient, userId]);

  return {
    armPaymentReturn,
    cancelPaymentReturn,
    isAwaitingReturn,
  } as const;
}
