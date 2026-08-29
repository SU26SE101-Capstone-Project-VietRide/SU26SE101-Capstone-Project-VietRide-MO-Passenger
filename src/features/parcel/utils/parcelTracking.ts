import type { ParcelDetail, ParcelReliabilityTrip } from '../types';
import i18n from '@shared/i18n';
import { formatDate, formatTime } from '@shared/utils/format';
import { getParcelStatusPresentation } from './parcelPresentation';

export type ParcelMilestoneStatus = 'active' | 'completed' | 'pending';

export interface ParcelMilestone {
  id: 'created' | 'loaded' | 'in-transit' | 'unloaded' | 'confirmed';
  titleKey: string;
  descriptionKey: string;
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

const TRACKABLE_PARCEL_STATUSES = new Set([
  'PENDING',
  'LOADED',
  'IN_TRANSIT',
  'UNLOADED',
  'DELIVERED_PENDING_CONFIRM',
  'DELIVERY_CONFIRMED',
  'DELIVERY_REJECTED',
  'PENDING_OPERATOR_ACTION',
  'PENDING_TRANSFER_CONFIRM',
  'TRANSFER_ESCALATED',
]);

const TERMINAL_LOCATION_STATUSES = new Set([
  'DELIVERY_CONFIRMED',
  'RETURNED',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
]);

const normalizeStatus = (status?: string | null): string =>
  status?.trim().toUpperCase() || 'PENDING';

export const formatParcelStatusLabel = (status?: string | null): string =>
  i18n.t(getParcelStatusPresentation(status).labelKey);

export const isParcelRejected = (
  parcel: Pick<ParcelDetail, 'status' | 'rejectedAt'>,
): boolean => ['DELIVERY_REJECTED', 'REJECTED'].includes(normalizeStatus(parcel.status))
  || Boolean(parcel.rejectedAt);

/** Mirrors the public Tracking authorization allow-list in Parcel BE. */
export const isParcelTrackingEligible = (status?: string | null): boolean => {
  const normalizedStatus = status?.trim().toUpperCase();
  return normalizedStatus ? TRACKABLE_PARCEL_STATUSES.has(normalizedStatus) : false;
};

/**
 * Selects the only trip Passenger may subscribe to for this parcel.
 *
 * During vehicle substitution BE keeps `trip` on the source trip until the
 * replacement crew confirms the parcel handoff. `forwardingTrip` is therefore
 * a candidate context, not proof that the parcel is already on that vehicle.
 * While confirmation is pending, never show GPS from the disrupted source
 * trip; switch to the replacement trip only after BE reports it IN_PROGRESS.
 */
export const resolveParcelLiveTrackingTrip = ({
  parcelStatus,
  trip,
  forwardingTrip,
}: {
  parcelStatus?: string | null;
  trip: ParcelReliabilityTrip;
  forwardingTrip?: ParcelReliabilityTrip | null;
}): ParcelReliabilityTrip | null => {
  const normalizedStatus = normalizeStatus(parcelStatus);
  if (!isParcelTrackingEligible(normalizedStatus)) return null;

  if (
    normalizedStatus === 'PENDING_TRANSFER_CONFIRM'
    || normalizedStatus === 'TRANSFER_ESCALATED'
  ) {
    return forwardingTrip?.status?.trim().toUpperCase() === 'IN_PROGRESS'
      ? forwardingTrip
      : null;
  }

  return trip;
};

/**
 * Stops location work only after the parcel can no longer require vehicle
 * movement. DELIVERY_REJECTED deliberately remains live because BE may move
 * it into the return flow after the recipient's undo window.
 */
export const isParcelLocationTrackingTerminal = (status?: string | null): boolean => {
  const normalizedStatus = status?.trim().toUpperCase();
  return normalizedStatus ? TERMINAL_LOCATION_STATUSES.has(normalizedStatus) : false;
};

export const formatParcelEventTime = (
  dateLike?: string | null,
  locale?: string,
): string | null => {
  if (!dateLike) {
    return null;
  }

  const date = formatDate(dateLike, locale);
  const time = formatTime(dateLike, locale);
  return date && time ? `${time} · ${date}` : null;
};

export function buildParcelMilestones(
  parcel: ParcelDetail,
  locale?: string,
): ParcelMilestone[] {
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
      titleKey: 'parcel.tracking.timeline.created.title',
      descriptionKey: 'parcel.tracking.timeline.created.description',
      time: formatParcelEventTime(parcel.createdAt, locale),
      status: isRejected || hasMovedBeyondCreation ? 'completed' : 'active',
    },
    {
      id: 'loaded',
      titleKey: 'parcel.tracking.timeline.loaded.title',
      descriptionKey: 'parcel.tracking.timeline.loaded.description',
      time: formatParcelEventTime(parcel.loadedAt, locale),
      status: isCurrentlyLoaded
        ? 'active'
        : hasBeenLoaded
          ? 'completed'
          : 'pending',
    },
    {
      id: 'in-transit',
      titleKey: 'parcel.tracking.timeline.inTransit.title',
      descriptionKey: 'parcel.tracking.timeline.inTransit.description',
      time: isCurrentlyInTransit
        ? formatParcelEventTime(parcel.loadedAt, locale)
        : null,
      status: isCurrentlyInTransit
        ? 'active'
        : hasBeenUnloaded
          ? 'completed'
          : 'pending',
    },
    {
      id: 'unloaded',
      titleKey: 'parcel.tracking.timeline.unloaded.title',
      descriptionKey: 'parcel.tracking.timeline.unloaded.description',
      time: formatParcelEventTime(parcel.unloadedAt, locale),
      status: isCurrentlyUnloaded
        ? 'active'
        : hasBeenUnloaded
          ? 'completed'
          : 'pending',
    },
    {
      id: 'confirmed',
      titleKey: 'parcel.tracking.timeline.confirmed.title',
      descriptionKey: 'parcel.tracking.timeline.confirmed.description',
      time: formatParcelEventTime(parcel.confirmedAt, locale),
      status: isConfirmed
        ? 'completed'
        : isAwaitingConfirmation
          ? 'active'
          : 'pending',
    },
  ];
}
