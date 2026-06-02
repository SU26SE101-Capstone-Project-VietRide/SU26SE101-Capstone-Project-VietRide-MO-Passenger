import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Truck,
  Phone,
  ChatText,
  Star,
  CheckCircle,
  MapPin,
  Clock,
} from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TrackingStackParamList } from '@app/navigation/types';

type TripTrackerRouteProp = RouteProp<TrackingStackParamList, 'TripTracker'>;
type TripTrackerNavProp = NativeStackNavigationProp<TrackingStackParamList, 'TripTracker'>;

export function TripTrackerScreen(): React.JSX.Element {
  const route = useRoute<TripTrackerRouteProp>();
  const navigation = useNavigation<TripTrackerNavProp>();
  const { tripId } = route.params;

  // Active tracking coordinate progress simulator state
  const [progress, setProgress] = useState(0.45); // 0 to 1
  const [etaMins, setEtaMins] = useState(25); // initial remaining mins
  const progressAnim = useRef(new Animated.Value(0.45)).current;

  // Simulated GPS movement loop
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 0.02;
        if (next >= 1) {
          clearInterval(timer);
          setEtaMins(0);
          return 1;
        }
        
        // Synchronously animate marker slider position
        Animated.timing(progressAnim, {
          toValue: next,
          duration: 1000,
          useNativeDriver: false,
        }).start();

        // Update ETA countdown based on remaining distance
        setEtaMins(Math.ceil((1 - next) * 45));
        
        return next;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [progressAnim]);

  const handleCallDriver = () => {
    Alert.alert('Calling Driver', 'Connecting call to driver Nguyen Van A (49B-882.91)...', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK' },
    ]);
  };

  const handleMessageDriver = () => {
    // Navigate user to AI Chatbot support to chat with assistant
    navigation.navigate('Chatbot' as any);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Interpolated percentage offset for styling simulated map layout
  const positionPercentage = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Top Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navButton} onPress={handleGoBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.navHeaderTitleContainer}>
          <Text style={styles.navTitle}>Live Tracking</Text>
          <Text style={styles.navSubtitle}>Trip Ref: {tripId}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dynamic Simulated Active Map Panel (1:1 Premium visual layout) */}
        <View style={styles.mapCard}>
          <Text style={styles.mapHeading}>Simulated Route GPS Map</Text>
          <View style={styles.mapCanvas}>
            {/* Visual background grids */}
            <View style={styles.gridLineHorizontal} />
            <View style={[styles.gridLineHorizontal, { top: '65%' }]} />
            <View style={styles.gridLineVertical} />
            
            {/* Route track path line */}
            <View style={styles.routeTrackLine}>
              <View style={[styles.routeTrackLineFill, { width: `${progress * 100}%` }]} />
            </View>

            {/* Custom Moving Bus Marker */}
            <Animated.View style={[styles.busMarkerContainer, { left: positionPercentage }]}>
              <View style={styles.busIconBubble}>
                <Truck size={18} color={colors.textInverse} weight="fill" />
              </View>
              <View style={styles.markerPinIndicator} />
            </Animated.View>

            {/* Departure Station node marker */}
            <View style={styles.stationMarkerStart}>
              <MapPin size={20} color={colors.primary} weight="fill" />
              <Text style={styles.markerText}>HCMC</Text>
            </View>

            {/* Arrival Station node marker */}
            <View style={styles.stationMarkerEnd}>
              <MapPin size={20} color={colors.accent} weight="fill" />
              <Text style={styles.markerText}>Da Lat</Text>
            </View>

            {/* Dynamic visual landscape features (representing high fidelity aesthetic) */}
            <View style={styles.mountainStub1} />
            <View style={styles.mountainStub2} />
          </View>

          {/* Current location status bar details */}
          <View style={styles.locationFooterBar}>
            <MapPin size={16} color={colors.primary} weight="bold" />
            <Text style={styles.locationFooterText} numberOfLines={1}>
              {progress >= 1
                ? 'Arrived at Da Lat Station.'
                : `Highway QL20 • Near Di Linh, Lam Dong`}
            </Text>
          </View>
        </View>

        {/* Dynamic ETA Panel */}
        <View style={styles.bentoCard}>
          <View style={styles.etaHeaderRow}>
            <View style={styles.clockIconContainer}>
              <Clock size={24} color={colors.accentDark} weight="bold" />
            </View>
            <View style={styles.etaInfoCol}>
              <Text style={styles.etaLabelText}>ESTIMATED ARRIVAL</Text>
              <Text style={styles.etaValueText}>
                {progress >= 1 ? 'Arrived' : `04:30 PM (${etaMins} mins remaining)`}
              </Text>
            </View>
          </View>
        </View>

        {/* Driver Profile Bento Card */}
        <View style={styles.bentoCard}>
          <Text style={styles.bentoCardHeading}>Driver & Bus Details</Text>
          <View style={styles.driverInfoRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>NV</Text>
            </View>
            <View style={styles.driverMetaCol}>
              <Text style={styles.driverName}>Nguyen Van A</Text>
              <View style={styles.ratingRow}>
                <Star size={14} color={colors.accent} weight="fill" />
                <Text style={styles.ratingText}>4.9 (104 trips)</Text>
              </View>
              <Text style={styles.plateText}>Plate: 49B-882.91 • FUTA-104</Text>
            </View>
          </View>
          
          <View style={styles.driverActionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCallDriver} activeOpacity={0.8}>
              <Phone size={16} color={colors.primary} weight="bold" />
              <Text style={styles.actionButtonText}>Call Driver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleMessageDriver} activeOpacity={0.8}>
              <ChatText size={16} color={colors.primary} weight="bold" />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Terminal Milestones Log */}
        <View style={[styles.bentoCard, { paddingBottom: spacing.xl }]}>
          <Text style={styles.bentoCardHeading}>Trip Landmarks</Text>
          <View style={styles.timeline}>
            
            {/* Milestone 1: Departure check out */}
            <View style={styles.timelineRow}>
              <View style={styles.nodeColumn}>
                <CheckCircle size={20} color={colors.success} weight="fill" />
                <View style={[styles.timelineLine, styles.timelineLineActive]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Departure scan checked</Text>
                <Text style={styles.timelineDesc}>Bus checked out from Mien Dong Terminal HCMC.</Text>
                <Text style={styles.timelineTime}>Jun 02 • 10:00 AM</Text>
              </View>
            </View>

            {/* Milestone 2: Di Linh Pass Transit (Active) */}
            <View style={styles.timelineRow}>
              <View style={styles.nodeColumn}>
                <View style={[styles.nodeCircle, styles.nodeCircleActive]}>
                  <Truck size={12} color={colors.textInverse} weight="fill" />
                </View>
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, { color: colors.primary }]}>Highway QL20 Transit</Text>
                <Text style={styles.timelineDesc}>Bus crossing Lam Dong checkpoint waypoints.</Text>
                <Text style={styles.timelineTime}>Active now</Text>
              </View>
            </View>

            {/* Milestone 3: Da Lat Arrival dropoff */}
            <View style={styles.timelineRow}>
              <View style={styles.nodeColumn}>
                <View style={styles.nodeCirclePending}>
                  <View style={styles.pendingDot} />
                </View>
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, { color: colors.textTertiary }]}>Da Lat Arrival Station</Text>
                <Text style={styles.timelineDesc}>Expected arrival checkout and passenger drop-off.</Text>
                <Text style={styles.timelineTime}>Expected: 04:30 PM</Text>
              </View>
            </View>

          </View>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={handleGoBack} activeOpacity={0.8}>
          <Text style={styles.backBtnText}>Back to Dashboard</Text>
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
  navHeaderTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  navTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  navSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
  },
  mapCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  mapHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  mapCanvas: {
    height: 180,
    backgroundColor: '#E8F5F2',
    position: 'relative',
    overflow: 'hidden',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '35%',
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  routeTrackLine: {
    position: 'absolute',
    top: '50%',
    left: 48,
    right: 48,
    height: 4,
    backgroundColor: 'rgba(10, 126, 164, 0.15)',
    borderRadius: 2,
    transform: [{ translateY: -2 }],
  },
  routeTrackLineFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  busMarkerContainer: {
    position: 'absolute',
    top: '50%',
    width: 32,
    height: 40,
    transform: [{ translateX: -16 }, { translateY: -32 }],
    alignItems: 'center',
  },
  busIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  markerPinIndicator: {
    width: 6,
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  stationMarkerStart: {
    position: 'absolute',
    top: '50%',
    left: 20,
    transform: [{ translateY: -22 }],
    alignItems: 'center',
  },
  stationMarkerEnd: {
    position: 'absolute',
    top: '50%',
    right: 20,
    transform: [{ translateY: -22 }],
    alignItems: 'center',
  },
  markerText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textPrimary,
    marginTop: 2,
  },
  mountainStub1: {
    position: 'absolute',
    bottom: -10,
    left: '25%',
    width: 60,
    height: 40,
    backgroundColor: 'rgba(0, 106, 103, 0.04)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    transform: [{ rotate: '15deg' }],
  },
  mountainStub2: {
    position: 'absolute',
    bottom: -15,
    right: '25%',
    width: 80,
    height: 50,
    backgroundColor: 'rgba(0, 106, 103, 0.04)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    transform: [{ rotate: '-10deg' }],
  },
  locationFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  locationFooterText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  bentoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  etaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  clockIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaInfoCol: {
    flex: 1,
  },
  etaLabelText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textTertiary,
  },
  etaValueText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginTop: 2,
  },
  bentoCardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  driverAvatarText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.primary,
  },
  driverMetaCol: {
    flex: 1,
  },
  driverName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  plateText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginTop: 4,
  },
  driverActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.md,
    height: 40,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.primary,
  },
  timeline: {
    marginTop: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  nodeColumn: {
    alignItems: 'center',
    width: 24,
  },
  nodeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    zIndex: 1,
  },
  nodeCircleActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  nodeCirclePending: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    zIndex: 1,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textDisabled,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    position: 'absolute',
    top: 20,
    bottom: -6,
  },
  timelineLineActive: {
    backgroundColor: colors.success,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.lg,
  },
  timelineTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  timelineDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: fontSizes.xs * 1.3,
  },
  timelineTime: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 4,
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  backBtnText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
});
