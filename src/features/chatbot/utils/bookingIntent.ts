import type { Location } from '@features/location/types/location';
import { normalizeLocationSearchText } from '@features/location/utils/locationSearch';
import type { ChatBookingDraft } from '../types/chatbot';
import { normalizeBookingSeatCount } from '@features/booking/constants/bookingLimits';
const BOOKING_TERMS = [
  'dat ve',
  'mua ve',
  'tim chuyen',
  'tim xe',
  'book ticket',
  'book a ticket',
  'book trip',
  'find a bus',
];

const normalize = (value: string): string =>
  normalizeLocationSearchText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const aliasesForLocation = (location: Location): string[] => {
  const normalizedName = normalize(location.name);
  const withoutAdministrativePrefix = normalizedName.replace(
    /^(?:tinh|thanh pho|tp)\s+/,
    '',
  );

  return Array.from(new Set([
    normalizedName,
    withoutAdministrativePrefix,
    normalize(location.code),
  ])).filter((alias) => alias.length >= 2);
};

const phraseIndex = (text: string, phrase: string): number => {
  const paddedText = ` ${text} `;
  const index = paddedText.indexOf(` ${phrase} `);
  return index < 0 ? -1 : Math.max(0, index - 1);
};

const findLocationInText = (
  text: string,
  locations: readonly Location[],
): Location | undefined => {
  const normalizedText = normalize(text);

  return locations
    .flatMap((location) =>
      aliasesForLocation(location).map((alias) => ({ location, alias })),
    )
    .filter(({ alias }) => phraseIndex(normalizedText, alias) >= 0)
    .sort((a, b) => b.alias.length - a.alias.length)[0]?.location;
};

const findMentionedLocations = (
  text: string,
  locations: readonly Location[],
): Location[] => {
  const normalizedText = normalize(text);
  const matches = locations.flatMap((location) => {
    const bestMatch = aliasesForLocation(location)
      .map((alias) => ({ alias, index: phraseIndex(normalizedText, alias) }))
      .filter(({ index }) => index >= 0)
      .sort((a, b) => b.alias.length - a.alias.length)[0];

    return bestMatch ? [{ location, ...bestMatch }] : [];
  });

  return matches
    .sort((a, b) => a.index - b.index || b.alias.length - a.alias.length)
    .map(({ location }) => location);
};

const toValidatedDisplayDate = (
  dayValue: string,
  monthValue: string,
  yearValue: string | undefined,
  now: Date,
): string | undefined => {
  const day = Number.parseInt(dayValue, 10);
  const month = Number.parseInt(monthValue, 10);
  let year = yearValue ? Number.parseInt(yearValue, 10) : now.getFullYear();

  const isValidDate = (candidateYear: number): boolean => {
    const date = new Date(candidateYear, month - 1, day);
    return date.getFullYear() === candidateYear
      && date.getMonth() === month - 1
      && date.getDate() === day;
  };

  if (!isValidDate(year)) return undefined;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let candidate = new Date(year, month - 1, day);
  if (candidate < today) {
    if (yearValue) return undefined;
    year += 1;
    if (!isValidDate(year)) return undefined;
    candidate = new Date(year, month - 1, day);
  }

  return `${String(candidate.getDate()).padStart(2, '0')}/${String(candidate.getMonth() + 1).padStart(2, '0')}/${candidate.getFullYear()}`;
};

const extractDate = (message: string, now: Date): string | undefined => {
  const normalizedMessage = normalize(message);

  if (/\b(?:ngay mai|tomorrow)\b/.test(normalizedMessage)) {
    return 'Tomorrow';
  }
  if (/\b(?:hom nay|today)\b/.test(normalizedMessage)) {
    return 'Today';
  }

  const isoDate = message.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return toValidatedDisplayDate(day, month, year, now);
  }

  const displayDate = message.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/);
  if (displayDate) {
    const [, day, month, year] = displayDate;
    return toValidatedDisplayDate(day, month, year, now);
  }

  return undefined;
};

const extractPassengers = (message: string): number | undefined => {
  const normalizedMessage = normalize(message);
  const match = normalizedMessage.match(
    /\b(\d+)\s*(?:nguoi|hanh khach|ve|ghe|passengers?|tickets?|seats?)\b/,
  );
  if (!match) return undefined;

  return normalizeBookingSeatCount(Number.parseInt(match[1], 10));
};

/**
 * Extracts only deterministic, catalog-backed booking fields from the user's own text.
 * AI response text is intentionally never used to execute an app action.
 */
export const extractBookingDraft = (
  message: string,
  locations: readonly Location[],
  now = new Date(),
  previousDraft?: ChatBookingDraft,
): ChatBookingDraft | undefined => {
  const normalizedMessage = normalize(message);
  const hasRoutePhrase = /\b(?:tu|from)\b.+\b(?:den|toi|to)\b/.test(normalizedMessage);
  const hasBookingIntent = BOOKING_TERMS.some((term) => normalizedMessage.includes(term));

  if (!previousDraft && !hasBookingIntent && !hasRoutePhrase) {
    return undefined;
  }

  const routeMatch = normalizedMessage.match(
    /\b(?:tu|from)\s+(.+?)\s+(?:den|toi|to)\s+(.+)$/,
  );
  const mentionedLocations = findMentionedLocations(normalizedMessage, locations);
  const originOnlyMatch = normalizedMessage.match(/\b(?:tu|from)\s+(.+)$/);
  const destinationOnlyMatch = normalizedMessage.match(/\b(?:di|den|toi|to)\s+(.+)$/);

  const detectedOrigin = routeMatch
    ? findLocationInText(routeMatch[1], locations) ?? mentionedLocations[0]
    : mentionedLocations.length >= 2
      ? mentionedLocations[0]
      : originOnlyMatch
        ? findLocationInText(originOnlyMatch[1], locations)
        : undefined;
  const detectedDestination = routeMatch
    ? findLocationInText(routeMatch[2], locations)
      ?? mentionedLocations.find((location) => location.id !== detectedOrigin?.id)
    : mentionedLocations.length >= 2
      ? mentionedLocations.find((location) => location.id !== detectedOrigin?.id)
      : destinationOnlyMatch
        ? findLocationInText(destinationOnlyMatch[1], locations)
        : undefined;
  const detectedDate = extractDate(message, now);
  const detectedPassengers = extractPassengers(message);
  const hasDraftSignal = hasBookingIntent
    || hasRoutePhrase
    || Boolean(originOnlyMatch || destinationOnlyMatch)
    || mentionedLocations.length >= 2
    || Boolean(detectedDate || detectedPassengers);

  if (!hasDraftSignal) return undefined;

  const origin = detectedOrigin ?? previousDraft?.origin;
  const destination = detectedDestination ?? previousDraft?.destination;
  const date = detectedDate ?? previousDraft?.date;
  const passengers = detectedPassengers ?? previousDraft?.passengers;

  return {
    origin,
    destination,
    date,
    passengers,
    isReadyToSearch: Boolean(origin && destination && date && origin.id !== destination.id),
  };
};
