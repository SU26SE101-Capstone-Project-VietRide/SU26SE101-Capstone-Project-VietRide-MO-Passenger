import { apiClient } from '@shared/api/axiosInstance';
import type { ApiSuccessEnvelope } from '@shared/api/errors';
import type { ParcelDetail } from '../types';
import { getParcelDetail } from './parcelApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const PARCEL_ID = '4d680b5f-8a94-4f26-9f5b-413bd1221e02';

describe('getParcelDetail', () => {
  const getMock = jest.mocked(apiClient.get);

  beforeEach(() => {
    getMock.mockReset();
  });

  it('uses a validated UUID as the only dynamic path segment', async () => {
    const detail = { id: PARCEL_ID } as unknown as ParcelDetail;
    const envelope: ApiSuccessEnvelope<ParcelDetail> = {
      success: true,
      statusCode: 200,
      data: detail,
    };
    getMock.mockResolvedValueOnce({ data: envelope });

    await expect(getParcelDetail(PARCEL_ID)).resolves.toBe(detail);
    expect(getMock).toHaveBeenCalledWith(`/parcels/${PARCEL_ID}`);
  });

  it.each([
    'not-a-uuid',
    `${PARCEL_ID}/status`,
    `${PARCEL_ID}?include=private`,
  ])('rejects %p before issuing a request', async (parcelId) => {
    await expect(getParcelDetail(parcelId)).rejects.toThrow('Invalid parcelId.');
    expect(getMock).not.toHaveBeenCalled();
  });
});
