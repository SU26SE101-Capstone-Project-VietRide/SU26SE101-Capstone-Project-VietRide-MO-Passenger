/** Pure, allocation-conscious display formatters shared by mobile features. */

import i18n from '@shared/i18n';

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

const toValidDate = (dateLike: string | number | Date): Date | null => {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return Number.isNaN(date.getTime()) ? null : date;
};

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
  const date = toValidDate(dateLike);
  if (!date) {
    return '';
  }

  let formatter = dateFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    dateFormatters.set(locale, formatter);
  }

  return formatter.format(date);
}

/** Format a date without a year, for compact list metadata. */
export function formatShortDate(
  dateLike: string | number | Date,
  locale = getActiveIntlLocale(),
): string {
  const date = toValidDate(dateLike);
  if (!date) {
    return '';
  }

  let formatter = shortDateFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
    });
    shortDateFormatters.set(locale, formatter);
  }

  return formatter.format(date);
}

/** Format the month and year with a cached locale-aware formatter. */
export function formatMonthYear(
  dateLike: string | number | Date,
  locale = getActiveIntlLocale(),
): string {
  const date = toValidDate(dateLike);
  if (!date) {
    return '';
  }

  let formatter = monthYearFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    });
    monthYearFormatters.set(locale, formatter);
  }

  return formatter.format(date);
}

/** Format a compact local date and time without constructing Intl per render. */
export function formatDateTime(
  dateLike: string | number | Date,
  locale = getActiveIntlLocale(),
): string {
  const date = toValidDate(dateLike);
  if (!date) {
    return '';
  }

  let formatter = dateTimeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    dateTimeFormatters.set(locale, formatter);
  }

  let day: string | undefined;
  let month: string | undefined;
  let year: string | undefined;
  let hour: string | undefined;
  let minute: string | undefined;

  for (const part of formatter.formatToParts(date)) {
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
  const date = toValidDate(dateLike);
  if (!date) {
    return '';
  }

  let formatter = timeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    timeFormatters.set(locale, formatter);
  }

  return formatter.format(date);
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
