import type { Location } from '@features/location/types/location';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DISPLAY_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const toLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toTripSearchDate = (value: string): string => {
  const normalized = value.trim();

  if (!normalized || normalized === 'Today') {
    return toLocalIsoDate(new Date());
  }

  if (normalized === 'Tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toLocalIsoDate(tomorrow);
  }

  if (ISO_DATE_PATTERN.test(normalized)) {
    return normalized;
  }

  const displayDate = DISPLAY_DATE_PATTERN.exec(normalized);
  if (displayDate) {
    const [, day, month, year] = displayDate;
    return `${year}-${month}-${day}`;
  }

  throw new Error('Please select a valid departure date.');
};

export const normalizeLocationSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLocaleLowerCase();

export const findLocationByName = (
  locations: readonly Location[],
  nameOrCode: string,
): Location | undefined => {
  const target = normalizeLocationSearchText(nameOrCode);
  return locations.find((location) => {
    return normalizeLocationSearchText(location.name) === target
      || normalizeLocationSearchText(location.code) === target;
  });
};
