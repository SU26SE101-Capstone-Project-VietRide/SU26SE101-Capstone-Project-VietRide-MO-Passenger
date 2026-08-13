/**
 * ShuttlePickupSheet — navigation entry into the Places-only Shuttle address picker.
 *
 * Kept as the shared entry point so Pickup and Dropoff continue to call one
 * component. Verified Places selection lives on the dedicated address screen.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { BookingStackParamList } from '@app/navigation/types';
import { isValidGeoCoordinate } from '@shared/utils/geo';
import { useBookingStore } from '../store/useBookingStore';
import type { ShuttleServiceDirection } from '../types';

type BookingNav = NativeStackNavigationProp<BookingStackParamList>;

export interface ShuttlePickupSheetProps {
  direction?: ShuttleServiceDirection;
  visible: boolean;
  stationId: string;
  stationName: string;
  stationLatitude?: number | null;
  stationLongitude?: number | null;
  onClose: () => void;
}

export function ShuttlePickupSheet({
  direction = 'pickup',
  visible,
  stationId,
  stationName,
  stationLatitude,
  stationLongitude,
  onClose,
}: ShuttlePickupSheetProps): null {
  const navigation = useNavigation<BookingNav>();
  const currentLeg = useBookingStore(state => state.currentLeg);
  const lastOpenedRef = useRef(false);

  const openPicker = useCallback(() => {
    if (
      typeof stationLatitude !== 'number' ||
      typeof stationLongitude !== 'number' ||
      !isValidGeoCoordinate({
        latitude: stationLatitude,
        longitude: stationLongitude,
      })
    ) {
      onClose();
      return;
    }

    navigation.navigate('ShuttleAddressPicker', {
      leg: currentLeg,
      direction,
      stationId,
      stationName,
      stationLatitude,
      stationLongitude,
    });
    onClose();
  }, [
    currentLeg,
    direction,
    navigation,
    onClose,
    stationId,
    stationLatitude,
    stationLongitude,
    stationName,
  ]);

  useEffect(() => {
    if (!visible) {
      lastOpenedRef.current = false;
      return;
    }

    if (lastOpenedRef.current) {
      return;
    }

    lastOpenedRef.current = true;
    openPicker();
  }, [openPicker, visible]);

  return null;
}
