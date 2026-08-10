import type { Location } from '../types/location';
import { findLocationByName, normalizeLocationSearchText } from './locationSearch';

const base = {
  parentId: null as string | null,
  parentCode: null as string | null,
  parentName: null as string | null,
  isActive: true,
  sortOrder: 1,
  createdAt: '2026-08-11T00:00:00.000+07:00',
  updatedAt: '2026-08-11T00:00:00.000+07:00',
};

const locations: Location[] = [
  {
    id: '9dc3b96d-bd8e-4e28-aa5a-7862ef7a4a92',
    name: 'Thành phố Hồ Chí Minh',
    code: '79',
    type: 'MUNICIPALITY',
    ...base,
  },
  {
    id: '1ec7e797-ac97-4b61-8a54-837e43cb2353',
    name: 'Đà Nẵng',
    code: '48',
    type: 'MUNICIPALITY',
    ...base,
    sortOrder: 2,
  },
];

describe('location search helpers', () => {
  it('normalizes Vietnamese accents', () => {
    expect(normalizeLocationSearchText('  Đà Nẵng ')).toBe('da nang');
  });

  it('finds by name or code', () => {
    expect(findLocationByName(locations, 'thanh pho ho chi minh')?.code).toBe('79');
    expect(findLocationByName(locations, '48')?.name).toBe('Đà Nẵng');
  });

  it('ignores empty query', () => {
    expect(findLocationByName(locations, '  ')).toBeUndefined();
  });
});
