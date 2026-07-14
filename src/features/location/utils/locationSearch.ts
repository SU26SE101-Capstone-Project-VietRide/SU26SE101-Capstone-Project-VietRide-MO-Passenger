import type { Location } from '../types/location';

/** Accent-insensitive, device-locale-independent text used by location search. */
export const normalizeLocationSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (character) => (character === 'đ' ? 'd' : 'D'))
    .trim()
    .toLowerCase();

export const findLocationByName = (
  locations: readonly Location[],
  nameOrCode: string,
): Location | undefined => {
  const target = normalizeLocationSearchText(nameOrCode);
  if (!target) {
    return undefined;
  }

  return locations.find((location) =>
    normalizeLocationSearchText(location.name) === target
    || normalizeLocationSearchText(location.code) === target,
  );
};
