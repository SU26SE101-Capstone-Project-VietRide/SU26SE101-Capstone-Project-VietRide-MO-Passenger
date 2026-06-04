/**
 * VietRide Parcel — Zustand Store
 *
 * Manages parcel booking state: origin/destination cities,
 * destination district, package specs, payment method.
 */

import { create } from 'zustand';
import type { ParcelBookingState, Station } from '../types';

interface ParcelStore {
  // ─── Locations ──────────────────────────────────────
  fromCity: string;
  toCity: string;
  toDistrict: string;
  setFromCity: (city: string) => void;
  setToCity: (city: string) => void;
  setToDistrict: (district: string) => void;

  // ─── Package Details ────────────────────────────────
  size: 'small' | 'medium' | 'large';
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
  paymentMethod: 'vnpay' | 'wallet' | 'card';
  setPaymentMethod: (method: 'vnpay' | 'wallet' | 'card') => void;

  // ─── Reset ──────────────────────────────────────────
  resetParcel: () => void;
}

export const useParcelStore = create<ParcelStore>((set) => ({
  // ─── Locations ──────────────────────────────────────
  fromCity: '',
  toCity: '',
  toDistrict: '',
  setFromCity: (city) => set({ fromCity: city }),
  setToCity: (city) => set({ toCity: city }),
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
