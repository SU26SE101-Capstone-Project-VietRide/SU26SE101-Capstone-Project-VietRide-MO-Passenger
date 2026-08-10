import { apiClient } from '@shared/api/axiosInstance';

import { listNotifications } from './notificationApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const NOTIFICATION_ID = 'f2cc19e6-2303-4697-84c1-e5e441506239';
const USER_ID = '5b96a936-8f3e-43e5-af5d-ee52a7687d61';
const PARCEL_ID = 'f6b8ef47-c739-49fd-a66c-c85e5ffdb4f5';

const responseWithAction = (action: unknown) => ({
  data: {
    success: true as const,
    statusCode: 200,
    data: {
      items: [{
        id: NOTIFICATION_ID,
        userId: USER_ID,
        type: 'PARCEL_STATUS_CHANGED',
        title: 'Parcel update',
        body: 'Your parcel moved.',
        data: { deepLink: 'vietride://untrusted' },
        action,
        readAt: null,
        createdAt: '2026-08-10T14:05:06+07:00',
      }],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      nextCursor: null,
    },
  },
});

describe('notification REST semantic action', () => {
  const getMock = jest.mocked(apiClient.get);

  beforeEach(() => {
    getMock.mockReset();
  });

  it('keeps a strict validated action and ignores legacy deepLink data', async () => {
    const action = {
      type: 'OPEN_PARCEL_DETAIL',
      params: { parcelId: PARCEL_ID },
    };
    getMock.mockResolvedValueOnce(responseWithAction(action));

    const result = await listNotifications();

    expect(result.items[0]?.action).toEqual(action);
  });

  it.each([
    { type: 'OPEN_PARCEL_DETAIL', params: { parcelId: 'invalid' } },
    {
      type: 'OPEN_PARCEL_DETAIL',
      params: { parcelId: PARCEL_ID, deepLink: 'vietride://untrusted' },
    },
    { type: 'FUTURE_ACTION', params: {} },
  ])('degrades malformed REST action %# to NONE without dropping the inbox page', async (action) => {
    getMock.mockResolvedValueOnce(responseWithAction(action));

    const result = await listNotifications();

    expect(result.items[0]?.action).toEqual({ type: 'NONE', params: {} });
  });
});
