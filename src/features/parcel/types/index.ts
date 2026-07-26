import type {
  BackendPaymentMethod,
  PaymentMethod,
} from '@shared/utils/paymentMethod';

export type ParcelSize = 'small' | 'medium' | 'large';
export type ParcelSizeCategory = 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';
export type ParcelPaymentMethod = PaymentMethod;
export type ParcelBackendPaymentMethod = BackendPaymentMethod;

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
  category: string;
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

export interface AvailableParcelTripsParams {
  originStationId: string;
  destinationStationId: string;
  departureDate: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  estimatedWeightKg: number;
  sizeCategory: ParcelSizeCategory;
  page?: number;
  pageSize?: number;
}

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
  estimatedPriceVnd: number;
  estimatedDepositVnd: number;
  depositPercent: number;
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
  paymentMethod?: ParcelBackendPaymentMethod;
  orderAmount?: number;
}

export interface CreateParcelPayload {
  tripId: string;
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
}

export interface CreateParcelResult {
  parcelId: string;
  parcelCode: string;
  status: string;
  totalAmount: number;
  originalDepositAmount: number;
  discountAmount: number;
  voucherCode: string | null;
  paymentRedirectUrl: string | null;
}

export interface ParcelDetail {
  parcelId: string;
  parcelCode: string;
  status: string;
  senderUserId: string;
  recipientUserId: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  operatorId: string;
  tripId: string;
  dropoffStopId: string | null;
  description: string | null;
  photoUrl?: string | null;
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
  createdAt: string;
  loadedAt: string | null;
  unloadedAt: string | null;
  deliveredPendingConfirmAt: string | null;
  confirmedAt: string | null;
  rejectedAt: string | null;
  originStationName: string | null;
  destinationStationName: string | null;
  eta: string | null;
}

export interface ReceivedParcel {
  parcelId: string;
  parcelCode: string;
  status: string;
  originStation: { id: string; name: string } | null;
  destinationStation: { id: string; name: string } | null;
  eta: string | null;
  senderUserId: string;
  recipientName: string | null;
  sizeCategory: ParcelSizeCategory | string;
  createdAt: string;
  operatorId: string;
  tripId: string;
}
