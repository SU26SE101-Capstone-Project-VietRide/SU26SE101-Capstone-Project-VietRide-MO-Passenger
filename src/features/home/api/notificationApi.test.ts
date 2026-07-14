import { apiClient } from '@shared/api/axiosInstance';
import { markNotificationRead } from './notificationApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const NOTIFICATION_ID = '7da4c38b-3540-4c0e-b7f3-bca6a0c642ca';

describe('markNotificationRead', () => {
  const postMock = jest.mocked(apiClient.post);

  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts to the validated notification resource', async () => {
    postMock.mockResolvedValueOnce({});

    await markNotificationRead(NOTIFICATION_ID);

    expect(postMock).toHaveBeenCalledWith(
      `/notifications/${NOTIFICATION_ID}/read`,
    );
  });

  it.each([
    'not-a-uuid',
    `${NOTIFICATION_ID}/read`,
    `${NOTIFICATION_ID}?all=true`,
  ])('rejects %p before issuing a request', async (notificationId) => {
    await expect(markNotificationRead(notificationId)).rejects.toThrow(
      'Invalid notificationId.',
    );
    expect(postMock).not.toHaveBeenCalled();
  });
});
