import { apiClient } from '@shared/api/axiosInstance';
import { type ApiSuccessEnvelope } from '@shared/api/errors';
import {
  createTopUpPayload,
  flattenWalletTransactionPages,
  getWalletBalance,
  getWalletTransactions,
  initiateTopUp,
  mapWalletTransactionDto,
  walletKeys,
  type TopUpResult,
  type WalletBalanceDto,
  type WalletTransactionsPage,
  type WalletTransactionDto,
  type WalletTransactionsPageDto,
} from './walletApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const transaction: WalletTransactionDto = {
  id: 'c6ca0b8c-e23a-43bb-9908-750eab8f54b7',
  type: 'CREDIT',
  amount: 100_000,
  balanceBefore: 20_000,
  balanceAfter: 120_000,
  referenceType: 'TOP_UP',
  referenceId: 'e2bd6d41-4dd6-42d4-bf70-bab0f87cfe61',
  note: 'Top-up succeeded',
  createdAt: '2026-07-14T05:00:00Z',
};
const TOP_UP_IDEMPOTENCY_KEY = 'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111';

describe('wallet API contract', () => {
  const getMock = jest.mocked(apiClient.get);
  const postMock = jest.mocked(apiClient.post);

  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it('gets the authenticated wallet from GET /wallet', async () => {
    const wallet: WalletBalanceDto = {
      userId: 'd333999c-0e6c-4c8f-8ec5-c9d29ac03b2f',
      balance: 125_000,
      currency: 'VND',
    };
    const envelope: ApiSuccessEnvelope<WalletBalanceDto> = {
      success: true,
      statusCode: 200,
      data: wallet,
    };
    getMock.mockResolvedValueOnce({ data: envelope });

    await expect(getWalletBalance()).resolves.toEqual(wallet);
    expect(getMock).toHaveBeenCalledWith('/wallet', {});
  });

  it('requests and maps a paged CREDIT/DEBIT ledger', async () => {
    const page: WalletTransactionsPageDto = {
      items: [transaction],
      page: 4,
      pageSize: 30,
      totalItems: 125,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    };
    const envelope: ApiSuccessEnvelope<WalletTransactionsPageDto> = {
      success: true,
      statusCode: 200,
      data: page,
    };
    getMock.mockResolvedValueOnce({ data: envelope });

    await expect(getWalletTransactions(4, 30)).resolves.toEqual({
      ...page,
      items: [mapWalletTransactionDto(transaction)],
    });
    expect(getMock).toHaveBeenCalledWith('/wallet/transactions', {
      params: { page: 4, pageSize: 30 },
    });
  });

  it('posts the exact VNPay body and idempotency header to /wallet/top-up', async () => {
    const result: TopUpResult = {
      topUpRequestId: '9eb9764e-1648-4dd8-923e-f1227c8cf4ef',
      status: 'PENDING',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    };
    const envelope: ApiSuccessEnvelope<TopUpResult> = {
      success: true,
      statusCode: 201,
      data: result,
    };
    postMock.mockResolvedValueOnce({ data: envelope });

    await expect(
      initiateTopUp(createTopUpPayload(100_000), TOP_UP_IDEMPOTENCY_KEY),
    ).resolves.toBe(result);
    expect(postMock).toHaveBeenCalledWith(
      '/wallet/top-up',
      { amount: 100_000, method: 'VNPAY' },
      { headers: { 'Idempotency-Key': TOP_UP_IDEMPOTENCY_KEY } },
    );
  });

  it.each([9_999, 10_000.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid amount %p before issuing a request',
    async (amount) => {
      expect(() => createTopUpPayload(amount)).toThrow();
      expect(postMock).not.toHaveBeenCalled();
    },
  );

  it('isolates cache keys by user and transaction page size', () => {
    expect(walletKeys.balance('user-a')).not.toEqual(walletKeys.balance('user-b'));
    expect(walletKeys.transactions('user-a', 20)).not.toEqual(
      walletKeys.transactions('user-a', 50),
    );
    expect(walletKeys.transactions('user-a', 30)).toEqual([
      'wallet',
      'user-a',
      'transactions',
      { pageSize: 30 },
    ]);
  });

  it('flattens five pages into 125 ordered transactions and deduplicates page overlap', () => {
    const transactions = Array.from({ length: 125 }, (_, index) =>
      mapWalletTransactionDto({
        ...transaction,
        id: `transaction-${index.toString().padStart(3, '0')}`,
        amount: index + 1,
        balanceAfter: index + 1,
      }));
    const page = (
      pageNumber: number,
      items: WalletTransactionsPage['items'],
    ): WalletTransactionsPage => ({
      items,
      page: pageNumber,
      pageSize: 30,
      totalItems: 125,
      totalPages: 5,
      hasNextPage: pageNumber < 5,
      hasPreviousPage: pageNumber > 1,
    });
    const pages = [
      page(1, transactions.slice(0, 30)),
      page(2, [transactions[29], ...transactions.slice(30, 59)]),
      page(3, transactions.slice(59, 89)),
      page(4, transactions.slice(89, 119)),
      page(5, transactions.slice(119, 125)),
    ];

    const flattened = flattenWalletTransactionPages(pages);

    expect(flattened).toHaveLength(125);
    expect(flattened.map(({ id }) => id)).toEqual(
      transactions.map(({ id }) => id),
    );
    expect(flattened.filter(({ id }) => id === transactions[29].id)).toHaveLength(1);
    expect(flattened.at(-1)).toBe(transactions[124]);
  });
});
