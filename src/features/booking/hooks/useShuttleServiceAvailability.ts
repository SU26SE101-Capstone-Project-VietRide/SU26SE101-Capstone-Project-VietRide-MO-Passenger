import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStationDetail } from '@features/trip/hooks';
import type { BusTrip, DropOffPoint, PickUpPoint, ShuttleServiceDirection } from '../types';
import {
  getShuttleServiceEligibility,
  isDestinationStationDropoff,
  isOriginStationPickup,
  type ShuttleServiceStatus,
} from '../utils/shuttle';

interface UseShuttleServiceAvailabilityParams {
  direction: ShuttleServiceDirection;
  trip: BusTrip | null;
  point: PickUpPoint | DropOffPoint | null;
}

interface ShuttleServiceAvailability {
  status: ShuttleServiceStatus;
  reason?: string;
}

export const useShuttleServiceAvailability = ({
  direction,
  trip,
  point,
}: UseShuttleServiceAvailabilityParams) => {
  const { t } = useTranslation();
  const stationId = trip
    ? direction === 'pickup'
      ? trip.originStationId
      : trip.destinationStationId
    : undefined;
  const stationQuery = useStationDetail(stationId, Boolean(stationId));

  const availability = useMemo<ShuttleServiceAvailability>(() => {
    if (!trip || !point) {
      return {
        status: 'unavailable',
        reason: t(direction === 'pickup'
          ? 'booking.shuttle.reasons.selectTripAndBoarding'
          : 'booking.shuttle.reasons.selectTripAndAlighting'),
      };
    }

    const isTerminalSelected = direction === 'pickup'
      ? isOriginStationPickup(trip, point)
      : isDestinationStationDropoff(trip, point);
    if (!isTerminalSelected) {
      return {
        status: 'unavailable',
        reason: t(direction === 'pickup'
          ? 'booking.shuttle.reasons.departureStationOnly'
          : 'booking.shuttle.reasons.destinationStationOnly'),
      };
    }

    if (stationQuery.isPending) return { status: 'loading' };
    if (stationQuery.isError || !stationQuery.data) return { status: 'error' };

    const eligibility = getShuttleServiceEligibility(
      trip,
      point,
      stationQuery.data,
      direction,
    );
    if (eligibility.eligible) return { status: 'available' };

    const reasonKey = (() => {
      switch (eligibility.reason) {
        case 'BOARDING_POINT':
          return 'booking.shuttle.reasons.departureStationOnly';
        case 'ALIGHTING_POINT':
          return 'booking.shuttle.reasons.destinationStationOnly';
        case 'TRIP_STATUS':
          return 'booking.shuttle.reasons.tripStatus';
        case 'TRIP_SCHEDULE':
          return 'booking.shuttle.reasons.tripSchedule';
        case 'CUTOFF':
          return 'booking.shuttle.reasons.cutoff';
        case 'STATION_INACTIVE':
          return 'booking.shuttle.reasons.stationInactive';
        case 'STATION_UNSUPPORTED':
          return direction === 'pickup'
            ? 'booking.shuttle.reasons.stationUnsupported'
            : 'booking.shuttle.reasons.destinationStationUnsupported';
        case 'STATION_COORDINATES':
          return 'booking.shuttle.reasons.stationCoordinates';
      }
    })();

    return { status: 'unavailable', reason: t(reasonKey) };
  }, [
    direction,
    point,
    stationQuery.data,
    stationQuery.isError,
    stationQuery.isPending,
    t,
    trip,
  ]);

  return {
    ...availability,
    station: stationQuery.data ?? null,
    stationLatitude: stationQuery.data?.latitude ?? null,
    stationLongitude: stationQuery.data?.longitude ?? null,
    refetch: stationQuery.refetch,
  };
};
