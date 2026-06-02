import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { ArrowLeft, Truck, CheckCircle } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParcelStackParamList } from '@app/navigation/types';

type ParcelTrackingRouteProp = RouteProp<ParcelStackParamList, 'ParcelTracking'>;
type ParcelTrackingNavProp = NativeStackNavigationProp<ParcelStackParamList, 'ParcelTracking'>;

// Mock tracking milestones
const MILESTONES = [
  {
    title: 'In Transit',
    desc: 'Departure scan, vehicle heading to Sapa terminal.',
    time: 'Jun 02, 2026 • 11:45 AM',
    status: 'active', // active, completed, pending
  },
  {
    title: 'Received at Station',
    desc: 'Parcel processed at FUTA Mien Dong Bus Station.',
    time: 'Jun 02, 2026 • 09:15 AM',
    status: 'completed',
  },
  {
    title: 'Booked successfully',
    desc: 'Delivery booking confirmed online.',
    time: 'Jun 02, 2026 • 08:00 AM',
    status: 'completed',
  },
  {
    title: 'Out for Delivery',
    desc: 'Courier delivering to Sapa recipient.',
    time: '--',
    status: 'pending',
  },
  {
    title: 'Delivered',
    desc: 'Successfully received by recipient.',
    time: '--',
    status: 'pending',
  },
];

export function ParcelTrackingScreen(): React.JSX.Element {
  const route = useRoute<ParcelTrackingRouteProp>();
  const navigation = useNavigation<ParcelTrackingNavProp>();
  const { parcelId } = route.params;

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navButton} onPress={handleGoBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Track Shipment</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Header Badge Card */}
        <View style={styles.statusHeaderCard}>
          <View style={styles.statusIconBackground}>
            <Truck size={32} color={colors.accentDark} weight="fill" />
          </View>
          <View style={styles.statusMeta}>
            <Text style={styles.statusLabelText}>CURRENT STATUS</Text>
            <Text style={styles.statusValueText}>In Transit</Text>
            <Text style={styles.refText}>Order Ref: {parcelId}</Text>
          </View>
        </View>

        {/* Route Card summary */}
        <View style={styles.bentoSummaryCard}>
          <Text style={styles.bentoCardHeading}>Route Details</Text>
          <View style={styles.summaryRoute}>
            <View style={styles.routeTrack}>
              <View style={styles.dotStart} />
              <View style={styles.dottedDivider} />
              <View style={styles.dotEnd} />
            </View>
            <View style={styles.routeDetailsText}>
              <View style={styles.routeStationSection}>
                <Text style={styles.routeLabelText}>FROM</Text>
                <Text style={styles.routeStationName}>FUTA Mien Dong Station</Text>
                <Text style={styles.routeStationCity}>Ho Chi Minh City</Text>
              </View>
              <View style={styles.routeStationSection}>
                <Text style={styles.routeLabelText}>TO</Text>
                <Text style={styles.routeStationName}>FUTA Sapa Office</Text>
                <Text style={styles.routeStationCity}>Sapa</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Timeline Log Section */}
        <View style={[styles.bentoSummaryCard, { paddingBottom: spacing.xl }]}>
          <Text style={styles.bentoCardHeading}>Shipment Timeline</Text>
          
          <View style={styles.timelineContainer}>
            {MILESTONES.map((item, idx) => {
              const isLast = idx === MILESTONES.length - 1;
              const isCompleted = item.status === 'completed';
              const isActive = item.status === 'active';

              return (
                <View key={`milestone-${idx}`} style={styles.timelineRow}>
                  {/* Left node point line */}
                  <View style={styles.nodeColumn}>
                    <View
                      style={[
                        styles.nodeCircle,
                        isCompleted && styles.nodeCompleted,
                        isActive && styles.nodeActive,
                      ]}
                    >
                      {isCompleted && <CheckCircle size={18} color={colors.success} weight="fill" />}
                      {isActive && <Truck size={14} color={colors.textInverse} weight="fill" />}
                      {!isCompleted && !isActive && <View style={styles.nodePendingDot} />}
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          (isCompleted || isActive) && styles.timelineLineCompleted,
                        ]}
                      />
                    )}
                  </View>

                  {/* Right item textual content */}
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineTitle,
                        isActive && styles.timelineTitleActive,
                        !isCompleted && !isActive && styles.timelineTitlePending,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.timelineDesc}>{item.desc}</Text>
                    {item.time !== '--' && <Text style={styles.timelineTime}>{item.time}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={handleGoBack} activeOpacity={0.8}>
          <Text style={styles.refreshButtonText}>Back to List</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
  },
  navTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
  },
  statusHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.md,
    ...shadows.sm,
    gap: spacing.lg,
  },
  statusIconBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMeta: {
    flex: 1,
  },
  statusLabelText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textTertiary,
  },
  statusValueText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginTop: 2,
  },
  refText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.primary,
    marginTop: 2,
  },
  bentoSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  bentoCardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRoute: {
    flexDirection: 'row',
  },
  routeTrack: {
    alignItems: 'center',
    marginRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  dotStart: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  dottedDivider: {
    width: 1,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  dotEnd: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  routeDetailsText: {
    flex: 1,
    gap: spacing.md,
  },
  routeStationSection: {},
  routeLabelText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textTertiary,
  },
  routeStationName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginTop: 2,
  },
  routeStationCity: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
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
    backgroundColor: colors.surfaceAlt,
    zIndex: 1,
  },
  nodeCompleted: {
    backgroundColor: 'transparent',
  },
  nodeActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  nodePendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textDisabled,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    position: 'absolute',
    top: 24,
    bottom: -8,
  },
  timelineLineCompleted: {
    backgroundColor: colors.primary,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.xl,
  },
  timelineTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  timelineTitleActive: {
    color: colors.primary,
    fontSize: fontSizes.md,
  },
  timelineTitlePending: {
    color: colors.textTertiary,
  },
  timelineDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: fontSizes.xs * 1.3,
  },
  timelineTime: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 6,
  },
  refreshButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.divider,
    marginTop: spacing.sm,
  },
  refreshButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
});
