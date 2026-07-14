const ISO_LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_LOCAL_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const createValidatedLocalDate = (
  year: number,
  month: number,
  day: number,
): Date | null => {
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);

  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    ? date
    : null;
};

export const startOfLocalDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/** Parse a date-only value without converting it through UTC. */
export const parseLocalDate = (value: string): Date | null => {
  const normalized = value.trim();
  const isoMatch = ISO_LOCAL_DATE_PATTERN.exec(normalized);
  if (isoMatch) {
    return createValidatedLocalDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  const displayMatch = DISPLAY_LOCAL_DATE_PATTERN.exec(normalized);
  if (displayMatch) {
    return createValidatedLocalDate(
      Number(displayMatch[3]),
      Number(displayMatch[2]),
      Number(displayMatch[1]),
    );
  }

  return null;
};

export const isValidLocalDate = (value: string): boolean =>
  parseLocalDate(value) !== null;

export const toLocalIsoDate = (date: Date): string => {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Cannot format an invalid local date.');
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toLocalDisplayDate = (date: Date): string => {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Cannot format an invalid local date.');
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

export const addLocalDays = (date: Date, days: number): Date => {
  const result = startOfLocalDay(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const compareLocalDates = (left: Date, right: Date): number =>
  startOfLocalDay(left).getTime() - startOfLocalDay(right).getTime();
