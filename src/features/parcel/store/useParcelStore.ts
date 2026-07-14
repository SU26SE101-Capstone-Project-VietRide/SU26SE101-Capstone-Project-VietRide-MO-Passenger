/**
 * VietRide Parcel — Zustand Store
 *
 * Manages parcel booking state: origin/destination cities,
 * destination district, package specs, payment method.
 */

import { create } from 'zustand';
import { registerSessionCleanup } from '@shared/session/cleanup';
import type { ParcelBookingState, ParcelPaymentMethod, ParcelSize, Station } from '../types/index';

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

  // ─── Package Details ────────────────────────────────
  size: ParcelSize;
  weight: number;
  category: string;
  cod: boolean;
  estimatedValue: string;
  photos: string[];
  setPackage: (partial: Partial<Pick<ParcelBookingState,
    | 'size' | 'weight' | 'category' | 'cod' | 'estimatedValue' | 'photos'>>) => void;

  // ─── Stations ───────────────────────────────────────
  receivingStation?: Station;
  dropoffStation?: Station;
  setReceivingStation: (station: Station) => void;
  setDropoffStation: (station: Station) => void;

  // ─── Payment ────────────────────────────────────────
  paymentMethod: ParcelPaymentMethod;
  setPaymentMethod: (method: ParcelPaymentMethod) => void;

  // ─── Reset ──────────────────────────────────────────
  resetParcel: () => void;
}

export const useParcelStore = create<ParcelStore>((set) => ({
  // ─── Locations ──────────────────────────────────────
  fromCity: '',
  toCity: '',
  toDistrict: '',
  fromLocationCode: '',
  toLocationCode: '',
  setFromCity: (city) => set({ fromCity: city }),
  setToCity: (city) => set({ toCity: city }),
  setFromLocation: (city, code) => set({ fromCity: city, fromLocationCode: code }),
  setToLocation: (city, code) => set({ toCity: city, toLocationCode: code }),
  setToDistrict: (district) => set({ toDistrict: district }),

  // ─── Package Details ────────────────────────────────
  size: 'small',
  weight: 1,
  category: '',
  cod: false,
  estimatedValue: '',
  photos: [],
  setPackage: (partial) =>
    set((state) => ({ ...state, ...partial })),

  // ─── Stations ───────────────────────────────────────
  receivingStation: undefined,
  dropoffStation: undefined,
  setReceivingStation: (station) => set({ receivingStation: station }),
  setDropoffStation: (station) => set({ dropoffStation: station }),

  // ─── Payment ────────────────────────────────────────
  paymentMethod: 'vnpay',
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  // ─── Reset ──────────────────────────────────────────
  resetParcel: () =>
    set({
      fromCity: '',
      toCity: '',
      toDistrict: '',
      fromLocationCode: '',
      toLocationCode: '',
      size: 'small',
      weight: 1,
      category: '',
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
