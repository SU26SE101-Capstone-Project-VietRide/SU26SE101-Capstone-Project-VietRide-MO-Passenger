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

const PARCEL_SIZE_ORDER: readonly ParcelSize[] = ['small', 'medium', 'large'];

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

/**
 * Finds the smallest supported fare tier whose dimension envelope can contain
 * the parcel. Sorting makes the check orientation-independent.
 */
export function getSmallestParcelSizeForDimensions(
  dimensions: ParcelDimensions,
): ParcelSize | null {
  const parcelEdges = Object.values(dimensions).sort(
    (left, right) => left - right,
  );

  return (
    PARCEL_SIZE_ORDER.find(size => {
      const sizeEdges = Object.values(
        PARCEL_PACKAGE_SIZE_CONFIG[size].dimensions,
      ).sort((left, right) => left - right);

      return parcelEdges.every((edge, index) => edge <= sizeEdges[index]);
    }) ?? null
  );
}

export function isParcelSizeAtLeast(
  candidate: ParcelSize,
  current: ParcelSize,
): boolean {
  return (
    PARCEL_SIZE_ORDER.indexOf(candidate) >= PARCEL_SIZE_ORDER.indexOf(current)
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
