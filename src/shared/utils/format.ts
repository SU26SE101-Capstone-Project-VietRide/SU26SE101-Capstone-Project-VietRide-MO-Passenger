/**
 * Format Utilities — Pure formatting helpers
 */

/**
 * Format a number as Vietnamese Dong currency.
 * Example: 150000 → "150.000₫"
 */
export function formatVND(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}₫`;
}

/**
 * Format a date string to a human-readable format.
 * Example: "2025-06-15T08:00:00Z" → "15/06/2025"
 */
export function formatDate(dateString: string, locale = 'vi-VN'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format a date string to time only.
 * Example: "2025-06-15T08:30:00Z" → "08:30"
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format a phone number to Vietnamese format.
 * Example: "0912345678" → "091 234 5678"
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Calculate estimated time of arrival in minutes.
 */
export function formatETA(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}
