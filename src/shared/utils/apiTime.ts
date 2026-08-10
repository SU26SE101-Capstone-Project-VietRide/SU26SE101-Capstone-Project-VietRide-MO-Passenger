import { z } from 'zod';

export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

/** Public API instants must include either `Z` or an explicit numeric offset. */
export const apiInstantSchema = z.string().datetime({ offset: true });

/**
 * Helpers from BE `API-timezone-consistency.md` §6.2.
 * Accepts 0–7 fractional second digits; never add +7 client-side.
 */
export const assertBackendInstant = (value: string): string => {
  const parsed = apiInstantSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Backend instant is missing offset or invalid: ${value}`);
  }
  return parsed.data;
};

export const compareInstants = (left: string, right: string): number =>
  Date.parse(assertBackendInstant(left)) - Date.parse(assertBackendInstant(right));

/** Request body/query instant: UTC ISO with `Z` is valid; BE normalizes like `+07:00`. */
export const toRequestInstant = (date: Date = new Date()): string => date.toISOString();

const API_CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isValidCalendarDate = (value: string): boolean => {
  const match = API_CALENDAR_DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

/** Business-calendar values are dates, never instants. */
export const apiCalendarDateSchema = z.string().refine(
  isValidCalendarDate,
  'Invalid YYYY-MM-DD calendar date.',
);

const vietnamBusinessDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: VIETNAM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const toValidInstantDate = (value: string | number | Date): Date => {
  const date = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Cannot resolve an invalid instant to a Vietnam business date.');
  }
  return date;
};

/** Resolve an instant to the authoritative Vietnam business-calendar date. */
export const toVietnamBusinessDate = (
  value: string | number | Date = new Date(),
): string => {
  const parts = vietnamBusinessDateFormatter.formatToParts(
    toValidInstantDate(value),
  );
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Cannot resolve the Vietnam business date.');
  }

  return `${year}-${month}-${day}`;
};

/** Add whole days to a calendar value without using the device timezone. */
export const addApiCalendarDays = (value: string, days: number): string => {
  const dateValue = apiCalendarDateSchema.parse(value);
  if (!Number.isInteger(days)) {
    throw new Error('Calendar day offset must be an integer.');
  }

  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const result = [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');

  return apiCalendarDateSchema.parse(result);
};

export interface ApiInstantRange {
  from?: string;
  to?: string;
}

interface ApiInstantRangeOptions {
  /** History windows are strict; trail windows may include one exact instant. */
  allowEqual?: boolean;
  label?: string;
}

/** Validate explicit offsets and chronological order before a request is sent. */
export const assertApiInstantRange = (
  range: ApiInstantRange,
  options: ApiInstantRangeOptions = {},
): void => {
  const { from, to } = range;
  const label = options.label ?? 'API instant range';

  if (from !== undefined) apiInstantSchema.parse(from);
  if (to !== undefined) apiInstantSchema.parse(to);
  if (from === undefined || to === undefined) return;

  const fromTime = Date.parse(from);
  const toTime = Date.parse(to);
  const isOrdered = options.allowEqual === false
    ? fromTime < toTime
    : fromTime <= toTime;

  if (!isOrdered) {
    const relation = options.allowEqual === false ? 'before' : 'before or equal to';
    throw new Error(`${label} from must be ${relation} to.`);
  }
};
