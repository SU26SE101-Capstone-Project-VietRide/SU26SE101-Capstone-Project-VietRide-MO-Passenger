import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bus, CheckCircle, CaretUp, CaretDown } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { MockMapView, MapPoint } from '@shared/components/MockMapView';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BookingStackParamList } from '@app/navigation/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'Tracking'>;

const MOCK_TICKET_STOPS: MapPoint[] = [
  {
    id: 'stop-1',
    name: 'Nuoc Ngam Station',
    detail: 'Origin departure point. Bus departed at 07:00 AM.',
    x: 40,
    y: 260,
    type: 'origin',
    status: 'completed',
  },
  {
    id: 'stop-2',
    name: 'Phu Ly Rest Stop',
    detail: 'Completed 15 min rest stop for passenger refreshment.',
    x: 100,
    y: 180,
    type: 'transit',
    status: 'completed',
  },
  {
    id: 'stop-3',
    name: 'Yen Bai Terminal',
    detail: 'Current position. Bus arrived at 10:45 AM, departing soon.',
    x: 180,
    y: 130,
    type: 'transit',
    status: 'active',
  },
  {
    id: 'stop-4',
    name: 'Lao Cai Station',
    detail: 'Upcoming transit stop. Expected ETA: 12:30 PM.',
    x: 240,
    y: 80,
    type: 'transit',
    status: 'pending',
  },
  {
    id: 'stop-5',
    name: 'Sapa Bus Station',
    detail: 'Final destination drop-off point. Expected ETA: 01:30 PM.',
    x: 280,
    y: 40,
    type: 'destination',
    status: 'pending',
  },
];

export function TrackingScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Background Interactive Mock Map */}
      <MockMapView points={MOCK_TICKET_STOPS} vehicleType="bus" />

      {/* Floating Header */}
      <SafeAreaView edges={['top']} style={styles.floatingHeader}>
        <Pressable style={styles.navButton} onPress={handleGoBack}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.floatingHeaderBadge}>
          <Text style={styles.floatingHeaderTitle}>Trip Tracking: Hanoi to Sapa</Text>
        </View>
        <View style={{ width: 44 }} />
      </SafeAreaView>

      {/* Bottom Floating Sheet containing Timeline */}
      <View style={[styles.bottomSheetContainer, isMinimized ? styles.bottomSheetMinimized : null]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          scrollEnabled={!isMinimized}
        >
          {/* Status Header Badge Card */}
          <Pressable
            onPress={() => setIsMinimized(!isMinimized)}
            style={styles.statusHeaderCard}
          >
            <View style={styles.statusIconBackground}>
              <Bus size={32} color={theme.colors.primary} weight="fill" />
            </View>
            <View style={styles.statusMeta}>
              <Text style={styles.statusLabelText}>TRIP STATUS (TAP TO TOGGLE)</Text>
              <Text style={styles.statusValueText}>Heading to Yen Bai</Text>
            </View>
            {isMinimized ? (
              <CaretUp size={20} color={theme.colors.textSecondary} weight="bold" />
            ) : (
              <CaretDown size={20} color={theme.colors.textSecondary} weight="bold" />
            )}
          </Pressable>

          {/* Timeline Log Section */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionHeading}>Journey Timeline</Text>
            
            <View style={styles.timelineContainer}>
              {MOCK_TICKET_STOPS.map((item, idx) => {
                const isLast = idx === MOCK_TICKET_STOPS.length - 1;
                const isCompleted = item.status === 'completed';
                const isActive = item.status === 'active';

                return (
                  <View key={`ticket-stop-${item.id}`} style={styles.timelineRow}>
                    {/* Left node point line */}
                    <View style={styles.nodeColumn}>
                      <View
                        style={[
                          styles.nodeCircle,
                          isCompleted ? styles.nodeCompleted : null,
                          isActive ? styles.nodeActive : null,
                        ]}
                      >
                        {isCompleted ? <CheckCircle size={18} color={theme.colors.success} weight="fill" /> : null}
                        {isActive ? <Bus size={14} color={theme.colors.textInverse} weight="fill" /> : null}
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

                    {/* Right item textual content */}
                    <View style={styles.timelineContent}>
                      <Text
                        style={[
                          styles.timelineTitle,
                          isActive ? styles.timelineTitleActive : null,
                          !isCompleted && !isActive ? styles.timelineTitlePending : null,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.timelineDesc}>{item.detail}</Text>
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
    height: SCREEN_HEIGHT * 0.45,
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
    backgroundColor: theme.colors.primaryFaded,
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
  timelineSection: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
  },
  sectionHeading: {
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
});
