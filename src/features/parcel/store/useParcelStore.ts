/**
 * VietRide Parcel — Zustand Store
 *
 * Manages parcel booking state: origin/destination cities,
 * destination district, package specs, payment method.
 */

import { create } from 'zustand';
import { registerSessionCleanup } from '@shared/session/cleanup';
import {
  DEFAULT_PARCEL_SIZE,
  DEFAULT_PARCEL_WEIGHT_KG,
  getParcelDimensions,
} from '../config/parcelPackage';
import type {
  ParcelBookingState,
  ParcelPaymentMethod,
  ParcelSize,
  Station,
} from '../types/index';

const DEFAULT_DIMENSIONS = getParcelDimensions(DEFAULT_PARCEL_SIZE);

interface ParcelStore {
  // ─── Locations ──────────────────────────────────────
  fromCity: string;
  toCity: string;
  toDistrict: string;
  fromLocationCode: string;
  toLocationCode: string;
  setFromCity: (city: string) => void;
  setToCity: (city: string) => void;
  setFromLocation: (city: string, code: string) => void;
  setToLocation: (city: string, code: string) => void;
  setToDistrict: (district: string) => void;
  /** Swap origin/destination locations and stations (mirrors booking swapCities). */
  swapLocations: () => void;

  // ─── Package Details ────────────────────────────────
  size: ParcelSize;
  weight: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  category: string;
  cod: boolean;
  estimatedValue: string;
  photos: string[];
  setPackage: (
    partial: Partial<
      Pick<
        ParcelBookingState,
        | 'size'
        | 'weight'
        | 'lengthCm'
        | 'widthCm'
        | 'heightCm'
        | 'category'
        | 'cod'
        | 'estimatedValue'
        | 'photos'
      >
    >,
  ) => void;

  // ─── Stations ───────────────────────────────────────
  receivingStation?: Station;
  dropoffStation?: Station;
  setReceivingStation: (station?: Station) => void;
  setDropoffStation: (station?: Station) => void;

  // ─── Payment ────────────────────────────────────────
  paymentMethod: ParcelPaymentMethod;
  setPaymentMethod: (method: ParcelPaymentMethod) => void;

  // ─── Reset ──────────────────────────────────────────
  resetParcel: () => void;
}

export const useParcelStore = create<ParcelStore>(set => ({
  // ─── Locations ──────────────────────────────────────
  fromCity: '',
  toCity: '',
  toDistrict: '',
  fromLocationCode: '',
  toLocationCode: '',
  setFromCity: city =>
    set({
      fromCity: city,
      fromLocationCode: '',
      receivingStation: undefined,
    }),
  setToCity: city =>
    set({
      toCity: city,
      toDistrict: '',
      toLocationCode: '',
      dropoffStation: undefined,
    }),
  setFromLocation: (city, code) =>
    set(state => ({
      fromCity: city,
      fromLocationCode: code,
      receivingStation:
        state.fromLocationCode === code ? state.receivingStation : undefined,
    })),
  setToLocation: (city, code) =>
    set(state => ({
      toCity: city,
      toDistrict: state.toLocationCode === code ? state.toDistrict : '',
      toLocationCode: code,
      dropoffStation:
        state.toLocationCode === code ? state.dropoffStation : undefined,
    })),
  setToDistrict: district => set({ toDistrict: district }),
  swapLocations: () =>
    set(state => ({
      fromCity: state.toCity,
      toCity: state.fromCity,
      fromLocationCode: state.toLocationCode,
      toLocationCode: state.fromLocationCode,
      // District is destination-scoped; clear after swap rather than invent a mapping.
      toDistrict: '',
      receivingStation: state.dropoffStation,
      dropoffStation: state.receivingStation,
    })),

  // ─── Package Details ────────────────────────────────
  size: DEFAULT_PARCEL_SIZE,
  weight: DEFAULT_PARCEL_WEIGHT_KG,
  ...DEFAULT_DIMENSIONS,
  category: 'Documents',
  cod: false,
  estimatedValue: '',
  photos: [],
  setPackage: partial =>
    set({
      ...(partial.size ? getParcelDimensions(partial.size) : {}),
      ...partial,
    }),

  // ─── Stations ───────────────────────────────────────
  receivingStation: undefined,
  dropoffStation: undefined,
  setReceivingStation: station => set({ receivingStation: station }),
  setDropoffStation: station => set({ dropoffStation: station }),

  // ─── Payment ────────────────────────────────────────
  paymentMethod: 'vnpay',
  setPaymentMethod: method => set({ paymentMethod: method }),

  // ─── Reset ──────────────────────────────────────────
  resetParcel: () =>
    set({
      fromCity: '',
      toCity: '',
      toDistrict: '',
      fromLocationCode: '',
      toLocationCode: '',
      size: DEFAULT_PARCEL_SIZE,
      weight: DEFAULT_PARCEL_WEIGHT_KG,
      ...DEFAULT_DIMENSIONS,
      category: 'Documents',
      cod: false,
      estimatedValue: '',
      photos: [],
      receivingStation: undefined,
      dropoffStation: undefined,
      paymentMethod: 'vnpay',
    }),
}));

registerSessionCleanup('parcel', () => {
  useParcelStore.getState().resetParcel();
});
