import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { ArrowLeft, Truck, CheckCircle, MapPin } from 'phosphor-react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParcelStackParamList } from '@app/navigation/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

// Mock Map Coordinates
const ROUTE_COORDINATES = [
  { latitude: 10.816667, longitude: 106.716667 }, // FUTA Mien Dong (Origin)
  { latitude: 11.940419, longitude: 108.458313 }, // Da Lat (Transit)
  { latitude: 22.333333, longitude: 103.833333 }, // Sapa (Destination)
];

export function ParcelTrackingScreen(): React.JSX.Element {
  const route = useRoute<ParcelTrackingRouteProp>();
  const navigation = useNavigation<ParcelTrackingNavProp>();
  const { parcelId } = route.params;

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Background Map View */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 16.4637, // Center of Vietnam roughly
          longitude: 107.5909,
          latitudeDelta: 14.0,
          longitudeDelta: 14.0,
        }}
      >
        {/* Origin Marker */}
        <Marker coordinate={ROUTE_COORDINATES[0]} title="Origin" description="FUTA Mien Dong">
          <View style={styles.mapMarkerContainer}>
            <MapPin size={24} color={colors.primary} weight="fill" />
          </View>
        </Marker>

        {/* Destination Marker */}
        <Marker coordinate={ROUTE_COORDINATES[2]} title="Destination" description="Sapa">
          <View style={styles.mapMarkerContainer}>
            <MapPin size={24} color={colors.accent} weight="fill" />
          </View>
        </Marker>

        {/* Truck Marker (Current Location) */}
        <Marker coordinate={ROUTE_COORDINATES[1]} title="Current Location" description="In Transit">
          <View style={[styles.mapMarkerContainer, styles.truckMarker]}>
            <Truck size={20} color={colors.textInverse} weight="fill" />
          </View>
        </Marker>

        {/* Polyline Route */}
        <Polyline
          coordinates={ROUTE_COORDINATES}
          strokeColor={colors.primary}
          strokeWidth={4}
          lineDashPattern={[1]} // solid line
        />
      </MapView>

      {/* Floating Header */}
      <SafeAreaView edges={['top']} style={styles.floatingHeader}>
        <TouchableOpacity style={styles.navButton} onPress={handleGoBack} activeOpacity={0.8}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.floatingHeaderBadge}>
          <Text style={styles.floatingHeaderTitle}>Order Ref: {parcelId}</Text>
        </View>
        <View style={{ width: 44 }} />
      </SafeAreaView>

      {/* Bottom Floating Sheet containing Timeline */}
      <View style={styles.bottomSheetContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* Status Header Badge Card */}
          <View style={styles.statusHeaderCard}>
            <View style={styles.statusIconBackground}>
              <Truck size={32} color={colors.accentDark} weight="fill" />
            </View>
            <View style={styles.statusMeta}>
              <Text style={styles.statusLabelText}>CURRENT STATUS</Text>
              <Text style={styles.statusValueText}>In Transit</Text>
            </View>
          </View>

          {/* Timeline Log Section */}
          <View style={styles.bentoSummaryCard}>
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
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 6,
    ...shadows.md,
  },
  truckMarker: {
    backgroundColor: colors.primary,
    padding: 8,
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  floatingHeaderBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  floatingHeaderTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.55,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...shadows.lg,
    elevation: 20,
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
  },
  statusHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statusIconBackground: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.warningLight,
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
    color: colors.textTertiary,
  },
  statusValueText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginTop: 2,
  },
  bentoSummaryCard: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
  },
  bentoCardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
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
});
