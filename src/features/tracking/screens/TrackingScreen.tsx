import React, { useCallback, useMemo, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinkBreak, ShareNetwork } from 'phosphor-react-native';

import type { RootStackParamList } from '@app/navigation/types';
import type { TripLifecycleStatus } from '@features/trip/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import {
  LiveTripTrackingPanel,
  type TrackingShareQuickAction,
} from '../components/LiveTripTrackingPanel';
import {
  TrackingHeader,
  type TrackingHeaderAction,
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
  const shareScopeKey = isShuttle ? undefined : route.params.tripId;
  const terminalMessageKey = terminalMessageKeyForStatus(tripStatus);
  const [routeHeader, setRouteHeader] = useState<TrackingHeaderRoute>();
  const [shareQuickAction, setShareQuickAction] = useState<TrackingShareQuickAction | null>(null);
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
  const headerActions = useMemo<readonly TrackingHeaderAction[]>(() => {
    if (!shareQuickAction || shareQuickAction.scopeKey !== shareScopeKey) {
      return [];
    }

    const isRevoke = shareQuickAction.mode === 'revoke';
    return [{
      key: 'share-location',
      accessibilityLabel: t(isRevoke
        ? 'tracking.share.revokeAction'
        : 'tracking.share.action'),
      accessibilityHint: t(isRevoke
        ? 'tracking.share.revokeActionHint'
        : 'tracking.share.actionHint'),
      busy: shareQuickAction.pending,
      disabled: shareQuickAction.disabled,
      tone: isRevoke ? 'destructive' : 'default',
      icon: isRevoke
        ? <LinkBreak size={20} color={theme.colors.error} weight="bold" />
        : <ShareNetwork size={20} color={theme.colors.primary} weight="bold" />,
      onPress: shareQuickAction.onPress,
    }];
  }, [
    shareQuickAction,
    shareScopeKey,
    t,
    theme.colors.error,
    theme.colors.primary,
  ]);

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
        actions={headerActions}
      />

      <View style={styles.body}>
        {isShuttle ? (
          <LiveTripTrackingPanel
            source="shuttle"
            shuttleTripId={route.params.shuttleTripId}
            bookingId={bookingId}
            pickupOrder={pickupOrder}
            onShareQuickActionChange={setShareQuickAction}
          />
        ) : (
          <LiveTripTrackingPanel
            source="trip"
            tripId={route.params.tripId}
            trackingTarget={route.params.trackingTarget}
            tripStatus={tripStatus}
            terminalMessage={terminalMessageKey ? t(terminalMessageKey) : undefined}
            onRouteHeaderChange={handleRouteHeaderChange}
            onShareQuickActionChange={setShareQuickAction}
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
