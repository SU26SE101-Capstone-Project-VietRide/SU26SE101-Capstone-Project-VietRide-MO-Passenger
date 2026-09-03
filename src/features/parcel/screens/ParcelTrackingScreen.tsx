/**
 * Backward-compatible import boundary for the passenger parcel tracking flow.
 *
 * ParcelReliabilityScreen is the single canonical implementation used by the
 * navigator. Keep this alias so older direct imports do not silently diverge
 * into a second tracking UI.
 */
export { ParcelReliabilityScreen as ParcelTrackingScreen } from './ParcelReliabilityScreen';
