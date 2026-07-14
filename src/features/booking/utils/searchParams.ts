import {
  addLocalDays,
  parseLocalDate,
  startOfLocalDay,
  toLocalIsoDate,
} from '@shared/utils/localDate';

export {
  findLocationByName,
  normalizeLocationSearchText,
} from '@features/location/utils/locationSearch';

export const toTripSearchDate = (value: string, now = new Date()): string => {
  const normalized = value.trim();
  const today = startOfLocalDay(now);

  if (normalized === 'Today') {
    return toLocalIsoDate(today);
  }

  if (normalized === 'Tomorrow') {
    return toLocalIsoDate(addLocalDays(today, 1));
  }

  const date = parseLocalDate(normalized);
  if (date) {
    return toLocalIsoDate(date);
  }

  throw new Error('Please select a valid departure date.');
};
