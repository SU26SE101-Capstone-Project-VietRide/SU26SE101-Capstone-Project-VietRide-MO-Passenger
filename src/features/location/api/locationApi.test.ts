import { apiClient } from '@shared/api/axiosInstance';
import { getLocations } from './locationApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: { get: jest.fn() },
}));

const mockGet = jest.mocked(apiClient.get);

const root = {
  id: '9dc3b96d-bd8e-4e28-aa5a-7862ef7a4a92',
  code: '79',
  name: 'Thành phố Hồ Chí Minh',
  type: 'MUNICIPALITY',
  parentId: null,
  parentCode: null,
  parentName: null,
  isActive: true,
  sortOrder: 28,
  createdAt: '2026-08-11T00:00:00.000+07:00',
  updatedAt: '2026-08-11T00:00:00.000+07:00',
};

describe('getLocations (BE contract)', () => {
  beforeEach(() => mockGet.mockReset());

  it('calls GET /locations with no query for roots', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, statusCode: 200, data: [root] },
    });

    const rows = await getLocations();
    expect(mockGet).toHaveBeenCalledWith('/locations', { params: {} });
    expect(rows).toEqual([root]);
  });

  it('calls GET /locations?parentCode=&search= for children', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, statusCode: 200, data: [] },
    });

    await getLocations({ parentCode: '79', search: 'Vung' });
    expect(mockGet).toHaveBeenCalledWith('/locations', {
      params: { parentCode: '79', search: 'Vung' },
    });
  });
});
