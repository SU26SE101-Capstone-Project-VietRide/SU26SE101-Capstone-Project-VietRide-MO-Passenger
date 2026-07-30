import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  CheckCircle,
  Package,
  Truck,
  WarningCircle,
} from 'phosphor-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getApiErrorMessage } from '@shared/api/errors';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { ParcelStackParamList } from '@app/navigation/types';
import { LiveTripTrackingPanel } from '@features/tracking';
import { ErrorView } from '../components';
import { useParcelDetail } from '../hooks/useParcelQueries';
import {
  buildParcelMilestones,
  formatParcelEventTime,
  formatParcelStatusLabel,
  isParcelLocationTrackingTerminal,
  isParcelRejected,
  isParcelTrackingEligible,
} from '../utils/parcelTracking';

type ParcelTrackingRouteProp = RouteProp<ParcelStackParamList, 'ParcelTracking'>;
type ParcelTrackingNavProp = NativeStackNavigationProp<ParcelStackParamList, 'ParcelTracking'>;

export function ParcelTrackingScreen(): React.JSX.Element {
  const route = useRoute<ParcelTrackingRouteProp>();
  const navigation = useNavigation<ParcelTrackingNavProp>();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { parcelId } = route.params;
  const {
    data: parcel,
    error,
    isError,
    isLoading,
    isRefetching,
    refetch,
  } = useParcelDetail(parcelId);
  const milestones = useMemo(
    () => (parcel ? buildParcelMilestones(parcel) : []),
    [parcel],
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const isRejected = parcel ? isParcelRejected(parcel) : false;
  const isTrackingEligible = isParcelTrackingEligible(parcel?.status);
  const isTrackingTerminal = isParcelLocationTrackingTerminal(parcel?.status);
  const rejectedTime = formatParcelEventTime(parcel?.rejectedAt);
  const eta = formatParcelEventTime(parcel?.eta);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navbar}>
        <Pressable
          accessibilityLabel={t('parcel.actions.goBack')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleGoBack}
          style={styles.navButton}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.navTitle}>
            {t('parcel.tracking.title')}
          </Text>
          <Text numberOfLines={1} style={styles.navSubtitle}>
            {parcel?.parcelCode || parcelId}
          </Text>
        </View>
        <View style={styles.navSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.stateText}>
            {t('parcel.tracking.loading')}
          </Text>
        </View>
      ) : isError || !parcel ? (
        <ErrorView
          message={getApiErrorMessage(error)}
          onRetry={handleRefresh}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={(
            <RefreshControl
              colors={[theme.colors.primary]}
              onRefresh={handleRefresh}
              refreshing={isRefetching}
              tintColor={theme.colors.primary}
            />
          )}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusCard}>
            <View style={styles.statusIconBackground}>
              {isRejected ? (
                <WarningCircle size={30} color={theme.colors.error} weight="fill" />
              ) : (
                <Package size={30} color={theme.colors.primary} weight="fill" />
              )}
            </View>
            <View style={styles.statusMeta}>
              <Text style={styles.eyebrow}>
                {t('parcel.tracking.latestStatus')}
              </Text>
              <Text style={[styles.statusValue, isRejected ? styles.rejectedText : null]}>
                {formatParcelStatusLabel(parcel.status)}
              </Text>
              {eta ? (
                <Text style={styles.etaText}>
                  {t('parcel.tracking.estimatedArrival', { time: eta })}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.trackingSection}>
            <Text style={styles.cardHeading}>
              {t('parcel.tracking.liveLocationTitle')}
            </Text>
            <Text style={styles.cardDescription}>
              {t('parcel.tracking.liveLocationDescription')}
            </Text>
            <View style={styles.trackingContent}>
              {isTrackingEligible ? (
                <LiveTripTrackingPanel
                  tripId={parcel.tripId}
                  stopId={parcel.dropoffStopId ?? undefined}
                  sourceTerminal={isTrackingTerminal}
                  terminalMessage={t('parcel.tracking.transportComplete')}
                />
              ) : (
                <View style={styles.trackingUnavailable} accessibilityRole="summary">
                  <Truck size={28} color={theme.colors.textTertiary} weight="duotone" />
                  <Text style={styles.trackingUnavailableTitle}>
                    {t('parcel.tracking.mapUnavailableTitle')}
                  </Text>
                  <Text style={styles.trackingUnavailableText}>
                    {t('parcel.tracking.mapUnavailableDescription')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {isRejected ? (
            <View style={styles.rejectedNotice}>
              <WarningCircle size={20} color={theme.colors.error} weight="fill" />
              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle}>
                  {t('parcel.tracking.rejectedTitle')}
                </Text>
                <Text style={styles.noticeText}>
                  {rejectedTime
                    ? t('parcel.tracking.rejectedAt', { time: rejectedTime })
                    : t('parcel.tracking.rejectedContactSupport')}
                </Text>
              </View>
            </View>
          ) : null}

          {(parcel.originStationName || parcel.destinationStationName) ? (
            <View style={styles.routeCard}>
              <View style={styles.routeEndpoint}>
                <Text style={styles.eyebrow}>{t('parcel.route.origin')}</Text>
                <Text style={styles.routeName}>
                  {parcel.originStationName || t('parcel.common.notProvided')}
                </Text>
              </View>
              <View style={styles.routeDivider} />
              <View style={styles.routeEndpoint}>
                <Text style={styles.eyebrow}>
                  {t('parcel.route.destination')}
                </Text>
                <Text style={styles.routeName}>
                  {parcel.destinationStationName || t('parcel.common.notProvided')}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.timelineCard}>
            <Text style={styles.cardHeading}>
              {t('parcel.tracking.timelineTitle')}
            </Text>
            <Text style={styles.cardDescription}>
              {t('parcel.tracking.timelineDescription')}
            </Text>

            <View style={styles.timelineContainer}>
              {milestones.map((item, index) => {
                const isLast = index === milestones.length - 1;
                const isCompleted = item.status === 'completed';
                const isActive = item.status === 'active';

                return (
                  <View key={item.id} style={styles.timelineRow}>
                    <View style={styles.nodeColumn}>
                      <View
                        style={[
                          styles.nodeCircle,
                          isCompleted ? styles.nodeCompleted : null,
                          isActive ? styles.nodeActive : null,
                        ]}
                      >
                        {isCompleted ? (
                          <CheckCircle size={19} color={theme.colors.success} weight="fill" />
                        ) : isActive ? (
                          <Truck size={13} color={theme.colors.textInverse} weight="fill" />
                        ) : (
                          <View style={styles.nodePendingDot} />
                        )}
                      </View>
                      {!isLast ? (
                        <View
                          style={[
                            styles.timelineLine,
                            isCompleted ? styles.timelineLineCompleted : null,
                          ]}
                        />
                      ) : null}
                    </View>

                    <View style={styles.timelineContent}>
                      <Text
                        style={[
                          styles.timelineTitle,
                          isActive ? styles.timelineTitleActive : null,
                          item.status === 'pending' ? styles.timelineTitlePending : null,
                        ]}
                      >
                        {t(item.titleKey)}
                      </Text>
                      <Text style={styles.timelineDescription}>
                        {t(item.descriptionKey)}
                      </Text>
                      {item.time ? <Text style={styles.timelineTime}>{item.time}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
  },
  navButton: {
    ...theme.components.headerButton,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  navTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  navSubtitle: {
    maxWidth: '100%',
    marginTop: 2,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  navSpacer: {
    width: 40,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  stateText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.divider,
    borderRadius: borderRadius.xl,
    ...theme.effects.cardShadow,
  },
  statusIconBackground: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    backgroundColor: theme.colors.primaryFaded,
  },
  statusMeta: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
  },
  statusValue: {
    marginTop: 3,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  rejectedText: {
    color: theme.colors.error,
  },
  etaText: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  rejectedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: theme.colors.errorLight,
    borderRadius: borderRadius.lg,
  },
  trackingSection: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surface,
  },
  trackingContent: {
    marginTop: spacing.lg,
  },
  trackingUnavailable: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surfaceAlt,
  },
  trackingUnavailableTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  trackingUnavailableText: {
    maxWidth: 340,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.45,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.error,
  },
  noticeText: {
    marginTop: 2,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.4,
    color: theme.colors.textSecondary,
  },
  routeCard: {
    flexDirection: 'row',
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
  },
  routeEndpoint: {
    flex: 1,
  },
  routeDivider: {
    width: 1,
    marginHorizontal: spacing.md,
    backgroundColor: theme.colors.divider,
  },
  routeName: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.35,
    color: theme.colors.textPrimary,
  },
  timelineCard: {
    padding: spacing.lg,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.divider,
  },
  cardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  cardDescription: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.4,
    color: theme.colors.textSecondary,
  },
  timelineContainer: {
    marginTop: spacing.xl,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  nodeColumn: {
    width: 32,
    alignItems: 'center',
  },
  nodeCircle: {
    width: 24,
    height: 24,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  nodeCompleted: {
    backgroundColor: 'transparent',
  },
  nodeActive: {
    backgroundColor: theme.colors.primary,
    ...theme.effects.cardShadow,
  },
  nodePendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textDisabled,
  },
  timelineLine: {
    position: 'absolute',
    top: 24,
    bottom: -8,
    width: 2,
    backgroundColor: theme.colors.border,
  },
  timelineLineCompleted: {
    backgroundColor: theme.colors.success,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.xl,
  },
  timelineTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  timelineTitleActive: {
    color: theme.colors.primary,
  },
  timelineTitlePending: {
    color: theme.colors.textTertiary,
  },
  timelineDescription: {
    marginTop: 4,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.35,
    color: theme.colors.textSecondary,
  },
  timelineTime: {
    marginTop: 6,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
});
