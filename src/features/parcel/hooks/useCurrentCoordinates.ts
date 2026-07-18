/**
 * Backward-compatible Parcel entry point.
 * The implementation is shared so Booking and Parcel cannot drift or request
 * foreground location through competing code paths.
 */
export {
  useCurrentCoordinates,
  type CurrentCoordinates,
} from '@shared/hooks/useCurrentCoordinates';
