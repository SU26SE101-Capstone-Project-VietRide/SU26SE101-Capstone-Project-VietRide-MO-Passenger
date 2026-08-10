import { apiClient } from '@shared/api/axiosInstance';
import { normalizeIdempotencyKey } from '@shared/api/idempotency';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';

export const MINIMUM_TOP_UP_AMOUNT = 10_000;
export const WALLET_TRANSACTION_PAGE_SIZE = 30;

export interface WalletBalanceDto {
  userId: string;
  balance: number;
  currency: string;
}

export interface WalletBalance {
  userId: string;
  balance: number;
  currency: string;
}

export type WalletTransactionType = 'CREDIT' | 'DEBIT';

export type WalletTransactionReferenceType =
  | 'TOP_UP'
  | 'BOOKING_PAYMENT'
  | 'BOOKING_REFUND'
  | 'PARCEL_PAYMENT'
  | 'PARCEL_REFUND'
  | 'PARCEL_ADDITIONAL_PAYMENT'
  | 'MANUAL_ADJUSTMENT';

export interface WalletTransactionDto {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: WalletTransactionReferenceType;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
}

/** UI-facing ledger model. It intentionally preserves the BE CREDIT/DEBIT contract. */
export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: WalletTransactionReferenceType;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
}

export interface WalletTransactionsPageDto {
  items: WalletTransactionDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface WalletTransactionsPage
  extends Omit<WalletTransactionsPageDto, 'items'> {
  items: WalletTransaction[];
}

export interface TopUpPayload {
  amount: number;
  method: 'VNPAY';
  paymentReturnMode: 'MOBILE_SDK';
}

export type TopUpStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';

export interface VnPaySdkMeta {
  tmnCode: string;
  scheme: string;
  isSandbox: boolean;
}

export interface TopUpResult {
  topUpRequestId: string;
  status: TopUpStatus;
  paymentRedirectUrl: string;
  paymentReturnMode?: 'MOBILE_SDK' | string | null;
  vnpaySdk?: VnPaySdkMeta | null;
}

export const walletKeys = {
  all: ['wallet'] as const,
  user: (userId: string) => [...walletKeys.all, userId] as const,
  balance: (userId: string) => [...walletKeys.user(userId), 'balance'] as const,
  transactions: (userId: string, pageSize: number) =>
    [...walletKeys.user(userId), 'transactions', { pageSize }] as const,
} as const;

export const createTopUpPayload = (amount: number): TopUpPayload => {
  if (!Number.isSafeInteger(amount) || amount < MINIMUM_TOP_UP_AMOUNT) {
    throw new Error(`Top-up amount must be an integer of at least ${MINIMUM_TOP_UP_AMOUNT} VND.`);
  }

  return {
    amount,
    method: 'VNPAY',
    paymentReturnMode: 'MOBILE_SDK',
  };
};

export const mapWalletTransactionDto = (
  transaction: WalletTransactionDto,
): WalletTransaction => ({
  id: transaction.id,
  type: transaction.type,
  amount: transaction.amount,
  balanceBefore: transaction.balanceBefore,
  balanceAfter: transaction.balanceAfter,
  referenceType: transaction.referenceType,
  referenceId: transaction.referenceId ?? null,
  note: transaction.note ?? null,
  createdAt: transaction.createdAt,
});

/**
 * Flattens paginated ledger data in server order while removing page-boundary
 * duplicates. A transaction can appear on two adjacent pages when new ledger
 * entries are inserted between requests, so the stable BE id is authoritative.
 */
export const flattenWalletTransactionPages = (
  pages: readonly Pick<WalletTransactionsPage, 'items'>[] | undefined,
): WalletTransaction[] => {
  if (!pages) {
    return [];
  }

  const seenIds = new Set<string>();
  const transactions: WalletTransaction[] = [];

  pages.forEach(({ items }) => {
    items.forEach((transaction) => {
      if (seenIds.has(transaction.id)) {
        return;
      }

      seenIds.add(transaction.id);
      transactions.push(transaction);
    });
  });

  return transactions;
};

export async function getWalletBalance(signal?: AbortSignal): Promise<WalletBalance> {
  const response = await apiClient.get<ApiEnvelope<WalletBalanceDto>>(
    '/wallet',
    signal ? { signal } : {},
  );
  const wallet = unwrapApiResponse(response.data);

  return {
    userId: wallet.userId,
    balance: wallet.balance,
    currency: wallet.currency,
  };
}

export async function getWalletTransactions(
  page = 1,
  pageSize = WALLET_TRANSACTION_PAGE_SIZE,
  signal?: AbortSignal,
): Promise<WalletTransactionsPage> {
  const response = await apiClient.get<ApiEnvelope<WalletTransactionsPageDto>>(
    '/wallet/transactions',
    {
      params: { page, pageSize },
      ...(signal ? { signal } : {}),
    },
  );
  const result = unwrapApiResponse(response.data);

  return {
    ...result,
    items: result.items.map(mapWalletTransactionDto),
  };
}

export async function initiateTopUp(
  payload: TopUpPayload,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<TopUpResult> {
  const normalizedPayload = createTopUpPayload(payload.amount);
  const response = await apiClient.post<ApiEnvelope<TopUpResult>>(
    '/wallet/top-up',
    normalizedPayload,
    {
      headers: { 'Idempotency-Key': normalizeIdempotencyKey(idempotencyKey) },
      ...(signal ? { signal } : {}),
    },
  );

  return unwrapApiResponse(response.data);
}
