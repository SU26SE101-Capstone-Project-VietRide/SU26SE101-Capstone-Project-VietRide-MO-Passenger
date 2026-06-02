export interface Station {
  id: string;
  name: string;
  address: string;
  distance: string;
  isClosest?: boolean;
  rating: number;
  reviewsCount: number;
  city: string;
}

export interface ParcelShipment {
  id: string;
  toLocation: string;
  status: 'booked' | 'at_station' | 'in_transit' | 'delivered';
  date: string;
  size: 'small' | 'medium' | 'large';
  category: string;
  weight: number; // in kg
  cod: boolean;
  codAmount?: number;
  estimatedValue?: number;
  price: number;
  paymentMethod?: 'vnpay' | 'wallet' | 'card';
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
  size: 'small' | 'medium' | 'large';
  weight: number;
  category: string;
  cod: boolean;
  estimatedValue?: string;
  photos: string[];
  paymentMethod: 'vnpay' | 'wallet' | 'card';
  promoApplied: boolean;
}
