import type {
  BackendPaymentMethod,
  PaymentMethod,
} from '@shared/utils/paymentMethod';
import type { ParcelItemCategory } from '../config/parcelItemCategories';
import type {
  ParcelCompensationPolicySnapshot,
  ParcelOperatorSummary,
  ParcelPassengerAction,
  ParcelReliabilityLocation,
  ParcelReliabilitySummary,
  ParcelReliabilityTrip,
} from './reliability';

export * from './reliability';

export type ParcelSize = 'small' | 'medium' | 'large';
export const PARCEL_SIZE_CATEGORIES = [
  'SMALL',
  'MEDIUM',
  'LARGE',
  'EXTRA_LARGE',
] as const;
export type ParcelSizeCategory = (typeof PARCEL_SIZE_CATEGORIES)[number];
export type ParcelPaymentMethod = PaymentMethod;
export type ParcelBackendPaymentMethod = BackendPaymentMethod;
export const PARCEL_STATUSES = [
  'PENDING_OPERATOR_REVIEW',
  'PENDING_PAYMENT',
  'PENDING',
  'PENDING_ADDITIONAL_PAYMENT',
  'RESERVED',
  'CHECKED_IN',
  'PENDING_FINAL_PAYMENT',
  'READY_TO_LOAD',
  'LOADED',
  'IN_TRANSIT',
  'PENDING_TRANSFER_CONFIRM',
  'TRANSFER_ESCALATED',
  'UNLOADED',
  'DELIVERED_PENDING_CONFIRM',
  'DELIVERY_CONFIRMED',
  'DELIVERY_REJECTED',
  'RETURN_INITIATED',
  'RETURNED',
  'PENDING_OPERATOR_ACTION',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
] as const;
export type ParcelStatus = (typeof PARCEL_STATUSES)[number];

export interface Station {
  id: string;
  name: string;
  address: string;
  distance: string | null;
  isClosest?: boolean;
  city: string;
}

export interface ParcelShipment {
  id: string;
  toLocation: string;
  status: 'booked' | 'at_station' | 'in_transit' | 'delivered';
  date: string;
  size: ParcelSize;
  category: string;
  weight: number; // in kg
  cod: boolean;
  codAmount?: number;
  estimatedValue?: number;
  price: number;
  paymentMethod?: ParcelPaymentMethod;
  fromStation?: string;
  toStation?: string;
}

export interface ParcelBookingState {
  fromCity: string;
  toCity: string;
  toDistrict: string;
  step: number;
  receivingStation?: Station;
  dropoffStation?: Station;
  size: ParcelSize;
  weight: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  category: ParcelItemCategory;
  customItemName: string;
  cod: boolean;
  estimatedValue?: string;
  photos: string[];
  paymentMethod: ParcelPaymentMethod;
  promoApplied: boolean;
}

export interface PagedParcelResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface AvailableParcelTripsBaseParams {
  originStationId: string;
  departureDate: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  estimatedWeightKg: number;
  /** Optional legacy hint; settlement v2 derives category from cargo metrics. */
  sizeCategory?: ParcelSizeCategory;
  page?: number;
  pageSize?: number;
}

export type AvailableParcelTripsParams = AvailableParcelTripsBaseParams & (
  | {
      destinationStationId: string;
      dropoffStopId?: never;
      destinationProvinceCode?: never;
      destinationLocationCode?: never;
    }
  | {
      destinationStationId?: never;
      dropoffStopId: string;
      destinationProvinceCode?: never;
      destinationLocationCode?: never;
    }
  | {
      destinationStationId?: never;
      dropoffStopId?: never;
      destinationProvinceCode: string;
      destinationLocationCode?: string;
    }
);

export type ParcelDropoffPoint =
  | {
      type: 'STATION';
      stationId: string;
      stopId: null;
      name: string;
      orderIndex: number;
      estimatedArrivalTime: string;
    }
  | {
      type: 'STOP';
      stationId: null;
      stopId: string;
      name: string;
      orderIndex: number;
      estimatedArrivalTime: string;
    };

export interface AvailableParcelTrip {
  tripId: string;
  routeId: string;
  status: string;
  operatorId: string;
  operatorName: string;
  originStation: {
    id: string;
    name: string;
  };
  destinationStation: {
    id: string;
    name: string;
  };
  departureDateTime: string;
  estimatedArrivalTime: string;
  quoteToken: string | null;
  quoteExpiresAt: string | null;
  estimatedSizeCategory: ParcelSizeCategory | null;
  /** Null on pre-v1.76 transport; selection requires hasParcelQuoteContract. */
  estimatedGrossPriceVnd: number | null;
  /** Null on pre-v1.76 transport; selection requires hasParcelQuoteContract. */
  estimatedDiscountVnd: number | null;
  estimatedPriceVnd: number;
  estimatedDepositVnd: number;
  depositPercent: number;
  dropoffPoints: ParcelDropoffPoint[];
}

export interface ParcelAvailableVoucher {
  id: string;
  code: string;
  name: string;
  type: 'PERCENT' | 'PERCENT_OFF' | 'FIXED_AMOUNT' | string;
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  discountAmount: number;
  applicableServices: string[];
  applicablePaymentMethods: string[];
  validUntil: string;
}

export interface GetParcelVouchersParams {
  tripId: string;
  sizeCategory: ParcelSizeCategory;
  paymentMethod: ParcelBackendPaymentMethod;
  quoteToken: string;
  /** Safe query-key metadata; never serialized to the API. */
  quoteExpiresAt: string;
  /** Safe query-key metadata; never serialized to the API. */
  estimatedGrossPriceVnd: number;
}

export interface CreateParcelPayload {
  tripId: string;
  quoteToken: string;
  dropoffStopId: string | null;
  bookingId: string | null;
  itemName: string | null;
  description: string | null;
  sizeCategory: ParcelSizeCategory;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  estimatedWeightKg: number;
  photoUrl: string | null;
  recipient: {
    fullName: string;
    phoneNumber: string;
    email?: string | null;
  };
  deliveryMethod: 'TERMINAL_PICKUP';
  paymentMethod: ParcelBackendPaymentMethod;
  voucherCode?: string | null;
  declaredValueVnd: number | null;
  quantity: number;
}

export interface CreateParcelResult {
  parcelId: string;
  bookingId: string | null;
  parcelCode: string;
  status: ParcelStatus;
  estimatedSizeCategory: ParcelSizeCategory;
  estimatedGrossPriceVnd: number;
  discountAmountVnd: number;
  estimatedTotalPriceVnd: number;
  depositPercent: number;
  depositRequiredVnd: number;
  depositPaidVnd: number;
  voucherCode: string | null;
  settlementPolicyVersion: number;
  compensationPolicy: ParcelCompensationPolicySnapshot | null;
}

export interface StartParcelPaymentInput {
  parcelId: string;
  paymentMethod: ParcelBackendPaymentMethod;
  /** Required by BE when paymentMethod is VNPAY (MOBILE_SDK). */
  paymentReturnMode?: 'MOBILE_SDK';
}

export interface ParcelVnPaySdkMeta {
  tmnCode: string;
  scheme: string;
  isSandbox: boolean;
}

export interface ParcelDepositPaymentResult {
  parcelId: string;
  status: ParcelStatus;
  depositPaymentId: string | null;
  depositRequiredVnd: number;
  depositPaidVnd: number;
  paymentDueAt: string | null;
  paymentRedirectUrl: string | null;
  paymentReturnMode?: 'MOBILE_SDK' | string | null;
  vnpaySdk?: ParcelVnPaySdkMeta | null;
}

export interface ParcelFinalPaymentResult {
  parcelId: string;
  status: ParcelStatus;
  balancePaymentId: string | null;
  balanceRequiredVnd: number;
  balancePaidVnd: number;
  finalPaymentDeadline: string;
  paymentRedirectUrl: string | null;
  paymentReturnMode?: 'MOBILE_SDK' | string | null;
  vnpaySdk?: ParcelVnPaySdkMeta | null;
}

export interface ParcelDetail {
  parcelId: string;
  parcelCode: string;
  status: ParcelStatus | (string & {});
  senderUserId: string;
  recipientUserId: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  operatorId: string;
  tripId: string;
  bookingId: string | null;
  dropoffStopId: string | null;
  description: string | null;
  quantity: number;
  /** Rolling-contract field. Current v1.98.1 detail omits it; trace carries it. */
  declaredValueVnd: number | null;
  photoUrl: string | null;
  checkInPhotoUrls: string[] | null;
  deliveryPhotoUrls: string[] | null;
  sizeCategory: ParcelSizeCategory | string;
  estimatedWeightKg: number;
  actualWeightKg: number | null;
  deliveryMethod: string;
  depositAmount: number;
  originalDepositAmount: number;
  discountAmount: number;
  voucherCode: string | null;
  voucherUsageId: string | null;
  additionalAmount: number;
  estimatedSizeCategory: ParcelSizeCategory | string;
  actualSizeCategory: ParcelSizeCategory | string | null;
  estimatedLengthCm: number;
  estimatedWidthCm: number;
  estimatedHeightCm: number;
  estimatedVolumeM3: number;
  estimatedDimWeightKg: number;
  estimatedChargeableWeightKg: number;
  actualLengthCm: number | null;
  actualWidthCm: number | null;
  actualHeightCm: number | null;
  actualVolumeM3: number | null;
  actualDimWeightKg: number | null;
  actualChargeableWeightKg: number | null;
  estimatedGrossPriceVnd: number;
  finalGrossPriceVnd: number;
  discountAmountVnd: number;
  estimatedTotalPriceVnd: number;
  finalTotalPriceVnd: number;
  depositPercent: number;
  depositRequiredVnd: number;
  depositPaidVnd: number;
  balanceRequiredVnd: number;
  balancePaidVnd: number;
  refundDueVnd: number;
  refundedAmountVnd: number;
  forfeitedDepositVnd: number;
  depositPaymentId: string | null;
  balancePaymentId: string | null;
  loadCutoffAt: string | null;
  latestCheckInAt: string | null;
  checkedInAt: string | null;
  checkedInByUserId: string | null;
  reweighedAt: string | null;
  reweighedByUserId: string | null;
  finalPaymentDeadline: string | null;
  pricePerKgVnd: number;
  minimumPriceVnd: number;
  dimWeightFactor: number;
  settlementPolicyVersion: number;
  createdAt: string;
  loadedAt: string | null;
  unloadedAt: string | null;
  deliveredPendingConfirmAt: string | null;
  confirmedAt: string | null;
  rejectedAt: string | null;
  originStationName: string | null;
  destinationStationName: string | null;
  eta: string | null;
  operator: ParcelOperatorSummary | null;
  trip: ParcelReliabilityTrip | null;
  dropoffLocation: ParcelReliabilityLocation | null;
  compensationPolicySnapshot: ParcelCompensationPolicySnapshot | null;
  reliabilitySummary: ParcelReliabilitySummary | null;
  availableActions: ParcelPassengerAction[];
}

export interface ReceivedParcel {
  parcelId: string;
  parcelCode: string;
  status: ParcelStatus | (string & {});
  originStation: { id: string; name: string } | null;
  destinationStation: { id: string; name: string } | null;
  eta: string | null;
  senderUserId: string;
  recipientName: string | null;
  sizeCategory: ParcelSizeCategory | string;
  createdAt: string;
  operatorId: string;
  tripId: string;
  operator: ParcelOperatorSummary | null;
  dropoffLocation: ParcelReliabilityLocation | null;
  reliability: ParcelReliabilitySummary | null;
}

export interface SentParcel {
  parcelId: string;
  parcelCode: string;
  tripId: string;
  status: ParcelStatus | (string & {});
  createdAt: string;
  totalAmount: number;
  originName: string | null;
  destinationName: string | null;
  departureDateTime: string | null;
  estimatedArrivalTime: string | null;
  bookingId: string | null;
  recipientName: string;
  sizeCategory: ParcelSizeCategory | string;
  photoUrl: string | null;
  deliveryMethod: string;
  operator: ParcelOperatorSummary | null;
  dropoffLocation: ParcelReliabilityLocation | null;
  reliability: ParcelReliabilitySummary | null;
}

export interface SentParcelQuery {
  status?: ParcelStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
