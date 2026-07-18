import { useEffect, useState } from 'react';

import type { GeoCoordinate } from '@shared/types/common';
import {
  DeviceLocationError,
  getCurrentCoordinates,
  isDeviceLocationError,
  requestForegroundLocationPermission,
} from '@shared/services/deviceLocation';

export type CurrentCoordinates = GeoCoordinate;

/**
 * Progressive foreground location for nearby-data screens. Permission is only
 * requested while the consuming flow is enabled; coordinates remain in memory.
 */
export function useCurrentCoordinates(enabled = true) {
  const [coords, setCoords] = useState<CurrentCoordinates | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [error, setError] = useState<DeviceLocationError | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsResolving(false);
      return undefined;
    }

    let mounted = true;
    let hasLastKnownCoordinates = false;

    const loadCoordinates = async (): Promise<void> => {
      setError(null);
      setIsResolving(true);

      await requestForegroundLocationPermission();
      if (mounted) {
        setPermissionGranted(true);
      }

      const currentCoordinates = await getCurrentCoordinates({
        onLastKnownCoordinates: (lastKnownCoordinates) => {
          hasLastKnownCoordinates = true;
          if (mounted) {
            setCoords(lastKnownCoordinates);
          }
        },
      });

      if (mounted) {
        setCoords(currentCoordinates);
        setIsResolving(false);
      }
    };

    loadCoordinates().catch((caughtError: unknown) => {
      if (!mounted) {
        return;
      }

      const safeError = isDeviceLocationError(caughtError)
        ? caughtError
        : new DeviceLocationError('position-unavailable');

      if (safeError.code === 'permission-denied') {
        setCoords(null);
        setPermissionGranted(false);
      } else if (!hasLastKnownCoordinates) {
        setCoords(null);
      }

      setError(safeError);
      setIsResolving(false);
    });

    return () => {
      mounted = false;
    };
  }, [enabled]);

  return {
    coords,
    isResolving,
    permissionGranted,
    error,
  };
}
