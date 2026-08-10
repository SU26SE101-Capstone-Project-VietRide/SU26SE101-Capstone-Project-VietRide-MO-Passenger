import {
  parseLocalDate,
  toLocalIsoDate,
} from '@shared/utils/localDate';
import { addApiCalendarDays, toVietnamBusinessDate } from '@shared/utils/apiTime';

export {
  findLocationByName,
  normalizeLocationSearchText,
} from '@features/location/utils/locationSearch';

export const toTripSearchDate = (value: string, now = new Date()): string => {
  const normalized = value.trim();
  const today = toVietnamBusinessDate(now);

  if (normalized === 'Today') {
    return today;
  }

  if (normalized === 'Tomorrow') {
    return addApiCalendarDays(today, 1);
  }

  const date = parseLocalDate(normalized);
  if (date) {
    return toLocalIsoDate(date);
  }

  throw new Error('Please select a valid departure date.');
};
