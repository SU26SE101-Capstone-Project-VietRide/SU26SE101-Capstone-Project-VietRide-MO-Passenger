import type { Seat } from '../types';

export type SeatBadgeScope = 'trip' | 'outbound' | 'return';

export interface SeatBadgeItem {
  key: string;
  label: string;
}

interface BuildSeatBadgeItemsOptions {
  scope: SeatBadgeScope;
  tripId?: string;
  labelPrefix?: string;
}

interface SeatBadgeLegSource {
  seats: readonly Seat[];
  tripId?: string;
}

interface BuildBookingSeatBadgesOptions {
  isRoundTrip: boolean;
  oneWay: SeatBadgeLegSource;
  outbound?: SeatBadgeLegSource;
  returnLeg?: SeatBadgeLegSource;
  outboundLabel: string;
  returnLabel: string;
}

/** Keeps UI identity leg-scoped while leaving BE seatNumber untouched. */
export const buildSeatBadgeItems = (
  seats: readonly Seat[],
  { scope, tripId, labelPrefix }: BuildSeatBadgeItemsOptions,
): SeatBadgeItem[] => {
  const identity = tripId?.trim() || 'pending';

  return seats.map((seat) => ({
    key: `${scope}:${identity}:${seat.id}`,
    label: labelPrefix
      ? `${labelPrefix} · ${seat.label || seat.id}`
      : seat.label || seat.id,
  }));
};

export const buildBookingSeatBadges = ({
  isRoundTrip,
  oneWay,
  outbound,
  returnLeg,
  outboundLabel,
  returnLabel,
}: BuildBookingSeatBadgesOptions): SeatBadgeItem[] => {
  if (!isRoundTrip) {
    return buildSeatBadgeItems(oneWay.seats, {
      scope: 'trip',
      tripId: oneWay.tripId,
    });
  }

  return [
    ...buildSeatBadgeItems(outbound?.seats ?? [], {
      scope: 'outbound',
      tripId: outbound?.tripId,
      labelPrefix: outboundLabel,
    }),
    ...buildSeatBadgeItems(returnLeg?.seats ?? [], {
      scope: 'return',
      tripId: returnLeg?.tripId,
      labelPrefix: returnLabel,
    }),
  ];
};
