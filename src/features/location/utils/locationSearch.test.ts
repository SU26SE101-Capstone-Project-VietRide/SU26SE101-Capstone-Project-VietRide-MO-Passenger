import type { Location } from '../types/location';
import { findLocationByName, normalizeLocationSearchText } from './locationSearch';

const locations = [
  { id: '1', name: 'Thành phố Hồ Chí Minh', code: 'HCM' },
  { id: '2', name: 'Đà Nẵng', code: 'DAD' },
] as Location[];

describe('location search helpers', () => {
  it('normalizes Vietnamese accents and đ deterministically', () => {
    expect(normalizeLocationSearchText('  Đà Nẵng ')).toBe('da nang');
  });

  it('finds a location by accent-insensitive name or code', () => {
    expect(findLocationByName(locations, 'thanh pho ho chi minh')?.code).toBe('HCM');
    expect(findLocationByName(locations, 'dad')?.name).toBe('Đà Nẵng');
  });

  it('does not match an empty query', () => {
    expect(findLocationByName(locations, '  ')).toBeUndefined();
  });
});
