import type { ParcelSize, ParcelSizeCategory } from '../types';
import i18n from '@shared/i18n';

export interface ParcelDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ParcelPackageSizeOption {
  size: ParcelSize;
  sizeCategory: ParcelSizeCategory;
  labelKey: string;
  dimensions: ParcelDimensions;
}

/**
 * Package presets are a convenience for the passenger, not a separate pricing
 * model. The exact dimensions below are also the values sent to the backend.
 */
export const PARCEL_PACKAGE_SIZE_CONFIG = {
  small: {
    size: 'small',
    sizeCategory: 'SMALL',
    labelKey: 'parcel.packageSize.options.small',
    dimensions: { lengthCm: 25, widthCm: 20, heightCm: 10 },
  },
  medium: {
    size: 'medium',
    sizeCategory: 'MEDIUM',
    labelKey: 'parcel.packageSize.options.medium',
    dimensions: { lengthCm: 45, widthCm: 35, heightCm: 25 },
  },
  large: {
    size: 'large',
    sizeCategory: 'LARGE',
    labelKey: 'parcel.packageSize.options.large',
    dimensions: { lengthCm: 60, widthCm: 45, heightCm: 35 },
  },
} as const satisfies Record<ParcelSize, ParcelPackageSizeOption>;

export const PARCEL_PACKAGE_SIZE_OPTIONS: readonly ParcelPackageSizeOption[] =
  Object.values(PARCEL_PACKAGE_SIZE_CONFIG);

export const DEFAULT_PARCEL_SIZE: ParcelSize = 'medium';
export const DEFAULT_PARCEL_WEIGHT_KG = 2.5;
export const MIN_PARCEL_DIMENSION_CM = 5;

export function roundParcelMeasurement(value: number): number {
  return Number(value.toFixed(2));
}

export function formatParcelMeasurement(value: number): string {
  return String(roundParcelMeasurement(value));
}

export function sanitizeParcelMeasurementDraft(value: string): string {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
  const [whole = '', ...fractions] = normalized.split('.');

  if (fractions.length === 0) {
    return whole;
  }

  return `${whole}.${fractions.join('').slice(0, 2)}`;
}

export function getParcelDimensions(size: ParcelSize): ParcelDimensions {
  return { ...PARCEL_PACKAGE_SIZE_CONFIG[size].dimensions };
}

export function getParcelSizeCategory(size: ParcelSize): ParcelSizeCategory {
  return PARCEL_PACKAGE_SIZE_CONFIG[size].sizeCategory;
}

const sortedMeasurements = (dimensions: ParcelDimensions): number[] =>
  [dimensions.lengthCm, dimensions.widthCm, dimensions.heightCm]
    .slice()
    .sort((left, right) => right - left);

const fitsPresetEnvelope = (
  dimensions: ParcelDimensions,
  preset: ParcelDimensions,
): boolean => {
  const actual = sortedMeasurements(dimensions);
  const envelope = sortedMeasurements(preset);
  return actual.every((measurement, index) => measurement <= envelope[index]);
};

/**
 * Maps typed measurements onto the smallest quick-access chip that can hold
 * them, ignoring axis order so rotating the box does not change the chip.
 * Values larger than Large stay on Large.
 */
export function resolveParcelSizeFromDimensions(
  dimensions: ParcelDimensions,
): ParcelSize {
  for (const option of PARCEL_PACKAGE_SIZE_OPTIONS) {
    if (fitsPresetEnvelope(dimensions, option.dimensions)) {
      return option.size;
    }
  }
  return 'large';
}

/**
 * Every submitted edge must be finite and at least 5 cm. Small/medium/large
 * are quick-access fill-ins; the backend still prices from the typed cargo.
 */
export function areParcelDimensionsPositive(
  dimensions: ParcelDimensions,
): boolean {
  return Object.values(dimensions).every(
    measurement =>
      Number.isFinite(measurement) && measurement >= MIN_PARCEL_DIMENSION_CM,
  );
}

export function formatParcelDimensions({
  lengthCm,
  widthCm,
  heightCm,
}: ParcelDimensions): string {
  return `${lengthCm} × ${widthCm} × ${heightCm}\u00A0${i18n.t(
    'parcel.units.cm',
  )}`;
}
