import { apiClient } from '@shared/api/axiosInstance';
import type { ListPublishedPoliciesParams } from '../types/policy';
import {
  buildPublishedPolicyQuery,
  getPublishedPolicy,
  listPublishedPolicies,
} from './policyApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const POLICY_ID = '11111111-1111-4111-8111-111111111111';
const OPERATOR_ID = '44444444-4444-4444-8444-444444444444';

const policyItem = {
  id: POLICY_ID,
  operatorId: null,
  title: 'Chính sách hoàn vé',
  description: 'Quy định hoàn vé áp dụng toàn hệ thống',
  content: 'Nội dung Policy',
  category: 'REFUND',
  version: 1,
  createdAt: '2026-08-15T10:00:00.000Z',
  updatedAt: '2026-08-15T10:00:00.000Z',
};

const successEnvelope = <T>(data: T) => ({
  success: true as const,
  statusCode: 200,
  data,
  meta: { traceId: 'req-1', timestamp: '2026-08-15T11:00:00.000Z' },
});

describe('buildPublishedPolicyQuery', () => {
  it('sends only the Gateway allow-list and defaults pagination', () => {
    expect(buildPublishedPolicyQuery()).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it('keeps a valid operatorId and drops a driver-user-shaped invalid id', () => {
    expect(buildPublishedPolicyQuery({
      operatorId: OPERATOR_ID,
      category: 'LUGGAGE',
      search: '  hành lý  ',
      sortBy: 'title',
      sortDir: 'asc',
      page: 2,
    })).toEqual({
      page: 2,
      pageSize: 20,
      operatorId: OPERATOR_ID,
      category: 'LUGGAGE',
      search: 'hành lý',
      sortBy: 'title',
      sortDir: 'asc',
    });

    const malformedParams = {
      operatorId: 'driver-user-id',
      category: 'refund',
      sortBy: 'unknown',
      sortDir: 'up',
      pageSize: 500,
    } as unknown as ListPublishedPoliciesParams;

    expect(buildPublishedPolicyQuery(malformedParams)).toEqual({
      page: 1,
      pageSize: 100,
    });
  });
});

describe('listPublishedPolicies', () => {
  const getMock = jest.mocked(apiClient.get);

  beforeEach(() => {
    getMock.mockReset();
  });

  it('requests /policies through the Gateway and parses the consumer page', async () => {
    getMock.mockResolvedValueOnce({
      data: successEnvelope({
        items: [policyItem],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      }),
    });

    await expect(listPublishedPolicies({ operatorId: OPERATOR_ID })).resolves.toEqual({
      items: [policyItem],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });

    expect(getMock).toHaveBeenCalledWith(
      '/policies',
      expect.objectContaining({
        params: {
          page: 1,
          pageSize: 20,
          operatorId: OPERATOR_ID,
        },
      }),
    );
  });
});

describe('getPublishedPolicy', () => {
  const getMock = jest.mocked(apiClient.get);

  beforeEach(() => {
    getMock.mockReset();
  });

  it('reads a single published Policy by UUID', async () => {
    getMock.mockResolvedValueOnce({ data: successEnvelope(policyItem) });

    await expect(getPublishedPolicy(POLICY_ID)).resolves.toEqual(policyItem);
    expect(getMock).toHaveBeenCalledWith(`/policies/${POLICY_ID}`, undefined);
  });

  it.each([
    'not-a-uuid',
    `${POLICY_ID}/admin`,
    `${POLICY_ID}?all=true`,
  ])('rejects %p before issuing a request', async (policyId) => {
    await expect(getPublishedPolicy(policyId)).rejects.toThrow('Invalid policyId.');
    expect(getMock).not.toHaveBeenCalled();
  });
});
