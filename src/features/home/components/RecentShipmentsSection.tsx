import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Truck,
  Check,
  Clock,
  XCircle,
  PlusCircle,
  Gift,
} from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, shadows } from '@shared/theme';

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
        return <Truck size={24} color={colors.primary} weight="bold" />;
      case 'Delivered':
        return <Check size={20} color={colors.textTertiary} weight="bold" />;
      case 'Pending':
        return <Clock size={22} color="#B45309" weight="bold" />;
      case 'Cancelled':
        return <XCircle size={22} color={colors.error} weight="bold" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Recent Shipments Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Shipments</Text>
        <TouchableOpacity activeOpacity={0.6} onPress={onViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.shipmentList}>
        {MOCK_SHIPMENTS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.shipmentCard}
            onPress={() => onTrackShipment(item.id)}
            activeOpacity={0.8}
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
          </TouchableOpacity>
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
          <TouchableOpacity style={styles.promoButton} activeOpacity={0.8}>
            <Text style={styles.promoButtonText}>Share Now</Text>
          </TouchableOpacity>
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

const styles = StyleSheet.create({
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
    color: colors.textPrimary,
  },
  viewAllText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  shipmentList: {
    gap: spacing.sm,
  },
  shipmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  shipmentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
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
    color: colors.textPrimary,
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
    backgroundColor: colors.successLight,
  },
  textTransit: {
    color: colors.primary,
  },
  badgeDelivered: {
    backgroundColor: colors.surfaceAlt,
  },
  textDelivered: {
    color: colors.textTertiary,
  },
  badgePending: {
    backgroundColor: colors.warningLight,
  },
  textPending: {
    color: '#B45309',
  },
  badgeCancelled: {
    backgroundColor: colors.errorLight,
  },
  textCancelled: {
    color: colors.error,
  },
  shipmentMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    lineHeight: 16,
  },
  promoCard: {
    flexDirection: 'row',
    backgroundColor: '#CEAB00',
    borderRadius: 24,
    padding: spacing.xl,
    ...shadows.md,
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
    color: '#3A2E00',
    marginBottom: spacing.xs,
  },
  promoDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: '#4F4000',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  promoButton: {
    backgroundColor: '#3A2E00',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    alignSelf: 'flex-start',
    ...shadows.sm,
  },
  promoButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textInverse,
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
});
