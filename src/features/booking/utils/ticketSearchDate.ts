import { normalizeAppLocale } from '@shared/utils/format';
import { parseLocalDate } from '@shared/utils/localDate';

/** Format the date shown in the Home ticket-search bar without changing API values. */
export const formatTicketSearchDate = (
  value: string,
  language?: string,
): string => {
  const date = parseLocalDate(value);
  if (!date) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear() % 100).padStart(2, '0');

  return normalizeAppLocale(language) === 'en'
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`;
};
