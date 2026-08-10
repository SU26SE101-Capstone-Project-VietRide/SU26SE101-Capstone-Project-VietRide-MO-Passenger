import type { Location } from '@features/location/types/location';
import { resolvePopularRoutes } from './popularRoutes';

const location = (
  id: string,
  code: string,
  name: string,
  isActive = true,
): Location => ({
  id,
  code,
  name,
  type: 'MUNICIPALITY',
  parentId: null,
  parentCode: null,
  parentName: null,
  isActive,
  sortOrder: 0,
  createdAt: '2026-08-11T00:00:00.000+07:00',
  updatedAt: '2026-08-11T00:00:00.000+07:00',
});

describe('resolvePopularRoutes', () => {
  it('uses catalog-backed codes and hides unavailable definitions', () => {
    const routes = resolvePopularRoutes([
      location('1', '01', 'Thành phố Hà Nội'),
      location('2', '48', 'Thành phố Đà Nẵng'),
      location('3', '79', 'Thành phố Hồ Chí Minh'),
    ]);

    expect(routes).toEqual([
      expect.objectContaining({
        id: 'ha-noi-da-nang',
        originCode: '01',
        destinationCode: '48',
      }),
      expect.objectContaining({
        id: 'ha-noi-ho-chi-minh',
        originCode: '01',
        destinationCode: '79',
      }),
    ]);
  });

  it('does not expose an inactive catalog location', () => {
    expect(resolvePopularRoutes([
      location('1', '01', 'Hà Nội'),
      location('2', '48', 'Đà Nẵng', false),
    ])).toEqual([]);
  });
});
