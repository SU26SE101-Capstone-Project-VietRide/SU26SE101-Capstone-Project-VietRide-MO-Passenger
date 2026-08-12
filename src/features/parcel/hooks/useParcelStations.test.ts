import type { StationSearchResult } from '@features/trip/types';
import i18n from '@shared/i18n';
import { mapParcelStation } from './useParcelStations';

jest.mock('@features/trip/api/stationApi', () => ({
  searchStations: jest.fn(async () => []),
  stationKeys: {
    search: (scope: { mode: string; locationId?: string; locationScopeCode?: string }) =>
      scope.mode === 'hierarchy'
        ? ['stations', 'search', 'hierarchy', scope.locationScopeCode]
        : ['stations', 'search', 'exact', scope.locationId],
  },
}));

const station: StationSearchResult = {
  id: 'station-1',
  name: 'Bến xe Miền Đông',
  city: 'Thành phố Hồ Chí Minh',
  ward: 'Phường Long Bình',
  addressStreet: '501 Hoàng Hữu Nam',
  latitude: 10.877,
  longitude: 106.814,
  supportsShuttle: false,
};

describe('mapParcelStation', () => {
  const previousLanguage = i18n.language;

  afterEach(async () => {
    await i18n.changeLanguage(previousLanguage);
  });

  it('does not invent distance, closest status, rating, hours, or parcel acceptance', () => {
    expect(mapParcelStation(station, 0)).toEqual({
      id: 'station-1',
      name: 'Bến xe Miền Đông',
      address: '501 Hoàng Hữu Nam, Phường Long Bình, Thành phố Hồ Chí Minh',
      distance: null,
      isClosest: false,
      city: 'Thành phố Hồ Chí Minh',
    });
  });

  it('marks the first station closest only when a real distance can be calculated', async () => {
    await i18n.changeLanguage('en');
    const mapped = mapParcelStation(station, 0, {
      latitude: 10.876,
      longitude: 106.813,
    });

    expect(mapped.isClosest).toBe(true);
    expect(mapped.distance).toMatch(/m away|km away/);
  });

  it('formats Vietnamese distance labels when locale is vi', async () => {
    await i18n.changeLanguage('vi');
    const mapped = mapParcelStation(station, 0, {
      latitude: 10.876,
      longitude: 106.813,
    });

    expect(mapped.distance).toMatch(/Cách .* m|Cách .* km/);
  });
});
