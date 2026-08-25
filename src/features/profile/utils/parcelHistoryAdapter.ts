import type {
  ReceivedParcel,
  SentParcel,
} from '@features/parcel/types';
import type { TrackingTarget } from '@features/tracking/types/trackingTarget';
import type { PassengerParcelHistoryItem } from '../types';

const toTrackingTarget = (
  location: SentParcel['dropoffLocation'] | ReceivedParcel['dropoffLocation'],
): TrackingTarget | null => {
  if (!location?.id) return null;
  const type = location.type?.toUpperCase() ?? '';
  return type.includes('STOP')
    ? { kind: 'STOP', stopId: location.id }
    : { kind: 'STATION', stationId: location.id };
};

export const mapSentParcelToHistoryItem = (
  item: SentParcel,
): PassengerParcelHistoryItem => ({
  type: 'PARCEL',
  id: item.parcelId,
  code: item.parcelCode,
  tripId: item.tripId,
  status: item.status,
  createdAt: item.createdAt,
  totalAmount: item.totalAmount,
  originName: item.originName,
  destinationName: item.destinationName,
  departureDateTime: item.departureDateTime,
  estimatedArrivalTime: item.estimatedArrivalTime,
  paymentRedirectUrl: null,
  trackingTarget: toTrackingTarget(item.dropoffLocation),
  ticket: null,
  parcel: {
    bookingId: item.bookingId,
    recipientName: item.recipientName,
    sizeCategory: item.sizeCategory,
    photoUrl: item.photoUrl,
    deliveryMethod: item.deliveryMethod,
    role: 'SENT',
    reliability: item.reliability,
  },
});

export const mapReceivedParcelToHistoryItem = (
  item: ReceivedParcel,
): PassengerParcelHistoryItem => ({
  type: 'PARCEL',
  id: item.parcelId,
  code: item.parcelCode,
  tripId: item.tripId,
  status: item.status,
  createdAt: item.createdAt,
  totalAmount: 0,
  originName: item.originStation?.name ?? null,
  destinationName: item.destinationStation?.name ?? null,
  departureDateTime: null,
  estimatedArrivalTime: item.eta,
  paymentRedirectUrl: null,
  trackingTarget: toTrackingTarget(item.dropoffLocation),
  ticket: null,
  parcel: {
    bookingId: null,
    recipientName: item.recipientName ?? '',
    sizeCategory: item.sizeCategory,
    photoUrl: null,
    deliveryMethod: 'TERMINAL_PICKUP',
    role: 'RECEIVED',
    reliability: item.reliability,
  },
});
