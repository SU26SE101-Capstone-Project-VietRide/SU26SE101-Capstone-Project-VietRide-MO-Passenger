import type { BookingResult, RoundTripResult } from '../types/booking';

const normalizeReference = (value: string): string | null => {
  const reference = value.trim();
  return reference.length > 0 ? reference : null;
};

/** Returns only booking references issued by the booking API. */
export function getBookingReference(
  result: BookingResult | RoundTripResult | null,
): string | null {
  if (!result) {
    return null;
  }

  if ('bookingCode' in result) {
    return normalizeReference(result.bookingCode);
  }

  const outboundReference = normalizeReference(result.outbound.bookingCode);
  const returnReference = normalizeReference(result.return.bookingCode);

  if (!outboundReference || !returnReference) {
    return null;
  }

  return `${outboundReference}/${returnReference}`;
}
