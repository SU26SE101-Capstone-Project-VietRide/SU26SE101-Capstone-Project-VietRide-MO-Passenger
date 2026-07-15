import type { Location } from '@features/location/types/location';
import { resolvePopularRoutes } from './popularRoutes';

const location = (id: string, code: string, name: string, isActive = true): Location => ({
  id,
  code,
  name,
  isActive,
  sortOrder: 0,
  type: 'MUNICIPALITY',
});

describe('resolvePopularRoutes', () => {
  it('uses catalog-backed codes and hides unavailable definitions', () => {
    const routes = resolvePopularRoutes([
      location('1', 'HN', 'Thành phố Hà Nội'),
      location('2', 'DN', 'Thành phố Đà Nẵng'),
      location('3', 'HCM', 'Thành phố Hồ Chí Minh'),
    ]);

    expect(routes).toEqual([
      expect.objectContaining({
        id: 'ha-noi-da-nang',
        originCode: 'HN',
        destinationCode: 'DN',
      }),
      expect.objectContaining({
        id: 'ha-noi-ho-chi-minh',
        originCode: 'HN',
        destinationCode: 'HCM',
      }),
    ]);
  });

  it('does not expose an inactive catalog location', () => {
    expect(resolvePopularRoutes([
      location('1', 'HN', 'Hà Nội'),
      location('2', 'DN', 'Đà Nẵng', false),
    ])).toEqual([]);
  });
});
