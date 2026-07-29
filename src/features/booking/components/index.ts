/**
 * Booking Components — Barrel Export
 */

export { EmptyState } from './EmptyState';
export { ErrorState } from './ErrorState';
export { FloatingActionBar } from './FloatingActionBar';
export { LoadingState } from './LoadingState';
export { SeatGrid } from './SeatGrid';
export { SeatLegend } from './SeatLegend';
export { TripCard } from './TripCard';
export * from './StopOption';

// ─── New shared booking primitives (extracted from screens) ────────
export { SectionCard } from './SectionCard';
export { InfoRow } from './InfoRow';
export { RouteProgressRow } from './RouteProgressRow';
export { StatusChip } from './StatusChip';
export { StopOption } from './StopOption';
export { BookingProgressBar } from './BookingProgressBar';
export { RadioOption } from './RadioOption';
export { ShuttleServiceCard, type ShuttleServiceStatus } from './ShuttleServiceCard';
export { ShuttlePickupSheet } from './ShuttlePickupSheet';
export { TripSummaryRow } from './TripSummaryRow';
export { PromoRow } from './PromoRow';
export { ImageUploadSlot } from './ImageUploadSlot';
export { SearchForm } from './SearchForm';
export { PassengerCountInput } from './PassengerCountInput';
export { PopularRoutesSection } from './PopularRoutesSection';
export { RecentSearchesSection } from './RecentSearchesSection';
