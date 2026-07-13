import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, CaretDown, CaretUp, CheckCircle, Truck } from 'phosphor-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { MockMapView, MapPoint } from '@shared/components/MockMapView';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { ParcelStackParamList } from '@app/navigation/types';
import { useParcelDetail } from '../hooks/useParcelQueries';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type ParcelTrackingRouteProp = RouteProp<ParcelStackParamList, 'ParcelTracking'>;
type ParcelTrackingNavProp = NativeStackNavigationProp<ParcelStackParamList, 'ParcelTracking'>;
type MilestoneStatus = 'active' | 'completed' | 'pending';

interface Milestone {
  title: string;
  desc: string;
  time: string;
  status: MilestoneStatus;
}

const PARCEL_TRACKING_POINTS: MapPoint[] = [
  {
    id: 'parcel-origin',
    name: 'Origin terminal',
    detail: 'Parcel accepted at the origin terminal.',
    x: 40,
    y: 260,
    type: 'origin',
    status: 'completed',
  },
  {
    id: 'parcel-transit',
    name: 'In transit',
    detail: 'Parcel is moving with the assigned trip.',
    x: 150,
    y: 150,
    type: 'transit',
    status: 'active',
  },
  {
    id: 'parcel-dest',
    name: 'Destination terminal',
    detail: 'Parcel will be available for terminal pickup.',
    x: 280,
    y: 40,
    type: 'destination',
    status: 'pending',
  },
];

const formatMilestoneTime = (dateLike?: string | null): string => {
  if (!dateLike) return '--';
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '--';

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusLabel = (status?: string): string =>
  (status || 'PENDING')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildMilestones = (parcel?: ReturnType<typeof useParcelDetail>['data']): Milestone[] => {
  const status = parcel?.status ?? 'PENDING';
  const loaded = Boolean(parcel?.loadedAt)
    || ['LOADED', 'IN_TRANSIT', 'UNLOADED', 'DELIVERED_PENDING_CONFIRM', 'DELIVERY_CONFIRMED'].includes(status);
  const unloaded = Boolean(parcel?.unloadedAt)
    || ['UNLOADED', 'DELIVERED_PENDING_CONFIRM', 'DELIVERY_CONFIRMED'].includes(status);
  const pendingConfirm = Boolean(parcel?.deliveredPendingConfirmAt)
    || ['DELIVERED_PENDING_CONFIRM', 'DELIVERY_CONFIRMED'].includes(status);
  const confirmed = Boolean(parcel?.confirmedAt) || status === 'DELIVERY_CONFIRMED';

  return [
    {
      title: 'Parcel Created',
      desc: 'Parcel booking has been created and is waiting for payment or review.',
      time: formatMilestoneTime(parcel?.createdAt),
      status: loaded || unloaded || pendingConfirm || confirmed ? 'completed' : 'active',
    },
    {
      title: 'Loaded',
      desc: 'Terminal staff loaded the parcel onto the assigned trip.',
      time: formatMilestoneTime(parcel?.loadedAt),
      status: loaded ? 'completed' : 'pending',
    },
    {
      title: 'In Transit',
      desc: 'Parcel is moving toward the destination terminal.',
      time: loaded ? formatMilestoneTime(parcel?.loadedAt) : '--',
      status: loaded && !unloaded ? 'active' : unloaded || pendingConfirm || confirmed ? 'completed' : 'pending',
    },
    {
      title: 'Unloaded',
      desc: 'Parcel arrived at the destination terminal.',
      time: formatMilestoneTime(parcel?.unloadedAt ?? parcel?.deliveredPendingConfirmAt),
      status: unloaded || pendingConfirm || confirmed ? 'completed' : 'pending',
    },
    {
      title: 'Delivery Confirmed',
      desc: 'Recipient confirmed parcel pickup.',
      time: formatMilestoneTime(parcel?.confirmedAt),
      status: confirmed ? 'completed' : pendingConfirm ? 'active' : 'pending',
    },
  ];
};

export function ParcelTrackingScreen(): React.JSX.Element {
  const route = useRoute<ParcelTrackingRouteProp>();
  const navigation = useNavigation<ParcelTrackingNavProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { parcelId } = route.params;
  const [isMinimized, setIsMinimized] = useState(false);
  const parcelQuery = useParcelDetail(parcelId);
  const milestones = useMemo(() => buildMilestones(parcelQuery.data), [parcelQuery.data]);
  const currentStatus = statusLabel(parcelQuery.data?.status);

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <MockMapView points={PARCEL_TRACKING_POINTS} vehicleType="truck" />

      <SafeAreaView edges={['top']} style={styles.floatingHeader}>
        <Pressable style={styles.navButton} onPress={handleGoBack}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.floatingHeaderBadge}>
          <Text style={styles.floatingHeaderTitle}>
            {parcelQuery.data?.parcelCode || parcelId}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </SafeAreaView>

      <View style={[styles.bottomSheetContainer, isMinimized ? styles.bottomSheetMinimized : null]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          scrollEnabled={!isMinimized}
        >
          <Pressable
            onPress={() => setIsMinimized(!isMinimized)}
            style={styles.statusHeaderCard}
          >
            <View style={styles.statusIconBackground}>
              {parcelQuery.isLoading ? (
                <ActivityIndicator color={theme.colors.accentDark} />
              ) : (
                <Truck size={32} color={theme.colors.accentDark} weight="fill" />
              )}
            </View>
            <View style={styles.statusMeta}>
              <Text style={styles.statusLabelText}>CURRENT STATUS</Text>
              <Text style={styles.statusValueText}>{currentStatus}</Text>
            </View>
            {isMinimized ? (
              <CaretUp size={20} color={theme.colors.textSecondary} weight="bold" />
            ) : (
              <CaretDown size={20} color={theme.colors.textSecondary} weight="bold" />
            )}
          </Pressable>

          <View style={styles.bentoSummaryCard}>
            <Text style={styles.bentoCardHeading}>Shipment Timeline</Text>

            <View style={styles.timelineContainer}>
              {milestones.map((item, idx) => {
                const isLast = idx === milestones.length - 1;
                const isCompleted = item.status === 'completed';
                const isActive = item.status === 'active';

                return (
                  <View key={`${item.title}-${idx}`} style={styles.timelineRow}>
                    <View style={styles.nodeColumn}>
                      <View
                        style={[
                          styles.nodeCircle,
                          isCompleted ? styles.nodeCompleted : null,
                          isActive ? styles.nodeActive : null,
                        ]}
                      >
                        {isCompleted ? <CheckCircle size={18} color={theme.colors.success} weight="fill" /> : null}
                        {isActive ? <Truck size={14} color={theme.colors.textInverse} weight="fill" /> : null}
                        {!isCompleted && !isActive ? <View style={styles.nodePendingDot} /> : null}
                      </View>
                      {!isLast ? (
                        <View
                          style={[
                            styles.timelineLine,
                            isCompleted || isActive ? styles.timelineLineCompleted : null,
                          ]}
                        />
                      ) : null}
                    </View>

                    <View style={styles.timelineContent}>
                      <Text
                        style={[
                          styles.timelineTitle,
                          isActive ? styles.timelineTitleActive : null,
                          !isCompleted && !isActive ? styles.timelineTitlePending : null,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.timelineDesc}>{item.desc}</Text>
                      {item.time !== '--' ? <Text style={styles.timelineTime}>{item.time}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    zIndex: 10,
  },
  navButton: {
    ...theme.components.headerButton,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  floatingHeaderBadge: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.divider,
    ...theme.effects.cardShadow,
  },
  floatingHeaderTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.55,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.divider,
    borderBottomWidth: 0,
    ...theme.effects.floatingShadow,
  },
  bottomSheetMinimized: {
    height: 112,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
  },
  statusHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  statusIconBackground: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statusMeta: {
    flex: 1,
  },
  statusLabelText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: theme.colors.textTertiary,
  },
  statusValueText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  bentoSummaryCard: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
  },
  bentoCardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineContainer: {
    marginTop: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  nodeColumn: {
    alignItems: 'center',
    width: 32,
  },
  nodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    zIndex: 1,
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
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    position: 'absolute',
    top: 24,
    bottom: -8,
  },
  timelineLineCompleted: {
    backgroundColor: theme.colors.primary,
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
    fontSize: fontSizes.md,
  },
  timelineTitlePending: {
    color: theme.colors.textTertiary,
  },
  timelineDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: fontSizes.xs * 1.3,
  },
  timelineTime: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: theme.colors.textTertiary,
    marginTop: 6,
  },
});
