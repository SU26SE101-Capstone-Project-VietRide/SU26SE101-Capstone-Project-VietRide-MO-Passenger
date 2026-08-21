import { apiClient } from '@shared/api/axiosInstance';
import {
  addParcelClaimEvidence,
  appealParcelClaim,
} from './parcelReliabilityApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const PARCEL_ID = '11111111-1111-4111-8111-111111111111';
const CLAIM_ID = '22222222-2222-4222-8222-222222222222';
const KEY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('Parcel claim mutation input guards', () => {
  const postMock = apiClient.post as jest.Mock;

  beforeEach(() => jest.clearAllMocks());

  it('rejects blank evidence fields locally instead of calling the known 500 path', async () => {
    await expect(addParcelClaimEvidence({
      parcelId: PARCEL_ID,
      claimId: CLAIM_ID,
      evidenceType: 'PHOTO',
      reference: ' ',
      note: null,
    }, KEY)).rejects.toThrow('required');
    expect(postMock).not.toHaveBeenCalled();
  });

  it('rejects a blank appeal reason locally', async () => {
    await expect(appealParcelClaim({
      parcelId: PARCEL_ID,
      claimId: CLAIM_ID,
      reason: ' ',
    }, KEY)).rejects.toThrow('required');
    expect(postMock).not.toHaveBeenCalled();
  });
});
