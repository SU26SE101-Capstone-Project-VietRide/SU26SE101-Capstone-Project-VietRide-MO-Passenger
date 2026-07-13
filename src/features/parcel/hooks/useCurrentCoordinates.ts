import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface CurrentCoordinates {
  latitude: number;
  longitude: number;
}

export function useCurrentCoordinates(enabled = true) {
  const [coords, setCoords] = useState<CurrentCoordinates | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsResolving(false);
      return undefined;
    }

    let mounted = true;

    const loadCoordinates = async () => {
      setIsResolving(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === Location.PermissionStatus.GRANTED;

      if (!granted) {
        if (mounted) {
          setCoords(null);
          setPermissionGranted(false);
          setIsResolving(false);
        }
        return;
      }

      if (mounted) {
        setPermissionGranted(true);
      }

      const lastKnownPosition = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000,
      });

      if (mounted && lastKnownPosition) {
        setCoords({
          latitude: lastKnownPosition.coords.latitude,
          longitude: lastKnownPosition.coords.longitude,
        });
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (mounted) {
        setCoords({
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
        });
        setIsResolving(false);
      }
    };

    loadCoordinates().catch((error) => {
      if (__DEV__) {
        console.warn('[Parcel] Could not resolve current location:', error);
      }
      if (mounted) {
        setCoords(null);
        setIsResolving(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [enabled]);

  return {
    coords,
    isResolving,
    permissionGranted,
  };
}
