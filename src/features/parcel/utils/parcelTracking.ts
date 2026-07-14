import type { ParcelDetail } from '../types';
import { formatDate, formatTime } from '@shared/utils/format';

export type ParcelMilestoneStatus = 'active' | 'completed' | 'pending';

export interface ParcelMilestone {
  id: 'created' | 'loaded' | 'in-transit' | 'unloaded' | 'confirmed';
  title: string;
  description: string;
  time: string | null;
  status: ParcelMilestoneStatus;
}

const LOADED_OR_LATER_STATUSES = new Set([
  'LOADED',
  'IN_TRANSIT',
  'UNLOADED',
  'DELIVERED_PENDING_CONFIRM',
  'DELIVERY_CONFIRMED',
]);

const UNLOADED_OR_LATER_STATUSES = new Set([
  'UNLOADED',
  'DELIVERED_PENDING_CONFIRM',
  'DELIVERY_CONFIRMED',
]);

const normalizeStatus = (status?: string | null): string =>
  status?.trim().toUpperCase() || 'PENDING';

export const formatParcelStatusLabel = (status?: string | null): string =>
  normalizeStatus(status)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const isParcelRejected = (
  parcel: Pick<ParcelDetail, 'status' | 'rejectedAt'>,
): boolean => normalizeStatus(parcel.status) === 'REJECTED' || Boolean(parcel.rejectedAt);

export const formatParcelEventTime = (dateLike?: string | null): string | null => {
  if (!dateLike) {
    return null;
  }

  const date = formatDate(dateLike);
  const time = formatTime(dateLike);
  return date && time ? `${time} · ${date}` : null;
};

export function buildParcelMilestones(parcel: ParcelDetail): ParcelMilestone[] {
  const status = normalizeStatus(parcel.status);
  const isRejected = isParcelRejected(parcel);
  const isConfirmed = status === 'DELIVERY_CONFIRMED' || Boolean(parcel.confirmedAt);
  const isAwaitingConfirmation = status === 'DELIVERED_PENDING_CONFIRM';
  const hasReachedConfirmation = isAwaitingConfirmation || isConfirmed
    || Boolean(parcel.deliveredPendingConfirmAt);
  const isCurrentlyUnloaded = status === 'UNLOADED';
  const hasBeenUnloaded = UNLOADED_OR_LATER_STATUSES.has(status)
    || Boolean(parcel.unloadedAt)
    || hasReachedConfirmation;
  const isCurrentlyInTransit = status === 'IN_TRANSIT';
  const isCurrentlyLoaded = status === 'LOADED';
  const hasBeenLoaded = LOADED_OR_LATER_STATUSES.has(status)
    || Boolean(parcel.loadedAt)
    || hasBeenUnloaded;
  const hasMovedBeyondCreation = hasBeenLoaded || hasBeenUnloaded || hasReachedConfirmation;

  return [
    {
      id: 'created',
      title: 'Shipment created',
      description: 'The shipment request was registered.',
      time: formatParcelEventTime(parcel.createdAt),
      status: isRejected || hasMovedBeyondCreation ? 'completed' : 'active',
    },
    {
      id: 'loaded',
      title: 'Load at origin',
      description: 'Origin-terminal loading checkpoint.',
      time: formatParcelEventTime(parcel.loadedAt),
      status: isCurrentlyLoaded
        ? 'active'
        : hasBeenLoaded
          ? 'completed'
          : 'pending',
    },
    {
      id: 'in-transit',
      title: 'In transit',
      description: 'Travel checkpoint between the origin and destination terminals.',
      time: isCurrentlyInTransit ? formatParcelEventTime(parcel.loadedAt) : null,
      status: isCurrentlyInTransit
        ? 'active'
        : hasBeenUnloaded
          ? 'completed'
          : 'pending',
    },
    {
      id: 'unloaded',
      title: 'Unload at destination',
      description: 'Destination-terminal unloading checkpoint.',
      time: formatParcelEventTime(parcel.unloadedAt),
      status: isCurrentlyUnloaded
        ? 'active'
        : hasBeenUnloaded
          ? 'completed'
          : 'pending',
    },
    {
      id: 'confirmed',
      title: 'Pickup confirmation',
      description: 'Recipient pickup-confirmation checkpoint.',
      time: formatParcelEventTime(parcel.confirmedAt),
      status: isConfirmed
        ? 'completed'
        : isAwaitingConfirmation
          ? 'active'
          : 'pending',
    },
  ];
}
