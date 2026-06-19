import React from 'react';
import {
  View,
  Text,
  Pressable,
} from 'react-native';
import {
  Truck,
  Check,
  Clock,
  XCircle,
  PlusCircle,
  Gift,
} from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface ShipmentItem {
  id: string;
  destination: string;
  status: 'In Transit' | 'Delivered' | 'Pending' | 'Cancelled';
  date: string;
}

const MOCK_SHIPMENTS: ShipmentItem[] = [
  {
    id: 'VR-8829',
    destination: 'Da Lat',
    status: 'In Transit',
    date: 'Expected: tomorrow',
  },
  {
    id: 'VR-7741',
    destination: 'Ho Chi Minh City',
    status: 'Delivered',
    date: 'Oct 24, 2023',
  },
];

interface RecentShipmentsSectionProps {
  onViewAll: () => void;
  onTrackShipment: (id: string) => void;
}

export function RecentShipmentsSection({
  onViewAll,
  onTrackShipment,
}: RecentShipmentsSectionProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const renderStatusBadge = (status: ShipmentItem['status']) => {
    switch (status) {
      case 'In Transit':
        return (
          <View style={[styles.badge, styles.badgeTransit]}>
            <Text style={[styles.badgeText, styles.textTransit]}>In Transit</Text>
          </View>
        );
      case 'Delivered':
        return (
          <View style={[styles.badge, styles.badgeDelivered]}>
            <Text style={[styles.badgeText, styles.textDelivered]}>Delivered</Text>
          </View>
        );
      case 'Pending':
        return (
          <View style={[styles.badge, styles.badgePending]}>
            <Text style={[styles.badgeText, styles.textPending]}>Pending</Text>
          </View>
        );
      case 'Cancelled':
        return (
          <View style={[styles.badge, styles.badgeCancelled]}>
            <Text style={[styles.badgeText, styles.textCancelled]}>Cancelled</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderStatusIcon = (status: ShipmentItem['status']) => {
    switch (status) {
      case 'In Transit':
        return <Truck size={24} color={theme.colors.primary} weight="bold" />;
      case 'Delivered':
        return <Check size={20} color={theme.colors.textTertiary} weight="bold" />;
      case 'Pending':
        return <Clock size={22} color="#B45309" weight="bold" />;
      case 'Cancelled':
        return <XCircle size={22} color={theme.colors.error} weight="bold" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Recent Shipments Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Shipments</Text>
        <Pressable onPress={onViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
      </View>

      <View style={styles.shipmentList}>
        {MOCK_SHIPMENTS.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.shipmentCard, pressed ? styles.pressed : null]}
            onPress={() => onTrackShipment(item.id)}
          >
            <View style={styles.shipmentIconContainer}>
              {renderStatusIcon(item.status)}
            </View>
            <View style={styles.shipmentInfo}>
              <View style={styles.shipmentRow}>
                <Text style={styles.shipmentDestination} numberOfLines={1}>
                  To: {item.destination}
                </Text>
                {renderStatusBadge(item.status)}
              </View>
              <Text style={styles.shipmentMeta}>
                Order #{item.id} • {item.date}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Illustration Promo Banner */}
      <View style={styles.promoCard}>
        <View style={styles.promoTextContent}>
          <Text style={styles.promoTitle}>Invite friends,</Text>
          <Text style={styles.promoTitle}>get coins!</Text>
          <Text style={styles.promoDesc}>
            Share your delivery code and get 50,000 VND off your next parcel.
          </Text>
          <Pressable style={({ pressed }) => [styles.promoButton, pressed ? styles.pressed : null]}>
            <Text style={styles.promoButtonText}>Share Now</Text>
          </Pressable>
        </View>
        <View style={styles.promoGiftContainer}>
          <PlusCircle
            size={64}
            color="rgba(255, 255, 255, 0.15)"
            weight="light"
            style={styles.promoBgCircle}
          />
          <Gift size={48} color="rgba(255, 255, 255, 0.3)" weight="fill" />
        </View>
      </View>
    </>
  );
}

const createStyles = (theme: AppTheme) => ({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  viewAllText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  shipmentList: {
    gap: spacing.sm,
  },
  shipmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.components.card,
    borderRadius: 24,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  shipmentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  shipmentInfo: {
    flex: 1,
  },
  shipmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shipmentDestination: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    flex: 1,
    paddingRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
  },
  badgeTransit: {
    backgroundColor: theme.colors.successLight,
  },
  textTransit: {
    color: theme.colors.primary,
  },
  badgeDelivered: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  textDelivered: {
    color: theme.colors.textTertiary,
  },
  badgePending: {
    backgroundColor: theme.colors.warningLight,
  },
  textPending: {
    color: '#B45309',
  },
  badgeCancelled: {
    backgroundColor: theme.colors.errorLight,
  },
  textCancelled: {
    color: theme.colors.error,
  },
  shipmentMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    lineHeight: 16,
  },
  promoCard: {
    flexDirection: 'row',
    backgroundColor: theme.isDark ? 'rgba(255, 225, 119, 0.14)' : '#F3CF3B',
    borderWidth: theme.effects.isLiquid ? 1 : 0,
    borderColor: theme.isDark ? 'rgba(255, 225, 119, 0.22)' : 'transparent',
    borderRadius: 24,
    padding: spacing.xl,
    ...theme.effects.cardShadow,
    overflow: 'hidden',
    position: 'relative',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  promoTextContent: {
    flex: 1.4,
    zIndex: 2,
  },
  promoTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: theme.isDark ? '#FFECA3' : '#3A2E00',
    marginBottom: spacing.xs,
  },
  promoDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.isDark ? 'rgba(255, 236, 163, 0.78)' : '#4F4000',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  promoButton: {
    backgroundColor: theme.isDark ? '#FFE177' : '#3A2E00',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    alignSelf: 'flex-start',
    ...theme.effects.cardShadow,
  },
  promoButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.isDark ? '#2B2200' : theme.colors.textInverse,
  },
  promoGiftContainer: {
    flex: 0.8,
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
  },
  promoBgCircle: {
    position: 'absolute',
    opacity: 0.15,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
