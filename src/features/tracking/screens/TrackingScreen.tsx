import React, { useCallback, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '@app/navigation/types';
import type { TripLifecycleStatus } from '@features/trip/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { LiveTripTrackingPanel } from '../components/LiveTripTrackingPanel';
import {
  TrackingHeader,
  type TrackingHeaderRoute,
} from '../components/TrackingHeader';

type TrackingRoute = RouteProp<RootStackParamList, 'Tracking'>;
type TrackingNavigation = NativeStackNavigationProp<RootStackParamList, 'Tracking'>;

const terminalMessageKeyForStatus = (
  status: TripLifecycleStatus | undefined,
): string | undefined => {
  if (status === 'CANCELLED') return 'tracking.tripCancelled';
  if (status === 'DISRUPTED') return 'tracking.tripDisrupted';
  return undefined;
};

export function TrackingScreen(): React.JSX.Element {
  const route = useRoute<TrackingRoute>();
  const navigation = useNavigation<TrackingNavigation>();
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const isShuttle = route.params.source === 'shuttle';
  const bookingId = route.params.bookingId;
  const pickupOrder = isShuttle ? route.params.pickupOrder : undefined;
  const tripStatus = isShuttle ? undefined : route.params.tripStatus;
  const terminalMessageKey = terminalMessageKeyForStatus(tripStatus);
  const [routeHeader, setRouteHeader] = useState<TrackingHeaderRoute>();
  const headerSubtitleKey = bookingId
    ? 'tracking.bookingReference'
    : isShuttle
      ? 'tracking.shuttleReference'
      : 'tracking.tripReference';
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleRouteHeaderChange = useCallback((next: TrackingHeaderRoute | undefined) => {
    setRouteHeader((current) => (
      current?.originName === next?.originName
      && current?.destinationName === next?.destinationName
        ? current
        : next
    ));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <TrackingHeader
        title={t(isShuttle
          ? 'tracking.shuttleLiveTracking'
          : 'tracking.liveTracking')}
        subtitle={t(headerSubtitleKey)}
        onBack={handleBack}
        route={routeHeader}
      />

      <View style={styles.body}>
        {isShuttle ? (
          <LiveTripTrackingPanel
            source="shuttle"
            shuttleTripId={route.params.shuttleTripId}
            bookingId={bookingId}
            pickupOrder={pickupOrder}
          />
        ) : (
          <LiveTripTrackingPanel
            source="trip"
            tripId={route.params.tripId}
            trackingTarget={route.params.trackingTarget}
            tripStatus={tripStatus}
            terminalMessage={terminalMessageKey ? t(terminalMessageKey) : undefined}
            onRouteHeaderChange={handleRouteHeaderChange}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});
