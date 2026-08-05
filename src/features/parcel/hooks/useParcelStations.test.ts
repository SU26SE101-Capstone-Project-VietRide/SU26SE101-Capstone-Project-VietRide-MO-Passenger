import type { StationSearchResult } from '@features/trip/types';
import { mapParcelStation } from './useParcelStations';

jest.mock('@features/trip/api/stationApi', () => ({
  searchStations: jest.fn(async () => []),
  stationKeys: {
    search: (locationId: string) => ['stations', 'search', locationId],
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

  it('marks the first station closest only when a real distance can be calculated', () => {
    const mapped = mapParcelStation(station, 0, {
      latitude: 10.876,
      longitude: 106.813,
    });

    expect(mapped.isClosest).toBe(true);
    expect(mapped.distance).toMatch(/m away|km away/);
  });
});
