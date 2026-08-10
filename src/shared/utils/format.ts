/** Pure, allocation-conscious display formatters shared by mobile features. */

import i18n from '@shared/i18n';
import {
  apiCalendarDateSchema,
  apiInstantSchema,
  VIETNAM_TIME_ZONE,
} from '@shared/utils/apiTime';

export type VndDisplay = 'symbol' | 'code';

const vndFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const shortDateFormatters = new Map<string, Intl.DateTimeFormat>();
const monthYearFormatters = new Map<string, Intl.DateTimeFormat>();
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const timeFormatters = new Map<string, Intl.DateTimeFormat>();

export type SupportedLocale = 'en' | 'vi';

export const normalizeAppLocale = (language?: string): SupportedLocale =>
  language?.toLowerCase().startsWith('en') ? 'en' : 'vi';

export const toIntlLocale = (language?: string): string =>
  normalizeAppLocale(language) === 'en' ? 'en-US' : 'vi-VN';

export const getActiveIntlLocale = (): string =>
  toIntlLocale(i18n.resolvedLanguage ?? i18n.language);

interface ResolvedDisplayDate {
  date: Date;
  timeZone?: string;
}

const toValidDate = (
  dateLike: string | number | Date,
): ResolvedDisplayDate | null => {
  if (typeof dateLike === 'string') {
    const calendarResult = apiCalendarDateSchema.safeParse(dateLike);
    if (calendarResult.success) {
      const [year, month, day] = calendarResult.data.split('-').map(Number);
      return {
        date: new Date(Date.UTC(year, month - 1, day)),
        timeZone: 'UTC',
      };
    }

    const instantResult = apiInstantSchema.safeParse(dateLike);
    if (!instantResult.success) return null;

    return {
      date: new Date(instantResult.data),
      timeZone: VIETNAM_TIME_ZONE,
    };
  }

  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;

  return { date };
};

const dateFormatterKey = (locale: string, timeZone?: string): string =>
  `${locale}:${timeZone ?? 'device'}`;

/**
 * Format a number as Vietnamese Dong currency.
 * Example: 150000 → "150.000₫"
 */
export function formatVnd(
  amount: number,
  options: {
    display?: VndDisplay;
    clampNegative?: boolean;
    locale?: string;
  } = {},
): string {
  const finiteAmount = Number.isFinite(amount) ? amount : 0;
  const normalizedAmount = options.clampNegative
    ? Math.max(finiteAmount, 0)
    : finiteAmount;

  const display = options.display ?? 'symbol';
  const locale = options.locale ?? getActiveIntlLocale();
  const formatterKey = `${locale}:${display}`;
  let formatter = vndFormatters.get(formatterKey);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'VND',
      currencyDisplay: display === 'code' ? 'code' : 'narrowSymbol',
      maximumFractionDigits: 0,
    });
    vndFormatters.set(formatterKey, formatter);
  }

  return formatter.format(normalizedAmount);
}

/**
 * Format a date string to a human-readable format.
 * Example: "2025-06-15T08:00:00Z" → "15/06/2025"
 */
export function formatDate(
  dateLike: string | number | Date,
  locale = getActiveIntlLocale(),
): string {
  const resolved = toValidDate(dateLike);
  if (!resolved) {
    return '';
  }

  const formatterKey = dateFormatterKey(locale, resolved.timeZone);
  let formatter = dateFormatters.get(formatterKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(resolved.timeZone ? { timeZone: resolved.timeZone } : {}),
    });
    dateFormatters.set(formatterKey, formatter);
  }

  return formatter.format(resolved.date);
}

/** Format a date without a year, for compact list metadata. */
export function formatShortDate(
  dateLike: string | number | Date,
  locale = getActiveIntlLocale(),
): string {
  const resolved = toValidDate(dateLike);
  if (!resolved) {
    return '';
  }

  const formatterKey = dateFormatterKey(locale, resolved.timeZone);
  let formatter = shortDateFormatters.get(formatterKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      ...(resolved.timeZone ? { timeZone: resolved.timeZone } : {}),
    });
    shortDateFormatters.set(formatterKey, formatter);
  }

  return formatter.format(resolved.date);
}

/** Format the month and year with a cached locale-aware formatter. */
export function formatMonthYear(
  dateLike: string | number | Date,
  locale = getActiveIntlLocale(),
): string {
  const resolved = toValidDate(dateLike);
  if (!resolved) {
    return '';
  }

  const formatterKey = dateFormatterKey(locale, resolved.timeZone);
  let formatter = monthYearFormatters.get(formatterKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
      ...(resolved.timeZone ? { timeZone: resolved.timeZone } : {}),
    });
    monthYearFormatters.set(formatterKey, formatter);
  }

  return formatter.format(resolved.date);
}

/** Format a compact local date and time without constructing Intl per render. */
export function formatDateTime(
  dateLike: string | number | Date,
  locale = getActiveIntlLocale(),
): string {
  const resolved = toValidDate(dateLike);
  if (!resolved) {
    return '';
  }

  const formatterKey = dateFormatterKey(locale, resolved.timeZone);
  let formatter = dateTimeFormatters.get(formatterKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      ...(resolved.timeZone ? { timeZone: resolved.timeZone } : {}),
    });
    dateTimeFormatters.set(formatterKey, formatter);
  }

  let day: string | undefined;
  let month: string | undefined;
  let year: string | undefined;
  let hour: string | undefined;
  let minute: string | undefined;

  for (const part of formatter.formatToParts(resolved.date)) {
    switch (part.type) {
      case 'day': day = part.value; break;
      case 'month': month = part.value; break;
      case 'year': year = part.value; break;
      case 'hour': hour = part.value; break;
      case 'minute': minute = part.value; break;
      default: break;
    }
  }

  if (!day || !month || !year || !hour || !minute) {
    return '';
  }

  return `${day}/${month}/${year} ${hour}:${minute}`;
}

/**
 * Format a date string to time only.
 * Example: "2025-06-15T08:30:00Z" → "08:30"
 */
export function formatTime(
  dateLike: string | number | Date,
  locale = getActiveIntlLocale(),
): string {
  const resolved = toValidDate(dateLike);
  if (!resolved) {
    return '';
  }

  const formatterKey = dateFormatterKey(locale, resolved.timeZone);
  let formatter = timeFormatters.get(formatterKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      ...(resolved.timeZone ? { timeZone: resolved.timeZone } : {}),
    });
    timeFormatters.set(formatterKey, formatter);
  }

  return formatter.format(resolved.date);
}

/** Format a non-negative duration as `mm:ss` for OTP/session countdowns. */
export function formatCountdown(seconds: number): string {
  const normalizedSeconds = Number.isFinite(seconds)
    ? Math.max(0, Math.floor(seconds))
    : 0;
  const minutes = Math.floor(normalizedSeconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (normalizedSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}
