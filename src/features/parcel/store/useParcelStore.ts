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
import type { ParcelItemCategory } from '../config/parcelItemCategories';
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
  fromWardCode: string;
  toWardCode: string;
  setFromCity: (city: string) => void;
  setToCity: (city: string) => void;
  setFromLocation: (city: string, code: string, wardCode?: string) => void;
  setToLocation: (city: string, code: string, wardCode?: string) => void;
  setToDistrict: (district: string) => void;
  /** Swap origin/destination locations and stations (mirrors booking swapCities). */
  swapLocations: () => void;

  // ─── Package Details ────────────────────────────────
  size: ParcelSize;
  weight: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  category: ParcelItemCategory;
  customItemName: string;
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
        | 'customItemName'
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
  fromWardCode: '',
  toWardCode: '',
  setFromCity: city =>
    set({
      fromCity: city,
      fromLocationCode: '',
      fromWardCode: '',
      receivingStation: undefined,
    }),
  setToCity: city =>
    set({
      toCity: city,
      toDistrict: '',
      toLocationCode: '',
      toWardCode: '',
      dropoffStation: undefined,
    }),
  setFromLocation: (city, code, wardCode = '') =>
    set(state => ({
      fromCity: city,
      fromLocationCode: code,
      fromWardCode: wardCode,
      receivingStation:
        state.fromLocationCode === code && state.fromWardCode === wardCode
          ? state.receivingStation
          : undefined,
    })),
  setToLocation: (city, code, wardCode = '') =>
    set(state => ({
      toCity: city,
      toDistrict: state.toLocationCode === code && state.toWardCode === wardCode
        ? state.toDistrict
        : '',
      toLocationCode: code,
      toWardCode: wardCode,
      dropoffStation:
        state.toLocationCode === code && state.toWardCode === wardCode
          ? state.dropoffStation
          : undefined,
    })),
  setToDistrict: district => set({ toDistrict: district }),
  swapLocations: () =>
    set(state => ({
      fromCity: state.toCity,
      toCity: state.fromCity,
      fromLocationCode: state.toLocationCode,
      toLocationCode: state.fromLocationCode,
      fromWardCode: state.toWardCode,
      toWardCode: state.fromWardCode,
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
  customItemName: '',
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
      fromWardCode: '',
      toWardCode: '',
      size: DEFAULT_PARCEL_SIZE,
      weight: DEFAULT_PARCEL_WEIGHT_KG,
      ...DEFAULT_DIMENSIONS,
      category: 'Documents',
      customItemName: '',
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
