import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '@app/navigation/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { borderRadius, fontFamilies, fontSizes, spacing, type AppTheme } from '@shared/theme';
import { LiveTripTrackingPanel } from '../components/LiveTripTrackingPanel';

type TrackingRoute = RouteProp<RootStackParamList, 'Tracking'>;
type TrackingNavigation = NativeStackNavigationProp<RootStackParamList, 'Tracking'>;

const terminalMessageKeyForStatus = (
  status: TrackingRoute['params']['tripStatus'],
): string | undefined => {
  if (status === 'CANCELLED') {
    return 'tracking.tripCancelled';
  }
  if (status === 'DISRUPTED') {
    return 'tracking.tripDisrupted';
  }
  return undefined;
};

export function TrackingScreen(): React.JSX.Element {
  const route = useRoute<TrackingRoute>();
  const navigation = useNavigation<TrackingNavigation>();
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { tripId, stopId, bookingId, tripStatus } = route.params;
  const terminalMessageKey = terminalMessageKeyForStatus(tripStatus);
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [styles.headerButton, pressed ? styles.pressed : null]}
          onPress={handleBack}
        >
          <ArrowLeft size={23} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('tracking.liveTracking')}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {bookingId
              ? t('tracking.bookingReference', { id: bookingId })
              : t('tracking.tripReference', { id: tripId })}
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LiveTripTrackingPanel
          tripId={tripId}
          stopId={stopId}
          tripStatus={tripStatus}
          terminalMessage={
            terminalMessageKey ? t(terminalMessageKey) : undefined
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    borderCurve: 'continuous' as const,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 2,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    maxWidth: 260,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  pressed: {
    opacity: 0.78,
  },
});
