/**
 * VietRide Parcel — Zustand Store
 *
 * Manages parcel booking state: origin/destination cities,
 * destination district, package specs, payment method.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { registerSessionCleanup } from '@shared/session/cleanup';
import { getLocalSessionScope } from '@shared/session/scope';
import { createDebouncedAsyncStorage } from '@shared/utils/debouncedAsyncStorage';
import {
  DEFAULT_PARCEL_SIZE,
  DEFAULT_PARCEL_WEIGHT_KG,
  getParcelDimensions,
  resolveParcelSizeFromDimensions,
  type ParcelDimensions,
} from '../config/parcelPackage';
import type { ParcelItemCategory } from '../config/parcelItemCategories';
import type {
  ParcelBookingState,
  ParcelPaymentMethod,
  ParcelSize,
  Station,
} from '../types/index';

const DEFAULT_DIMENSIONS = getParcelDimensions(DEFAULT_PARCEL_SIZE);
const PARCEL_DRAFT_STORAGE_KEY = 'vietride-parcel-draft-v1';
const parcelPersistStorage = createDebouncedAsyncStorage(180);

interface ParcelStore {
  ownerUserId: string | null;

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

  // ─── Persistence ────────────────────────────────────
  hasHydrated: boolean;

  // ─── Reset ──────────────────────────────────────────
  resetParcel: () => void;
}

export const useParcelStore = create<ParcelStore>()(
  persist(
    set => ({
  ownerUserId: null,

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
      ownerUserId: getLocalSessionScope().userId,
      fromCity: city,
      fromLocationCode: '',
      fromWardCode: '',
      receivingStation: undefined,
    }),
  setToCity: city =>
    set({
      ownerUserId: getLocalSessionScope().userId,
      toCity: city,
      toDistrict: '',
      toLocationCode: '',
      toWardCode: '',
      dropoffStation: undefined,
    }),
  setFromLocation: (city, code, wardCode = '') =>
    set(state => ({
      ownerUserId: getLocalSessionScope().userId,
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
      ownerUserId: getLocalSessionScope().userId,
      toCity: city,
      toDistrict:
        state.toLocationCode === code && state.toWardCode === wardCode
          ? state.toDistrict
          : '',
      toLocationCode: code,
      toWardCode: wardCode,
      dropoffStation:
        state.toLocationCode === code && state.toWardCode === wardCode
          ? state.dropoffStation
          : undefined,
    })),
  setToDistrict: district => set({
    ownerUserId: getLocalSessionScope().userId,
    toDistrict: district,
  }),
  swapLocations: () =>
    set(state => ({
      ownerUserId: getLocalSessionScope().userId,
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
    set(state => {
      const presetDimensions: Partial<ParcelDimensions> = partial.size
        ? getParcelDimensions(partial.size)
        : {};
      const nextDimensions = {
        lengthCm:
          partial.lengthCm ?? presetDimensions.lengthCm ?? state.lengthCm,
        widthCm: partial.widthCm ?? presetDimensions.widthCm ?? state.widthCm,
        heightCm:
          partial.heightCm ?? presetDimensions.heightCm ?? state.heightCm,
      };

      return {
        ownerUserId: getLocalSessionScope().userId,
        ...presetDimensions,
        ...partial,
        size: resolveParcelSizeFromDimensions(nextDimensions),
      };
    }),

  // ─── Stations ───────────────────────────────────────
  receivingStation: undefined,
  dropoffStation: undefined,
  setReceivingStation: station => set({
    ownerUserId: getLocalSessionScope().userId,
    receivingStation: station,
  }),
  setDropoffStation: station => set({
    ownerUserId: getLocalSessionScope().userId,
    dropoffStation: station,
  }),

  // ─── Payment ────────────────────────────────────────
  paymentMethod: 'vnpay',
  setPaymentMethod: method => set({
    ownerUserId: getLocalSessionScope().userId,
    paymentMethod: method,
  }),

  // ─── Persistence ────────────────────────────────────
  hasHydrated: false,

  // ─── Reset ──────────────────────────────────────────
  resetParcel: () => {
    set({
      ownerUserId: null,
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
    });

    // Reset/discard is destructive user intent. Flush the cleared snapshot as
    // soon as Zustand persist has enqueued it so an abrupt app kill cannot
    // resurrect a draft the passenger explicitly removed.
    Promise.resolve()
      .then(() => parcelPersistStorage.flush(PARCEL_DRAFT_STORAGE_KEY))
      .catch(() => undefined);
  },
    }),
    {
      name: PARCEL_DRAFT_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => parcelPersistStorage),
      partialize: state => ({
        ownerUserId: state.ownerUserId,
        fromCity: state.fromCity,
        toCity: state.toCity,
        toDistrict: state.toDistrict,
        fromLocationCode: state.fromLocationCode,
        toLocationCode: state.toLocationCode,
        fromWardCode: state.fromWardCode,
        toWardCode: state.toWardCode,
        size: state.size,
        weight: state.weight,
        lengthCm: state.lengthCm,
        widthCm: state.widthCm,
        heightCm: state.heightCm,
        category: state.category,
        customItemName: state.customItemName,
        cod: state.cod,
        estimatedValue: state.estimatedValue,
        receivingStation: state.receivingStation,
        dropoffStation: state.dropoffStation,
        paymentMethod: state.paymentMethod,
      }),
      onRehydrateStorage: () => () => {
        useParcelStore.setState({ hasHydrated: true, photos: [] });
      },
    },
  ),
);

registerSessionCleanup('parcel', () => {
  useParcelStore.getState().resetParcel();
  // Session cleanup is privacy-sensitive. Persist the cleared owner/draft
  // immediately instead of leaving it in the normal debounce window.
  parcelPersistStorage.flush(PARCEL_DRAFT_STORAGE_KEY).catch(() => undefined);
});
