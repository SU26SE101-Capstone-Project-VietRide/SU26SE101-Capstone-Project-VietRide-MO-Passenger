export const MIN_BOOKING_SEATS = 1;
export const MAX_BOOKING_SEATS = 5;

export const normalizeBookingSeatCount = (value: number): number => {
  if (!Number.isFinite(value)) return MIN_BOOKING_SEATS;

  return Math.min(
    MAX_BOOKING_SEATS,
    Math.max(MIN_BOOKING_SEATS, Math.trunc(value)),
  );
};

export const isValidBookingSeatCount = (value: number): boolean =>
  Number.isInteger(value)
  && value >= MIN_BOOKING_SEATS
  && value <= MAX_BOOKING_SEATS;
